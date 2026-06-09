import type {
  PlanCostAnalysis,
  ResourceCostEstimate,
} from "../types";
import {
  defaultCostAssumptions,
  type CostAssumptions,
} from "../controls/workspacePolicy";

const HOURS_PER_MONTH = 730;
const PRICING_SOURCE =
  "https://prices.azure.com/api/retail/prices";

interface TerraformPlan {
  planned_values?: { root_module?: PlanModule };
}

interface PlanModule {
  resources?: PlanResource[];
  child_modules?: PlanModule[];
}

interface PlanResource {
  address?: string;
  mode?: string;
  type?: string;
  values?: Record<string, unknown>;
}

interface RetailPriceItem {
  currencyCode?: string;
  retailPrice?: number;
  armSkuName?: string;
  skuName?: string;
  meterName?: string;
  productName?: string;
  unitOfMeasure?: string;
  type?: string;
  isPrimaryMeterRegion?: boolean;
  tierMinimumUnits?: number;
}

interface RetailPriceResponse {
  Items?: RetailPriceItem[];
}

export async function estimateTerraformPlanCosts(
  planJson: string,
  options: {
    currency?: string;
    fetchImpl?: typeof fetch;
    assumptions?: CostAssumptions;
  } = {},
): Promise<PlanCostAnalysis> {
  const assumptions = options.assumptions ?? defaultCostAssumptions();
  const currency = (
    options.currency ??
    assumptions.currency
  ).toUpperCase();
  const fetchImpl = options.fetchImpl ?? fetch;
  const plan = JSON.parse(planJson) as TerraformPlan;
  const resources = flattenModule(plan.planned_values?.root_module);
  const resourcesById = buildResourceIdIndex(resources);
  const storageChildren = groupStorageChildren(resources);
  const billableResources = resources.filter(
    (resource) => !isNoDirectCost(resource.type as string),
  );
  const estimates = await Promise.all(
    billableResources.map((resource) =>
      estimateResource(
        resource,
        resourcesById,
        storageChildren,
        assumptions,
        currency,
        fetchImpl,
      ),
    ),
  );

  return {
    currency,
    knownMonthlyCost: roundMoney(
      estimates.reduce(
        (total, estimate) => total + (estimate.monthlyCost ?? 0),
        0,
      ),
    ),
    estimatedResources: estimates.filter(
      (estimate) => estimate.status === "estimated",
    ).length,
    partialResources: estimates.filter(
      (estimate) => estimate.status === "partial",
    ).length,
    usageDependentResources: estimates.filter(
      (estimate) => estimate.status === "usage-required",
    ).length,
    unavailableResources: estimates.filter(
      (estimate) => estimate.status === "unavailable",
    ).length,
    omittedResources: resources.length - billableResources.length,
    hoursPerMonth: HOURS_PER_MONTH,
    generatedAt: new Date().toISOString(),
    source: PRICING_SOURCE,
    resources: estimates,
  };
}

function flattenModule(module?: PlanModule): PlanResource[] {
  if (!module) {
    return [];
  }
  return [
    ...(module.resources ?? []).filter(
      (resource) =>
        resource.mode !== "data" &&
        resource.address &&
        resource.type,
    ),
    ...(module.child_modules ?? []).flatMap(flattenModule),
  ];
}

function buildResourceIdIndex(
  resources: PlanResource[],
): Map<string, PlanResource> {
  const result = new Map<string, PlanResource>();
  for (const resource of resources) {
    const id = resource.values?.id;
    if (typeof id === "string" && id) {
      result.set(id, resource);
    }
  }
  return result;
}

function groupStorageChildren(
  resources: PlanResource[],
): Map<string, PlanResource[]> {
  const result = new Map<string, PlanResource[]>();
  for (const resource of resources) {
    if (resource.type !== "azurerm_storage_blob") {
      continue;
    }
    const accountName = stringValue(
      resource.values?.storage_account_name,
    );
    if (!accountName) {
      continue;
    }
    result.set(accountName, [
      ...(result.get(accountName) ?? []),
      resource,
    ]);
  }
  return result;
}

async function estimateResource(
  resource: PlanResource,
  resourcesById: Map<string, PlanResource>,
  storageChildren: Map<string, PlanResource[]>,
  assumptions: CostAssumptions,
  currency: string,
  fetchImpl: typeof fetch,
): Promise<ResourceCostEstimate> {
  const type = resource.type as string;
  const values = resource.values ?? {};
  const region = inheritedRegion(resource, resourcesById);
  const zones = stringArray(values.zones);
  const factors: Record<string, string> = {
    region: region ?? "not resolved",
    ...(zones.length > 0 ? { zones: zones.join(", ") } : {}),
  };

  if (
    [
      "azurerm_linux_virtual_machine",
      "azurerm_windows_virtual_machine",
      "azurerm_linux_virtual_machine_scale_set",
      "azurerm_windows_virtual_machine_scale_set",
    ].includes(type)
  ) {
    const sku = stringValue(values.size) ?? stringValue(values.sku);
    const quantity = numberValue(values.instances) ?? 1;
    factors.size = sku ?? "not resolved";
    factors.quantity = String(quantity);
    factors.os = type.includes("windows") ? "Windows" : "Linux";
    return fixedHourlyEstimate(
      resource,
      factors,
      currency,
      region,
      sku,
      quantity,
      {
        serviceName: "Virtual Machines",
        skuField: "armSkuName",
        productIncludes: type.includes("windows") ? "Windows" : undefined,
        productExcludes: type.includes("windows") ? undefined : "Windows",
      },
      fetchImpl,
    );
  }

  if (type === "azurerm_service_plan") {
    const sku = stringValue(values.sku_name);
    const quantity = numberValue(values.worker_count) ?? 1;
    const os = stringValue(values.os_type);
    factors.sku = sku ?? "not resolved";
    factors.quantity = String(quantity);
    factors.os = os ?? "not resolved";
    factors.zoneBalancing =
      values.zone_balancing_enabled === true ? "enabled" : "disabled";
    return fixedHourlyEstimate(
      resource,
      factors,
      currency,
      region,
      sku,
      quantity,
      {
        serviceName: "Azure App Service",
        skuField: "skuName",
        productIncludes: os?.toLowerCase() === "linux" ? "Linux" : undefined,
      },
      fetchImpl,
    );
  }

  if (type === "azurerm_storage_account") {
    const accountName = stringValue(values.name);
    return storageEstimate(
      resource,
      storageChildren.get(accountName ?? "") ?? [],
      assumptions,
      currency,
      region,
      fetchImpl,
    );
  }

  addCommonSkuFactors(values, factors);
  if (isUsageDependent(type)) {
    return baseEstimate(
      resource,
      "usage-required",
      currency,
      factors,
      usageNote(type),
    );
  }
  return baseEstimate(
    resource,
    "unavailable",
    currency,
    factors,
    "No reliable retail-meter mapping is available for this Terraform resource. It is excluded from the known monthly subtotal.",
  );
}

async function storageEstimate(
  resource: PlanResource,
  blobs: PlanResource[],
  assumptions: CostAssumptions,
  currency: string,
  region: string | undefined,
  fetchImpl: typeof fetch,
): Promise<ResourceCostEstimate> {
  const values = resource.values ?? {};
  const tier = stringValue(values.access_tier) ?? "Hot";
  const replication =
    stringValue(values.account_replication_type) ?? "LRS";
  const plannedBytes = blobs.reduce(
    (total, blob) => total + plannedBlobBytes(blob),
    0,
  );
  const plannedGb = plannedBytes / 1024 ** 3;
  const storageGb = Math.max(
    assumptions.monthlyStorageGb,
    plannedGb,
  );
  const factors: Record<string, string> = {
    region: region ?? "not resolved",
    tier,
    replication,
    storageGb: formatQuantity(storageGb),
    readOperations: formatInteger(assumptions.monthlyReadOperations),
    writeOperations: formatInteger(assumptions.monthlyWriteOperations),
    egressGb: formatQuantity(assumptions.monthlyEgressGb),
    plannedBlobs: String(blobs.length),
    plannedContent: formatBytes(plannedBytes),
  };
  if (!region) {
    return baseEstimate(
      resource,
      "unavailable",
      currency,
      factors,
      "The storage account region must be resolved before Microsoft retail meters can be selected.",
    );
  }

  try {
    const skuName = `${tier} ${replication}`;
    const filter = [
      "serviceName eq 'Storage'",
      `armRegionName eq '${escapeOData(region)}'`,
      "productName eq 'General Block Blob v2'",
      `skuName eq '${escapeOData(skuName)}'`,
      "priceType eq 'Consumption'",
    ].join(" and ");
    const url = new URL(PRICING_SOURCE);
    url.searchParams.set("currencyCode", currency);
    url.searchParams.set("$filter", filter);
    const response = await fetchImpl(url, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = (await response.json()) as RetailPriceResponse;
    const items = payload.Items ?? [];
    const dataMeter = baseTierMeter(
      items,
      `${tier} ${replication} Data Stored`,
      "1 GB/Month",
    );
    const readMeter = baseTierMeter(
      items,
      `${tier} Read Operations`,
      "10K",
    );
    const writeMeter = baseTierMeter(
      items,
      `${tier} ${replication} Write Operations`,
      "10K",
    );
    if (
      typeof dataMeter?.retailPrice !== "number" ||
      typeof readMeter?.retailPrice !== "number" ||
      typeof writeMeter?.retailPrice !== "number"
    ) {
      return baseEstimate(
        resource,
        "unavailable",
        currency,
        factors,
        `Microsoft Retail Prices returned incomplete ${skuName} blob meters for this region.`,
      );
    }
    const monthlyCost =
      storageGb * dataMeter.retailPrice +
      (assumptions.monthlyReadOperations / 10000) *
        readMeter.retailPrice +
      (assumptions.monthlyWriteOperations / 10000) *
        writeMeter.retailPrice;
    const partial = assumptions.monthlyEgressGb > 0;
    return {
      ...baseEstimate(
        resource,
        partial ? "partial" : "estimated",
        dataMeter.currencyCode ?? currency,
        factors,
        partial
          ? "Storage capacity and blob operations are priced. Egress is shown as an assumption but excluded because the applicable bandwidth route and destination cannot be inferred from Terraform."
          : "Storage account, static website, and planned blobs are grouped into one estimate. Capacity and blob operations use the configured monthly assumptions.",
      ),
      monthlyCost: roundMoney(monthlyCost),
      unitPrice: dataMeter.retailPrice,
      unitOfMeasure: dataMeter.unitOfMeasure,
      quantity: storageGb,
    };
  } catch (error) {
    return baseEstimate(
      resource,
      "unavailable",
      currency,
      factors,
      `Live Microsoft storage pricing was unavailable: ${error instanceof Error ? error.message : String(error)}.`,
    );
  }
}

async function fixedHourlyEstimate(
  resource: PlanResource,
  factors: Record<string, string>,
  currency: string,
  region: string | undefined,
  sku: string | undefined,
  quantity: number,
  query: {
    serviceName: string;
    skuField: "armSkuName" | "skuName";
    productIncludes?: string;
    productExcludes?: string;
  },
  fetchImpl: typeof fetch,
): Promise<ResourceCostEstimate> {
  if (!region || !sku) {
    return baseEstimate(
      resource,
      "unavailable",
      currency,
      factors,
      "Region and SKU/size must be resolved in the Terraform plan before a retail price can be selected.",
    );
  }
  try {
    const filter = [
      `serviceName eq '${escapeOData(query.serviceName)}'`,
      `armRegionName eq '${escapeOData(region)}'`,
      `${query.skuField} eq '${escapeOData(sku)}'`,
      "priceType eq 'Consumption'",
    ].join(" and ");
    const url = new URL(PRICING_SOURCE);
    url.searchParams.set("currencyCode", currency);
    url.searchParams.set("$filter", filter);
    const response = await fetchImpl(url, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = (await response.json()) as RetailPriceResponse;
    const meter = (payload.Items ?? []).find(
      (item) =>
        item.type === "Consumption" &&
        item.isPrimaryMeterRegion !== false &&
        item.unitOfMeasure === "1 Hour" &&
        !containsAny(item, ["Spot", "Low Priority"]) &&
        (!query.productIncludes ||
          item.productName?.includes(query.productIncludes)) &&
        (!query.productExcludes ||
          !item.productName?.includes(query.productExcludes)),
    );
    if (typeof meter?.retailPrice !== "number") {
      return baseEstimate(
        resource,
        "unavailable",
        currency,
        factors,
        "Microsoft Retail Prices returned no matching primary hourly consumption meter for this region and SKU.",
      );
    }
    const monthlyCost = meter.retailPrice * HOURS_PER_MONTH * quantity;
    return {
      ...baseEstimate(
        resource,
        "estimated",
        meter.currencyCode ?? currency,
        factors,
        `Retail list-price estimate using ${HOURS_PER_MONTH} hours/month. Availability zones are considered as a deployment factor; no separate zone meter was returned.`,
      ),
      monthlyCost: roundMoney(monthlyCost),
      unitPrice: meter.retailPrice,
      unitOfMeasure: meter.unitOfMeasure,
      quantity,
    };
  } catch (error) {
    return baseEstimate(
      resource,
      "unavailable",
      currency,
      factors,
      `Live Microsoft retail pricing was unavailable: ${error instanceof Error ? error.message : String(error)}.`,
    );
  }
}

function inheritedRegion(
  resource: PlanResource,
  resourcesById: Map<string, PlanResource>,
): string | undefined {
  const own = stringValue(resource.values?.location);
  if (own) {
    return own.toLowerCase().replaceAll(" ", "");
  }
  for (const key of ["server_id", "service_plan_id", "storage_account_id"]) {
    const parentId = stringValue(resource.values?.[key]);
    const parent = parentId ? resourcesById.get(parentId) : undefined;
    const location = stringValue(parent?.values?.location);
    if (location) {
      return location.toLowerCase().replaceAll(" ", "");
    }
  }
  return undefined;
}

function addCommonSkuFactors(
  values: Record<string, unknown>,
  factors: Record<string, string>,
): void {
  for (const key of [
    "sku",
    "sku_name",
    "size",
    "tier",
    "account_tier",
    "account_replication_type",
    "access_tier",
    "max_size_gb",
    "capacity",
    "zone_redundant",
  ]) {
    const value = values[key];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      factors[key] = String(value);
    }
  }
}

function baseTierMeter(
  items: RetailPriceItem[],
  meterName: string,
  unitOfMeasure: string,
): RetailPriceItem | undefined {
  return items.find(
    (item) =>
      item.type === "Consumption" &&
      item.meterName === meterName &&
      item.unitOfMeasure === unitOfMeasure &&
      (item.tierMinimumUnits ?? 0) === 0,
  );
}

function plannedBlobBytes(resource: PlanResource): number {
  const sourceContent = stringValue(resource.values?.source_content);
  if (sourceContent !== undefined) {
    return Buffer.byteLength(sourceContent, "utf8");
  }
  const size = numberValue(resource.values?.size);
  return size && size > 0 ? size : 0;
}

function isNoDirectCost(type: string): boolean {
  return [
    "azurerm_resource_group",
    "azurerm_storage_account_static_website",
    "azurerm_storage_blob",
    "azurerm_role_assignment",
    "azurerm_user_assigned_identity",
    "azurerm_monitor_diagnostic_setting",
    "azurerm_private_dns_zone_virtual_network_link",
  ].includes(type);
}

function isUsageDependent(type: string): boolean {
  return [
    "azurerm_storage_account",
    "azurerm_storage_blob",
    "azurerm_storage_share",
    "azurerm_cosmosdb_account",
    "azurerm_log_analytics_workspace",
    "azurerm_application_insights",
    "azurerm_cognitive_account",
    "azurerm_mssql_database",
    "azurerm_postgresql_flexible_server",
    "azurerm_mysql_flexible_server",
    "azurerm_kubernetes_cluster",
    "azurerm_public_ip",
    "azurerm_nat_gateway",
  ].includes(type);
}

function usageNote(type: string): string {
  if (type.startsWith("azurerm_storage_")) {
    return "Storage cost depends on GB-month by service, redundancy, access tier, operations, retrieval, replication, and egress. Add usage assumptions before treating it as a monthly total.";
  }
  return "This service has consumption, capacity, data-transfer, or add-on meters that cannot be derived completely from Terraform configuration alone.";
}

function baseEstimate(
  resource: PlanResource,
  status: ResourceCostEstimate["status"],
  currency: string,
  factors: Record<string, string>,
  note: string,
): ResourceCostEstimate {
  return {
    address: resource.address as string,
    resourceType: resource.type as string,
    status,
    currency,
    factors,
    note,
  };
}

function containsAny(
  item: RetailPriceItem,
  terms: string[],
): boolean {
  const value = [
    item.productName,
    item.skuName,
    item.meterName,
  ].join(" ");
  return terms.some((term) => value.includes(term));
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function escapeOData(value: string): string {
  return value.replaceAll("'", "''");
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatQuantity(value: number): string {
  return value.toLocaleString("en", { maximumFractionDigits: 3 });
}

function formatInteger(value: number): string {
  return Math.round(value).toLocaleString("en");
}

function formatBytes(value: number): string {
  if (value === 0) {
    return "not available in plan";
  }
  if (value < 1024) {
    return `${value} B`;
  }
  return `${(value / 1024).toFixed(1)} KB`;
}

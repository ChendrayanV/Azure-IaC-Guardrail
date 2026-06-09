export type SketchServiceType = string;

export interface SketchNode {
  id: string;
  serviceType: SketchServiceType;
  name: string;
  region: string;
  x: number;
  y: number;
}

export interface SketchConnection {
  id: string;
  source: string;
  target: string;
  bidirectional?: boolean;
}

export interface InfraSketch {
  version: 1;
  nodes: SketchNode[];
  connections: SketchConnection[];
}

export const SKETCH_SERVICES: Array<{
  type: SketchServiceType;
  title: string;
  short: string;
  color: string;
  category: string;
  description: string;
}> = [
  service("resource_group", "Resource Group", "RG", "#0078d4", "Management + Governance", "RESOURCE CONTAINER"),
  service("azure_advisor", "Azure Advisor", "ADV", "#38a169", "Management + Governance", "OPTIMIZATION RECOMMENDATIONS"),
  service("azure_arc", "Azure Arc", "ARC", "#0078d4", "Hybrid + Multicloud", "HYBRID MANAGEMENT"),
  service("azure_policy", "Azure Policy", "POL", "#7f56d9", "Management + Governance", "GOVERNANCE AND COMPLIANCE"),
  service("automation_account", "Automation Accounts", "AUT", "#2563eb", "Management + Governance", "PROCESS AUTOMATION"),
  service("cost_management", "Cost Management", "COST", "#16a34a", "Management + Governance", "COST OPTIMIZATION"),
  service("managed_application", "Managed Applications", "MA", "#0078d4", "Management + Governance", "MANAGED SOLUTIONS"),
  service("service_health", "Service Health", "HLTH", "#16a34a", "Management + Governance", "SERVICE STATUS"),
  service("app_configuration", "App Configuration", "CFG", "#2563eb", "Developer Tools", "CENTRALIZED APP SETTINGS"),
  service("application_insights", "Application Insights", "AI", "#7c3aed", "DevOps", "APPLICATION MONITORING"),
  service("azure_devops", "Azure DevOps", "ADO", "#0078d4", "DevOps", "PLAN BUILD AND RELEASE"),
  service("dev_box", "Microsoft Dev Box", "DEV", "#2563eb", "Developer Tools", "CLOUD DEVELOPER WORKSTATIONS"),
  service("load_testing", "Azure Load Testing", "LOAD", "#e11d48", "DevOps", "PERFORMANCE TESTING"),
  service("managed_grafana", "Managed Grafana", "GRAF", "#f97316", "DevOps", "OBSERVABILITY DASHBOARDS"),
  service("monitor", "Azure Monitor", "MON", "#2563eb", "DevOps", "FULL STACK MONITORING"),
  service("log_analytics", "Log Analytics", "LOG", "#ca8a04", "DevOps", "LOG QUERY AND ANALYSIS"),
  service("machine_learning", "Machine Learning", "ML", "#0078d4", "AI + Machine Learning", "MODEL DEVELOPMENT"),
  service("ai_foundry", "Azure AI Foundry", "AIF", "#7c3aed", "AI + Machine Learning", "GENERATIVE AI PLATFORM"),
  service("ai_search", "AI Search", "AIS", "#0284c7", "AI + Machine Learning", "AI ENRICHED SEARCH"),
  service("bot_service", "Azure Bot Service", "BOT", "#2563eb", "AI + Machine Learning", "CONVERSATIONAL AI"),
  service("computer_vision", "AI Vision", "VIS", "#7c3aed", "AI + Machine Learning", "IMAGE AND VIDEO ANALYSIS"),
  service("content_safety", "AI Content Safety", "SAFE", "#dc2626", "AI + Machine Learning", "CONTENT MODERATION"),
  service("document_intelligence", "Document Intelligence", "DOC", "#2563eb", "AI + Machine Learning", "DOCUMENT EXTRACTION"),
  service("language_service", "AI Language", "LANG", "#7c3aed", "AI + Machine Learning", "NATURAL LANGUAGE AI"),
  service("openai_service", "Azure OpenAI", "AOAI", "#0f766e", "AI + Machine Learning", "GENERATIVE AI MODELS"),
  service("speech_service", "AI Speech", "SPCH", "#0284c7", "AI + Machine Learning", "SPEECH TO TEXT"),
  service("translator", "AI Translator", "TR", "#2563eb", "AI + Machine Learning", "LANGUAGE TRANSLATION"),
  service("analysis_services", "Analysis Services", "AS", "#2563eb", "Analytics", "ENTERPRISE SEMANTIC MODELS"),
  service("data_explorer", "Data Explorer", "ADX", "#0078d4", "Analytics", "REAL TIME ANALYTICS"),
  service("data_factory", "Data Factory", "ADF", "#2563eb", "Analytics", "DATA INTEGRATION"),
  service("databricks", "Azure Databricks", "ADB", "#e11d48", "Analytics", "LAKEHOUSE ANALYTICS"),
  service("event_hubs", "Event Hubs", "EH", "#7c3aed", "Analytics", "STREAMING INGESTION"),
  service("hdinsight", "HDInsight", "HDI", "#2563eb", "Analytics", "OPEN SOURCE ANALYTICS"),
  service("power_bi_embedded", "Power BI Embedded", "PBI", "#eab308", "Analytics", "EMBEDDED ANALYTICS"),
  service("stream_analytics", "Stream Analytics", "ASA", "#0284c7", "Analytics", "REAL TIME STREAM PROCESSING"),
  service("synapse_analytics", "Synapse Analytics", "SYN", "#2563eb", "Analytics", "UNIFIED DATA ANALYTICS"),
  service("app_service", "App Services", "APP", "#2563eb", "Compute", "WEB HOSTING"),
  service("service_plan", "App Service Plan", "ASP", "#db2777", "Compute", "APP SERVICE COMPUTE"),
  service("web_app", "Web App", "WEB", "#e11d48", "Compute", "MANAGED WEB APPLICATION"),
  service("batch", "Azure Batch", "BAT", "#2563eb", "Compute", "ON-DEMAND VM CLUSTERS"),
  service("kubernetes_service", "Azure Kubernetes Service", "AKS", "#7c3aed", "Compute", "MANAGED KUBERNETES"),
  service("spring_apps", "Azure Spring Apps", "SPR", "#16a34a", "Compute", "SPRING APP HOSTING"),
  service("virtual_desktop", "Azure Virtual Desktop", "AVD", "#0284c7", "Compute", "VIRTUAL DESKTOP INFRASTRUCTURE"),
  service("vmware_solution", "Azure VMware Solution", "AVS", "#2563eb", "Compute", "VMWARE VSPHERE CLUSTERS"),
  service("container_instances", "Container Instances", "ACI", "#7c3aed", "Compute", "ON-DEMAND CONTAINERS"),
  service("dedicated_host", "Dedicated Host", "HOST", "#2563eb", "Compute", "PHYSICAL SERVERS"),
  service("functions", "Functions", "FUNC", "#f59e0b", "Compute", "SERVERLESS COMPUTE"),
  service("virtual_machine", "Virtual Machine", "VM", "#2563eb", "Compute", "ON-DEMAND VIRTUAL MACHINES"),
  service("vm_scale_sets", "Virtual Machine Scale Sets", "VMSS", "#2563eb", "Compute", "AUTOSCALING VIRTUAL MACHINES"),
  service("container_apps", "Container Apps", "ACA", "#7c3aed", "Containers", "SERVERLESS CONTAINERS"),
  service("container_registry", "Container Registry", "ACR", "#ea580c", "Containers", "CONTAINER IMAGE REGISTRY"),
  service("service_fabric", "Service Fabric", "SF", "#2563eb", "Containers", "MICROSERVICES PLATFORM"),
  service("cosmos_db", "Azure Cosmos DB", "COS", "#2563eb", "Databases", "GLOBALLY DISTRIBUTED NOSQL"),
  service("database_mysql", "Azure Database for MySQL", "MYSQL", "#0284c7", "Databases", "MANAGED MYSQL"),
  service("database_postgresql", "Azure Database for PostgreSQL", "PG", "#2563eb", "Databases", "MANAGED POSTGRESQL"),
  service("managed_instance", "SQL Managed Instance", "MI", "#0284c7", "Databases", "MANAGED SQL INSTANCE"),
  service("redis_cache", "Azure Managed Redis", "REDIS", "#dc2626", "Databases", "IN-MEMORY DATA STORE"),
  service("sql_server", "SQL Server", "SQL", "#0891b2", "Databases", "LOGICAL SQL SERVER"),
  service("sql_database", "SQL Database", "DB", "#0e7490", "Databases", "MANAGED RELATIONAL DATABASE"),
  service("api_management", "API Management", "APIM", "#7c3aed", "Integration", "API GATEWAY AND MANAGEMENT"),
  service("event_grid", "Event Grid", "EG", "#2563eb", "Integration", "EVENT ROUTING"),
  service("logic_apps", "Logic Apps", "LA", "#2563eb", "Integration", "WORKFLOW AUTOMATION"),
  service("service_bus", "Service Bus", "SB", "#7c3aed", "Integration", "ENTERPRISE MESSAGING"),
  service("signalr_service", "Azure SignalR Service", "SIG", "#2563eb", "Integration", "REAL TIME WEB MESSAGING"),
  service("communication_services", "Communication Services", "ACS", "#2563eb", "Integration", "VOICE VIDEO AND CHAT"),
  service("entra_domain_services", "Entra Domain Services", "DS", "#2563eb", "Identity", "MANAGED DOMAIN SERVICES"),
  service("entra_external_id", "Entra External ID", "EXT", "#7c3aed", "Identity", "CUSTOMER IDENTITIES"),
  service("entra_id", "Microsoft Entra ID", "ENTRA", "#2563eb", "Identity", "IDENTITY AND ACCESS"),
  service("managed_identity", "Managed Identities", "MI", "#16a34a", "Identity", "WORKLOAD IDENTITY"),
  service("key_vault", "Key Vault", "KV", "#7c3aed", "Security", "SECRETS KEYS AND CERTIFICATES"),
  service("defender_cloud", "Defender for Cloud", "MDC", "#2563eb", "Security", "CLOUD SECURITY POSTURE"),
  service("sentinel", "Microsoft Sentinel", "SENT", "#7c3aed", "Security", "CLOUD NATIVE SIEM"),
  service("ddos_protection", "DDoS Protection", "DDOS", "#dc2626", "Security", "NETWORK ATTACK PROTECTION"),
  service("bastion", "Azure Bastion", "BAS", "#2563eb", "Networking", "SECURE VM ACCESS"),
  service("cdn", "Azure CDN", "CDN", "#0284c7", "Networking", "CONTENT DELIVERY"),
  service("dns", "Azure DNS", "DNS", "#2563eb", "Networking", "DOMAIN NAME HOSTING"),
  service("expressroute", "ExpressRoute", "ER", "#7c3aed", "Networking", "PRIVATE WAN CONNECTIVITY"),
  service("firewall", "Azure Firewall", "FW", "#dc2626", "Networking", "MANAGED NETWORK FIREWALL"),
  service("front_door", "Front Door", "FD", "#2563eb", "Networking", "GLOBAL APPLICATION DELIVERY"),
  service("load_balancer", "Load Balancer", "LB", "#2563eb", "Networking", "LAYER 4 LOAD BALANCING"),
  service("nat_gateway", "NAT Gateway", "NAT", "#0284c7", "Networking", "OUTBOUND CONNECTIVITY"),
  service("network_security_group", "Network Security Group", "NSG", "#dc2626", "Networking", "NETWORK ACCESS CONTROL"),
  service("private_endpoint", "Private Endpoint", "PE", "#16a34a", "Networking", "PRIVATE SERVICE ACCESS"),
  service("public_ip", "Public IP", "PIP", "#0284c7", "Networking", "PUBLIC IP ADDRESS"),
  service("route_table", "Route Table", "UDR", "#2563eb", "Networking", "CUSTOM NETWORK ROUTING"),
  service("subnet", "Subnet", "SNET", "#0284c7", "Networking", "VIRTUAL NETWORK SEGMENT"),
  service("traffic_manager", "Traffic Manager", "TM", "#2563eb", "Networking", "DNS TRAFFIC ROUTING"),
  service("virtual_network", "Virtual Network", "VNET", "#2563eb", "Networking", "PRIVATE CLOUD NETWORK"),
  service("vpn_gateway", "VPN Gateway", "VPN", "#7c3aed", "Networking", "ENCRYPTED HYBRID CONNECTIVITY"),
  service("application_gateway", "Application Gateway", "AGW", "#2563eb", "Networking", "WEB TRAFFIC LOAD BALANCER"),
  service("backup_vault", "Backup Vault", "BKP", "#16a34a", "Storage", "CLOUD DATA PROTECTION"),
  service("data_box", "Azure Data Box", "BOX", "#2563eb", "Storage", "OFFLINE DATA TRANSFER"),
  service("disk_storage", "Disk Storage", "DISK", "#2563eb", "Storage", "BLOCK STORAGE"),
  service("files", "Azure Files", "FILE", "#0284c7", "Storage", "MANAGED FILE SHARES"),
  service("netapp_files", "Azure NetApp Files", "ANF", "#2563eb", "Storage", "ENTERPRISE FILE STORAGE"),
  service("storage_account", "Storage Account", "ST", "#16a34a", "Storage", "DATA LAKE AND OBJECT STORAGE"),
  service("iot_hub", "IoT Hub", "IOT", "#2563eb", "Internet of Things", "DEVICE MESSAGING"),
  service("digital_twins", "Digital Twins", "ADT", "#7c3aed", "Internet of Things", "CONNECTED ENVIRONMENT MODELS"),
  service("iot_central", "IoT Central", "IOTC", "#0284c7", "Internet of Things", "IOT APPLICATION PLATFORM"),
  service("maps", "Azure Maps", "MAP", "#16a34a", "Internet of Things", "GEOSPATIAL SERVICES"),
];

const SERVICE_TYPES = new Set(SKETCH_SERVICES.map((service) => service.type));

function service(
  type: string,
  title: string,
  short: string,
  color: string,
  category: string,
  description: string,
) {
  return { type, title, short, color, category, description };
}

export function normalizeInfraSketch(input: unknown): InfraSketch {
  if (!input || typeof input !== "object") {
    throw new Error("Infrastructure sketch must be an object.");
  }
  const value = input as Record<string, unknown>;
  if (!Array.isArray(value.nodes) || !Array.isArray(value.connections)) {
    throw new Error("Infrastructure sketch requires nodes and connections.");
  }
  const nodes = value.nodes.map((item, index) => normalizeNode(item, index));
  const nodeIds = new Set(nodes.map((node) => node.id));
  if (nodeIds.size !== nodes.length) {
    throw new Error("Infrastructure sketch node IDs must be unique.");
  }
  const connections = value.connections.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Connection ${index + 1} must be an object.`);
    }
    const entry = item as Record<string, unknown>;
    const source = String(entry.source ?? "");
    const target = String(entry.target ?? "");
    if (!nodeIds.has(source) || !nodeIds.has(target) || source === target) {
      throw new Error(`Connection ${index + 1} must link two different nodes.`);
    }
    return {
      id: cleanId(String(entry.id ?? `connection-${index + 1}`)),
      source,
      target,
      ...(entry.bidirectional === true ? { bidirectional: true } : {}),
    };
  });
  return { version: 1, nodes, connections };
}

export function generateTerraformFromSketch(sketch: InfraSketch): string {
  const normalized = normalizeInfraSketch(sketch);
  if (normalized.nodes.length === 0) {
    throw new Error("Add at least one Azure service before generating Terraform.");
  }
  const context = createContext(normalized);
  const needsClientConfig = normalized.nodes.some((node) =>
    ["key_vault", "sql_server"].includes(node.serviceType),
  );
  const generatedResourceGroup = context.resourceGroup
    ? []
    : [
        'resource "azurerm_resource_group" "sketch" {',
        '  name     = "rg-cloud-canvas"',
        `  location = ${JSON.stringify(normalized.nodes[0].region)}`,
        "  tags = {",
        '    managed_by = "terraform"',
        '    source     = "cloud-canvas"',
        "  }",
        "}",
        "",
      ];
  const clientConfig = needsClientConfig
    ? ['data "azurerm_client_config" "current" {}', ""]
    : [];
  const sections = normalized.nodes.map((node) =>
    renderNode(node, normalized, context),
  );
  const networkAssociations = renderNetworkAssociations(normalized, context);
  return [
    "# Generated by Azure IaC Guardrail: Cloud Canvas",
    "# Review names, network ranges, SKUs, and identity settings before deployment.",
    "",
    'terraform {',
    '  required_version = ">= 1.5.0"',
    "",
    "  required_providers {",
    "    azurerm = {",
    '      source  = "hashicorp/azurerm"',
    '      version = "~> 4.0"',
    "    }",
    "  }",
    "}",
    "",
    'provider "azurerm" {',
    "  features {}",
    "}",
    "",
    ...generatedResourceGroup,
    ...clientConfig,
    ...sections,
    ...networkAssociations,
  ].join("\n");
}

function normalizeNode(input: unknown, index: number): SketchNode {
  if (!input || typeof input !== "object") {
    throw new Error(`Node ${index + 1} must be an object.`);
  }
  const value = input as Record<string, unknown>;
  const serviceType = String(value.serviceType ?? "") as SketchServiceType;
  if (!SERVICE_TYPES.has(serviceType)) {
    throw new Error(`Node ${index + 1} has an unsupported Azure service.`);
  }
  const name = String(value.name ?? "").trim();
  const region = String(value.region ?? "uksouth")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "");
  if (!name) {
    throw new Error(`Node ${index + 1} requires a resource name.`);
  }
  return {
    id: cleanId(String(value.id ?? `node-${index + 1}`)),
    serviceType,
    name,
    region,
    x: finiteNumber(value.x, 80),
    y: finiteNumber(value.y, 80),
  };
}

function createContext(sketch: InfraSketch): {
  labels: Map<string, string>;
  resourceGroup?: SketchNode;
} {
  const labels = new Map<string, string>();
  const used = new Set<string>();
  for (const node of sketch.nodes) {
    const base = terraformLabel(node.name || node.serviceType);
    let label = base;
    let suffix = 2;
    while (used.has(label)) {
      label = `${base}_${suffix++}`;
    }
    used.add(label);
    labels.set(node.id, label);
  }
  return {
    labels,
    resourceGroup: sketch.nodes.find(
      (node) => node.serviceType === "resource_group",
    ),
  };
}

function renderNode(
  node: SketchNode,
  sketch: InfraSketch,
  context: ReturnType<typeof createContext>,
): string {
  const label = context.labels.get(node.id) as string;
  const rgReference = context.resourceGroup
    ? `azurerm_resource_group.${context.labels.get(context.resourceGroup.id)}.name`
    : "azurerm_resource_group.sketch.name";
  const locationReference = context.resourceGroup
    ? `azurerm_resource_group.${context.labels.get(context.resourceGroup.id)}.location`
    : "azurerm_resource_group.sketch.location";
  const dependsOn = renderDependsOn(node, sketch, context.labels);
  const tags = `  tags = {\n    managed_by = "terraform"\n    source     = "cloud-canvas"\n  }`;

  switch (node.serviceType) {
    case "resource_group":
      return block("azurerm_resource_group", label, [
        `  name     = ${JSON.stringify(node.name)}`,
        `  location = ${JSON.stringify(node.region)}`,
        tags,
        dependsOn,
      ]);
    case "virtual_network":
      return block("azurerm_virtual_network", label, [
        `  name                = ${JSON.stringify(node.name)}`,
        `  location            = ${locationReference}`,
        `  resource_group_name = ${rgReference}`,
        '  address_space       = ["10.0.0.0/16"]',
        tags,
        dependsOn,
      ]);
    case "subnet": {
      const vnet = connectedNode(node, sketch, "virtual_network") ??
        sketch.nodes.find((candidate) => candidate.serviceType === "virtual_network");
      if (!vnet) {
        return commentOnly(node, "Add and connect a Virtual Network before generating this subnet.");
      }
      return block("azurerm_subnet", label, [
        `  name                 = ${JSON.stringify(node.name)}`,
        `  resource_group_name  = ${rgReference}`,
        `  virtual_network_name = azurerm_virtual_network.${context.labels.get(vnet.id)}.name`,
        '  address_prefixes     = ["10.0.1.0/24"]',
        dependsOn,
      ]);
    }
    case "network_security_group":
      return block("azurerm_network_security_group", label, [
        `  name                = ${JSON.stringify(node.name)}`,
        `  location            = ${locationReference}`,
        `  resource_group_name = ${rgReference}`,
        tags,
        dependsOn,
      ]);
    case "storage_account":
      return block("azurerm_storage_account", label, [
        `  name                            = ${JSON.stringify(storageName(node.name))}`,
        `  location                        = ${locationReference}`,
        `  resource_group_name             = ${rgReference}`,
        '  account_tier                    = "Standard"',
        '  account_replication_type        = "LRS"',
        "  public_network_access_enabled   = false",
        "  shared_access_key_enabled       = false",
        '  min_tls_version                 = "TLS1_2"',
        "  allow_nested_items_to_be_public = false",
        tags,
        dependsOn,
      ]);
    case "key_vault":
      return block("azurerm_key_vault", label, [
        `  name                       = ${JSON.stringify(truncateName(node.name, 24))}`,
        `  location                   = ${locationReference}`,
        `  resource_group_name        = ${rgReference}`,
        "  tenant_id                  = data.azurerm_client_config.current.tenant_id",
        '  sku_name                   = "standard"',
        "  enable_rbac_authorization  = true",
        "  public_network_access_enabled = false",
        "  purge_protection_enabled   = true",
        tags,
        dependsOn,
      ]);
    case "service_plan":
      return block("azurerm_service_plan", label, [
        `  name                = ${JSON.stringify(node.name)}`,
        `  location            = ${locationReference}`,
        `  resource_group_name = ${rgReference}`,
        '  os_type             = "Linux"',
        '  sku_name            = "P1v3"',
        tags,
        dependsOn,
      ]);
    case "web_app": {
      const plan = connectedNode(node, sketch, "service_plan") ??
        sketch.nodes.find((candidate) => candidate.serviceType === "service_plan");
      if (!plan) {
        return commentOnly(node, "Add and connect an App Service Plan before generating this web app.");
      }
      return block("azurerm_linux_web_app", label, [
        `  name                = ${JSON.stringify(node.name)}`,
        `  location            = ${locationReference}`,
        `  resource_group_name = ${rgReference}`,
        `  service_plan_id     = azurerm_service_plan.${context.labels.get(plan.id)}.id`,
        "  https_only          = true",
        "  public_network_access_enabled = false",
        "",
        "  identity {",
        '    type = "SystemAssigned"',
        "  }",
        "",
        "  site_config {}",
        tags,
        dependsOn,
      ]);
    }
    case "sql_server":
      return block("azurerm_mssql_server", label, [
        `  name                          = ${JSON.stringify(node.name)}`,
        `  location                      = ${locationReference}`,
        `  resource_group_name           = ${rgReference}`,
        '  version                       = "12.0"',
        "  public_network_access_enabled = false",
        '  minimum_tls_version           = "1.2"',
        "  azuread_administrator {",
        '    login_username = "current-terraform-principal"',
        "    object_id      = data.azurerm_client_config.current.object_id",
        "  }",
        tags,
        dependsOn,
      ]);
    case "sql_database": {
      const server = connectedNode(node, sketch, "sql_server") ??
        sketch.nodes.find((candidate) => candidate.serviceType === "sql_server");
      if (!server) {
        return commentOnly(node, "Add and connect a SQL Server before generating this database.");
      }
      return block("azurerm_mssql_database", label, [
        `  name      = ${JSON.stringify(node.name)}`,
        `  server_id = azurerm_mssql_server.${context.labels.get(server.id)}.id`,
        '  sku_name  = "S0"',
        "  zone_redundant = false",
        tags,
        dependsOn,
      ]);
    }
    case "container_registry":
      return block("azurerm_container_registry", label, [
        `  name                          = ${JSON.stringify(alphaNumeric(node.name))}`,
        `  location                      = ${locationReference}`,
        `  resource_group_name           = ${rgReference}`,
        '  sku                           = "Premium"',
        "  admin_enabled                 = false",
        "  public_network_access_enabled = false",
        tags,
        dependsOn,
      ]);
    case "log_analytics":
      return block("azurerm_log_analytics_workspace", label, [
        `  name                = ${JSON.stringify(node.name)}`,
        `  location            = ${locationReference}`,
        `  resource_group_name = ${rgReference}`,
        '  sku                 = "PerGB2018"',
        "  retention_in_days   = 30",
        tags,
        dependsOn,
      ]);
    default:
      return commentOnly(
        node,
        "This service is included in the architecture diagram but does not yet have a generated Terraform template.",
      );
  }
}

function renderNetworkAssociations(
  sketch: InfraSketch,
  context: ReturnType<typeof createContext>,
): string[] {
  const rendered = new Set<string>();
  const associations: string[] = [];
  for (const connection of sketch.connections) {
    const source = sketch.nodes.find((node) => node.id === connection.source);
    const target = sketch.nodes.find((node) => node.id === connection.target);
    if (!source || !target) {
      continue;
    }
    const subnet =
      source.serviceType === "subnet"
        ? source
        : target.serviceType === "subnet"
          ? target
          : undefined;
    const networkSecurityGroup =
      source.serviceType === "network_security_group"
        ? source
        : target.serviceType === "network_security_group"
          ? target
          : undefined;
    if (!subnet || !networkSecurityGroup) {
      continue;
    }
    const associationKey = `${subnet.id}:${networkSecurityGroup.id}`;
    if (rendered.has(associationKey)) {
      continue;
    }
    rendered.add(associationKey);
    const subnetLabel = context.labels.get(subnet.id) as string;
    const networkSecurityGroupLabel = context.labels.get(
      networkSecurityGroup.id,
    ) as string;
    associations.push(
      block(
        "azurerm_subnet_network_security_group_association",
        `${subnetLabel}_${networkSecurityGroupLabel}`,
        [
          `  subnet_id                 = azurerm_subnet.${subnetLabel}.id`,
          `  network_security_group_id = azurerm_network_security_group.${networkSecurityGroupLabel}.id`,
        ],
      ),
    );
  }
  return associations;
}

function renderDependsOn(
  node: SketchNode,
  sketch: InfraSketch,
  labels: Map<string, string>,
): string {
  const dependencies = sketch.connections
    .filter(
      (connection) =>
        connection.source === node.id ||
        (connection.bidirectional === true && connection.target === node.id),
    )
    .map((connection) =>
      sketch.nodes.find((item) =>
        connection.source === node.id
          ? item.id === connection.target
          : item.id === connection.source,
      ),
    )
    .filter((item): item is SketchNode => item !== undefined)
    .map((item) => terraformAddress(item, labels.get(item.id) as string))
    .filter((address): address is string => address !== undefined);
  return dependencies.length > 0
    ? `  depends_on = [${[...new Set(dependencies)].join(", ")}]`
    : "";
}

function connectedNode(
  node: SketchNode,
  sketch: InfraSketch,
  serviceType: SketchServiceType,
): SketchNode | undefined {
  const connectedIds = sketch.connections.flatMap((connection) =>
    connection.source === node.id
      ? [connection.target]
      : connection.target === node.id
        ? [connection.source]
        : [],
  );
  return sketch.nodes.find(
    (candidate) =>
      connectedIds.includes(candidate.id) &&
      candidate.serviceType === serviceType,
  );
}

function terraformAddress(
  node: SketchNode,
  label: string,
): string | undefined {
  const type: Record<string, string> = {
    resource_group: "azurerm_resource_group",
    virtual_network: "azurerm_virtual_network",
    subnet: "azurerm_subnet",
    network_security_group: "azurerm_network_security_group",
    storage_account: "azurerm_storage_account",
    key_vault: "azurerm_key_vault",
    service_plan: "azurerm_service_plan",
    web_app: "azurerm_linux_web_app",
    sql_server: "azurerm_mssql_server",
    sql_database: "azurerm_mssql_database",
    container_registry: "azurerm_container_registry",
    log_analytics: "azurerm_log_analytics_workspace",
  };
  const resourceType = type[node.serviceType];
  return resourceType ? `${resourceType}.${label}` : undefined;
}

function block(type: string, label: string, lines: string[]): string {
  return [
    `resource "${type}" "${label}" {`,
    ...lines.filter((line) => line !== ""),
    "}",
    "",
  ].join("\n");
}

function commentOnly(node: SketchNode, message: string): string {
  return [
    `# ${node.name} (${node.serviceType}) was not generated.`,
    `# ${message}`,
    "",
  ].join("\n");
}

function terraformLabel(value: string): string {
  const result = value
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return /^[a-z_]/.test(result) ? result || "resource" : `resource_${result}`;
}

function storageName(value: string): string {
  return truncateName(alphaNumeric(value).toLowerCase(), 24).padEnd(3, "0");
}

function alphaNumeric(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "");
}

function truncateName(value: string, length: number): string {
  return value.slice(0, length);
}

function cleanId(value: string): string {
  const result = value.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!result) {
    throw new Error("Sketch IDs must contain letters or numbers.");
  }
  return result;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

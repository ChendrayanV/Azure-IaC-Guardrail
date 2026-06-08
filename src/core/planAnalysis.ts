import type {
  ArchitectureEdge,
  ArchitectureNode,
  BlastRadiusItem,
  ChangeAction,
  Finding,
  PlanAnalysis,
} from "../types";

interface TerraformPlan {
  planned_values?: { root_module?: PlanModule };
  resource_changes?: PlanChange[];
}

interface PlanModule {
  resources?: PlanResource[];
  child_modules?: PlanModule[];
}

interface PlanResource {
  address?: string;
  mode?: string;
  type?: string;
  name?: string;
  values?: Record<string, unknown>;
}

interface PlanChange {
  address?: string;
  mode?: string;
  type?: string;
  name?: string;
  change?: {
    actions?: string[];
    before?: unknown;
    after?: unknown;
  };
}

export function analyzeTerraformPlan(
  planJson: string,
  findings: Finding[],
): PlanAnalysis {
  const plan = JSON.parse(planJson) as TerraformPlan;
  const resources = flattenModule(plan.planned_values?.root_module);
  const changes = new Map(
    (plan.resource_changes ?? [])
      .filter((change) => change.mode !== "data" && change.address)
      .map((change) => [
        change.address as string,
        normalizeAction(change.change?.actions ?? []),
      ]),
  );
  const failedByAddress = new Map<string, Finding[]>();
  for (const finding of findings.filter(
    (item) => item.outcome === "noncompliant",
  )) {
    const address =
      finding.resource.address ??
      `${finding.resource.type}.${finding.resource.name}`;
    failedByAddress.set(address, [
      ...(failedByAddress.get(address) ?? []),
      finding,
    ]);
  }

  const knownTargets = buildTargetIndex(resources);
  const edges = collectEdges(resources, knownTargets);
  const nodes = resources.map((resource) =>
    createNode(
      resource,
      changes.get(resource.address as string) ?? "no-op",
      failedByAddress.get(resource.address as string) ?? [],
    ),
  );
  const blastRadius = createBlastRadius(nodes, edges, failedByAddress);
  return {
    nodes,
    edges,
    changes: countChanges(nodes),
    blastRadius,
    riskScore: calculateRiskScore(blastRadius),
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
        resource.type &&
        resource.name,
    ),
    ...(module.child_modules ?? []).flatMap(flattenModule),
  ];
}

function normalizeAction(actions: string[]): ChangeAction {
  if (actions.includes("delete") && actions.includes("create")) {
    return "replace";
  }
  const action = actions[0];
  return ["create", "update", "delete", "no-op", "read"].includes(action)
    ? (action as ChangeAction)
    : "no-op";
}

function buildTargetIndex(resources: PlanResource[]): Map<string, string> {
  const targets = new Map<string, string>();
  for (const resource of resources) {
    const address = resource.address as string;
    targets.set(address, address);
    for (const [key, value] of Object.entries(resource.values ?? {})) {
      if (
        ["id", "resource_id", "principal_id"].includes(key) &&
        typeof value === "string" &&
        value
      ) {
        targets.set(value, address);
      }
    }
  }
  return targets;
}

function collectEdges(
  resources: PlanResource[],
  targets: Map<string, string>,
): ArchitectureEdge[] {
  const edges = new Map<string, ArchitectureEdge>();
  for (const resource of resources) {
    const source = resource.address as string;
    walkValues(resource.values ?? {}, "", (path, value) => {
      if (typeof value !== "string") {
        return;
      }
      const target = targets.get(value);
      if (!target || target === source) {
        return;
      }
      const label = path.split(".").at(-1) ?? "reference";
      edges.set(`${source}|${target}|${label}`, { source, target, label });
    });
  }
  return [...edges.values()];
}

function walkValues(
  value: unknown,
  path: string,
  visit: (path: string, value: unknown) => void,
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      walkValues(item, `${path}.${index}`, visit),
    );
    return;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) =>
      walkValues(item, path ? `${path}.${key}` : key, visit),
    );
    return;
  }
  visit(path, value);
}

function createNode(
  resource: PlanResource,
  action: ChangeAction,
  failures: Finding[],
): ArchitectureNode {
  const values = resource.values ?? {};
  const publicExposure = isPublic(values);
  const risk =
    failures.some((finding) => finding.control.severity === "error") ||
    (publicExposure && ["create", "update", "replace"].includes(action))
      ? "high"
      : failures.length > 0 || ["delete", "replace"].includes(action)
        ? "medium"
        : action === "create" || action === "update"
          ? "low"
          : "none";
  return {
    address: resource.address as string,
    type: resource.type as string,
    name: resource.name as string,
    service: serviceName(resource.type as string),
    changeAction: action,
    risk,
    publicExposure,
  };
}

function isPublic(values: Record<string, unknown>): boolean {
  return (
    values.public_network_access_enabled === true ||
    values.public_network_access === "Enabled" ||
    values.network_access_type === "Public" ||
    values.public_ip_address_id != null ||
    values.default_action === "Allow" ||
    values.ip_restriction_default_action === "Allow"
  );
}

function createBlastRadius(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
  failures: Map<string, Finding[]>,
): BlastRadiusItem[] {
  const dependants = new Map<string, number>();
  for (const edge of edges) {
    dependants.set(edge.target, (dependants.get(edge.target) ?? 0) + 1);
  }
  return nodes
    .filter(
      (node) =>
        node.changeAction !== "no-op" ||
        node.risk === "high" ||
        node.risk === "medium",
    )
    .map((node) => {
      const impacted = dependants.get(node.address) ?? 0;
      const failed = failures.get(node.address)?.length ?? 0;
      const risk: BlastRadiusItem["risk"] =
        node.risk === "high" ||
        node.changeAction === "replace" ||
        (node.changeAction === "delete" && impacted > 0)
          ? "high"
          : node.risk === "medium" || impacted > 0
            ? "medium"
            : "low";
      const reasons = [
        node.changeAction !== "no-op"
          ? `${node.changeAction} operation`
          : undefined,
        node.publicExposure ? "public exposure detected" : undefined,
        impacted > 0 ? `${impacted} connected resources may be affected` : undefined,
        failed > 0 ? `${failed} failed controls` : undefined,
      ].filter(Boolean);
      return {
        address: node.address,
        action: node.changeAction,
        risk,
        reason: reasons.join("; ") || "Review planned configuration",
      };
    })
    .sort((a, b) => riskRank(a.risk) - riskRank(b.risk));
}

function countChanges(
  nodes: ArchitectureNode[],
): Record<ChangeAction, number> {
  const result: Record<ChangeAction, number> = {
    create: 0,
    update: 0,
    delete: 0,
    replace: 0,
    "no-op": 0,
    read: 0,
  };
  nodes.forEach((node) => {
    result[node.changeAction] += 1;
  });
  return result;
}

function calculateRiskScore(items: BlastRadiusItem[]): number {
  return Math.min(
    100,
    items.reduce(
      (score, item) =>
        score + (item.risk === "high" ? 25 : item.risk === "medium" ? 10 : 3),
      0,
    ),
  );
}

function riskRank(risk: BlastRadiusItem["risk"]): number {
  return risk === "high" ? 0 : risk === "medium" ? 1 : 2;
}

function serviceName(type: string): string {
  return type
    .replace(/^azurerm_/, "")
    .split("_")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

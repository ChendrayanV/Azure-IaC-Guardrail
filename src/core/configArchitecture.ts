import type {
  ArchitectureEdge,
  ArchitectureNode,
  ChangeAction,
  PlanAnalysis,
  TerraformResource,
} from "../types";

export function analyzeTerraformConfiguration(
  resources: TerraformResource[],
): PlanAnalysis {
  const nodes = resources.map(toArchitectureNode);
  const edges = collectReferenceEdges(resources, new Set(nodes.map((node) => node.address)));
  return {
    nodes,
    edges,
    changes: countChanges(nodes),
    blastRadius: [],
    riskScore: calculateConfigurationRisk(nodes),
  };
}

function toArchitectureNode(resource: TerraformResource): ArchitectureNode {
  const address = resourceAddress(resource);
  const publicExposure = hasPublicExposure(resource);
  return {
    address,
    type: resource.type,
    name: resource.name,
    service: serviceName(resource.type),
    changeAction: "no-op",
    risk: publicExposure ? "medium" : "none",
    publicExposure,
    changedAttributes: [],
  };
}

function collectReferenceEdges(
  resources: TerraformResource[],
  addresses: Set<string>,
): ArchitectureEdge[] {
  const edges = new Map<string, ArchitectureEdge>();
  for (const resource of resources) {
    const source = resourceAddress(resource);
    for (const attribute of resource.attributes.values()) {
      const references = referenceAddresses(attribute.value, addresses);
      for (const target of references) {
        if (target === source) {
          continue;
        }
        const label = attribute.name.split(".").at(-1) ?? "reference";
        edges.set(`${source}|${target}|${label}`, {
          source,
          target,
          label,
        });
      }
    }
  }
  return [...edges.values()];
}

function referenceAddresses(value: unknown, addresses: Set<string>): string[] {
  const candidates = new Set<string>();
  collectReferenceCandidates(value, candidates);
  return [...candidates]
    .map((candidate) => referenceTarget(candidate, addresses))
    .filter((candidate): candidate is string => candidate !== undefined);
}

function collectReferenceCandidates(value: unknown, output: Set<string>): void {
  if (Array.isArray(value)) {
    value.forEach((item) => collectReferenceCandidates(item, output));
    return;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectReferenceCandidates(item, output));
    return;
  }
  if (typeof value !== "string") {
    return;
  }
  const pattern =
    /\b(?:module\.[A-Za-z0-9_-]+\.)?azurerm_[A-Za-z0-9_]+\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*/g;
  for (const match of value.matchAll(pattern)) {
    output.add(match[0]);
  }
}

function referenceTarget(
  reference: string,
  addresses: Set<string>,
): string | undefined {
  const segments = reference.split(".");
  for (let length = segments.length; length >= 2; length -= 1) {
    const candidate = segments.slice(0, length).join(".");
    if (addresses.has(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function resourceAddress(resource: TerraformResource): string {
  const local = `${resource.type}.${resource.name}`;
  return resource.moduleAddress ? `${resource.moduleAddress}.${local}` : local;
}

function hasPublicExposure(resource: TerraformResource): boolean {
  const values = Object.fromEntries(
    [...resource.attributes.entries()].map(([key, attribute]) => [key, attribute.value]),
  );
  return (
    values.public_network_access_enabled === true ||
    values.public_network_access_enabled === "true" ||
    values.public_network_access === "Enabled" ||
    values.network_access_type === "Public" ||
    values.public_ip_address_id != null ||
    values.default_action === "Allow" ||
    values.ip_restriction_default_action === "Allow" ||
    resource.type === "azurerm_public_ip"
  );
}

function countChanges(
  nodes: ArchitectureNode[],
): Record<ChangeAction, number> {
  return nodes.reduce(
    (result, node) => {
      result[node.changeAction] += 1;
      return result;
    },
    {
      create: 0,
      update: 0,
      delete: 0,
      replace: 0,
      "no-op": 0,
      read: 0,
    } satisfies Record<ChangeAction, number>,
  );
}

function calculateConfigurationRisk(nodes: ArchitectureNode[]): number {
  return Math.min(
    100,
    nodes.reduce((score, node) => score + (node.publicExposure ? 10 : 0), 0),
  );
}

function serviceName(type: string): string {
  return type
    .replace(/^azurerm_/, "")
    .split("_")
    .slice(0, 3)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

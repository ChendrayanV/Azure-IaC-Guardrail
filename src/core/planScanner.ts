import type {
  Control,
  Finding,
  TerraformAttribute,
  TerraformResource,
} from "../types";
import { scanResources } from "./scanner";
import { analyzeTerraformPlan } from "./planAnalysis";
import type { PlanAnalysis } from "../types";

interface TerraformPlan {
  planned_values?: {
    root_module?: PlanModule;
  };
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

export function scanTerraformPlan(
  planJson: string,
  controls: Control[],
): Finding[] {
  const plan = JSON.parse(planJson) as TerraformPlan;
  const rootModule = plan.planned_values?.root_module;
  if (!rootModule) {
    throw new Error(
      "The JSON does not contain planned_values.root_module. Generate it with 'terraform show -json'.",
    );
  }

  return scanResources(parseModule(rootModule), controls);
}

export function scanTerraformPlanDetailed(
  planJson: string,
  controls: Control[],
): { findings: Finding[]; analysis: PlanAnalysis } {
  const findings = scanTerraformPlan(planJson, controls);
  return {
    findings,
    analysis: analyzeTerraformPlan(planJson, findings),
  };
}

function parseModule(module: PlanModule): TerraformResource[] {
  const resources = (module.resources ?? [])
    .filter(
      (resource) =>
        resource.mode !== "data" &&
        typeof resource.type === "string" &&
        typeof resource.name === "string",
    )
    .map(toTerraformResource);

  return [
    ...resources,
    ...(module.child_modules ?? []).flatMap((child) => parseModule(child)),
  ];
}

function toTerraformResource(resource: PlanResource): TerraformResource {
  const attributes = new Map<string, TerraformAttribute>();
  for (const [name, value] of Object.entries(resource.values ?? {})) {
    attributes.set(name, {
      name,
      value,
      resolved: true,
      line: 0,
      startCharacter: 0,
      endCharacter: 1,
    });
  }

  return {
    type: resource.type as string,
    name: resource.name as string,
    address:
      resource.address ?? `${resource.type as string}.${resource.name as string}`,
    startLine: 0,
    attributes,
  };
}

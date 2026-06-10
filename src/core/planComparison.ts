export interface PlanComparison {
  added: string[];
  removed: string[];
  changed: Array<{ address: string; attributes: string[] }>;
  unchanged: number;
}

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
  values?: Record<string, unknown>;
}

export function compareTerraformPlans(
  baselineJson: string,
  candidateJson: string,
): PlanComparison {
  const baseline = resourceMap(JSON.parse(baselineJson) as TerraformPlan);
  const candidate = resourceMap(JSON.parse(candidateJson) as TerraformPlan);
  const added = [...candidate.keys()].filter((key) => !baseline.has(key)).sort();
  const removed = [...baseline.keys()].filter((key) => !candidate.has(key)).sort();
  const changed: PlanComparison["changed"] = [];
  let unchanged = 0;
  for (const [address, values] of candidate) {
    const previous = baseline.get(address);
    if (!previous) {
      continue;
    }
    const attributes = changedKeys(previous, values);
    if (attributes.length > 0) {
      changed.push({ address, attributes });
    } else {
      unchanged += 1;
    }
  }
  return { added, removed, changed, unchanged };
}

export function renderPlanComparisonMarkdown(
  comparison: PlanComparison,
  baseline: string,
  candidate: string,
): string {
  return `# Terraform Plan Comparison

Baseline: \`${baseline}\`  
Candidate: \`${candidate}\`

| Result | Count |
|---|---:|
| Added | ${comparison.added.length} |
| Removed | ${comparison.removed.length} |
| Changed | ${comparison.changed.length} |
| Unchanged | ${comparison.unchanged} |

## Added

${list(comparison.added)}

## Removed

${list(comparison.removed)}

## Changed

${
  comparison.changed.length > 0
    ? comparison.changed
        .map(
          (item) =>
            `- \`${item.address}\`: ${item.attributes.map((value) => `\`${value}\``).join(", ")}`,
        )
        .join("\n")
    : "_None_"
}

Only changed attribute names are shown. Plan values may be sensitive and are
not copied into this report.
`;
}

function resourceMap(plan: TerraformPlan): Map<string, Record<string, unknown>> {
  return new Map(
    flatten(plan.planned_values?.root_module).map((resource) => [
      resource.address as string,
      resource.values ?? {},
    ]),
  );
}

function flatten(module?: PlanModule): PlanResource[] {
  if (!module) {
    return [];
  }
  return [
    ...(module.resources ?? []).filter(
      (resource) => resource.mode !== "data" && resource.address,
    ),
    ...(module.child_modules ?? []).flatMap(flatten),
  ];
}

function changedKeys(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): string[] {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .sort();
}

function list(values: string[]): string {
  return values.length > 0
    ? values.map((value) => `- \`${value}\``).join("\n")
    : "_None_";
}

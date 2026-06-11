export type Severity = "error" | "warning" | "information";
export type Operator =
  | "equals"
  | "notEquals"
  | "exists"
  | "oneOf"
  | "contains"
  | "relatedResourceExists";

export interface ControlCondition {
  attribute: string;
  operator: "equals" | "notEquals" | "exists";
  expected?: string | number | boolean;
}

export interface Control {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  resourceTypes: string[];
  attribute: string;
  operator: Operator;
  expected?: string | number | boolean | Array<string | number | boolean>;
  remediation?: string;
  reference?: string;
  benchmarkReference?: string;
  planOnly?: boolean;
  skipStatic?: boolean;
  conditions?: ControlCondition[];
  relatedResourceType?: string;
  relatedMatchAttribute?: string;
  relatedConditionAttribute?: string;
}

export interface PlatformAssurance {
  id: string;
  title: string;
  description: string;
  implementation: "platform";
  reference?: string;
}

export interface ControlCatalog {
  catalogVersion: string;
  controls: Control[];
  assurances?: PlatformAssurance[];
}

export interface TerraformAttribute {
  name: string;
  value: unknown;
  resolved: boolean;
  source?: string;
  line: number;
  startCharacter: number;
  endCharacter: number;
}

export interface TerraformResource {
  type: string;
  name: string;
  address?: string;
  sourcePath?: string;
  sourceUri?: string;
  moduleAddress?: string;
  startLine: number;
  attributes: Map<string, TerraformAttribute>;
}

export interface Finding {
  outcome: "compliant" | "noncompliant" | "unresolved";
  control: Control;
  resource: TerraformResource;
  actual: unknown;
  resolvedFrom?: string;
  expected: unknown;
  line: number;
  startCharacter: number;
  endCharacter: number;
  message: string;
  fix?: {
    kind: "replace-value" | "insert-attribute";
    value: unknown;
    attribute?: string;
  };
}

export type ChangeAction =
  | "create"
  | "update"
  | "delete"
  | "replace"
  | "no-op"
  | "read";

export interface ArchitectureNode {
  address: string;
  type: string;
  name: string;
  service: string;
  changeAction: ChangeAction;
  risk: "high" | "medium" | "low" | "none";
  publicExposure: boolean;
  changedAttributes?: string[];
}

export interface ArchitectureEdge {
  source: string;
  target: string;
  label: string;
}

export interface BlastRadiusItem {
  address: string;
  action: ChangeAction;
  risk: "high" | "medium" | "low";
  reason: string;
}

export interface ResourceCostEstimate {
  address: string;
  resourceType: string;
  status: "estimated" | "partial" | "usage-required" | "unavailable";
  monthlyCost?: number;
  currency: string;
  unitPrice?: number;
  unitOfMeasure?: string;
  quantity?: number;
  factors: Record<string, string>;
  note: string;
}

export interface PlanCostAnalysis {
  currency: string;
  knownMonthlyCost: number;
  estimatedResources: number;
  partialResources: number;
  usageDependentResources: number;
  unavailableResources: number;
  omittedResources: number;
  hoursPerMonth: number;
  generatedAt: string;
  source: string;
  resources: ResourceCostEstimate[];
}

export interface PlanAnalysis {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  changes: Record<ChangeAction, number>;
  blastRadius: BlastRadiusItem[];
  riskScore: number;
  cost?: PlanCostAnalysis;
}

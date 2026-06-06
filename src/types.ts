export type Severity = "error" | "warning" | "information";
export type Operator =
  | "equals"
  | "notEquals"
  | "exists"
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
  expected?: string | number | boolean;
  remediation?: string;
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
  line: number;
  startCharacter: number;
  endCharacter: number;
}

export interface TerraformResource {
  type: string;
  name: string;
  address?: string;
  startLine: number;
  attributes: Map<string, TerraformAttribute>;
}

export interface Finding {
  outcome: "compliant" | "noncompliant" | "unresolved";
  control: Control;
  resource: TerraformResource;
  actual: unknown;
  expected: unknown;
  line: number;
  startCharacter: number;
  endCharacter: number;
  message: string;
}

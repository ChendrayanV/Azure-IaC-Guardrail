import type {
  Control,
  ControlCondition,
  Finding,
  TerraformAttribute,
  TerraformResource,
} from "../types";
import { parseTerraform } from "./terraformParser";
import type { StaticResolutionContext } from "./staticResolution";

export function scanTerraform(source: string, controls: Control[]): Finding[] {
  const resources = parseTerraform(source);
  return scanResources(resources, controls);
}

export function scanTerraformWithContext(
  source: string,
  controls: Control[],
  context: StaticResolutionContext,
  origin?: {
    sourcePath?: string;
    sourceUri?: string;
    moduleAddress?: string;
  },
): Finding[] {
  return scanResources(parseTerraform(source, context, origin), controls);
}

export function scanResources(
  resources: TerraformResource[],
  controls: Control[],
): Finding[] {
  return resources.flatMap((resource) =>
    controls
      .filter((control) => control.resourceTypes.includes(resource.type))
      .flatMap((control) =>
        evaluateControl(resource, control, resources),
      ),
  );
}

function evaluateControl(
  resource: TerraformResource,
  control: Control,
  resources: TerraformResource[],
): Finding[] {
  if (control.planOnly && !resource.address && control.skipStatic) {
    return [];
  }
  const applicability = evaluateConditions(resource, control.conditions ?? []);
  if (applicability === false) {
    return [];
  }

  const attribute = getControlAttribute(resource, control);
  if (control.planOnly && !resource.address && !attribute) {
    return [createFinding(resource, control, undefined, "unresolved")];
  }
  if (applicability === undefined) {
    return [createFinding(resource, control, attribute, "unresolved")];
  }
  if (control.operator === "relatedResourceExists") {
    return evaluateRelatedResource(resource, control, attribute, resources);
  }
  if (
    attribute &&
    !attribute.resolved &&
    control.operator !== "exists"
  ) {
    return [
      createFinding(
        resource,
        control,
        attribute,
        "unresolved",
      ),
    ];
  }
  const passed = evaluate(attribute, control);
  if (passed) {
    return [createFinding(resource, control, attribute, "compliant")];
  }

  return [
    createFinding(
      resource,
      control,
      attribute,
      "noncompliant",
    ),
  ];
}

function evaluateConditions(
  resource: TerraformResource,
  conditions: ControlCondition[],
): boolean | undefined {
  for (const condition of conditions) {
    const values = getAttributeValues(resource, condition.attribute);
    if (values === undefined) {
      return undefined;
    }
    if (!evaluateValues(values, condition)) {
      return false;
    }
  }
  return true;
}

function evaluateRelatedResource(
  resource: TerraformResource,
  control: Control,
  attribute: TerraformAttribute | undefined,
  resources: TerraformResource[],
): Finding[] {
  if (
    !control.relatedResourceType ||
    !control.relatedMatchAttribute
  ) {
    throw new Error(
      `${control.id} must define related resource matching fields.`,
    );
  }
  if (
    !resource.address &&
    (!attribute || !attribute.resolved || attribute.value == null)
  ) {
    return [createFinding(resource, control, attribute, "unresolved")];
  }

  const relatedResources = resources.filter(
    (candidate) => candidate.type === control.relatedResourceType,
  );
  if (relatedResources.length === 0) {
    return [
      createFinding(
        resource,
        control,
        relationshipObservation(
          resource,
          `No ${control.relatedResourceType} resource found`,
        ),
        "noncompliant",
      ),
    ];
  }

  const eligibleResources = control.relatedConditionAttribute
    ? relatedResources.filter((candidate) => {
        const conditionValues = getAttributeValues(
          candidate,
          control.relatedConditionAttribute as string,
        );
        return (
          conditionValues !== undefined &&
          conditionValues.some((value) => value === control.expected)
        );
      })
    : relatedResources;

  if (eligibleResources.length === 0) {
    return [
      createFinding(
        resource,
        control,
        relationshipObservation(
          resource,
          `No ${control.relatedResourceType} with ${String(control.expected)} subresource found`,
        ),
        "noncompliant",
      ),
    ];
  }

  if (!attribute || !attribute.resolved || attribute.value == null) {
    return [createFinding(resource, control, attribute, "unresolved")];
  }

  const hasMatch = eligibleResources.some((candidate) => {
    const matchValues = getAttributeValues(
      candidate,
      control.relatedMatchAttribute as string,
    );
    return (
      matchValues !== undefined &&
      matchValues.some((value) => value === attribute.value)
    );
  });

  if (hasMatch) {
    return [createFinding(resource, control, attribute, "compliant")];
  }
  return [
    createFinding(
      resource,
      control,
      relationshipObservation(
        resource,
        `No matching ${control.relatedResourceType} linked to this resource`,
      ),
      "noncompliant",
    ),
  ];
}

function relationshipObservation(
  resource: TerraformResource,
  value: string,
): TerraformAttribute {
  return {
    name: "related_resource",
    value,
    resolved: true,
    line: resource.startLine,
    startCharacter: 0,
    endCharacter: 1,
  };
}

function createFinding(
  resource: TerraformResource,
  control: Control,
  attribute: TerraformAttribute | undefined,
  outcome: Finding["outcome"],
): Finding {
  const finding: Finding = {
    outcome,
    control,
    resource,
    actual: attribute?.value,
    resolvedFrom: attribute?.source,
    expected:
      control.operator === "exists"
        ? "attribute present"
        : control.expected,
    line: attribute?.line ?? resource.startLine,
    startCharacter: attribute?.startCharacter ?? 0,
    endCharacter: attribute?.endCharacter ?? 1,
    message: `${control.id}: ${control.title}`,
  };
  const fixValue = preferredFixValue(control);
  if (
    outcome === "noncompliant" &&
    fixValue !== undefined &&
    control.operator !== "relatedResourceExists"
  ) {
    finding.fix = attribute
      ? { kind: "replace-value", value: fixValue }
      : !control.attribute.includes(".")
        ? {
            kind: "insert-attribute",
            attribute: control.attribute,
            value: fixValue,
          }
        : undefined;
  }
  return finding;
}

function preferredFixValue(control: Control): unknown {
  if (control.operator === "equals") {
    return control.expected;
  }
  if (control.operator === "oneOf" && Array.isArray(control.expected)) {
    return control.expected[0];
  }
  return undefined;
}

function evaluate(
  attribute: TerraformAttribute | undefined,
  control: Control,
): boolean {
  if (control.operator === "exists") {
    return attribute !== undefined && hasValue(attribute.value);
  }
  if (!attribute) {
    return false;
  }

  const actual = attribute.value;
  const expected = control.expected;
  if (control.operator === "equals") {
    return valuesEqual(actual, expected);
  }
  if (control.operator === "notEquals") {
    return !valuesEqual(actual, expected);
  }
  if (control.operator === "oneOf") {
    return (
      Array.isArray(expected) &&
      expected.some((candidate) => valuesEqual(actual, candidate))
    );
  }
  if (control.operator === "contains") {
    return Array.isArray(actual)
      ? actual.some((value) => valuesEqual(value, expected))
      : false;
  }
  return false;
}

function getControlAttribute(
  resource: TerraformResource,
  control: Control,
): TerraformAttribute | undefined {
  const attributePath = control.attribute;
  const direct = resource.attributes.get(attributePath);
  if (direct || !attributePath.includes(".")) {
    return direct;
  }
  const values = getAttributeValues(resource, attributePath);
  if (values === undefined) {
    return undefined;
  }
  return {
    name: attributePath,
    value:
      control.operator === "contains"
        ? values
        : values.length === 1
          ? values[0]
          : values,
    resolved: true,
    line: resource.startLine,
    startCharacter: 0,
    endCharacter: 1,
  };
}

function evaluateValues(
  values: unknown[],
  condition: ControlCondition,
): boolean {
  if (condition.operator === "exists") {
    return values.some(hasValue);
  }
  const hasExpected = values.some(
    (value) => valuesEqual(value, condition.expected),
  );
  return condition.operator === "equals" ? hasExpected : !hasExpected;
}

function hasValue(value: unknown): boolean {
  return (
    value !== undefined &&
    value !== null &&
    (!Array.isArray(value) || value.length > 0)
  );
}

function getAttributeValues(
  resource: TerraformResource,
  attributePath: string,
): unknown[] | undefined {
  const direct = resource.attributes.get(attributePath);
  if (direct) {
    return direct.resolved ? [direct.value] : undefined;
  }
  const [root, ...segments] = attributePath.split(".");
  const attribute = resource.attributes.get(root);
  if (!attribute || !attribute.resolved) {
    return undefined;
  }
  return descend(attribute.value, segments);
}

function descend(value: unknown, segments: string[]): unknown[] {
  if (segments.length === 0) {
    return Array.isArray(value) ? value : [value];
  }
  const [segment, ...rest] = segments;
  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      segment === "*" ? descend(item, rest) : descend(item, segments),
    );
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  if (segment === "*") {
    return Object.values(value).flatMap((item) => descend(item, rest));
  }
  return descend((value as Record<string, unknown>)[segment], rest);
}

function coerce(value: string): string | number | boolean {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  const number = Number(value);
  return Number.isNaN(number) ? value : number;
}

function valuesEqual(actual: unknown, expected: unknown): boolean {
  if (typeof expected === "string") {
    return actual === expected;
  }
  return (
    (typeof actual === "string" ? coerce(actual) : actual) === expected
  );
}

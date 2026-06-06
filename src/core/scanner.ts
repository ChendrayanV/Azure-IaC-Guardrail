import type {
  Control,
  ControlCondition,
  Finding,
  TerraformAttribute,
  TerraformResource,
} from "../types";
import { parseTerraform } from "./terraformParser";

export function scanTerraform(source: string, controls: Control[]): Finding[] {
  const resources = parseTerraform(source);
  return scanResources(resources, controls);
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
  const applicability = evaluateConditions(resource, control.conditions ?? []);
  if (applicability === false) {
    return [];
  }

  const attribute = resource.attributes.get(control.attribute);
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
    !control.relatedMatchAttribute ||
    !control.relatedConditionAttribute
  ) {
    throw new Error(
      `${control.id} must define related resource matching fields.`,
    );
  }
  if (!attribute || !attribute.resolved || attribute.value == null) {
    return [createFinding(resource, control, attribute, "unresolved")];
  }

  const relatedResources = resources.filter(
    (candidate) => candidate.type === control.relatedResourceType,
  );
  const hasMatch = relatedResources.some((candidate) => {
    const matchValues = getAttributeValues(
      candidate,
      control.relatedMatchAttribute as string,
    );
    const conditionValues = getAttributeValues(
      candidate,
      control.relatedConditionAttribute as string,
    );
    return (
      matchValues !== undefined &&
      conditionValues !== undefined &&
      matchValues.some((value) => value === attribute.value) &&
      conditionValues.some((value) => value === control.expected)
    );
  });

  if (hasMatch) {
    return [createFinding(resource, control, attribute, "compliant")];
  }
  return [createFinding(resource, control, attribute, "noncompliant")];
}

function createFinding(
  resource: TerraformResource,
  control: Control,
  attribute: TerraformAttribute | undefined,
  outcome: Finding["outcome"],
): Finding {
  return {
    outcome,
    control,
    resource,
    actual: attribute?.value,
    expected:
      control.operator === "exists"
        ? "attribute present"
        : control.expected,
    line: attribute?.line ?? resource.startLine,
    startCharacter: attribute?.startCharacter ?? 0,
    endCharacter: attribute?.endCharacter ?? 1,
    message: `${control.id}: ${control.title}`,
  };
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

  const actual =
    typeof attribute.value === "string"
      ? coerce(attribute.value)
      : attribute.value;
  const expected = control.expected;
  return control.operator === "equals"
    ? actual === expected
    : actual !== expected;
}

function evaluateValues(
  values: unknown[],
  condition: ControlCondition,
): boolean {
  if (condition.operator === "exists") {
    return values.some(hasValue);
  }
  const hasExpected = values.some(
    (value) => coerceUnknown(value) === condition.expected,
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

function coerceUnknown(value: unknown): unknown {
  return typeof value === "string" ? coerce(value) : value;
}

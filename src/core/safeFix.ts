import type { Finding } from "../types";

export interface SafeFixPreview {
  title: string;
  resourceAddress: string;
  before: string;
  after: string;
  note: string;
}

export function createSafeFixPreview(
  finding: Finding,
): SafeFixPreview | undefined {
  if (
    finding.outcome !== "noncompliant" ||
    finding.control.operator === "relatedResourceExists"
  ) {
    return undefined;
  }
  const expected = preferredExpected(finding.expected);
  if (expected === undefined) {
    return undefined;
  }
  const attribute = finding.control.attribute;
  const rendered = renderHcl(expected);
  return {
    title: `Preview fix for ${finding.control.id}`,
    resourceAddress:
      finding.resource.address ??
      `${finding.resource.type}.${finding.resource.name}`,
    before: `${attribute} = ${renderHcl(finding.actual)}`,
    after: `${attribute} = ${rendered}`,
    note:
      attribute.includes(".")
        ? "Nested attributes may require placement inside the matching Terraform block. Review this preview before editing."
        : "This is a preview only. Apply it in the owning Terraform resource, then validate and rescan.",
  };
}

function preferredExpected(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

function renderHcl(value: unknown): string {
  if (value === undefined) {
    return "<missing>";
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  return JSON.stringify(value, null, 2);
}

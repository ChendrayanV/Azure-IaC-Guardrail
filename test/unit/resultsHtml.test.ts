import { describe, expect, it } from "vitest";
import {
  renderErrorHtml,
  renderLoadingHtml,
  renderResultsHtml,
} from "../../src/core/resultsHtml";
import type { Finding } from "../../src/types";

const finding: Finding = {
  outcome: "noncompliant",
  control: {
    id: "AZ-STOR-001",
    title: "Block public access",
    description: "Storage accounts must block public access.",
    severity: "error",
    resourceTypes: ["azurerm_storage_account"],
    attribute: "allow_nested_items_to_be_public",
    operator: "equals",
    expected: false,
    remediation: "Set allow_nested_items_to_be_public = false.",
  },
  resource: {
    type: "azurerm_storage_account",
    name: "example",
    startLine: 0,
    attributes: new Map(),
  },
  actual: true,
  expected: false,
  line: 4,
  startCharacter: 2,
  endCharacter: 45,
  message: "AZ-STOR-001: Block public access",
};

describe("renderResultsHtml", () => {
  it("renders a loading state", () => {
    const html = renderLoadingHtml("test-nonce");
    expect(html).toContain("Azure IaC Guardrail is scanning");
    expect(html).toContain("test-nonce");
  });

  it("renders and escapes an error state", () => {
    const html = renderErrorHtml("Bad <catalog>", "test-nonce");
    expect(html).toContain("Azure IaC Guardrail scan failed");
    expect(html).toContain("Bad &lt;catalog&gt;");
  });

  it("renders a clickable Azure finding card", () => {
    const html = renderResultsHtml(
      [
        {
          scanKind: "static",
          filePath: "main.tf",
          uri: "file:///workspace/main.tf",
          findings: [finding],
        },
      ],
      "test-nonce",
    );

    expect(html).toContain("Azure IaC Guardrail");
    expect(html).toContain("Compliance checks");
    expect(html).toContain("AZ-STOR-001");
    expect(html).toContain("main.tf:5");
    expect(html).toContain("Observed");
    expect(html).toContain("Expected");
    expect(html).toContain("<code>true</code>");
    expect(html).toContain("<code>false</code>");
    expect(html).toContain('data-uri="file:///workspace/main.tf"');
    expect(html).toContain("Action required");
  });

  it("renders a compliant state", () => {
    const compliantFinding: Finding = {
      ...finding,
      outcome: "compliant",
      actual: false,
    };
    const html = renderResultsHtml(
      [
        {
          scanKind: "static",
          filePath: "main.tf",
          uri: "file:///main.tf",
          findings: [compliantFinding],
        },
      ],
      "test-nonce",
    );

    expect(html).toContain("Compliant");
    expect(html).toContain("COMPLIANT");
    expect(html).toContain('data-outcome="compliant"');
    expect(html).toContain('data-filter="noncompliant"');
    expect(html).toContain('data-filter="compliant"');
    expect(html).toContain("Non-compliant (0)");
    expect(html).toContain("Compliant (1)");
  });

  it("renders an empty state when no controls apply", () => {
    const html = renderResultsHtml(
      [
        {
          scanKind: "static",
          filePath: "main.tf",
          findings: [],
        },
      ],
      "test-nonce",
    );

    expect(html).toContain("No applicable controls");
  });

  it("escapes control content", () => {
    const unsafeFinding = {
      ...finding,
      control: { ...finding.control, title: "<script>alert(1)</script>" },
    };
    const html = renderResultsHtml(
      [
        {
          scanKind: "static",
          filePath: "main.tf",
          uri: "file:///main.tf",
          findings: [unsafeFinding],
        },
      ],
      "test-nonce",
    );

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("renders plan resource addresses without source links", () => {
    const planFinding = {
      ...finding,
      resource: {
        ...finding.resource,
        address: "module.storage.azurerm_storage_account.example",
      },
    };
    const html = renderResultsHtml(
      [
        {
          scanKind: "plan",
          filePath: "environment.tfplan",
          findings: [planFinding],
        },
      ],
      "test-nonce",
    );

    expect(html).toContain("Resolved Terraform plan controls scan");
    expect(html).toContain(
      "module.storage.azurerm_storage_account.example",
    );
    expect(html).not.toContain("data-uri=");
  });

  it("renders variable expressions as requiring a plan", () => {
    const html = renderResultsHtml(
      [
        {
          scanKind: "static",
          filePath: "main.tf",
          uri: "file:///main.tf",
          findings: [
            {
              ...finding,
              outcome: "unresolved",
              actual: "var.allow_public_access",
            },
          ],
        },
      ],
      "test-nonce",
    );

    expect(html).toContain("Plan required");
    expect(html).toContain("PLAN REQUIRED");
    expect(html).toContain("var.allow_public_access");
    expect(html).toContain(
      "Azure IaC Guardrail: Create and Scan Local Terraform Plan",
    );
  });
});

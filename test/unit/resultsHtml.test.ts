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
    reference: "https://learn.microsoft.com/azure/storage/common/security-recommendations-for-blob-storage",
    benchmarkReference:
      "https://avd.aquasec.com/misconfig/azure/storage/azu-0008/",
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
    const html = renderLoadingHtml(
      "test-nonce",
      "plan",
      "Creating a resolved plan...",
    );
    expect(html).toContain("Azure IaC Guardrail is scanning");
    expect(html).toContain("Create plan");
    expect(html).toContain("Creating a resolved plan...");
    expect(html).toContain("role=\"progressbar\"");
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
    expect(html).toContain("finding-toggle");
    expect(html).toContain("data-finding-card");
    expect(html).toContain("data-finding-toggle");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('id="finding-details-0" hidden');
    expect(html).toContain("finding-summary-meta");
    expect(html).toContain(
      "grid-template-columns: 132px minmax(280px, 1.45fr)",
    );
    expect(html).toContain(
      'title="azurerm_storage_account.example"',
    );
    expect(html).toContain('data-uri="file:///workspace/main.tf"');
    expect(html).toContain("Action required");
    expect(html).toContain("Export PDF");
    expect(html).toContain("data-export-pdf");
    expect(html).toContain("Microsoft guidance");
    expect(html).toContain("Aqua AVD rule");
    expect(html).toContain(
      'data-reference="https://learn.microsoft.com/azure/storage/common/security-recommendations-for-blob-storage"',
    );
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

  it("renders unresolved plan values as apply-time values", () => {
    const html = renderResultsHtml(
      [
        {
          scanKind: "plan",
          filePath: "local.tfplan",
          findings: [
            {
              ...finding,
              outcome: "unresolved",
              actual: undefined,
            },
          ],
        },
      ],
      "test-nonce",
    );

    expect(html).toContain("Apply-time value");
    expect(html).toContain("APPLY-TIME VALUE");
    expect(html).toContain(
      "Terraform cannot know this value until Azure creates the resource",
    );
    expect(html).toContain("Example scenario");
    expect(html).toContain("new storage account");
    expect(html).toContain("Running the same unchanged pre-deployment plan");
    expect(html).not.toContain("Run <em>Azure IaC Guardrail");
  });

  it("renders colored metrics and a local plan rescan action", () => {
    const html = renderResultsHtml(
      [
        {
          scanKind: "plan",
          filePath: "local.tfplan",
          findings: [finding],
        },
      ],
      "test-nonce",
      true,
    );

    expect(html).toContain("metric compliant");
    expect(html).toContain("metric noncompliant");
    expect(html).toContain("metric unresolved");
    expect(html).toContain("Rescan Local Plan");
    expect(html).toContain("data-rescan");
    expect(html).toContain('type: "rescan"');
  });

  it("links plan results to the interactive architecture canvas", () => {
    const html = renderResultsHtml(
      [
        {
          scanKind: "plan",
          filePath: "local.tfplan",
          findings: [],
          analysis: {
            nodes: [],
            edges: [],
            changes: {
              create: 0,
              update: 0,
              delete: 0,
              replace: 0,
              "no-op": 0,
              read: 0,
            },
            blastRadius: [],
            riskScore: 0,
          },
        },
      ],
      "nonce",
    );

    expect(html).toContain("Open Architecture Diagram");
    expect(html).toContain('type: "openPlanArchitecture"');
  });

  it("renders architecture, blast-radius, fixes, and evidence actions", () => {
    const html = renderResultsHtml(
      [
        {
          scanKind: "plan",
          filePath: "local.tfplan",
          findings: [finding],
          analysis: {
            nodes: [
              {
                address: "azurerm_storage_account.example",
                type: "azurerm_storage_account",
                name: "example",
                service: "Storage Account",
                changeAction: "replace",
                risk: "high",
                publicExposure: true,
              },
            ],
            edges: [],
            changes: {
              create: 0,
              update: 0,
              delete: 0,
              replace: 1,
              "no-op": 0,
              read: 0,
            },
            blastRadius: [
              {
                address: "azurerm_storage_account.example",
                action: "replace",
                risk: "high",
                reason: "replace operation",
              },
            ],
            riskScore: 75,
            cost: {
              currency: "USD",
              knownMonthlyCost: 120.45,
              estimatedResources: 1,
              partialResources: 0,
              usageDependentResources: 1,
              unavailableResources: 0,
              omittedResources: 2,
              hoursPerMonth: 730,
              generatedAt: "2026-06-09T10:00:00.000Z",
              source: "https://prices.azure.com/api/retail/prices",
              resources: [
                {
                  address: "azurerm_linux_virtual_machine.example",
                  resourceType: "azurerm_linux_virtual_machine",
                  status: "estimated",
                  monthlyCost: 120.45,
                  currency: "USD",
                  unitPrice: 0.165,
                  unitOfMeasure: "1 Hour",
                  quantity: 1,
                  factors: {
                    region: "uksouth",
                    size: "Standard_D2s_v5",
                    zones: "1",
                  },
                  note: "Retail list-price estimate.",
                },
                {
                  address: "azurerm_storage_account.example",
                  resourceType: "azurerm_storage_account",
                  status: "partial",
                  monthlyCost: 0.13,
                  currency: "USD",
                  factors: {
                    region: "uksouth",
                    account_replication_type: "LRS",
                  },
                  note: "Storage usage assumptions required.",
                },
              ],
            },
          },
        },
      ],
      "test-nonce",
    );

    expect(html).toContain("Architecture Risk Graph");
    expect(html).toContain("view-tab findings active");
    expect(html).toContain("view-tab architecture");
    expect(html).toContain("view-tab changes");
    expect(html).toContain("Controls and remediation");
    expect(html).toContain("Resources and relationships");
    expect(html).toContain("Change impact and risk");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Open Architecture Diagram");
    expect(html).toContain("data-open-plan-architecture");
    expect(html).not.toContain("data-open-architecture");
    expect(html).not.toContain('type: "openArchitecture"');
    expect(html).toContain("PR Change &amp; Blast Radius");
    expect(html).toContain("Resource Cost · Preview");
    expect(html).toContain("Estimated monthly subtotal");
    expect(html).toContain("Free or helper resources hidden");
    expect(html).toContain("$120.45");
    expect(html).toContain("Partial estimate");
    expect(html).toContain("75/100");
    expect(html).toContain("Preview Safe Fix");
    expect(html).toContain("Export Evidence Pack");
  });
});

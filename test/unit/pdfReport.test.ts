import * as fs from "node:fs";
import * as path from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { generateScanReportPdf } from "../../src/core/pdfReport";
import type { FileScanResult } from "../../src/core/resultsHtml";

const results: FileScanResult[] = [
  {
    scanKind: "plan",
    filePath: "production.tfplan",
    findings: [
      {
        outcome: "noncompliant",
        control: {
          id: "AZ-FUNC-007",
          title: "Function apps must require modern TLS",
          description: "Function Apps must reject legacy TLS versions.",
          severity: "error",
          resourceTypes: ["azurerm_linux_function_app"],
          attribute: "site_config.minimum_tls_version",
          operator: "oneOf",
          expected: ["1.2", "1.3"],
          remediation: "Set minimum_tls_version to 1.2 or 1.3.",
          reference: "https://learn.microsoft.com/azure/app-service/tls-minimum-version",
        },
        resource: {
          type: "azurerm_linux_function_app",
          name: "example",
          address: "azurerm_linux_function_app.example",
          startLine: 0,
          attributes: new Map(),
        },
        actual: "1.0",
        expected: ["1.2", "1.3"],
        line: 0,
        startCharacter: 0,
        endCharacter: 1,
        message: "AZ-FUNC-007: Function apps must require modern TLS",
      },
      {
        outcome: "compliant",
        control: {
          id: "AZ-FUNC-001",
          title: "Function apps must require HTTPS",
          description: "Function Apps must require HTTPS.",
          severity: "error",
          resourceTypes: ["azurerm_linux_function_app"],
          attribute: "https_only",
          operator: "equals",
          expected: true,
        },
        resource: {
          type: "azurerm_linux_function_app",
          name: "example",
          startLine: 0,
          attributes: new Map(),
        },
        actual: true,
        expected: true,
        line: 0,
        startCharacter: 0,
        endCharacter: 1,
        message: "AZ-FUNC-001: Function apps must require HTTPS",
      },
    ],
  },
];

describe("generateScanReportPdf", () => {
  it("creates a readable multi-section PDF report", async () => {
    const bytes = await generateScanReportPdf(results, {
      workspaceName: "production",
      generatedAt: new Date("2026-06-07T12:00:00Z"),
      logo: fs.readFileSync(
        path.resolve("media/azure-iac-guardrail.png"),
      ),
    });
    const pdf = await PDFDocument.load(bytes);

    expect(bytes.slice(0, 4)).toEqual(
      new Uint8Array([0x25, 0x50, 0x44, 0x46]),
    );
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(4);
    expect(pdf.getTitle()).toBe("Azure IaC Guardrail Scan Report");
  });

  it("paginates detailed findings with long text", async () => {
    const longText =
      "Configure the service using private networking, customer-managed encryption, diagnostic settings, restricted ingress, managed identity, and an approved operational ownership model. ".repeat(
        4,
      );
    const longResults: FileScanResult[] = [
      {
        ...results[0],
        findings: Array.from({ length: 8 }, (_, index) => ({
          ...results[0].findings[0],
          control: {
            ...results[0].findings[0].control,
            id: `AZ-LONG-${index}`,
            title: `Production control with a long reference https://example.invalid/${"segment".repeat(30)}`,
            description: longText,
            remediation: longText,
          },
          resource: {
            ...results[0].findings[0].resource,
            address: `module.${"nested_module_".repeat(12)}.azurerm_linux_function_app.example_${index}`,
          },
          actual: { value: longText },
          expected: [longText, "approved"],
        })),
      },
    ];

    const bytes = await generateScanReportPdf(longResults);
    const pdf = await PDFDocument.load(bytes);

    expect(pdf.getPageCount()).toBeGreaterThan(8);
  });
});

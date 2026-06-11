import { describe, expect, it } from "vitest";
import { generateEvidencePack } from "../../src/core/evidencePack";
import type { FileScanResult } from "../../src/core/resultsHtml";

describe("generateEvidencePack", () => {
  it("exports architecture risk and governed exceptions", () => {
    const results: FileScanResult[] = [
      {
        scanKind: "plan",
        filePath: "plan.tfplan",
        findings: [],
        analysis: {
          nodes: [],
          edges: [],
          changes: {
            create: 1,
            update: 0,
            delete: 0,
            replace: 0,
            "no-op": 0,
            read: 0,
          },
          blastRadius: [],
          riskScore: 25,
        },
      },
    ];
    const pack = generateEvidencePack(results, {
      workspaceName: "production",
      generatedAt: new Date("2026-06-08T10:00:00Z"),
      profile: {
        version: 1,
        terraformRoot: ".",
        terraformVersion: ">= 1.8.0, < 2.0.0",
        allowedRegions: ["uksouth", "ukwest"],
        costAssumptions: {
          currency: "GBP",
          monthlyStorageGb: 5,
          monthlyReadOperations: 200000,
          monthlyWriteOperations: 20000,
          monthlyEgressGb: 1,
        },
        requiredTags: ["owner"],
        tagValues: {},
        skippedControlIds: [],
        exceptions: [
          {
            controlId: "AZ-AI-003",
            owner: "platform",
            justification: "Migration",
            expiresOn: "2026-12-31",
          },
        ],
      },
    });

    expect(pack.json).toContain('"riskScore": 25');
    expect(pack.json).toContain('"status": "active"');
    expect(pack.markdown).toContain("AZ-AI-003");
    expect(pack.markdown).toContain("Local-only");
  });
});

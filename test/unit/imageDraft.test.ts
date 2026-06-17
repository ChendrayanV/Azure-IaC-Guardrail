import { describe, expect, it } from "vitest";
import { extractImageDraft } from "../../src/core/imageDraft";

describe("image draft extraction", () => {
  it("detects Azure services from svg labels", () => {
    const draft = extractImageDraft(
      "architecture.svg",
      `
        <svg xmlns="http://www.w3.org/2000/svg">
          <text>Virtual Network</text>
          <text>Subnet</text>
          <text>Function App</text>
          <text>SQL Database</text>
        </svg>
      `,
    );

    expect(draft.source).toBe("svg-text");
    expect(draft.suggestions.map((item) => item.serviceType)).toEqual(
      expect.arrayContaining([
        "virtual_network",
        "subnet",
        "functions",
        "sql_database",
      ]),
    );
  });

  it("falls back to filename heuristics for raster images", () => {
    const draft = extractImageDraft(
      "web-app-storage-account.png",
      undefined,
    );

    expect(draft.source).toBe("filename");
    expect(draft.suggestions.map((item) => item.serviceType)).toEqual(
      expect.arrayContaining(["web_app", "storage_account"]),
    );
    expect(draft.notes.join(" ")).toContain("filename-only heuristics");
  });
});

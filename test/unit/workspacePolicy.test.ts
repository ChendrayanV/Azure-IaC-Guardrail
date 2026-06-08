import { describe, expect, it } from "vitest";
import {
  createWorkspacePolicyControls,
  defaultWorkspacePolicy,
  normalizeWorkspacePolicy,
} from "../../src/controls/workspacePolicy";

describe("workspace policy", () => {
  it("provides the recommended Azure tag defaults", () => {
    expect(defaultWorkspacePolicy()).toEqual({
      version: 1,
      requiredTags: [
        "environment",
        "cost-center",
        "owner",
        "deployed-via",
      ],
      tagValues: { "deployed-via": "terraform" },
      skippedControlIds: [],
      exceptions: [],
    });
  });

  it("normalizes duplicate tag entries", () => {
    const profile = normalizeWorkspacePolicy({
      requiredTags: ["owner", " owner ", ""],
      tagValues: { managed_by: " terraform " },
      skippedControlIds: ["az-ai-003", " AZ-AI-004 ", "az-ai-003"],
      exceptions: [
        {
          controlId: "az-stor-001",
          owner: "platform-team",
          justification: "Migration window",
          expiresOn: "2027-01-31",
          ticket: "SEC-42",
        },
      ],
    });

    expect(profile.requiredTags).toEqual(["owner"]);
    expect(profile.tagValues).toEqual({ managed_by: "terraform" });
    expect(profile).toEqual({
      version: 1,
      requiredTags: ["owner"],
      tagValues: { managed_by: "terraform" },
      skippedControlIds: ["AZ-AI-003", "AZ-AI-004"],
      exceptions: [
        {
          controlId: "AZ-STOR-001",
          owner: "platform-team",
          justification: "Migration window",
          expiresOn: "2027-01-31",
          ticket: "SEC-42",
        },
      ],
    });
  });

  it("creates resolved-plan controls for required and fixed tags", () => {
    const profile = normalizeWorkspacePolicy({
      requiredTags: ["owner", "managed_by"],
      tagValues: { managed_by: "terraform" },
      skippedControlIds: [],
      exceptions: [],
    });
    const controls = createWorkspacePolicyControls(profile);

    expect(controls).toHaveLength(2);
    expect(controls.find((item) => item.attribute === "tags.owner")).toMatchObject({
      operator: "exists",
      planOnly: true,
      skipStatic: true,
      severity: "error",
    });
    expect(
      controls.find((item) => item.attribute === "tags.managed_by"),
    ).toMatchObject({
      operator: "equals",
      expected: "terraform",
    });
  });

  it("rejects malformed skipped control IDs", () => {
    expect(() =>
      normalizeWorkspacePolicy({
        requiredTags: [],
        tagValues: {},
        skippedControlIds: ["not a control"],
        exceptions: [],
      }),
    ).toThrow("AZ-AI-003");
  });
});

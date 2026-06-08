import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Control } from "../types";

export const WORKSPACE_POLICY_PATH = path.join(
  ".azure-iac-guardrail",
  "profile.json",
);

export const DEFAULT_TAGGABLE_RESOURCE_TYPES = [
  "azurerm_resource_group",
  "azurerm_container_registry",
  "azurerm_storage_account",
  "azurerm_key_vault",
  "azurerm_linux_function_app",
  "azurerm_windows_function_app",
  "azurerm_function_app_flex_consumption",
  "azurerm_linux_web_app",
  "azurerm_windows_web_app",
  "azurerm_postgresql_flexible_server",
  "azurerm_mysql_flexible_server",
  "azurerm_mssql_server",
  "azurerm_cosmosdb_account",
  "azurerm_kubernetes_cluster",
  "azurerm_virtual_network",
  "azurerm_network_security_group",
  "azurerm_public_ip",
  "azurerm_firewall",
  "azurerm_application_gateway",
  "azurerm_cognitive_account",
  "azurerm_machine_learning_workspace",
  "azurerm_log_analytics_workspace",
  "azurerm_servicebus_namespace",
  "azurerm_eventhub_namespace",
  "azurerm_linux_virtual_machine",
  "azurerm_windows_virtual_machine",
];

export interface WorkspacePolicyProfile {
  version: 1;
  requiredTags: string[];
  tagValues: Record<string, string>;
  skippedControlIds: string[];
  exceptions: GovernedException[];
}

export interface GovernedException {
  controlId: string;
  owner: string;
  justification: string;
  expiresOn: string;
  ticket?: string;
}

export function defaultWorkspacePolicy(): WorkspacePolicyProfile {
  return {
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
  };
}

export async function loadWorkspacePolicy(
  workspacePath: string,
): Promise<WorkspacePolicyProfile | undefined> {
  try {
    const content = await fs.readFile(
      path.join(workspacePath, WORKSPACE_POLICY_PATH),
      "utf8",
    );
    return normalizeWorkspacePolicy(JSON.parse(content) as unknown);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return undefined;
    }
    throw error;
  }
}

export function normalizeWorkspacePolicy(
  input: unknown,
): WorkspacePolicyProfile {
  if (!input || typeof input !== "object") {
    throw new Error("Workspace policy must be a JSON object.");
  }
  const value = input as Record<string, unknown>;

  return {
    version: 1,
    requiredTags: uniqueStrings(value.requiredTags, "requiredTags"),
    tagValues: stringRecord(value.tagValues),
    skippedControlIds: normalizeControlIds(value.skippedControlIds),
    exceptions: normalizeExceptions(value.exceptions),
  };
}

export function createWorkspacePolicyControls(
  profile: WorkspacePolicyProfile,
): Control[] {
  const tagKeys = new Set([
    ...profile.requiredTags,
    ...Object.keys(profile.tagValues),
  ]);
  return [...tagKeys].map((tagKey) => {
    const expected = profile.tagValues[tagKey];
    const requiresValue = expected !== undefined;
    return {
      id: `ORG-TAG-${stableId(tagKey)}`,
      title: requiresValue
        ? `Tag ${tagKey} must equal ${expected}`
        : `Tag ${tagKey} is required`,
      description: requiresValue
        ? `Organization policy requires the ${tagKey} tag to have the configured value.`
        : `Organization policy requires the ${tagKey} tag on supported Azure resources.`,
      severity: "error",
      resourceTypes: DEFAULT_TAGGABLE_RESOURCE_TYPES,
      attribute: `tags.${tagKey}`,
      operator: requiresValue ? "equals" : "exists",
      expected,
      remediation: requiresValue
        ? `Set tags.${tagKey} to "${expected}".`
        : `Add the ${tagKey} tag with an appropriate value.`,
      reference:
        "https://learn.microsoft.com/azure/azure-resource-manager/management/tag-resources",
      planOnly: true,
      skipStatic: true,
    };
  });
}

function uniqueStrings(value: unknown, field: string): string[] {
  if (value === undefined) {
    return [];
  }
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string")
  ) {
    throw new Error(`Workspace policy ${field} must be a string array.`);
  }
  return [
    ...new Set(
      value.map((item) => item.trim()).filter((item) => item.length > 0),
    ),
  ];
}

function stringRecord(value: unknown): Record<string, string> {
  if (value === undefined) {
    return {};
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Workspace policy tagValues must be an object.");
  }
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== "string") {
      throw new Error("Workspace policy tagValues must contain strings.");
    }
    if (key.trim() && item.trim()) {
      result[key.trim()] = item.trim();
    }
  }
  return result;
}

function normalizeControlIds(value: unknown): string[] {
  const ids = uniqueStrings(value, "skippedControlIds").map((id) =>
    id.toUpperCase(),
  );
  const invalid = ids.find((id) => !/^[A-Z0-9]+(?:-[A-Z0-9]+)+$/.test(id));
  if (invalid) {
    throw new Error(
      `Skipped control ID "${invalid}" is invalid. Use IDs such as AZ-AI-003.`,
    );
  }
  return ids;
}

function normalizeExceptions(value: unknown): GovernedException[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error("Workspace policy exceptions must be an array.");
  }
  return value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Exception ${index + 1} must be an object.`);
    }
    const entry = item as Record<string, unknown>;
    const controlId = String(entry.controlId ?? "").trim().toUpperCase();
    const owner = String(entry.owner ?? "").trim();
    const justification = String(entry.justification ?? "").trim();
    const expiresOn = String(entry.expiresOn ?? "").trim();
    const ticket = String(entry.ticket ?? "").trim();
    if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)+$/.test(controlId)) {
      throw new Error(`Exception ${index + 1} has an invalid control ID.`);
    }
    if (!owner || !justification || !/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)) {
      throw new Error(
        `Exception ${controlId} requires owner, justification, and expiry date.`,
      );
    }
    return {
      controlId,
      owner,
      justification,
      expiresOn,
      ...(ticket ? { ticket } : {}),
    };
  });
}

function stableId(value: string): string {
  const slug = value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return `${slug || "TAG"}-${hash.toString(16).toUpperCase()}`;
}

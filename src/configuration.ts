import * as vscode from "vscode";

const CURRENT_NAMESPACE = "azureIacGuardrail";
const LEGACY_NAMESPACES = ["azureCodeGuard", "infraCompliance"];

export function getConfigurationValue<T>(
  uri: vscode.Uri,
  key: string,
  fallback?: T,
): T | undefined {
  const current = inspectConfiguredValue<T>(CURRENT_NAMESPACE, uri, key);
  if (current !== undefined) {
    return current;
  }

  for (const namespace of LEGACY_NAMESPACES) {
    const legacy = vscode.workspace
      .getConfiguration(namespace, uri)
      .get<T>(key);
    if (legacy !== undefined) {
      return legacy;
    }
  }

  return fallback;
}

function inspectConfiguredValue<T>(
  namespace: string,
  uri: vscode.Uri,
  key: string,
): T | undefined {
  const inspected = vscode.workspace
    .getConfiguration(namespace, uri)
    .inspect<T>(key);
  return (
    inspected?.workspaceFolderValue ??
    inspected?.workspaceValue ??
    inspected?.globalValue
  );
}

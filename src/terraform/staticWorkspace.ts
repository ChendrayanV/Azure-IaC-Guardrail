import * as vscode from "vscode";
import { loadWorkspacePolicy } from "../controls/workspacePolicy";
import { loadStaticModuleWorkspace } from "../core/staticModules";
import { resolveConfiguredTerraformRoot } from "./terraformRoot";

export async function loadStaticWorkspace(
  workspaceFolder: vscode.WorkspaceFolder,
): Promise<{
  workspacePath: string;
  terraformSources: Array<{
    uri: string;
    source: {
      path: string;
      content: string;
    };
    context: Awaited<
      ReturnType<typeof loadStaticModuleWorkspace>
    >["sources"][number]["context"];
    moduleAddress?: string;
  }>;
  issues: Awaited<
    ReturnType<typeof loadStaticModuleWorkspace>
  >["issues"];
}> {
  const profile = await loadWorkspacePolicy(workspaceFolder.uri.fsPath);
  const terraformRoot = resolveConfiguredTerraformRoot(
    workspaceFolder.uri.fsPath,
    profile?.terraformRoot ?? ".",
  );
  const configured = vscode.workspace
    .getConfiguration("azureIacGuardrail", workspaceFolder.uri)
    .get<string[]>("staticVarFiles", []);
  const workspace = await loadStaticModuleWorkspace(
    terraformRoot,
    configured,
  );

  return {
    workspacePath: terraformRoot,
    terraformSources: workspace.sources.map((entry) => ({
      uri: vscode.Uri.file(entry.filePath).toString(),
      source: {
        path: entry.displayPath,
        content: entry.content,
      },
      context: entry.context,
      moduleAddress: entry.moduleAddress,
    })),
    issues: workspace.issues,
  };
}

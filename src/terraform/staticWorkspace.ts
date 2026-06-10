import * as path from "node:path";
import * as vscode from "vscode";
import {
  createStaticResolutionContext,
  type StaticSource,
} from "../core/staticResolution";

export async function loadStaticWorkspace(
  workspaceFolder: vscode.WorkspaceFolder,
): Promise<{
  terraformSources: Map<string, StaticSource>;
  variableSources: StaticSource[];
  context: ReturnType<typeof createStaticResolutionContext>;
}> {
  const terraformUris = await vscode.workspace.findFiles(
    new vscode.RelativePattern(workspaceFolder, "**/*.tf"),
    "**/{.terraform,node_modules}/**",
  );
  const terraformSources = new Map(
    await Promise.all(
      terraformUris.map(async (uri) => [
        uri.toString(),
        {
          path: vscode.workspace.asRelativePath(uri, false),
          content: new TextDecoder("utf-8").decode(
            await vscode.workspace.fs.readFile(uri),
          ),
        },
      ] as const),
    ),
  );

  const configured = vscode.workspace
    .getConfiguration("azureIacGuardrail", workspaceFolder.uri)
    .get<string[]>("staticVarFiles", []);
  const automaticUris = await vscode.workspace.findFiles(
    new vscode.RelativePattern(
      workspaceFolder,
      "{terraform.tfvars,*.auto.tfvars,*.auto.tfvars.json}",
    ),
    "**/{.terraform,node_modules}/**",
  );
  const configuredUris = configured.map((file) =>
    vscode.Uri.file(path.resolve(workspaceFolder.uri.fsPath, file)),
  );
  const uniqueVariableUris = new Map(
    [...automaticUris, ...configuredUris].map((uri) => [uri.fsPath, uri]),
  );
  const variableSources = (
    await Promise.all(
      [...uniqueVariableUris.values()].map(async (uri) => {
        try {
          return {
            path: vscode.workspace.asRelativePath(uri, false),
            content: new TextDecoder("utf-8").decode(
              await vscode.workspace.fs.readFile(uri),
            ),
          };
        } catch {
          return undefined;
        }
      }),
    )
  ).filter((source): source is StaticSource => source !== undefined);

  return {
    terraformSources,
    variableSources,
    context: createStaticResolutionContext(
      [...terraformSources.values()],
      variableSources,
    ),
  };
}

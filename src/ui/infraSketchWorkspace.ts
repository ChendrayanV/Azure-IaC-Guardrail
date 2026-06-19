import * as vscode from "vscode";
import {
  normalizeInfraSketch,
  type InfraSketch,
  type SketchReferenceImage,
} from "../core/infraSketch";

const SKETCH_PATH = ".azure-iac-guardrail/sketchyourinfra.json";

export async function loadSketch(
  workspace: vscode.Uri,
): Promise<InfraSketch> {
  try {
    const content = await vscode.workspace.fs.readFile(
      vscode.Uri.joinPath(workspace, SKETCH_PATH),
    );
    const raw = new TextDecoder().decode(content);
    try {
      return normalizeInfraSketch(JSON.parse(raw) as unknown);
    } catch (parseError) {
      throw new Error(
        `Cloud Canvas saved sketch is invalid JSON in ${SKETCH_PATH}. The file may be incomplete or corrupted. Fix or remove that file, then reopen Cloud Canvas. Details: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      );
    }
  } catch (error) {
    if (
      !(error instanceof vscode.FileSystemError) ||
      error.code !== "FileNotFound"
    ) {
      throw error;
    }
    return { version: 1, nodes: [], connections: [] };
  }
}

export async function saveSketch(
  workspace: vscode.Uri,
  sketch: InfraSketch,
): Promise<void> {
  const directory = vscode.Uri.joinPath(
    workspace,
    ".azure-iac-guardrail",
  );
  await vscode.workspace.fs.createDirectory(directory);
  await vscode.workspace.fs.writeFile(
    vscode.Uri.joinPath(workspace, SKETCH_PATH),
    new TextEncoder().encode(
      `${JSON.stringify(serializableSketch(sketch), null, 2)}\n`,
    ),
  );
}

export function attachReferenceImageUri(
  webview: vscode.Webview,
  workspace: vscode.Uri,
  sketch: InfraSketch,
): InfraSketch & {
  referenceImage?: SketchReferenceImage & { uri?: string };
} {
  if (!sketch.referenceImage) {
    return sketch;
  }
  const imageUri = vscode.Uri.joinPath(workspace, sketch.referenceImage.path);
  return {
    ...sketch,
    referenceImage: {
      ...sketch.referenceImage,
      uri: webview.asWebviewUri(imageUri).toString(),
    },
  };
}

export async function selectWorkspaceFolder(): Promise<
  vscode.WorkspaceFolder | undefined
> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 0) {
    void vscode.window.showWarningMessage(
      "Open a workspace before sketching Azure infrastructure.",
    );
    return undefined;
  }
  return folders.length === 1
    ? folders[0]
    : vscode.window.showWorkspaceFolderPick({
        placeHolder: "Select the workspace for generated Terraform",
      });
}

function serializableSketch(sketch: InfraSketch): InfraSketch {
  return {
    version: 1,
    nodes: sketch.nodes,
    connections: sketch.connections,
    ...(sketch.referenceImage
      ? {
          referenceImage: {
            path: sketch.referenceImage.path,
            x: sketch.referenceImage.x,
            y: sketch.referenceImage.y,
            width: sketch.referenceImage.width,
            ...(sketch.referenceImage.opacity !== undefined
              ? { opacity: sketch.referenceImage.opacity }
              : {}),
          },
        }
      : {}),
  };
}

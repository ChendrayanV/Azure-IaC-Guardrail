import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";
import { loadControls } from "../controls/catalog";
import { loadWorkspacePolicy } from "../controls/workspacePolicy";
import {
  generateTerraformFromSketch,
  normalizeInfraSketch,
  SKETCH_PARAMETER_DEFINITIONS,
  SKETCH_SERVICES,
  type InfraSketch,
} from "../core/infraSketch";
import { scanTerraform } from "../core/scanner";
import serviceStatus from "../data/cloudCanvasServiceStatus.json";
import {
  terraformPathFor,
  validateTerraformConfiguration,
} from "../terraform/terraformCli";
import type { ResultsPanel } from "./resultsPanel";

const SKETCH_PATH = ".azure-iac-guardrail/sketchyourinfra.json";

export class InfraSketchPanel implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private workspaceFolder: vscode.WorkspaceFolder | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly resultsPanel: ResultsPanel,
  ) {}

  async show(selectedFolder?: vscode.WorkspaceFolder): Promise<void> {
    const folder = selectedFolder ?? (await selectWorkspaceFolder());
    if (!folder) {
      return;
    }
    this.workspaceFolder = folder;
    const sketch = await loadSketch(folder.uri);
    const panel = this.getOrCreatePanel();
    panel.title = `Cloud Canvas: ${folder.name}`;
    const montserratUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "media",
        "fonts",
        "Montserrat-VariableFont_wght.ttf",
      ),
    );
    panel.webview.html = renderSketchHtml(
      sketch,
      createNonce(),
      montserratUri.toString(),
      panel.webview.cspSource,
    );
    panel.reveal(vscode.ViewColumn.Active, false);
  }

  dispose(): void {
    this.panel?.dispose();
  }

  private getOrCreatePanel(): vscode.WebviewPanel {
    if (!this.panel) {
      const panel = vscode.window.createWebviewPanel(
        "infraCompliance.sketchYourInfra",
        "Cloud Canvas",
        vscode.ViewColumn.Active,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            vscode.Uri.joinPath(this.context.extensionUri, "media"),
          ],
        },
      );
      panel.onDidDispose(() => {
        this.panel = undefined;
      });
      panel.webview.onDidReceiveMessage((message: unknown) => {
        void this.handleMessage(message);
      });
      this.panel = panel;
    }
    return this.panel;
  }

  private async handleMessage(message: unknown): Promise<void> {
    if (!isSketchMessage(message) || !this.workspaceFolder) {
      return;
    }
    try {
      const sketch = normalizeInfraSketch(message.sketch);
      if (message.type === "exportPng") {
        const destination = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.joinPath(
            this.workspaceFolder.uri,
            "azure-architecture.png",
          ),
          filters: { PNG: ["png"] },
          saveLabel: "Export PNG",
          title: "Export Azure architecture diagram",
        });
        if (!destination) {
          return;
        }
        await vscode.workspace.fs.writeFile(
          destination,
          Uint8Array.from(Buffer.from(message.data, "base64")),
        );
        void vscode.window.showInformationMessage(
          `Architecture diagram exported to ${vscode.workspace.asRelativePath(destination, false)}.`,
        );
        return;
      }
      const policy = await loadWorkspacePolicy(
        this.workspaceFolder.uri.fsPath,
      );
      const terraform = generateTerraformFromSketch(
        sketch,
        policy?.terraformVersion,
      );
      if (message.type === "validateTerraform") {
        const controls = await loadControls(this.context);
        const findings = scanTerraform(terraform, controls);
        this.resultsPanel.setRescanHandler();
        this.resultsPanel.show([
          {
            scanKind: "static",
            filePath: "Cloud Canvas/cloud-canvas.generated.tf",
            findings,
          },
        ]);
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Validating Cloud Canvas Terraform",
            cancellable: false,
          },
          async () => {
            const directory = await fs.mkdtemp(
              path.join(os.tmpdir(), "cloud-canvas-"),
            );
            try {
              await fs.writeFile(
                path.join(directory, "main.tf"),
                terraform,
                "utf8",
              );
              const result = await validateTerraformConfiguration(
                terraformPathFor(this.workspaceFolder!.uri),
                directory,
              );
              const noncompliant = findings.filter(
                (finding) => finding.outcome === "noncompliant",
              ).length;
              const unresolved = findings.filter(
                (finding) => finding.outcome === "unresolved",
              ).length;
              void vscode.window.showInformationMessage(
                `${result.trim() || "Cloud Canvas Terraform is valid."} Static scan: ${noncompliant} noncompliant, ${unresolved} unresolved.`,
              );
            } finally {
              await fs.rm(directory, { recursive: true, force: true });
            }
          },
        );
        return;
      }
      if (message.type === "previewTerraform") {
        const document = await vscode.workspace.openTextDocument({
          language: "terraform",
          content: terraform,
        });
        await vscode.window.showTextDocument(
          document,
          vscode.ViewColumn.Beside,
          true,
        );
        return;
      }
      const destination = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.joinPath(
          this.workspaceFolder.uri,
          "sketchyourinfra.generated.tf",
        ),
        filters: { Terraform: ["tf"] },
        saveLabel: "Generate Terraform",
        title: "Generate Terraform from infrastructure sketch",
      });
      if (!destination) {
        return;
      }
      await vscode.workspace.fs.writeFile(
        destination,
        new TextEncoder().encode(terraform),
      );
      await saveSketch(this.workspaceFolder.uri, sketch);
      const document = await vscode.workspace.openTextDocument(destination);
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      void vscode.window.showInformationMessage(
        `Terraform generated at ${vscode.workspace.asRelativePath(destination, false)}. Review it before planning.`,
      );
    } catch (error) {
      void vscode.window.showErrorMessage(
        `Cloud Canvas: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

type SketchMessage =
  | { type: "exportPng"; sketch: unknown; data: string }
  | { type: "validateTerraform"; sketch: unknown }
  | { type: "previewTerraform"; sketch: unknown }
  | { type: "generateTerraform"; sketch: unknown };

function isSketchMessage(message: unknown): message is SketchMessage {
  if (!message || typeof message !== "object") {
    return false;
  }
  const value = message as Partial<SketchMessage>;
  return (
    [
      "exportPng",
      "validateTerraform",
      "previewTerraform",
      "generateTerraform",
    ].includes(
      value.type ?? "",
    ) &&
    "sketch" in value &&
    (value.type !== "exportPng" ||
      typeof (value as Partial<{ data: string }>).data === "string")
  );
}

async function loadSketch(workspace: vscode.Uri): Promise<InfraSketch> {
  try {
    const content = await vscode.workspace.fs.readFile(
      vscode.Uri.joinPath(workspace, SKETCH_PATH),
    );
    return normalizeInfraSketch(
      JSON.parse(new TextDecoder().decode(content)) as unknown,
    );
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

async function saveSketch(
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
    new TextEncoder().encode(`${JSON.stringify(sketch, null, 2)}\n`),
  );
}

async function selectWorkspaceFolder(): Promise<
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

function renderSketchHtml(
  sketch: InfraSketch,
  nonce: string,
  montserratUri: string,
  cspSource: string,
): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${cspSource}; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>Cloud Canvas</title>
  <style nonce="${nonce}">
    @font-face { font-family: "Montserrat"; src: url("${montserratUri}") format("truetype"); font-style: normal; font-weight: 100 900; font-display: swap; }
    :root { color-scheme: light; --azure: #1683ff; --ink: #171717; --muted: #77808c; --line: #d8dde5; --panel: #f4f5f7; }
    * { box-sizing: border-box; }
    body { margin: 0; overflow: hidden; color: var(--ink); background: #fff; font-family: "Montserrat", "Segoe UI", var(--vscode-font-family), sans-serif; }
    button, input, select { font: inherit; }
    .shell { display: grid; grid-template-columns: 350px minmax(0, 1fr); height: 100vh; }
    .palette { min-height: 0; overflow: auto; padding: 20px 16px 28px; border-right: 1px solid #d7dce3; background: #f3f3f3; }
    .brand { padding: 5px 6px 24px; }
    .brand h1 { margin: 0; font-size: 25px; font-weight: 650; }
    .palette-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin: 0 4px 18px; padding: 4px; border: 1px solid #d5dbe3; border-radius: 7px; background: #e7e9ec; }
    .palette-tab { min-height: 38px; border: 0; border-radius: 5px; color: #59636f; background: transparent; cursor: pointer; font-size: 12px; font-weight: 700; }
    .palette-tab.active { color: #075ea8; background: #fff; box-shadow: 0 2px 7px #17203318; }
    .palette-view[hidden] { display: none; }
    .pattern-intro { margin: 0 6px 14px; color: #65707c; font-size: 12px; line-height: 1.5; }
    .pattern-list { display: grid; gap: 10px; }
    .pattern-card { width: 100%; padding: 14px; border: 1px solid #d7dce3; border-radius: 7px; color: #202833; background: #fff; text-align: left; cursor: pointer; box-shadow: 0 2px 7px #1720330d; }
    .pattern-card:hover { border-color: #62a7e8; box-shadow: 0 5px 14px #1683ff1d; transform: translateY(-1px); }
    .pattern-card-head { display: flex; gap: 10px; align-items: center; }
    .pattern-icon { display: grid; width: 34px; height: 34px; flex: 0 0 34px; place-items: center; border-radius: 9px; color: #fff; background: linear-gradient(145deg, #1683ff, #6657c8); font-size: 10px; font-weight: 800; }
    .pattern-card strong { display: block; font-size: 14px; }
    .pattern-card small { display: block; margin-top: 4px; color: #7b8591; font-size: 10px; line-height: 1.4; }
    .pattern-services { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 11px; }
    .pattern-services span { padding: 3px 6px; border-radius: 999px; color: #4e6073; background: #edf3f8; font-size: 9px; font-weight: 700; }
    .blank-action { width: 100%; min-height: 40px; margin-bottom: 14px; border: 1px solid #1683ff; border-radius: 5px; color: #075ea8; background: #eaf4ff; cursor: pointer; font-weight: 700; }
    .search-wrap { position: relative; margin-bottom: 18px; }
    .search-wrap::before { content: ""; position: absolute; left: 16px; top: 15px; width: 13px; height: 13px; border: 1.8px solid #768394; border-radius: 50%; }
    .search-wrap::after { content: ""; position: absolute; left: 28px; top: 28px; width: 8px; height: 2px; background: #768394; transform: rotate(45deg); }
    #search { width: 100%; height: 52px; padding: 0 15px 0 50px; border: 1px solid #d5dbe3; border-radius: 5px; outline: none; color: #111; background: #fff; font-size: 17px; }
    #search:focus { border-color: var(--azure); box-shadow: 0 0 0 2px #1683ff22; }
    .category { border-bottom: 1px solid transparent; }
    .category-toggle { display: grid; grid-template-columns: 34px 1fr 18px; width: 100%; min-height: 58px; align-items: center; padding: 0 8px; border: 0; color: #202020; background: transparent; text-align: left; cursor: pointer; font-size: 17px; }
    .category-toggle:hover { background: #e9eaec; }
    .category-icon { display: grid; place-items: center; width: 24px; height: 24px; border: 1.6px solid #30343a; border-radius: 5px; font-size: 8px; font-weight: 800; }
    .chevron { width: 9px; height: 9px; border-right: 1.7px solid currentColor; border-bottom: 1.7px solid currentColor; transform: rotate(45deg) translateY(-3px); transition: transform .15s ease; }
    .category.open .chevron { transform: rotate(225deg) translate(-2px, -1px); }
    .service-list { display: none; gap: 9px; padding: 2px 0 14px; }
    .category.open .service-list { display: grid; }
    .service { position: relative; display: grid; grid-template-columns: 12px 42px 1fr; gap: 10px; min-height: 66px; align-items: center; padding: 8px 10px; border: 1px solid #d7dce3; border-radius: 3px; background: #fff; box-shadow: 0 1px 1px #00000008; cursor: grab; }
    .service:hover { border-color: #8abcf0; box-shadow: 0 2px 6px #00000012; }
    .grip { color: #89929d; font-size: 16px; line-height: 10px; letter-spacing: -1px; }
    .service-icon, .node-icon { display: grid; place-items: center; color: #fff; background: var(--service-color); font-size: 10px; font-weight: 800; }
    .service-icon { width: 34px; height: 34px; border-radius: 50%; box-shadow: inset 0 0 0 2px #ffffff44; }
    .service-copy { min-width: 0; }
    .service-copy strong { display: block; overflow: hidden; color: #111; font-size: 16px; text-overflow: ellipsis; white-space: nowrap; }
    .service-copy small { display: block; overflow: hidden; margin-top: 5px; color: #87909b; font-size: 10px; font-weight: 700; letter-spacing: .15px; text-overflow: ellipsis; white-space: nowrap; }
    .diagram-key { margin: 18px 4px 0; padding: 12px; border: 1px solid #d7dce3; border-radius: 5px; background: #fff; color: #56606c; font-size: 11px; line-height: 1.45; }
    .diagram-key strong { display: block; margin-bottom: 8px; color: #202833; font-size: 12px; }
    .key-row { display: flex; align-items: center; gap: 7px; margin-top: 6px; }
    .status-dot { display: inline-block; width: 11px; height: 11px; flex: 0 0 11px; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 0 1px #9aa4af; }
    .status-dot.approved { background: #22a447; }
    .status-dot.under-review { background: #f5c542; }
    .status-dot.not-approved { background: #d92d20; }
    .workspace { position: relative; min-width: 0; min-height: 0; overflow: hidden; background: #fff; }
    .toolbar { position: absolute; z-index: 20; top: 14px; left: 16px; right: 16px; display: flex; justify-content: space-between; gap: 12px; pointer-events: none; }
    .toolbar-group { display: flex; gap: 7px; padding: 6px; border: 1px solid #d9dee5; border-radius: 7px; background: #ffffffed; box-shadow: 0 5px 18px #17203316; pointer-events: auto; backdrop-filter: blur(8px); }
    .toolbar button { min-height: 34px; padding: 0 12px; border: 0; border-radius: 4px; color: #26313f; background: transparent; cursor: pointer; font-size: 12px; font-weight: 600; }
    .toolbar button:hover { background: #edf4fc; color: #0067b8; }
    .toolbar button.primary { color: #fff; background: #0078d4; }
    .toolbar button.active { color: #fff; background: #6657c8; }
    .canvas-wrap { width: 100%; height: 100%; overflow: auto; touch-action: none; background-color: #fff; background-image: radial-gradient(#cfd5dc 1px, transparent 1px); background-size: 16px 16px; cursor: grab; }
    .canvas-wrap.panning { cursor: grabbing; }
    #canvas { position: relative; width: 2400px; height: 1500px; }
    #connections { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
    .edge { fill: none; stroke: #4a90ff; stroke-width: 2; marker-end: url(#arrow); }
    .edge.preview { stroke-dasharray: 5 5; marker-end: none; }
    .edge-hit { fill: none; stroke: transparent; stroke-width: 14; pointer-events: stroke; cursor: pointer; }
    .node { position: absolute; width: 240px; height: 76px; border: 1px solid #d9dfe7; border-radius: 3px; background: #fff; box-shadow: 0 7px 15px #24364d16; cursor: move; user-select: none; }
    .node::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 12px; background: #eef3f8; }
    .node.selected { outline: 2px solid #1683ff; outline-offset: 2px; }
    .node-status { position: absolute; z-index: 6; top: -6px; left: -6px; }
    .node-head { position: relative; z-index: 1; display: grid; grid-template-columns: 38px 1fr; gap: 10px; align-items: center; height: 62px; padding: 8px 12px; }
    .node-icon { width: 30px; height: 30px; border-radius: 7px; }
    .node-copy { min-width: 0; }
    .node strong { display: block; overflow: hidden; font-size: 13px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
    .node small { display: block; overflow: hidden; margin-top: 3px; color: #7d8793; font-size: 8px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
    .port { position: absolute; z-index: 4; top: 28px; right: -7px; width: 14px; height: 14px; padding: 0; border: 2px solid #fff; border-radius: 50%; background: #4a90ff; box-shadow: 0 0 0 1px #4a90ff; cursor: crosshair; opacity: 0; transition: opacity .12s; }
    .node:hover .port, .node.selected .port, body.connecting .port { opacity: 1; }
    .empty { position: absolute; top: 160px; left: 50%; width: 430px; transform: translateX(-50%); padding: 28px; border: 1px dashed #b7c1cc; border-radius: 8px; color: #66717e; background: #ffffffd9; text-align: center; }
    .empty strong { color: #26313f; font-size: 18px; }
    .empty p { margin: 8px 0 0; line-height: 1.5; }
    .inspector { position: absolute; z-index: 19; top: 72px; right: 16px; width: 300px; max-height: calc(100vh - 90px); overflow: auto; padding: 14px; border: 1px solid #d9dee5; border-radius: 6px; background: #ffffffef; box-shadow: 0 8px 24px #17203316; backdrop-filter: blur(8px); }
    .inspector h2 { margin: 0 0 11px; font-size: 13px; }
    .inspector-service { margin: -5px 0 12px; color: #65707c; font-size: 11px; }
    .parameter-heading { margin: 16px 0 2px; padding-top: 12px; border-top: 1px solid #e0e5eb; color: #26313f; font-size: 11px; text-transform: uppercase; }
    .parameter-empty { margin: 10px 0 0; color: #7b8591; font-size: 11px; line-height: 1.4; }
    .field { margin-top: 10px; }
    .field label { display: block; margin-bottom: 4px; color: #65707c; font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .field input, .field select { width: 100%; height: 32px; padding: 0 8px; border: 1px solid #ced5dd; border-radius: 3px; color: #111; background: #fff; }
    .field.checkbox { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .field.checkbox label { margin: 0; text-transform: none; }
    .field.checkbox input { width: 18px; height: 18px; flex: 0 0 18px; }
    .danger { width: 100%; margin-top: 12px; padding: 7px; border: 1px solid #d92d20; border-radius: 3px; color: #b42318; background: #fff; cursor: pointer; }
    @media (max-width: 900px) { .shell { grid-template-columns: 285px minmax(0, 1fr); } .palette { padding-left: 10px; padding-right: 10px; } .toolbar-group.optional { display: none; } }
  </style>
</head>
<body>
  <div class="shell">
    <aside class="palette">
      <div class="brand"><h1>Cloud Canvas</h1></div>
      <div class="palette-tabs" role="tablist" aria-label="Canvas starting point">
        <button class="palette-tab active" type="button" data-palette-tab="patterns" role="tab" aria-selected="true">Common Patterns</button>
        <button class="palette-tab" type="button" data-palette-tab="blank" role="tab" aria-selected="false">Blank Canvas</button>
      </div>
      <div class="palette-view" data-palette-view="patterns">
        <p class="pattern-intro">Choose a proven starting point, then rename, move, connect, or remove services on the canvas.</p>
        <div class="pattern-list">
          <button class="pattern-card" type="button" data-pattern="aks-shared">
            <span class="pattern-card-head"><span class="pattern-icon">AKS</span><span><strong>AKS shared cluster</strong><small>One private cluster with isolated team namespaces.</small></span></span>
            <span class="pattern-services"><span>AKS</span><span>3 namespaces</span><span>ACR</span><span>Log Analytics</span></span>
          </button>
          <button class="pattern-card" type="button" data-pattern="web-three-tier">
            <span class="pattern-card-head"><span class="pattern-icon">WEB</span><span><strong>Web App with database</strong><small>Three-tier application with networking, app compute, and SQL.</small></span></span>
            <span class="pattern-services"><span>VNet</span><span>Web App</span><span>SQL</span><span>Key Vault</span></span>
          </button>
          <button class="pattern-card" type="button" data-pattern="event-hubs">
            <span class="pattern-card-head"><span class="pattern-icon">EH</span><span><strong>Event Hubs streaming</strong><small>Private streaming ingestion with monitoring and storage.</small></span></span>
            <span class="pattern-services"><span>Event Hubs</span><span>Storage</span><span>Monitor</span></span>
          </button>
          <button class="pattern-card" type="button" data-pattern="event-grid">
            <span class="pattern-card-head"><span class="pattern-icon">EG</span><span><strong>Event Grid routing</strong><small>Event topic with producer, consumer, and observability.</small></span></span>
            <span class="pattern-services"><span>Event Grid</span><span>Worker App</span><span>Storage</span></span>
          </button>
          <button class="pattern-card" type="button" data-pattern="service-bus">
            <span class="pattern-card-head"><span class="pattern-icon">SB</span><span><strong>Service Bus messaging</strong><small>Enterprise queue pattern with worker and monitoring.</small></span></span>
            <span class="pattern-services"><span>Service Bus</span><span>Producer App</span><span>Worker App</span></span>
          </button>
        </div>
      </div>
      <div class="palette-view" data-palette-view="blank" hidden>
        <button id="startBlank" class="blank-action" type="button">Start a blank canvas</button>
        <div class="search-wrap"><input id="search" type="search" placeholder="Search Azure services" aria-label="Search Azure services"></div>
        <div id="categories"></div>
        <div class="diagram-key">
          <strong>Diagram key</strong>
          <div class="key-row"><span class="status-dot approved"></span><span>Approved service</span></div>
          <div class="key-row"><span class="status-dot under-review"></span><span>Service under review</span></div>
          <div class="key-row"><span class="status-dot not-approved"></span><span>Not approved or not yet reviewed</span></div>
          <p>A connection means the source service depends on the service at the arrowhead.</p>
          <p>Press and hold the blank canvas with the left mouse button to pan.</p>
        </div>
      </div>
    </aside>
    <main class="workspace">
      <div class="toolbar">
        <div class="toolbar-group optional">
          <button id="undo" type="button" title="Undo (Ctrl+Z)">Undo</button>
          <button id="redo" type="button" title="Redo (Ctrl+Y)">Redo</button>
          <button id="zoomOut" type="button" title="Zoom out (Ctrl+-)">Zoom -</button>
          <button id="zoomIn" type="button" title="Zoom in (Ctrl++)">Zoom +</button>
          <button id="twoWay" type="button">Two-way arrows</button>
          <button id="clearCanvas" type="button">Clear canvas</button>
        </div>
        <div class="toolbar-group">
          <button id="exportPng" type="button">Export PNG</button>
          <button id="validate" type="button">Validate + Static Scan</button>
          <button id="preview" type="button">Preview Terraform</button>
          <button id="generate" class="primary" type="button">Generate Terraform</button>
        </div>
      </div>
      <div class="canvas-wrap">
        <div id="canvas">
          <svg id="connections"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#4a90ff"></path></marker><marker id="arrowStart" markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto"><path d="M8,0 L0,4 L8,8 z" fill="#4a90ff"></path></marker></defs></svg>
          <div id="empty" class="empty"><strong>Build a cloud architecture</strong><p>Drag services from the catalog, connect them to define Terraform dependencies, and drag the blank canvas to move around.</p></div>
        </div>
      </div>
      <section id="inspector" class="inspector" hidden>
        <h2>Selected Azure service</h2>
        <p id="inspectorService" class="inspector-service"></p>
        <div class="field"><label for="nodeName">Resource name</label><input id="nodeName"></div>
        <div class="field"><label for="nodeRegion">Azure region</label><input id="nodeRegion" value="uksouth"></div>
        <h3 class="parameter-heading">Service parameters</h3>
        <div id="serviceParameters"></div>
        <button id="deleteNode" class="danger" type="button">Delete service</button>
      </section>
    </main>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const catalog = ${JSON.stringify(serviceCatalog())};
    const parameterDefinitions = ${safeJson(SKETCH_PARAMETER_DEFINITIONS)};
    let sketch = ${safeJson(sketch)};
    let selectedId = null;
    let connectionDraft = null;
    let bidirectionalConnections = false;
    let openCategories = new Set(['Networking']);
    let sequence = sketch.nodes.length + 1;
    let zoom = 1;
    let history = [JSON.stringify(sketch)];
    let historyIndex = 0;
    const canvas = document.getElementById("canvas");
    const canvasWrap = document.querySelector(".canvas-wrap");
    const svg = document.getElementById("connections");
    const categories = document.getElementById("categories");
    const search = document.getElementById("search");
    const nodeName = document.getElementById("nodeName");
    const nodeRegion = document.getElementById("nodeRegion");
    const serviceParameters = document.getElementById("serviceParameters");
    document.querySelectorAll("[data-palette-tab]").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll("[data-palette-tab]").forEach(item => {
          const active = item === tab;
          item.classList.toggle("active", active);
          item.setAttribute("aria-selected", String(active));
        });
        document.querySelectorAll("[data-palette-view]").forEach(view => {
          view.hidden = view.dataset.paletteView !== tab.dataset.paletteTab;
        });
      });
    });
    document.querySelectorAll("[data-pattern]").forEach(card => {
      card.addEventListener("click", () => loadPattern(card.dataset.pattern));
    });

    function renderPalette() {
      const term = search.value.trim().toLowerCase();
      const grouped = new Map();
      catalog.forEach(item => {
        if (term && !(item.title + ' ' + item.category + ' ' + item.description).toLowerCase().includes(term)) return;
        if (!grouped.has(item.category)) grouped.set(item.category, []);
        grouped.get(item.category).push(item);
      });
      categories.innerHTML = '';
      grouped.forEach((items, categoryName) => {
        const category = document.createElement('section');
        const isOpen = term.length > 0 || openCategories.has(categoryName);
        category.className = 'category' + (isOpen ? ' open' : '');
        const initials = categoryName.split(/\\s+/).filter(word => /[A-Za-z]/.test(word[0] || '')).slice(0, 2).map(word => word[0]).join('');
        category.innerHTML = '<button class="category-toggle" type="button"><span class="category-icon">' + escapeText(initials) + '</span><span>' + escapeText(categoryName) + '</span><span class="chevron"></span></button><div class="service-list"></div>';
        category.querySelector('.category-toggle').addEventListener('click', () => {
          if (openCategories.has(categoryName)) openCategories.delete(categoryName); else openCategories.add(categoryName);
          category.classList.toggle('open');
        });
        const list = category.querySelector('.service-list');
        items.forEach(item => {
          const card = document.createElement('div');
          card.className = 'service';
          card.draggable = true;
          card.dataset.type = item.type;
          card.style.setProperty('--service-color', item.color);
          card.innerHTML = '<span class="grip">::</span><span class="service-icon">' + escapeText(item.short) + '</span><span class="service-copy"><strong>' + escapeText(item.title) + '</strong><small>' + escapeText(item.description) + '</small></span>';
          card.addEventListener('dragstart', event => event.dataTransfer.setData('text/service', item.type));
          card.addEventListener('dblclick', () => addNode(item, 440, 160 + sketch.nodes.length * 28));
          list.appendChild(card);
        });
        categories.appendChild(category);
      });
    }

    function render() {
      canvas.style.zoom = zoom;
      canvas.querySelectorAll(".node").forEach(node => node.remove());
      document.getElementById("empty").hidden = sketch.nodes.length > 0;
      sketch.nodes.forEach(node => {
        const service = catalog.find(item => item.type === node.serviceType);
        if (!service) return;
        const card = document.createElement("div");
        card.className = "node" + (node.id === selectedId ? " selected" : "");
        card.dataset.id = node.id;
        card.style.left = node.x + "px";
        card.style.top = node.y + "px";
        card.style.setProperty("--service-color", service.color);
        card.innerHTML = '<span class="node-status status-dot ' + service.status + '" title="' + escapeText(statusLabel(service.status)) + '"></span><div class="node-head"><span class="node-icon">' + escapeText(service.short) + '</span><div class="node-copy"><strong>' + escapeText(node.name) + '</strong><small>' + escapeText(service.description) + '</small></div></div><button class="port" type="button" title="Drag to create a Terraform dependency"></button>';
        card.addEventListener("pointerdown", event => beginDrag(event, node));
        card.addEventListener("click", event => selectNode(event, node));
        card.querySelector('.port').addEventListener('pointerdown', event => beginConnection(event, node));
        canvas.appendChild(card);
      });
      renderConnections();
      renderInspector();
    }

    function renderConnections() {
      svg.querySelectorAll(".edge, .edge-hit").forEach(edge => edge.remove());
      sketch.connections.forEach(connection => {
        const source = sketch.nodes.find(node => node.id === connection.source);
        const target = sketch.nodes.find(node => node.id === connection.target);
        if (!source || !target) return;
        const path = connectionPath(source.x + 240, source.y + 38, target.x, target.y + 38);
        const visible = appendPath(path, 'edge');
        if (connection.bidirectional) visible.setAttribute('marker-start', 'url(#arrowStart)');
        const hit = appendPath(path, 'edge-hit');
        hit.addEventListener('click', event => {
          event.stopPropagation();
          remember();
          sketch.connections = sketch.connections.filter(item => item.id !== connection.id);
          renderConnections();
        });
      });
      if (connectionDraft) appendPath(connectionDraft.path, 'edge preview');
    }

    function appendPath(path, className) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      line.setAttribute('class', className);
      line.setAttribute('d', path);
      svg.appendChild(line);
      return line;
    }

    function connectionPath(x1, y1, x2, y2) {
      const direction = x2 >= x1 ? 1 : -1;
      const bend = Math.max(70, Math.abs(x2 - x1) * .48);
      return 'M ' + x1 + ' ' + y1 + ' C ' + (x1 + bend * direction) + ' ' + y1 + ', ' + (x2 - bend * direction) + ' ' + y2 + ', ' + x2 + ' ' + y2;
    }

    function beginDrag(event, node) {
      if (event.target.closest('.port')) return;
      event.preventDefault();
      const card = event.currentTarget;
      const startX = event.clientX, startY = event.clientY, originX = node.x, originY = node.y;
      card.setPointerCapture(event.pointerId);
      const move = moveEvent => {
        node.x = Math.max(0, originX + (moveEvent.clientX - startX) / zoom);
        node.y = Math.max(0, originY + (moveEvent.clientY - startY) / zoom);
        card.style.left = node.x + "px";
        card.style.top = node.y + "px";
        renderConnections();
      };
      const up = () => {
        card.removeEventListener("pointermove", move);
        card.removeEventListener("pointerup", up);
        remember();
      };
      card.addEventListener("pointermove", move);
      card.addEventListener("pointerup", up);
    }

    function beginConnection(event, node) {
      event.preventDefault();
      event.stopPropagation();
      document.body.classList.add('connecting');
      const rect = canvas.getBoundingClientRect();
      const startX = node.x + 240;
      const startY = node.y + 38;
      connectionDraft = { source: node.id, path: connectionPath(startX, startY, startX, startY) };
      const move = moveEvent => {
        connectionDraft.path = connectionPath(startX, startY, (moveEvent.clientX - rect.left) / zoom, (moveEvent.clientY - rect.top) / zoom);
        renderConnections();
      };
      const up = upEvent => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        document.body.classList.remove('connecting');
        const targetCard = document.elementFromPoint(upEvent.clientX, upEvent.clientY)?.closest('.node');
        const targetId = targetCard?.dataset.id;
        if (targetId && targetId !== node.id) {
          const exists = sketch.connections.some(item => item.source === node.id && item.target === targetId);
          if (!exists) {
            remember();
            sketch.connections.push({ id: 'edge-' + Date.now(), source: node.id, target: targetId, ...(bidirectionalConnections ? { bidirectional: true } : {}) });
          }
        }
        connectionDraft = null;
        render();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      renderConnections();
    }

    function selectNode(event, node) {
      event.stopPropagation();
      selectedId = node.id;
      render();
    }

    function renderInspector() {
      const node = sketch.nodes.find(item => item.id === selectedId);
      document.getElementById("inspector").hidden = !node;
      if (node) {
        const service = catalog.find(item => item.type === node.serviceType);
        nodeName.value = node.name;
        nodeRegion.value = node.region;
        document.getElementById("inspectorService").textContent = service?.title || node.serviceType;
        renderServiceParameters(node);
      }
    }

    function renderServiceParameters(node) {
      const definitions = parameterDefinitions[node.serviceType] || [];
      serviceParameters.innerHTML = "";
      if (!definitions.length) {
        serviceParameters.innerHTML = '<p class="parameter-empty">This service currently has name and region settings only. Terraform generation support may be added in a later release.</p>';
        return;
      }
      definitions.forEach(definition => {
        const field = document.createElement("div");
        field.className = "field" + (definition.type === "boolean" ? " checkbox" : "");
        const label = document.createElement("label");
        label.textContent = definition.label;
        label.htmlFor = "parameter-" + definition.key;
        const control = createParameterControl(node, definition);
        field.append(label, control);
        serviceParameters.appendChild(field);
      });
    }

    function createParameterControl(node, definition) {
      let control;
      if (definition.type === "select") {
        control = document.createElement("select");
        (definition.options || []).forEach(option => {
          const item = document.createElement("option");
          item.value = option;
          item.textContent = option;
          control.appendChild(item);
        });
      } else {
        control = document.createElement("input");
        control.type = definition.type === "boolean" ? "checkbox" : definition.type;
        if (definition.min !== undefined) control.min = String(definition.min);
        if (definition.max !== undefined) control.max = String(definition.max);
        if (definition.step !== undefined) control.step = String(definition.step);
      }
      control.id = "parameter-" + definition.key;
      const current = node.parameters && Object.prototype.hasOwnProperty.call(node.parameters, definition.key)
        ? node.parameters[definition.key]
        : definition.defaultValue;
      if (definition.type === "boolean") control.checked = Boolean(current);
      else control.value = String(current);
      control.addEventListener("change", () => {
        node.parameters = node.parameters || {};
        node.parameters[definition.key] = definition.type === "boolean"
          ? control.checked
          : definition.type === "number"
            ? Number(control.value)
            : control.value;
        remember();
      });
      return control;
    }

    function post(type) {
      vscode.postMessage({ type, sketch });
    }

    function addNode(service, x, y) {
      remember();
      sketch.nodes.push({
        id: 'node-' + Date.now() + '-' + sequence,
        serviceType: service.type,
        name: service.type.replaceAll('_', '-') + '-' + sequence++,
        region: 'uksouth',
        x: Math.max(0, x),
        y: Math.max(0, y)
      });
      render();
    }

    canvas.addEventListener("dragover", event => event.preventDefault());
    canvas.addEventListener("drop", event => {
      event.preventDefault();
      const type = event.dataTransfer.getData("text/service");
      const service = catalog.find(item => item.type === type);
      if (!service) return;
      const rect = canvas.getBoundingClientRect();
      addNode(service, (event.clientX - rect.left) / zoom - 120, (event.clientY - rect.top) / zoom - 38);
    });
    canvas.addEventListener("click", () => { selectedId = null; render(); });
    canvasWrap.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('.node') || event.target.closest('.edge-hit')) return;
      event.preventDefault();
      const startX = event.clientX;
      const startY = event.clientY;
      const originLeft = canvasWrap.scrollLeft;
      const originTop = canvasWrap.scrollTop;
      canvasWrap.classList.add('panning');
      const move = moveEvent => {
        canvasWrap.scrollLeft = originLeft - (moveEvent.clientX - startX);
        canvasWrap.scrollTop = originTop - (moveEvent.clientY - startY);
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        canvasWrap.classList.remove('panning');
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
    search.addEventListener("input", renderPalette);
    function updateSelectedCard() {
      const node = sketch.nodes.find(item => item.id === selectedId);
      const card = canvas.querySelector('.node[data-id="' + selectedId + '"]');
      const service = node && catalog.find(item => item.type === node.serviceType);
      if (!node || !card || !service) return;
      card.querySelector("strong").textContent = node.name;
    }
    nodeName.addEventListener("input", () => { const node = sketch.nodes.find(item => item.id === selectedId); if (node) { node.name = nodeName.value; updateSelectedCard(); } });
    nodeName.addEventListener("change", remember);
    nodeRegion.addEventListener("input", () => { const node = sketch.nodes.find(item => item.id === selectedId); if (node) { node.region = nodeRegion.value; updateSelectedCard(); } });
    nodeRegion.addEventListener("change", remember);
    document.getElementById("deleteNode").addEventListener("click", () => {
      deleteSelectedNode();
    });
    document.getElementById("clearCanvas").addEventListener("click", () => {
      if (!sketch.nodes.length && !sketch.connections.length) return;
      sketch.nodes = [];
      sketch.connections = [];
      selectedId = null;
      connectionDraft = null;
      sequence = 1;
      render();
      remember();
    });
    document.getElementById("twoWay").addEventListener("click", event => {
      bidirectionalConnections = !bidirectionalConnections;
      event.currentTarget.classList.toggle('active', bidirectionalConnections);
    });
    document.getElementById("zoomIn").addEventListener("click", () => setZoom(zoom + .1));
    document.getElementById("zoomOut").addEventListener("click", () => setZoom(zoom - .1));
    document.getElementById("undo").addEventListener("click", () => restoreHistory(historyIndex - 1));
    document.getElementById("redo").addEventListener("click", () => restoreHistory(historyIndex + 1));
    document.getElementById("startBlank").addEventListener("click", () => {
      if (sketch.nodes.length && !confirm("Replace the current architecture with a blank canvas?")) return;
      remember();
      sketch = { version: 1, nodes: [], connections: [] };
      selectedId = null;
      sequence = 1;
      render();
    });
    document.getElementById("validate").addEventListener("click", () => post("validateTerraform"));
    document.getElementById("preview").addEventListener("click", () => post("previewTerraform"));
    document.getElementById("generate").addEventListener("click", () => post("generateTerraform"));
    document.getElementById("exportPng").addEventListener("click", exportPng);

    document.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        restoreHistory(event.shiftKey ? historyIndex + 1 : historyIndex - 1);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        restoreHistory(historyIndex + 1);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && ['+', '=', 'Add'].includes(event.key)) {
        event.preventDefault();
        setZoom(zoom + .1);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && ['-', '_', 'Subtract'].includes(event.key)) {
        event.preventDefault();
        setZoom(zoom - .1);
        return;
      }
      if ((event.key !== 'Delete' && event.key !== 'Backspace') || !selectedId) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      deleteSelectedNode();
    });

    function deleteSelectedNode() {
      if (!selectedId) return;
      remember();
      sketch.nodes = sketch.nodes.filter(node => node.id !== selectedId);
      sketch.connections = sketch.connections.filter(item => item.source !== selectedId && item.target !== selectedId);
      selectedId = null;
      render();
    }

    function remember() {
      queueMicrotask(() => {
        const current = JSON.stringify(sketch);
        if (history[historyIndex] !== current) {
          history = history.slice(0, historyIndex + 1);
          history.push(current);
          historyIndex = history.length - 1;
        }
      });
    }

    function restoreHistory(index) {
      if (index < 0 || index >= history.length) return;
      historyIndex = index;
      sketch = JSON.parse(history[historyIndex]);
      selectedId = null;
      render();
    }

    function setZoom(value) {
      zoom = Math.max(.5, Math.min(1.6, Math.round(value * 10) / 10));
      render();
    }

    function loadPattern(patternId) {
      if (sketch.nodes.length && !confirm("Replace the current architecture with this common pattern?")) return;
      const pattern = commonPattern(patternId);
      if (!pattern) return;
      remember();
      sketch = pattern;
      selectedId = null;
      sequence = sketch.nodes.length + 1;
      render();
      canvasWrap.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    }

    function commonPattern(patternId) {
      const patterns = {
        "aks-shared": {
          version: 1,
          nodes: [
            node("aks-rg", "resource_group", "rg-aks-shared", 80, 90),
            node("aks-vnet", "virtual_network", "vnet-aks-shared", 370, 90),
            node("aks-subnet", "subnet", "snet-aks-nodes", 660, 90),
            node("aks-cluster", "kubernetes_service", "aks-shared-platform", 950, 90),
            node("aks-team-a", "kubernetes_namespace", "team-a", 1240, 20),
            node("aks-team-b", "kubernetes_namespace", "team-b", 1240, 120),
            node("aks-team-c", "kubernetes_namespace", "team-c", 1240, 220),
            node("aks-acr", "container_registry", "acrsharedplatform", 950, 270),
            node("aks-logs", "log_analytics", "log-aks-shared", 660, 270)
          ],
          connections: [
            edge("aks-vnet", "aks-rg"), edge("aks-subnet", "aks-vnet"),
            edge("aks-cluster", "aks-subnet"), edge("aks-cluster", "aks-logs"),
            edge("aks-cluster", "aks-acr"), edge("aks-team-a", "aks-cluster"),
            edge("aks-team-b", "aks-cluster"), edge("aks-team-c", "aks-cluster")
          ]
        },
        "web-three-tier": {
          version: 1,
          nodes: [
            node("web-rg", "resource_group", "rg-web-three-tier", 80, 90),
            node("web-vnet", "virtual_network", "vnet-web", 370, 90),
            node("web-subnet", "subnet", "snet-app", 660, 90),
            node("web-plan", "service_plan", "asp-web-prod", 660, 260),
            node("web-app", "web_app", "app-web-prod", 950, 170),
            node("web-sql", "sql_server", "sql-web-prod", 1240, 90),
            node("web-db", "sql_database", "sqldb-web-prod", 1530, 90),
            node("web-kv", "key_vault", "kv-web-prod", 1240, 270),
            node("web-logs", "log_analytics", "log-web-prod", 950, 350)
          ],
          connections: [
            edge("web-vnet", "web-rg"), edge("web-subnet", "web-vnet"),
            edge("web-plan", "web-rg"), edge("web-app", "web-plan"),
            edge("web-app", "web-subnet"), edge("web-app", "web-kv"),
            edge("web-app", "web-db"), edge("web-db", "web-sql"),
            edge("web-app", "web-logs")
          ]
        },
        "event-hubs": messagingPattern("eh", "event_hubs", "evh-stream-prod"),
        "event-grid": messagingPattern("eg", "event_grid", "egt-events-prod"),
        "service-bus": messagingPattern("sb", "service_bus", "sbn-messages-prod")
      };
      return patterns[patternId];
    }

    function messagingPattern(prefix, serviceType, serviceName) {
      return {
        version: 1,
        nodes: [
          node(prefix + "-rg", "resource_group", "rg-" + prefix + "-pattern", 80, 100),
          node(prefix + "-producer", "web_app", "app-" + prefix + "-producer", 370, 30),
          node(prefix + "-plan", "service_plan", "asp-" + prefix + "-pattern", 370, 190),
          node(prefix + "-service", serviceType, serviceName, 680, 100),
          node(prefix + "-consumer", "web_app", "app-" + prefix + "-consumer", 990, 30),
          node(prefix + "-storage", "storage_account", "st" + prefix + "pattern", 990, 190),
          node(prefix + "-logs", "log_analytics", "log-" + prefix + "-pattern", 680, 300)
        ],
        connections: [
          edge(prefix + "-plan", prefix + "-rg"),
          edge(prefix + "-producer", prefix + "-plan"),
          edge(prefix + "-producer", prefix + "-service"),
          edge(prefix + "-consumer", prefix + "-service"),
          edge(prefix + "-consumer", prefix + "-storage"),
          edge(prefix + "-service", prefix + "-logs")
        ]
      };
    }

    function node(id, serviceType, name, x, y) {
      return { id, serviceType, name, region: "uksouth", x, y };
    }

    function edge(source, target) {
      return { id: "edge-" + source + "-" + target, source, target };
    }

    function exportPng() {
      if (!sketch.nodes.length) return;
      const padding = 70;
      const maxX = Math.max(...sketch.nodes.map(node => node.x + 240)) + padding;
      const maxY = Math.max(...sketch.nodes.map(node => node.y + 76)) + padding;
      const minX = Math.min(...sketch.nodes.map(node => node.x)) - padding;
      const minY = Math.min(...sketch.nodes.map(node => node.y)) - padding;
      const width = Math.max(600, maxX - minX);
      const height = Math.max(400, maxY - minY);
      const scale = Math.min(2, 7600 / Math.max(width, height));
      const output = document.createElement('canvas');
      output.width = Math.round(width * scale);
      output.height = Math.round(height * scale);
      const context = output.getContext('2d');
      context.scale(scale, scale);
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.fillStyle = '#dfe3e8';
      for (let x = 8; x < width; x += 16) for (let y = 8; y < height; y += 16) context.fillRect(x, y, 1, 1);
      context.save();
      context.translate(-minX, -minY);
      sketch.connections.forEach(connection => {
        const source = sketch.nodes.find(node => node.id === connection.source);
        const target = sketch.nodes.find(node => node.id === connection.target);
        if (!source || !target) return;
        drawConnection(context, source.x + 240, source.y + 38, target.x, target.y + 38, connection.bidirectional === true);
      });
      sketch.nodes.forEach(node => drawNode(context, node));
      context.restore();
      const data = output.toDataURL('image/png').replace(/^data:image\\/png;base64,/, '');
      vscode.postMessage({ type: 'exportPng', sketch, data });
    }

    function drawConnection(context, x1, y1, x2, y2, bidirectional) {
      const direction = x2 >= x1 ? 1 : -1;
      const bend = Math.max(70, Math.abs(x2 - x1) * .48);
      context.beginPath();
      context.moveTo(x1, y1);
      context.bezierCurveTo(x1 + bend * direction, y1, x2 - bend * direction, y2, x2, y2);
      context.strokeStyle = '#4a90ff';
      context.lineWidth = 2;
      context.stroke();
      context.save();
      context.translate(x2, y2);
      context.rotate(x2 >= x1 ? 0 : Math.PI);
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(-9, -5);
      context.lineTo(-9, 5);
      context.closePath();
      context.fillStyle = '#4a90ff';
      context.fill();
      context.restore();
      if (bidirectional) {
        context.save();
        context.translate(x1, y1);
        context.rotate(x2 >= x1 ? Math.PI : 0);
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(-9, -5);
        context.lineTo(-9, 5);
        context.closePath();
        context.fillStyle = '#4a90ff';
        context.fill();
        context.restore();
      }
    }

    function drawNode(context, node) {
      const service = catalog.find(item => item.type === node.serviceType);
      if (!service) return;
      context.save();
      context.shadowColor = '#24364d22';
      context.shadowBlur = 13;
      context.shadowOffsetY = 6;
      roundedRect(context, node.x, node.y, 240, 76, 3);
      context.fillStyle = '#ffffff';
      context.fill();
      context.shadowColor = 'transparent';
      context.strokeStyle = '#d9dfe7';
      context.lineWidth = 1;
      context.stroke();
      context.fillStyle = '#eef3f8';
      context.fillRect(node.x, node.y + 64, 240, 12);
      roundedRect(context, node.x + 12, node.y + 15, 30, 30, 7);
      context.fillStyle = service.color;
      context.fill();
      context.fillStyle = '#ffffff';
      context.font = '700 9px Segoe UI';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(service.short.slice(0, 5), node.x + 27, node.y + 30);
      context.textAlign = 'left';
      context.fillStyle = '#171717';
      context.font = '600 13px Segoe UI';
      context.fillText(trimCanvasText(context, node.name, 175), node.x + 52, node.y + 27);
      context.fillStyle = '#7d8793';
      context.font = '650 8px Segoe UI';
      context.fillText(trimCanvasText(context, service.description, 175), node.x + 52, node.y + 42);
      context.beginPath();
      context.arc(node.x, node.y, 6, 0, Math.PI * 2);
      context.fillStyle = statusColor(service.status);
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = '#ffffff';
      context.stroke();
      context.restore();
    }

    function roundedRect(context, x, y, width, height, radius) {
      context.beginPath();
      context.moveTo(x + radius, y);
      context.arcTo(x + width, y, x + width, y + height, radius);
      context.arcTo(x + width, y + height, x, y + height, radius);
      context.arcTo(x, y + height, x, y, radius);
      context.arcTo(x, y, x + width, y, radius);
      context.closePath();
    }

    function trimCanvasText(context, value, width) {
      if (context.measureText(value).width <= width) return value;
      let result = value;
      while (result.length > 1 && context.measureText(result + '...').width > width) result = result.slice(0, -1);
      return result + '...';
    }

    function statusColor(status) {
      return status === 'approved' ? '#22a447' : status === 'under-review' ? '#f5c542' : '#d92d20';
    }

    function statusLabel(status) {
      return status === 'approved' ? 'Approved' : status === 'under-review' ? 'Under review' : 'Not approved';
    }

    function escapeText(value) {
      const span = document.createElement("span");
      span.textContent = value;
      return span.innerHTML;
    }
    renderPalette();
    render();
  </script>
</body>
</html>`;
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function serviceCatalog() {
  const approved = new Set(serviceStatus.approved);
  const underReview = new Set(serviceStatus.underReview);
  return SKETCH_SERVICES.map((service) => ({
    ...service,
    status: approved.has(service.type)
      ? "approved"
      : underReview.has(service.type)
        ? "under-review"
        : "not-approved",
  }));
}

function createNonce(): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    { length: 32 },
    () => characters[Math.floor(Math.random() * characters.length)],
  ).join("");
}

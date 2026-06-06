import * as vscode from "vscode";
import {
  renderErrorHtml,
  renderLoadingHtml,
  renderResultsHtml,
  type FileScanResult,
} from "../core/resultsHtml";

export class ResultsPanel implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private results: FileScanResult[] = [];

  showLoading(): void {
    const panel = this.getOrCreatePanel();
    panel.webview.html = renderLoadingHtml(createNonce());
    panel.reveal(vscode.ViewColumn.Active, false);
  }

  show(results: FileScanResult[]): void {
    this.results = results;
    const panel = this.getOrCreatePanel();
    panel.reveal(vscode.ViewColumn.Active, false);
    this.render();
  }

  showError(message: string): void {
    const panel = this.getOrCreatePanel();
    panel.webview.html = renderErrorHtml(message, createNonce());
    panel.reveal(vscode.ViewColumn.Active, false);
  }

  refresh(results: FileScanResult[]): void {
    this.results = results;
    if (this.panel) {
      this.render();
    }
  }

  dispose(): void {
    this.panel?.dispose();
  }

  private getOrCreatePanel(): vscode.WebviewPanel {
    if (!this.panel) {
      const panel = vscode.window.createWebviewPanel(
        "infraCompliance.results",
        "Azure IaC Guardrail Results",
        vscode.ViewColumn.Active,
        { enableScripts: true, retainContextWhenHidden: true },
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

  private render(): void {
    if (this.panel) {
      this.panel.webview.html = renderResultsHtml(
        this.results,
        createNonce(),
      );
    }
  }

  private async handleMessage(message: unknown): Promise<void> {
    if (!isOpenFindingMessage(message)) {
      return;
    }
    const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(message.uri));
    const editor = await vscode.window.showTextDocument(
      document,
      vscode.ViewColumn.One,
    );
    const position = new vscode.Position(message.line, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(
      new vscode.Range(position, position),
      vscode.TextEditorRevealType.InCenter,
    );
  }
}

interface OpenFindingMessage {
  type: "openFinding";
  uri: string;
  line: number;
}

function isOpenFindingMessage(message: unknown): message is OpenFindingMessage {
  if (!message || typeof message !== "object") {
    return false;
  }
  const candidate = message as Partial<OpenFindingMessage>;
  return (
    candidate.type === "openFinding" &&
    typeof candidate.uri === "string" &&
    typeof candidate.line === "number"
  );
}

function createNonce(): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    { length: 32 },
    () => characters[Math.floor(Math.random() * characters.length)],
  ).join("");
}

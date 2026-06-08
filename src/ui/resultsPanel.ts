import * as vscode from "vscode";
import { loadWorkspacePolicy } from "../controls/workspacePolicy";
import { generateEvidencePack } from "../core/evidencePack";
import { generateScanReportPdf } from "../core/pdfReport";
import {
  renderErrorHtml,
  renderLoadingHtml,
  renderResultsHtml,
  type FileScanResult,
  type PlanProgressStage,
} from "../core/resultsHtml";

export class ResultsPanel implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private results: FileScanResult[] = [];
  private rescanHandler: (() => Promise<void>) | undefined;

  constructor(private readonly extensionUri: vscode.Uri) {}

  showLoading(): void {
    const panel = this.getOrCreatePanel();
    panel.webview.html = renderLoadingHtml(createNonce());
    panel.reveal(vscode.ViewColumn.Active, false);
  }

  showPlanProgress(stage: PlanProgressStage, detail: string): void {
    const panel = this.getOrCreatePanel();
    panel.webview.html = renderLoadingHtml(createNonce(), stage, detail);
    panel.reveal(vscode.ViewColumn.Active, false);
  }

  setRescanHandler(handler?: () => Promise<void>): void {
    this.rescanHandler = handler;
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

  async exportPdf(): Promise<void> {
    if (this.results.length === 0) {
      void vscode.window.showWarningMessage(
        "Run an Azure IaC Guardrail scan before exporting a PDF report.",
      );
      return;
    }
    const workspace = vscode.workspace.workspaceFolders?.[0];
    const timestamp = new Date().toISOString().slice(0, 10);
    const defaultUri = workspace
      ? vscode.Uri.joinPath(
          workspace.uri,
          `azure-iac-guardrail-report-${timestamp}.pdf`,
        )
      : undefined;
    const destination = await vscode.window.showSaveDialog({
      defaultUri,
      filters: { "PDF report": ["pdf"] },
      saveLabel: "Export Compliance Report",
      title: "Export Azure IaC Guardrail report",
    });
    if (!destination) {
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Generating Azure IaC Guardrail PDF report",
      },
      async () => {
        const logoUri = vscode.Uri.joinPath(
          this.extensionUri,
          "media",
          "azure-iac-guardrail.png",
        );
        const logo = await vscode.workspace.fs.readFile(logoUri);
        const pdf = await generateScanReportPdf(this.results, {
          workspaceName: workspace?.name,
          logo,
        });
        await vscode.workspace.fs.writeFile(destination, pdf);
      },
    );
    const action = await vscode.window.showInformationMessage(
      `PDF report exported to ${destination.fsPath}.`,
      "Open Report",
    );
    if (action === "Open Report") {
      await vscode.env.openExternal(destination);
    }
  }

  async exportEvidencePack(): Promise<void> {
    if (this.results.length === 0) {
      void vscode.window.showWarningMessage(
        "Run an Azure IaC Guardrail scan before exporting evidence.",
      );
      return;
    }
    const workspace = vscode.workspace.workspaceFolders?.[0];
    const selected = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      defaultUri: workspace?.uri,
      openLabel: "Export Evidence Pack Here",
      title: "Select evidence pack destination",
    });
    const destination = selected?.[0];
    if (!destination) {
      return;
    }
    const generatedAt = new Date();
    const folder = vscode.Uri.joinPath(
      destination,
      `azure-iac-guardrail-evidence-${generatedAt.toISOString().slice(0, 10)}`,
    );
    await vscode.workspace.fs.createDirectory(folder);
    const profile = workspace
      ? await loadWorkspacePolicy(workspace.uri.fsPath)
      : undefined;
    const evidence = generateEvidencePack(this.results, {
      workspaceName: workspace?.name,
      generatedAt,
      profile,
    });
    const logo = await vscode.workspace.fs.readFile(
      vscode.Uri.joinPath(
        this.extensionUri,
        "media",
        "azure-iac-guardrail.png",
      ),
    );
    const pdf = await generateScanReportPdf(this.results, {
      workspaceName: workspace?.name,
      generatedAt,
      logo,
    });
    await Promise.all([
      vscode.workspace.fs.writeFile(
        vscode.Uri.joinPath(folder, "evidence.json"),
        new TextEncoder().encode(evidence.json),
      ),
      vscode.workspace.fs.writeFile(
        vscode.Uri.joinPath(folder, "evidence.md"),
        new TextEncoder().encode(evidence.markdown),
      ),
      vscode.workspace.fs.writeFile(
        vscode.Uri.joinPath(folder, "compliance-report.pdf"),
        pdf,
      ),
    ]);
    const action = await vscode.window.showInformationMessage(
      `Auditor evidence pack exported to ${folder.fsPath}.`,
      "Open Folder",
    );
    if (action === "Open Folder") {
      await vscode.commands.executeCommand("revealFileInOS", folder);
    }
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
        this.rescanHandler !== undefined,
      );
    }
  }

  private async handleMessage(message: unknown): Promise<void> {
    if (isExportPdfMessage(message)) {
      await this.exportPdf();
      return;
    }
    if (isExportEvidenceMessage(message)) {
      await this.exportEvidencePack();
      return;
    }
    if (isRescanMessage(message) && this.rescanHandler) {
      await this.rescanHandler();
      return;
    }
    if (isOpenReferenceMessage(message)) {
      await vscode.env.openExternal(vscode.Uri.parse(message.url));
      return;
    }
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

interface ExportPdfMessage {
  type: "exportPdf";
}

interface ExportEvidenceMessage {
  type: "exportEvidence";
}

function isExportEvidenceMessage(
  message: unknown,
): message is ExportEvidenceMessage {
  return (
    !!message &&
    typeof message === "object" &&
    (message as Partial<ExportEvidenceMessage>).type === "exportEvidence"
  );
}

interface RescanMessage {
  type: "rescan";
}

function isRescanMessage(message: unknown): message is RescanMessage {
  return (
    !!message &&
    typeof message === "object" &&
    (message as Partial<RescanMessage>).type === "rescan"
  );
}

function isExportPdfMessage(message: unknown): message is ExportPdfMessage {
  return (
    !!message &&
    typeof message === "object" &&
    (message as Partial<ExportPdfMessage>).type === "exportPdf"
  );
}

interface OpenReferenceMessage {
  type: "openReference";
  url: string;
}

function isOpenReferenceMessage(
  message: unknown,
): message is OpenReferenceMessage {
  if (!message || typeof message !== "object") {
    return false;
  }
  const candidate = message as Partial<OpenReferenceMessage>;
  return (
    candidate.type === "openReference" &&
    typeof candidate.url === "string" &&
    /^https:\/\/(?:learn\.microsoft\.com|avd\.aquasec\.com)\//.test(
      candidate.url,
    )
  );
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

import * as vscode from "vscode";
import {
  defaultWorkspacePolicy,
  DEFAULT_REMOTE_CATALOG_URL,
  loadWorkspacePolicy,
  normalizeWorkspacePolicy,
  type WorkspacePolicyProfile,
} from "../controls/workspacePolicy";
import { AZURE_PUBLIC_REGIONS } from "../controls/azureRegions";
import { resolveConfiguredTerraformRoot } from "../terraform/terraformRoot";

export class WorkspacePolicyPanel implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private workspaceFolder: vscode.WorkspaceFolder | undefined;

  async show(
    selectedFolder?: vscode.WorkspaceFolder,
  ): Promise<void> {
    const folder = selectedFolder ?? (await selectWorkspaceFolder());
    if (!folder) {
      return;
    }
    this.workspaceFolder = folder;
    const profile =
      (await loadWorkspacePolicy(folder.uri.fsPath)) ??
      defaultWorkspacePolicy();
    const panel = this.getOrCreatePanel();
    panel.title = `Azure Pre-configuration: ${folder.name}`;
    panel.webview.html = renderPolicyHtml(profile, createNonce());
    panel.reveal(vscode.ViewColumn.Active, false);
  }

  dispose(): void {
    this.panel?.dispose();
  }

  private getOrCreatePanel(): vscode.WebviewPanel {
    if (!this.panel) {
      const panel = vscode.window.createWebviewPanel(
        "infraCompliance.workspacePolicy",
        "Azure IaC Guardrail Policy",
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

  private async handleMessage(message: unknown): Promise<void> {
    if (!this.workspaceFolder) {
      return;
    }
    if (isSelectTerraformRootMessage(message)) {
      await this.selectTerraformRoot();
      return;
    }
    if (!isSavePolicyMessage(message)) {
      return;
    }
    try {
      const panel = this.panel;
      const profile = normalizeWorkspacePolicy(message.profile);
      const terraformRoot = vscode.Uri.file(
        resolveConfiguredTerraformRoot(
          this.workspaceFolder.uri.fsPath,
          profile.terraformRoot,
        ),
      );
      const rootStat = await vscode.workspace.fs.stat(terraformRoot);
      if (!(rootStat.type & vscode.FileType.Directory)) {
        throw new Error("The selected Terraform root is not a folder.");
      }
      const entries = await vscode.workspace.fs.readDirectory(terraformRoot);
      if (
        !entries.some(
          ([name, type]) =>
            type === vscode.FileType.File && name.endsWith(".tf"),
        )
      ) {
        throw new Error(
          "The selected Terraform root does not contain any .tf files.",
        );
      }
      const policyDirectory = vscode.Uri.joinPath(
        this.workspaceFolder.uri,
        ".azure-iac-guardrail",
      );
      const target = vscode.Uri.joinPath(
        policyDirectory,
        "profile.json",
      );
      await vscode.workspace.fs.createDirectory(policyDirectory);
      await vscode.workspace.fs.writeFile(
        target,
        new TextEncoder().encode(
          `${JSON.stringify(profile, null, 2)}\n`,
        ),
      );
      void vscode.window.showInformationMessage(
        `Azure IaC Guardrail policy saved. Terraform root: ${profile.terraformRoot}.`,
      );
      if (panel) {
        panel.webview.html = renderPolicyHtml(
          profile,
          createNonce(),
          "Azure pre-configuration saved. New local scans will use it.",
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(
        `Could not save workspace policy: ${message}`,
      );
    }
  }

  private async selectTerraformRoot(): Promise<void> {
    if (!this.workspaceFolder || !this.panel) {
      return;
    }
    const selected = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      defaultUri: this.workspaceFolder.uri,
      openLabel: "Use Terraform Root",
      title: "Select the Terraform root folder",
    });
    const selectedUri = selected?.[0];
    if (!selectedUri) {
      return;
    }
    const relative = vscode.workspace.asRelativePath(selectedUri, false)
      .replaceAll("\\", "/");
    if (
      relative.startsWith("../") ||
      relative === ".." ||
      relative.includes(":")
    ) {
      void vscode.window.showErrorMessage(
        "Select a Terraform root inside the current workspace.",
      );
      return;
    }
    this.panel.webview.postMessage({
      type: "terraformRootSelected",
      terraformRoot: relative || ".",
    });
  }
}

interface SavePolicyMessage {
  type: "savePolicy";
  profile: unknown;
}

interface SelectTerraformRootMessage {
  type: "selectTerraformRoot";
}

function isSavePolicyMessage(
  message: unknown,
): message is SavePolicyMessage {
  return (
    !!message &&
    typeof message === "object" &&
    (message as Partial<SavePolicyMessage>).type === "savePolicy"
  );
}

function isSelectTerraformRootMessage(
  message: unknown,
): message is SelectTerraformRootMessage {
  return (
    !!message &&
    typeof message === "object" &&
    (message as Partial<SelectTerraformRootMessage>).type ===
      "selectTerraformRoot"
  );
}

async function selectWorkspaceFolder(): Promise<
  vscode.WorkspaceFolder | undefined
> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 0) {
    void vscode.window.showWarningMessage(
      "Open a Terraform workspace before configuring Azure scan defaults.",
    );
    return undefined;
  }
  return folders.length === 1
    ? folders[0]
    : vscode.window.showWorkspaceFolderPick({
        placeHolder: "Select the workspace to configure",
      });
}

function renderPolicyHtml(
  profile: WorkspacePolicyProfile,
  nonce: string,
  status = "",
): string {
  const tagKeys = [
    ...new Set([
      ...profile.requiredTags,
      ...Object.keys(profile.tagValues),
    ]),
  ];
  const tagRows = tagKeys
    .map(
      (key) => `<div class="tag-row">
        <input class="tag-key" type="text" value="${escapeHtml(key)}" placeholder="Tag name" aria-label="Tag name">
        <input class="tag-value" type="text" value="${escapeHtml(profile.tagValues[key] ?? "")}" placeholder="Any non-empty value" aria-label="Enforced tag value">
        <button class="remove secondary" type="button" title="Remove tag">Remove</button>
      </div>`,
    )
    .join("");
  const exceptionRows = profile.exceptions
    .map(
      (exception) => `<div class="exception-row">
        <input class="exception-id" value="${escapeHtml(exception.controlId)}" placeholder="AZ-AI-003" aria-label="Control ID">
        <input class="exception-owner" value="${escapeHtml(exception.owner)}" placeholder="Owner" aria-label="Exception owner">
        <input class="exception-expiry" type="date" value="${escapeHtml(exception.expiresOn)}" aria-label="Expiry date">
        <input class="exception-ticket" value="${escapeHtml(exception.ticket ?? "")}" placeholder="Ticket (optional)" aria-label="Ticket">
        <input class="exception-reason" value="${escapeHtml(exception.justification)}" placeholder="Business justification" aria-label="Business justification">
        <button class="remove-exception secondary" type="button">Remove</button>
      </div>`,
    )
    .join("");
  const regionOptions = AZURE_PUBLIC_REGIONS.map(
    (region) => `<option value="${region}"></option>`,
  ).join("");
  const terraformVersionOptions = [
    ">= 1.5.0, < 2.0.0",
    ">= 1.6.0, < 2.0.0",
    ">= 1.7.0, < 2.0.0",
    ">= 1.8.0, < 2.0.0",
    ">= 1.9.0, < 2.0.0",
    ">= 1.10.0, < 2.0.0",
    ">= 1.11.0, < 2.0.0",
    ">= 1.12.0, < 2.0.0",
    ">= 1.13.0, < 2.0.0",
    ">= 1.14.0, < 2.0.0",
    ">= 1.15.0, < 2.0.0",
  ]
    .map((version) => `<option value="${version}"></option>`)
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>Azure Pre-configuration</title>
  <style nonce="${nonce}">
    :root { color-scheme: light dark; }
    * { box-sizing: border-box; }
    body { color: var(--vscode-foreground); background: var(--vscode-editor-background); font: var(--vscode-font-size) var(--vscode-font-family); max-width: 1180px; margin: 0 auto; padding: 28px; }
    .hero { display: flex; gap: 18px; align-items: center; padding: 22px; border: 1px solid var(--vscode-widget-border); border-radius: 12px; background: radial-gradient(circle at top left, color-mix(in srgb, #1683ff 20%, transparent), transparent 38%), linear-gradient(135deg, color-mix(in srgb, var(--vscode-editorWidget-background) 94%, #1683ff), var(--vscode-editorWidget-background)); box-shadow: 0 14px 34px #0002; }
    .hero-icon { display: grid; flex: 0 0 58px; width: 58px; height: 58px; place-items: center; border-radius: 16px; color: white; background: linear-gradient(145deg, #1683ff, #3154c9); box-shadow: 0 10px 24px #1683ff44; font-size: 28px; font-weight: 800; }
    .hero-copy { min-width: 0; }
    h1 { font-size: 27px; margin: 0 0 6px; letter-spacing: -.02em; }
    .intro, .hint { color: var(--vscode-descriptionForeground); line-height: 1.5; }
    .intro { margin: 0; }
    .status { border: 1px solid color-mix(in srgb, var(--vscode-testing-iconPassed) 42%, var(--vscode-widget-border)); border-left: 4px solid var(--vscode-testing-iconPassed); border-radius: 8px; padding: 11px 14px; margin: 18px 0 0; background: color-mix(in srgb, var(--vscode-testing-iconPassed) 9%, var(--vscode-editorWidget-background)); }
    .policy-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 18px; }
    .card { min-width: 0; padding: 20px; background: linear-gradient(145deg, color-mix(in srgb, var(--vscode-editorWidget-background) 96%, #1683ff), var(--vscode-editorWidget-background)); border: 1px solid var(--vscode-widget-border); border-radius: 10px; box-shadow: 0 8px 22px #00000012; }
    .card.wide-card { grid-column: 1 / -1; }
    .card-heading { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 14px; }
    .card-icon { display: grid; flex: 0 0 34px; width: 34px; height: 34px; place-items: center; border-radius: 9px; color: #7bb7ff; background: color-mix(in srgb, #1683ff 15%, var(--vscode-editor-background)); box-shadow: inset 0 0 0 1px #1683ff55; font-weight: 800; }
    h2 { font-size: 17px; margin: 0 0 4px; }
    .card-heading .hint { margin: 0; }
    .columns, .tag-row { display: grid; grid-template-columns: minmax(180px, 1fr) minmax(220px, 1.3fr) 76px; gap: 10px; align-items: center; }
    .exception-row { display: grid; grid-template-columns: 120px 1fr 145px 1fr 1.5fr 76px; gap: 8px; margin: 8px 0; align-items: center; }
    .cost-row, .cost-columns { display: grid; grid-template-columns: 90px repeat(4, minmax(110px, 1fr)); gap: 10px; align-items: center; }
    .columns { color: var(--vscode-descriptionForeground); font-size: 12px; font-weight: 600; margin-bottom: 8px; }
    .tag-row { margin: 8px 0; }
    input { box-sizing: border-box; width: 100%; color: var(--vscode-input-foreground); background: color-mix(in srgb, var(--vscode-input-background) 92%, transparent); border: 1px solid var(--vscode-input-border, var(--vscode-widget-border)); border-radius: 5px; padding: 10px; font: inherit; }
    .wide { margin-top: 8px; }
    code { color: var(--vscode-textPreformat-foreground); }
    input:focus { outline: 2px solid var(--vscode-focusBorder); outline-offset: -1px; }
    button { color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: 1px solid var(--vscode-button-border, transparent); border-radius: 5px; padding: 9px 14px; cursor: pointer; font-weight: 600; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    .secondary { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
    .secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .actions { display: flex; gap: 10px; margin-top: 16px; }
    .path-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 8px; align-items: center; margin-top: 8px; }
    .path-preview { display: flex; gap: 8px; align-items: center; padding: 9px 11px; border: 1px solid var(--vscode-widget-border); border-radius: 6px; background: color-mix(in srgb, var(--vscode-editor-background) 78%, transparent); }
    .path-preview strong { flex: 0 0 auto; }
    .save-bar { position: sticky; bottom: 0; display: flex; gap: 16px; align-items: center; justify-content: space-between; margin-top: 18px; padding: 14px 16px; border: 1px solid var(--vscode-widget-border); border-radius: 10px; background: color-mix(in srgb, var(--vscode-editor-background) 93%, transparent); backdrop-filter: blur(12px); box-shadow: 0 -8px 24px #0003; }
    .save-bar .hint { margin: 0; }
    @media (max-width: 900px) { .policy-grid { grid-template-columns: 1fr; } .card.wide-card { grid-column: auto; } .columns { display: none; } .tag-row, .exception-row, .cost-row { grid-template-columns: 1fr; padding-bottom: 12px; border-bottom: 1px solid var(--vscode-widget-border); } }
    @media (max-width: 580px) { body { padding: 16px; } .hero { align-items: flex-start; } .save-bar { position: static; align-items: stretch; flex-direction: column; } .path-row { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header class="hero">
    <div class="hero-icon" aria-hidden="true">✓</div>
    <div class="hero-copy">
      <h1>Azure IaC Guardrail</h1>
      <p class="intro">Choose the Terraform root, compatibility, Azure governance, cost assumptions, tags, and exceptions for this workspace.</p>
    </div>
  </header>
  ${status ? `<div class="status">${escapeHtml(status)}</div>` : ""}
  <div class="policy-grid">
  <div class="card wide-card">
    <div class="card-heading"><span class="card-icon">RT</span><div><h2>Terraform workspace root</h2><p class="hint">Select the folder containing the root module that Guardrail should scan, initialize, and plan.</p></div></div>
    <label for="terraformRoot"><strong>Workspace-relative folder</strong></label>
    <div class="path-row">
      <input id="terraformRoot" type="text" value="${escapeHtml(profile.terraformRoot)}" placeholder="." aria-describedby="terraformRootHelp">
      <button id="browseTerraformRoot" class="secondary" type="button">Choose Folder</button>
      <button id="resetTerraformRoot" class="secondary" type="button">Use Workspace Root</button>
    </div>
    <p id="terraformRootHelp" class="hint">Use <code>.</code> for the workspace root or a relative path such as <code>infra</code> or <code>test/fixtures/three-tier-webapp</code>. Paths outside the workspace are rejected.</p>
    <div class="path-preview"><strong>Guardrail will use</strong><code id="terraformRootPreview">${escapeHtml(profile.terraformRoot)}</code></div>
  </div>
  <div class="card">
    <div class="card-heading"><span class="card-icon">TF</span><div><h2>Terraform compatibility</h2><p class="hint">Choose the version constraint recorded for workspace governance.</p></div></div>
    <label for="terraformVersion"><strong>Required Terraform version</strong></label>
    <input id="terraformVersion" class="wide" type="text" list="terraformVersions" value="${escapeHtml(profile.terraformVersion)}" placeholder=">= 1.8.0, < 2.0.0" aria-describedby="terraformVersionHelp">
    <datalist id="terraformVersions">${terraformVersionOptions}</datalist>
    <p id="terraformVersionHelp" class="hint">Select a supported preset or enter a Terraform constraint. Existing repository <code>required_version</code> declarations remain unchanged.</p>
  </div>
  <div class="card">
    <div class="card-heading"><span class="card-icon">CT</span><div><h2>Remote catalog URL</h2><p class="hint">Choose the approved complete catalog JSON used for controls and metadata.</p></div></div>
    <label for="catalogUrl"><strong>Complete catalog HTTPS URL</strong></label>
    <input id="catalogUrl" class="wide" type="url" value="${escapeHtml(profile.catalogUrl)}" placeholder="${escapeHtml(DEFAULT_REMOTE_CATALOG_URL)}" aria-describedby="catalogUrlHelp">
    <p id="catalogUrlHelp" class="hint">Use the raw JSON endpoint, not the GitHub <code>/blob/</code> page. Default: <code>${escapeHtml(DEFAULT_REMOTE_CATALOG_URL)}</code></p>
  </div>
  <div class="card">
    <div class="card-heading"><span class="card-icon">RG</span><div><h2>Approved Azure regions</h2><p class="hint">Restrict resolved resources to approved Azure locations.</p></div></div>
    <label for="allowedRegions"><strong>Allowed ARM region names</strong></label>
    <input id="allowedRegions" class="wide" type="text" list="azureRegions" value="${escapeHtml(profile.allowedRegions.join(", "))}" placeholder="uksouth, ukwest" aria-describedby="regionHelp">
    <datalist id="azureRegions">${regionOptions}</datalist>
    <p id="regionHelp" class="hint">Enter comma-separated Microsoft programmatic region names, for example <code>uksouth, ukwest</code>. A resolved plan resource outside this list is non-compliant.</p>
  </div>
  <div class="card wide-card">
    <div class="card-heading"><span class="card-icon">$</span><div><h2>Monthly cost assumptions</h2><p class="hint">Used when Terraform defines the service but cannot describe runtime usage.</p></div></div>
    <div class="columns cost-columns"><span>Currency</span><span>Storage GB</span><span>Read operations</span><span>Write operations</span><span>Egress GB</span></div>
    <div class="cost-row">
      <input id="costCurrency" value="${escapeHtml(profile.costAssumptions.currency)}" maxlength="3" aria-label="Cost currency">
      <input id="monthlyStorageGb" type="number" min="0" step="0.01" value="${profile.costAssumptions.monthlyStorageGb}" aria-label="Monthly storage GB">
      <input id="monthlyReadOperations" type="number" min="0" step="1" value="${profile.costAssumptions.monthlyReadOperations}" aria-label="Monthly read operations">
      <input id="monthlyWriteOperations" type="number" min="0" step="1" value="${profile.costAssumptions.monthlyWriteOperations}" aria-label="Monthly write operations">
      <input id="monthlyEgressGb" type="number" min="0" step="0.01" value="${profile.costAssumptions.monthlyEgressGb}" aria-label="Monthly egress GB">
    </div>
    <p class="hint">Example SPA baseline: 1 GB stored, 100,000 reads, 10,000 writes, and 0 GB paid egress. The result page shows every assumption used.</p>
  </div>
  <div class="card wide-card">
    <div class="card-heading"><span class="card-icon">#</span><div><h2>Required tags</h2><p class="hint">Require tag names and optionally enforce exact values.</p></div></div>
    <div class="columns"><span>Tag name</span><span>Required value (optional)</span><span></span></div>
    <div id="tagRows">${tagRows}</div>
    <div class="actions">
      <button id="add" class="secondary" type="button">Add Tag</button>
    </div>
  </div>
  <div class="card wide-card">
    <div class="card-heading"><span class="card-icon">EX</span><div><h2>Governed exceptions</h2><p class="hint">Temporary exceptions require ownership, justification, and expiry.</p></div></div>
    <div id="exceptionRows">${exceptionRows}</div>
    <div class="actions"><button id="addException" class="secondary" type="button">Add Governed Exception</button></div>
  </div>
  <div class="card wide-card">
    <div class="card-heading"><span class="card-icon">SK</span><div><h2>Skipped standard checks</h2><p class="hint">Exclude specific controls from local scans.</p></div></div>
    <label for="skippedControls"><strong>SKIP Scan for Control ID(s)</strong></label>
    <input id="skippedControls" class="wide" type="text" value="${escapeHtml(profile.skippedControlIds.join(", "))}" placeholder="AZ-AI-003, AZ-AI-004" aria-describedby="skipHelp">
    <p id="skipHelp" class="hint">Enter comma-separated control IDs. Matching controls are excluded from static and local plan scans.</p>
  </div>
  </div>
  <div class="save-bar">
    <p class="hint">Saved to <code>.azure-iac-guardrail/profile.json</code>. Commit it to share workspace policy.</p>
    <button id="save" type="button">Save Azure Pre-configuration</button>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const rows = document.getElementById("tagRows");
    const exceptionRows = document.getElementById("exceptionRows");
    const terraformRoot = document.getElementById("terraformRoot");
    const terraformRootPreview = document.getElementById("terraformRootPreview");
    const updateTerraformRootPreview = () => {
      terraformRootPreview.textContent = terraformRoot.value.trim() || ".";
    };
    terraformRoot.addEventListener("input", updateTerraformRootPreview);
    document.getElementById("browseTerraformRoot").addEventListener("click", () => {
      vscode.postMessage({ type: "selectTerraformRoot" });
    });
    document.getElementById("resetTerraformRoot").addEventListener("click", () => {
      terraformRoot.value = ".";
      updateTerraformRootPreview();
    });
    window.addEventListener("message", event => {
      if (event.data?.type === "terraformRootSelected") {
        terraformRoot.value = event.data.terraformRoot;
        updateTerraformRootPreview();
      }
    });
    const addRow = (key = "", value = "") => {
      const row = document.createElement("div");
      row.className = "tag-row";
      row.innerHTML = '<input class="tag-key" type="text" placeholder="e.g. environment" aria-label="Tag name"><input class="tag-value" type="text" placeholder="Any non-empty value" aria-label="Enforced tag value"><button class="remove secondary" type="button" title="Remove tag">Remove</button>';
      row.querySelector(".tag-key").value = key;
      row.querySelector(".tag-value").value = value;
      rows.appendChild(row);
      row.querySelector(".tag-key").focus();
    };
    document.getElementById("add").addEventListener("click", () => addRow());
    rows.addEventListener("click", (event) => {
      if (event.target.classList.contains("remove")) {
        event.target.closest(".tag-row").remove();
      }
    });
    const addExceptionRow = () => {
      const row = document.createElement("div");
      row.className = "exception-row";
      row.innerHTML = '<input class="exception-id" placeholder="AZ-AI-003" aria-label="Control ID"><input class="exception-owner" placeholder="Owner" aria-label="Exception owner"><input class="exception-expiry" type="date" aria-label="Expiry date"><input class="exception-ticket" placeholder="Ticket (optional)" aria-label="Ticket"><input class="exception-reason" placeholder="Business justification" aria-label="Business justification"><button class="remove-exception secondary" type="button">Remove</button>';
      exceptionRows.appendChild(row);
      row.querySelector(".exception-id").focus();
    };
    document.getElementById("addException").addEventListener("click", addExceptionRow);
    exceptionRows.addEventListener("click", (event) => {
      if (event.target.classList.contains("remove-exception")) {
        event.target.closest(".exception-row").remove();
      }
    });
    document.getElementById("save").addEventListener("click", () => {
      const terraformVersion = document.getElementById("terraformVersion").value.trim();
      if (!terraformVersion || terraformVersion.length > 80 || !/^[0-9<>=!~.,\\s]+$/.test(terraformVersion) || !/\\d+\\.\\d+(?:\\.\\d+)?/.test(terraformVersion)) {
        window.alert('Enter a Terraform version constraint such as ">= 1.8.0, < 2.0.0".');
        return;
      }
      const terraformRootValue = terraformRoot.value.trim().replaceAll("\\\\", "/").replace(/^\\.\\/+/, "").replace(/\\/+$/, "") || ".";
      if (terraformRootValue.startsWith("/") || /^[A-Za-z]:/.test(terraformRootValue) || terraformRootValue.split("/").some(part => part === ".." || !part)) {
        window.alert('Choose a folder inside the workspace, for example ".", "infra", or "test/fixtures/three-tier-webapp".');
        return;
      }
      const catalogUrl = document.getElementById("catalogUrl").value.trim() || ${JSON.stringify(DEFAULT_REMOTE_CATALOG_URL)};
      if (!/^https:\\/\\/\\S+$/i.test(catalogUrl)) {
        window.alert("Enter an HTTPS URL for the remote complete catalog JSON.");
        return;
      }
      if (/^https:\\/\\/github\\.com\\/.+\\/blob\\/.+/i.test(catalogUrl)) {
        window.alert("Use the raw JSON catalog URL from raw.githubusercontent.com, not a GitHub /blob/ page.");
        return;
      }
      const requiredTags = [];
      const tagValues = {};
      for (const row of rows.querySelectorAll(".tag-row")) {
        const key = row.querySelector(".tag-key").value.trim();
        const value = row.querySelector(".tag-value").value.trim();
        if (!key) {
          if (value) {
            window.alert("Enter a tag name for every configured value.");
            return;
          }
          continue;
        }
        if (requiredTags.includes(key)) {
          window.alert("Each tag name can appear only once.");
          return;
        }
        requiredTags.push(key);
        if (value) tagValues[key] = value;
      }
      const skippedControlIds = document.getElementById("skippedControls").value
        .split(",")
        .map(value => value.trim().toUpperCase())
        .filter(Boolean);
      const invalidControlId = skippedControlIds.find(
        value => !/^[A-Z0-9]+(?:-[A-Z0-9]+)+$/.test(value)
      );
      if (invalidControlId) {
        window.alert('Invalid control ID "' + invalidControlId + '". Use IDs such as AZ-AI-003.');
        return;
      }
      const allowedRegions = document.getElementById("allowedRegions").value
        .split(",")
        .map(value => value.trim().toLowerCase().replaceAll(" ", ""))
        .filter(Boolean);
      const acceptedRegions = new Set(${JSON.stringify(AZURE_PUBLIC_REGIONS)});
      const invalidRegion = allowedRegions.find(value => !acceptedRegions.has(value));
      if (invalidRegion) {
        window.alert('Invalid Azure public-cloud region "' + invalidRegion + '". Use a programmatic name such as uksouth or ukwest.');
        return;
      }
      const exceptions = [];
      for (const row of exceptionRows.querySelectorAll(".exception-row")) {
        const controlId = row.querySelector(".exception-id").value.trim().toUpperCase();
        const owner = row.querySelector(".exception-owner").value.trim();
        const expiresOn = row.querySelector(".exception-expiry").value;
        const ticket = row.querySelector(".exception-ticket").value.trim();
        const justification = row.querySelector(".exception-reason").value.trim();
        if (![controlId, owner, expiresOn, ticket, justification].some(Boolean)) continue;
        if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)+$/.test(controlId) || !owner || !expiresOn || !justification) {
          window.alert("Each governed exception requires a valid control ID, owner, expiry date, and business justification.");
          return;
        }
        exceptions.push({ controlId, owner, expiresOn, justification, ...(ticket ? { ticket } : {}) });
      }
      const costAssumptions = {
        currency: document.getElementById("costCurrency").value.trim().toUpperCase(),
        monthlyStorageGb: Number(document.getElementById("monthlyStorageGb").value),
        monthlyReadOperations: Number(document.getElementById("monthlyReadOperations").value),
        monthlyWriteOperations: Number(document.getElementById("monthlyWriteOperations").value),
        monthlyEgressGb: Number(document.getElementById("monthlyEgressGb").value)
      };
      const costValues = [
        costAssumptions.monthlyStorageGb,
        costAssumptions.monthlyReadOperations,
        costAssumptions.monthlyWriteOperations,
        costAssumptions.monthlyEgressGb
      ];
      if (!/^[A-Z]{3}$/.test(costAssumptions.currency) ||
          costValues.some(value => !Number.isFinite(value) || value < 0)) {
        window.alert("Enter a three-letter currency and non-negative monthly usage values.");
        return;
      }
      vscode.postMessage({
        type: "savePolicy",
        profile: {
          version: 1,
          terraformRoot: terraformRootValue,
          terraformVersion,
          catalogUrl,
          allowedRegions: [...new Set(allowedRegions)],
          costAssumptions,
          requiredTags,
          tagValues,
          skippedControlIds: [...new Set(skippedControlIds)],
          exceptions
        }
      });
    });
  </script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createNonce(): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    { length: 32 },
    () => characters[Math.floor(Math.random() * characters.length)],
  ).join("");
}

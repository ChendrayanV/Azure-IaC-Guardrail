import * as vscode from "vscode";
import {
  defaultWorkspacePolicy,
  loadWorkspacePolicy,
  normalizeWorkspacePolicy,
  WORKSPACE_POLICY_PATH,
  type WorkspacePolicyProfile,
} from "../controls/workspacePolicy";
import { AZURE_PUBLIC_REGIONS } from "../controls/azureRegions";

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
    if (!isSavePolicyMessage(message) || !this.workspaceFolder) {
      return;
    }
    try {
      const panel = this.panel;
      const profile = normalizeWorkspacePolicy(message.profile);
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
        `Azure IaC Guardrail policy saved to ${WORKSPACE_POLICY_PATH}.`,
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
}

interface SavePolicyMessage {
  type: "savePolicy";
  profile: unknown;
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
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>Azure Pre-configuration</title>
  <style nonce="${nonce}">
    body { color: var(--vscode-foreground); background: var(--vscode-editor-background); font: var(--vscode-font-size) var(--vscode-font-family); max-width: 820px; margin: 0 auto; padding: 32px; }
    h1 { font-size: 26px; margin: 0 0 8px; }
    .intro, .hint { color: var(--vscode-descriptionForeground); line-height: 1.5; }
    .status { border-left: 3px solid var(--vscode-testing-iconPassed); padding: 10px 12px; margin: 18px 0; background: var(--vscode-textBlockQuote-background); }
    .card { margin-top: 24px; padding: 20px; background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-widget-border); }
    h2 { font-size: 17px; margin: 0 0 6px; }
    .columns, .tag-row { display: grid; grid-template-columns: minmax(180px, 1fr) minmax(220px, 1.3fr) 76px; gap: 10px; align-items: center; }
    .exception-row { display: grid; grid-template-columns: 120px 1fr 145px 1fr 1.5fr 76px; gap: 8px; margin: 8px 0; align-items: center; }
    .cost-row, .cost-columns { display: grid; grid-template-columns: 90px repeat(4, minmax(110px, 1fr)); gap: 10px; align-items: center; }
    .columns { color: var(--vscode-descriptionForeground); font-size: 12px; font-weight: 600; margin-bottom: 8px; }
    .tag-row { margin: 8px 0; }
    input { box-sizing: border-box; width: 100%; color: var(--vscode-input-foreground); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, transparent); padding: 9px; font: inherit; }
    .wide { margin-top: 8px; }
    code { color: var(--vscode-textPreformat-foreground); }
    input:focus { outline: 1px solid var(--vscode-focusBorder); outline-offset: -1px; }
    button { color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: 0; padding: 9px 14px; cursor: pointer; font-weight: 600; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    .secondary { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
    .secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .actions { display: flex; gap: 10px; margin-top: 18px; }
    @media (max-width: 800px) { .columns { display: none; } .tag-row, .exception-row, .cost-row { grid-template-columns: 1fr; padding-bottom: 12px; border-bottom: 1px solid var(--vscode-widget-border); } }
  </style>
</head>
<body>
  <h1>Azure Pre-configuration</h1>
  <p class="intro">Configure local Azure standards for this Terraform workspace. No Azure sign-in or tenant connection is used.</p>
  ${status ? `<div class="status">${escapeHtml(status)}</div>` : ""}
  <div class="card">
    <h2>Approved Azure regions</h2>
    <label for="allowedRegions"><strong>Allowed ARM region names</strong></label>
    <input id="allowedRegions" class="wide" type="text" list="azureRegions" value="${escapeHtml(profile.allowedRegions.join(", "))}" placeholder="uksouth, ukwest" aria-describedby="regionHelp">
    <datalist id="azureRegions">${regionOptions}</datalist>
    <p id="regionHelp" class="hint">Enter comma-separated Microsoft programmatic region names, for example <code>uksouth, ukwest</code>. A resolved plan resource outside this list is non-compliant.</p>
  </div>
  <div class="card">
    <h2>Monthly cost assumptions</h2>
    <p class="hint">Used when Terraform defines the service but cannot describe runtime usage. Adjust these values to match the workload.</p>
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
  <div class="card">
    <h2>Required tags</h2>
    <p class="hint">Each tag name is required. Enter a value when the scan must also validate an exact key/value pair.</p>
    <div class="columns"><span>Tag name</span><span>Required value (optional)</span><span></span></div>
    <div id="tagRows">${tagRows}</div>
    <div class="actions">
      <button id="add" class="secondary" type="button">Add Tag</button>
    </div>
  </div>
  <div class="card">
    <h2>Governed exceptions</h2>
    <p class="hint">Temporary exceptions require accountability and automatically expire. Expired controls return to the scan.</p>
    <div id="exceptionRows">${exceptionRows}</div>
    <div class="actions"><button id="addException" class="secondary" type="button">Add Governed Exception</button></div>
  </div>
  <div class="card">
    <h2>Skipped standard checks</h2>
    <label for="skippedControls"><strong>SKIP Scan for Control ID(s)</strong></label>
    <input id="skippedControls" class="wide" type="text" value="${escapeHtml(profile.skippedControlIds.join(", "))}" placeholder="AZ-AI-003, AZ-AI-004" aria-describedby="skipHelp">
    <p id="skipHelp" class="hint">Enter comma-separated control IDs. Matching controls are excluded from static and local plan scans.</p>
  </div>
  <div class="actions">
    <button id="save" type="button">Save Azure Pre-configuration</button>
  </div>
  <p class="hint">Saved locally to <code>.azure-iac-guardrail/profile.json</code>. Commit this file to share the same local scan policy with your team.</p>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const rows = document.getElementById("tagRows");
    const exceptionRows = document.getElementById("exceptionRows");
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

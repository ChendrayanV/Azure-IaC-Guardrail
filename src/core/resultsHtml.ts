import type { Finding, PlanAnalysis } from "../types";
import { createSafeFixPreview } from "./safeFix";

export interface FileScanResult {
  scanKind: "static" | "plan";
  filePath: string;
  uri?: string;
  findings: Finding[];
  analysis?: PlanAnalysis;
}

export type PlanProgressStage =
  | "prepare"
  | "initialize"
  | "plan"
  | "evaluate";

export function renderLoadingHtml(
  nonce: string,
  stage?: PlanProgressStage,
  detail = "Reading Terraform files and evaluating compliance...",
): string {
  const stages: Array<[PlanProgressStage, string, string]> = [
    ["prepare", "Prepare", "Workspace and variables"],
    ["initialize", "Initialize", "Terraform providers"],
    ["plan", "Create plan", "Resolve configuration"],
    ["evaluate", "Evaluate", "Apply standards"],
  ];
  const activeIndex = stages.findIndex(([id]) => id === stage);
  const stagedProgress =
    activeIndex >= 0
      ? `<div class="progress" role="progressbar" aria-valuenow="${activeIndex + 1}" aria-valuemin="1" aria-valuemax="${stages.length}"><span></span></div>
    <div class="stages">
      ${stages
        .map(
          ([, label, description], index) =>
            `<div class="stage ${index < activeIndex ? "done" : index === activeIndex ? "active" : ""}">
              <strong>${index === activeIndex ? '<span class="pulse"></span>' : index < activeIndex ? "✓ " : ""}${label}</strong>
              <small>${description}</small>
            </div>`,
        )
        .join("")}
    </div>`
      : '<div class="progress indeterminate"><span></span></div>';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Azure IaC Guardrail</title>
  <style nonce="${nonce}">
    :root { color-scheme: light dark; }
    body {
      margin: 0;
      display: grid;
      min-height: 100vh;
      place-items: center;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      font-family: var(--vscode-font-family);
    }
    main { width: min(760px, calc(100vw - 64px)); padding: 32px; }
    h1 { margin: 0 0 8px; font-size: 25px; font-weight: 650; text-align: center; }
    .detail { margin: 0 0 30px; color: var(--vscode-descriptionForeground); text-align: center; }
    .progress { height: 6px; overflow: hidden; border-radius: 999px; background: var(--vscode-progressBar-background); opacity: .35; }
    .progress span { display: block; width: ${Math.max(0, ((activeIndex + 1) / stages.length) * 100)}%; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #1683ff, #8b5cf6, #14b8a6); transition: width .25s ease; }
    .progress.indeterminate span { width: 34%; animation: travel 1.3s ease-in-out infinite; }
    .stages { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 18px; }
    .stage { padding: 14px 12px; border: 1px solid var(--vscode-panel-border); border-radius: 9px; background: var(--vscode-sideBar-background); }
    .stage strong, .stage small { display: block; }
    .stage strong { margin-bottom: 5px; }
    .stage small { color: var(--vscode-descriptionForeground); line-height: 1.35; }
    .stage.done { border-color: #22a06b; background: color-mix(in srgb, #22a06b 12%, var(--vscode-sideBar-background)); }
    .stage.active { border-color: #1683ff; box-shadow: 0 0 0 1px #1683ff55, 0 8px 24px #1683ff18; }
    .stage.active strong { color: #4ca1ff; }
    .pulse { display: inline-block; width: 7px; height: 7px; margin-right: 7px; border-radius: 50%; background: currentColor; animation: pulse 1.2s ease-in-out infinite; }
    @keyframes pulse { 50% { opacity: .25; transform: scale(.75); } }
    @keyframes travel { from { transform: translateX(-110%); } to { transform: translateX(305%); } }
    @media (max-width: 650px) { .stages { grid-template-columns: repeat(2, 1fr); } }
  </style>
</head>
<body>
  <main>
    <h1>Azure IaC Guardrail is scanning</h1>
    <p class="detail">${escapeHtml(detail)}</p>
    ${stagedProgress}
  </main>
</body>
</html>`;
}

export function renderErrorHtml(message: string, nonce: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Azure IaC Guardrail</title>
  <style nonce="${nonce}">
    :root { color-scheme: light dark; }
    body {
      margin: 0;
      padding: 32px;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      font-family: var(--vscode-font-family);
    }
    main {
      max-width: 760px;
      margin: 48px auto;
      padding: 24px;
      border: 1px solid var(--vscode-panel-border);
      border-left: 4px solid var(--vscode-testing-iconFailed);
      border-radius: 8px;
      background: var(--vscode-sideBar-background);
    }
    h1 { margin: 0 0 12px; font-size: 21px; }
    p { margin: 0; line-height: 1.6; white-space: pre-wrap; }
  </style>
</head>
<body>
  <main>
    <h1>Azure IaC Guardrail scan failed</h1>
    <p>${escapeHtml(message)}</p>
  </main>
</body>
</html>`;
}

export function renderResultsHtml(
  results: FileScanResult[],
  nonce: string,
  canRescan = false,
): string {
  const findings = results.flatMap((result) =>
    result.findings.map((finding) => ({ ...finding, file: result })),
  );
  const noncompliant = findings.filter(
    (finding) => finding.outcome === "noncompliant",
  );
  const compliant = findings.filter(
    (finding) => finding.outcome === "compliant",
  );
  const unresolved = findings.filter(
    (finding) => finding.outcome === "unresolved",
  ).length;
  const unresolvedLabel = results.every(
    (result) => result.scanKind === "plan",
  )
    ? "Apply-time value"
    : "Plan required";
  const statusClass =
    noncompliant.length > 0
      ? "fail"
      : unresolved > 0
        ? "review"
        : "pass";
  const statusText =
    noncompliant.length > 0
      ? "Action required"
      : unresolved > 0
        ? unresolvedLabel
        : "Compliant";
  const analysis = results.find((result) => result.analysis)?.analysis;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Azure IaC Guardrail</title>
  <style nonce="${nonce}">
    :root { color-scheme: light dark; }
    body {
      margin: 0;
      padding: 28px;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      font-family: var(--vscode-font-family);
    }
    .page { max-width: 980px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }
    .header-actions { display: flex; gap: 10px; align-items: center; }
    h1 { margin: 0 0 6px; font-size: 24px; font-weight: 600; }
    .subtitle { margin: 0; color: var(--vscode-descriptionForeground); }
    .status {
      padding: 7px 12px;
      border: 1px solid;
      border-radius: 999px;
      font-weight: 600;
      white-space: nowrap;
    }
    .status.pass { color: var(--vscode-testing-iconPassed); }
    .status.fail { color: var(--vscode-testing-iconFailed); }
    .status.review { color: var(--vscode-editorWarning-foreground); }
    .export {
      padding: 7px 12px;
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 5px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .export:hover { background: var(--vscode-button-hoverBackground); }
    .rescan {
      padding: 7px 12px;
      border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
      border-radius: 5px;
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .rescan:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .summary {
      display: grid;
      grid-template-columns: repeat(5, minmax(110px, 1fr));
      gap: 12px;
      margin: 24px 0 28px;
    }
    .metric, .finding, .empty {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      background: var(--vscode-sideBar-background);
    }
    .metric { position: relative; overflow: hidden; padding: 16px; border-top: 3px solid var(--metric-color); background: linear-gradient(145deg, color-mix(in srgb, var(--metric-color) 13%, var(--vscode-sideBar-background)), var(--vscode-sideBar-background) 68%); }
    .metric::after { content: ""; position: absolute; width: 58px; height: 58px; right: -20px; top: -24px; border-radius: 50%; background: var(--metric-color); opacity: .12; }
    .metric strong { display: block; font-size: 24px; margin-bottom: 4px; }
    .metric span { color: var(--vscode-descriptionForeground); }
    .metric.sources { --metric-color: #1683ff; }
    .metric.evaluated { --metric-color: #8b5cf6; }
    .metric.compliant { --metric-color: #22a06b; }
    .metric.noncompliant { --metric-color: #e5484d; }
    .metric.unresolved { --metric-color: #f59e0b; }
    .metric.compliant strong { color: #2fbf7f; }
    .metric.noncompliant strong { color: #ff6369; }
    .metric.unresolved strong { color: #f6ad32; }
    h2 { margin: 0 0 14px; font-size: 17px; }
    .findings-stack { display: grid; gap: 9px; }
    .finding { margin: 0; overflow: hidden; transition: border-color .16s ease, box-shadow .16s ease, transform .16s ease; }
    .finding:hover { transform: translateY(-1px); box-shadow: 0 7px 20px color-mix(in srgb, #000 16%, transparent); }
    .finding.expanded { box-shadow: 0 10px 28px color-mix(in srgb, #000 20%, transparent); }
    .finding.error { border-left: 4px solid var(--vscode-testing-iconFailed); }
    .finding.warning { border-left: 4px solid var(--vscode-editorWarning-foreground); }
    .finding.information { border-left: 4px solid var(--vscode-editorInfo-foreground); }
    .finding.unresolved { border-left: 4px solid var(--vscode-editorWarning-foreground); }
    .finding.compliant { border-left: 4px solid var(--vscode-testing-iconPassed); }
    .finding[hidden] { display: none; }
    .finding-toggle {
      display: grid;
      grid-template-columns: auto minmax(180px, 1.5fr) minmax(160px, 1fr) minmax(120px, .75fr) auto;
      gap: 12px;
      width: 100%;
      align-items: center;
      padding: 12px 15px;
      border: 0;
      color: inherit;
      background: transparent;
      cursor: pointer;
      font: inherit;
      text-align: left;
    }
    .finding-toggle:hover { background: color-mix(in srgb, var(--vscode-list-hoverBackground) 72%, transparent); }
    .finding-toggle:focus-visible { outline: 2px solid var(--vscode-focusBorder); outline-offset: -2px; }
    .finding-summary-title { min-width: 0; }
    .finding-summary-title h3 { margin: 5px 0 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
    .finding-summary-meta { min-width: 0; }
    .finding-summary-meta span { display: block; margin-bottom: 3px; color: var(--vscode-descriptionForeground); font-size: 9px; text-transform: uppercase; }
    .finding-summary-meta code { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--vscode-foreground); font-family: var(--vscode-editor-font-family); font-size: 11px; }
    .finding-chevron {
      display: grid;
      width: 28px;
      height: 28px;
      place-items: center;
      border-radius: 7px;
      color: var(--vscode-descriptionForeground);
      background: var(--vscode-editor-background);
      transition: transform .16s ease, color .16s ease, background .16s ease;
    }
    .finding.expanded .finding-chevron { transform: rotate(180deg); color: var(--vscode-foreground); background: var(--vscode-button-secondaryBackground); }
    .badge {
      display: inline-block;
      margin-right: 8px;
      padding: 2px 7px;
      border-radius: 4px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      font-size: 11px;
      font-weight: 700;
    }
    .control-id { color: var(--vscode-descriptionForeground); font-family: var(--vscode-editor-font-family); }
    .details { padding: 2px 17px 17px; border-top: 1px solid var(--vscode-panel-border); }
    .details[hidden] { display: none; }
    .details p { margin: 8px 0; line-height: 1.5; }
    .meta { color: var(--vscode-descriptionForeground); }
    .evaluation {
      display: grid;
      grid-template-columns: repeat(2, minmax(160px, 1fr));
      gap: 10px;
      margin: 12px 0;
    }
    .value {
      padding: 10px 12px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 5px;
      background: var(--vscode-editor-background);
    }
    .value span {
      display: block;
      margin-bottom: 5px;
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
      text-transform: uppercase;
    }
    .value code { font-family: var(--vscode-editor-font-family); }
    button.link {
      border: 0;
      padding: 0;
      color: var(--vscode-textLink-foreground);
      background: transparent;
      font: inherit;
      cursor: pointer;
    }
    button.link:hover { color: var(--vscode-textLink-activeForeground); text-decoration: underline; }
    .reference { margin-top: 10px; }
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 0 0 18px;
    }
    .filter {
      padding: 6px 10px;
      border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
      border-radius: 5px;
      color: var(--vscode-foreground);
      background: var(--vscode-button-secondaryBackground);
      cursor: pointer;
    }
    .filter.active {
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
    }
    .remediation {
      margin-top: 12px;
      padding: 12px;
      border-radius: 5px;
      background: var(--vscode-textBlockQuote-background);
      border-left: 3px solid var(--vscode-focusBorder);
    }
    .apply-time-explanation p { margin: 7px 0; }
    .apply-time-scenario {
      margin-top: 10px;
      padding: 10px 12px;
      border: 1px solid color-mix(in srgb, #f59e0b 35%, var(--vscode-panel-border));
      border-radius: 6px;
      background: color-mix(in srgb, #f59e0b 8%, var(--vscode-editor-background));
    }
    .apply-time-next { color: var(--vscode-descriptionForeground); }
    .empty { padding: 36px; text-align: center; }
    .empty h2 { color: var(--vscode-testing-iconPassed); }
    .views {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin: 0 0 22px;
      padding: 5px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 13px;
      background: color-mix(in srgb, var(--vscode-sideBar-background) 78%, transparent);
    }
    .view-tab {
      --tab-color: #1683ff;
      display: flex;
      align-items: center;
      gap: 11px;
      min-width: 0;
      padding: 11px 13px;
      border: 1px solid transparent;
      border-radius: 9px;
      color: var(--vscode-descriptionForeground);
      background: transparent;
      cursor: pointer;
      font: inherit;
      font-weight: 600;
      text-align: left;
      transition: transform .16s ease, border-color .16s ease, background .16s ease, box-shadow .16s ease;
    }
    .view-tab:hover {
      color: var(--vscode-foreground);
      border-color: color-mix(in srgb, var(--tab-color) 38%, var(--vscode-panel-border));
      background: color-mix(in srgb, var(--tab-color) 8%, var(--vscode-sideBar-background));
      transform: translateY(-1px);
    }
    .view-tab.active {
      color: var(--vscode-foreground);
      border-color: color-mix(in srgb, var(--tab-color) 68%, var(--vscode-panel-border));
      background: linear-gradient(135deg, color-mix(in srgb, var(--tab-color) 20%, var(--vscode-sideBar-background)), var(--vscode-sideBar-background) 72%);
      box-shadow: 0 7px 22px color-mix(in srgb, var(--tab-color) 18%, transparent), inset 0 1px color-mix(in srgb, #fff 9%, transparent);
      transform: translateY(-1px);
    }
    .view-tab.findings { --tab-color: #1683ff; }
    .view-tab.architecture { --tab-color: #8b5cf6; }
    .view-tab.changes { --tab-color: #f59e0b; }
    .view-tab-icon {
      display: grid;
      flex: 0 0 30px;
      width: 30px;
      height: 30px;
      place-items: center;
      border-radius: 8px;
      color: color-mix(in srgb, var(--tab-color) 82%, white);
      background: color-mix(in srgb, var(--tab-color) 15%, var(--vscode-editor-background));
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tab-color) 35%, transparent);
      font-size: 15px;
    }
    .view-tab.active .view-tab-icon {
      color: white;
      background: var(--tab-color);
      box-shadow: 0 5px 14px color-mix(in srgb, var(--tab-color) 35%, transparent);
    }
    .view-tab-copy { min-width: 0; }
    .view-tab-copy strong, .view-tab-copy small { display: block; }
    .view-tab-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .view-tab-copy small { margin-top: 2px; color: var(--vscode-descriptionForeground); font-size: 10px; font-weight: 400; }
    .view[hidden] { display: none; }
    .analysis-grid { display: grid; grid-template-columns: repeat(3, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .analysis-card { padding: 15px; border: 1px solid var(--vscode-panel-border); border-radius: 8px; background: var(--vscode-sideBar-background); }
    .analysis-card strong { display: block; font-size: 22px; margin-bottom: 5px; }
    .risk-score.high strong, .risk-high { color: #ff6369; }
    .risk-score.medium strong, .risk-medium { color: #f6ad32; }
    .risk-score.low strong, .risk-low { color: #2fbf7f; }
    .graph { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; }
    .node { position: relative; padding: 14px; border: 1px solid var(--vscode-panel-border); border-left: 4px solid #64748b; border-radius: 8px; background: var(--vscode-sideBar-background); }
    .node.high { border-left-color: #e5484d; } .node.medium { border-left-color: #f59e0b; } .node.low { border-left-color: #22a06b; }
    .node strong, .node code { display: block; } .node code { margin-top: 6px; color: var(--vscode-descriptionForeground); font-size: 11px; overflow-wrap: anywhere; }
    .node-meta { margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap; }
    .chip { padding: 2px 7px; border-radius: 999px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); font-size: 10px; text-transform: uppercase; }
    .connections, .impact-list { margin-top: 18px; }
    .connection, .impact { display: grid; grid-template-columns: 120px 1fr; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--vscode-panel-border); }
    .impact { grid-template-columns: 90px minmax(220px, 1fr) 2fr; }
    .fix-preview { margin-top: 10px; padding: 7px 10px; border: 1px solid #22a06b; border-radius: 5px; color: #2fbf7f; background: transparent; cursor: pointer; font: inherit; font-weight: 600; }
    .diagram-action { display: flex; justify-content: space-between; gap: 18px; align-items: center; margin: 0 0 18px; padding: 16px; border: 1px solid #1683ff66; border-radius: 10px; background: linear-gradient(135deg, color-mix(in srgb, #1683ff 14%, var(--vscode-sideBar-background)), var(--vscode-sideBar-background)); }
    .diagram-action strong, .diagram-action span { display: block; }
    .diagram-action span { margin-top: 4px; color: var(--vscode-descriptionForeground); }
    .diagram-preview { opacity: .72; cursor: not-allowed; }
    dialog { width: min(720px, calc(100vw - 48px)); color: var(--vscode-foreground); background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-widget-border); border-radius: 10px; padding: 22px; }
    dialog::backdrop { background: #0008; }
    .diff { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .diff pre { min-height: 80px; margin: 6px 0; padding: 12px; overflow: auto; border-radius: 6px; background: var(--vscode-textCodeBlock-background); white-space: pre-wrap; }
    .before pre { border-left: 3px solid #e5484d; } .after pre { border-left: 3px solid #22a06b; }
    .dialog-actions { display: flex; justify-content: flex-end; margin-top: 16px; }
    @media (max-width: 650px) {
      body { padding: 18px; }
      .header { display: block; }
      .status { display: inline-block; margin-top: 14px; }
      .summary { grid-template-columns: repeat(2, 1fr); }
      .views { grid-template-columns: 1fr; }
      .finding-toggle { grid-template-columns: auto minmax(0, 1fr) auto; }
      .finding-summary-meta { display: none; }
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="header">
      <div>
        <h1>Azure IaC Guardrail</h1>
        <p class="subtitle">${scanSubtitle(results)}</p>
      </div>
      <div class="header-actions">
        ${canRescan ? '<button class="rescan" type="button" data-rescan>Rescan Local Plan</button>' : ""}
        <button class="rescan" type="button" data-export-evidence>Export Evidence Pack</button>
        <button class="export" type="button" data-export-pdf>Export PDF</button>
        <span class="status ${statusClass}">${statusText}</span>
      </div>
    </header>
    <section class="summary" aria-label="Scan summary">
      ${metric(results.length, "Sources scanned", "sources")}
      ${metric(findings.length, "Checks evaluated", "evaluated")}
      ${metric(compliant.length, "Compliant", "compliant")}
      ${metric(noncompliant.length, "Non-compliant", "noncompliant")}
      ${metric(unresolved, unresolvedLabel, "unresolved")}
    </section>
    ${
      analysis
        ? `<nav class="views" aria-label="Result views">
          <button class="view-tab findings active" data-view-tab="findings" type="button" aria-pressed="true">
            <span class="view-tab-icon" aria-hidden="true">✓</span>
            <span class="view-tab-copy"><strong>Findings</strong><small>Controls and remediation</small></span>
          </button>
          <button class="view-tab architecture" data-view-tab="architecture" type="button" aria-pressed="false">
            <span class="view-tab-icon" aria-hidden="true">◇</span>
            <span class="view-tab-copy"><strong>Architecture Risk Graph</strong><small>Resources and relationships</small></span>
          </button>
          <button class="view-tab changes" data-view-tab="changes" type="button" aria-pressed="false">
            <span class="view-tab-icon" aria-hidden="true">↗</span>
            <span class="view-tab-copy"><strong>PR Change &amp; Blast Radius</strong><small>Change impact and risk</small></span>
          </button>
        </nav>`
        : ""
    }
    <div class="view" data-view="findings">
    ${
      findings.length === 0
        ? `<section class="empty"><h2>No applicable controls</h2><p>No supported Terraform resources were found in this scan.</p></section>`
        : `<section>
          <h2>Compliance checks</h2>
          <div class="filters" role="group" aria-label="Filter compliance checks">
            ${filterButton("all", "All", findings.length, true)}
            ${filterButton("noncompliant", "Non-compliant", noncompliant.length)}
            ${filterButton("compliant", "Compliant", compliant.length)}
            ${filterButton("unresolved", unresolvedLabel, unresolved)}
          </div>
          <div class="findings-stack">
          ${findings
            .map(
              (finding, index) => `
        <article class="finding ${findingClass(finding)}" data-outcome="${finding.outcome}" data-finding-card>
          <button class="finding-toggle" type="button" data-finding-toggle aria-expanded="false" aria-controls="finding-details-${index}">
            <span class="badge">${escapeHtml(outcomeLabel(finding, finding.file.scanKind))}</span>
            <span class="finding-summary-title">
              <span class="control-id">${escapeHtml(finding.control.id)}</span>
              <h3>${escapeHtml(finding.control.title)}</h3>
            </span>
            <span class="finding-summary-meta">
              <span>Resource</span>
              <code>${escapeHtml(finding.resource.address ?? `${finding.resource.type}.${finding.resource.name}`)}</code>
            </span>
            <span class="finding-summary-meta">
              <span>Observed</span>
              <code>${escapeHtml(formatValue(finding.actual))}</code>
            </span>
            <span class="finding-chevron" aria-hidden="true">⌄</span>
          </button>
          <div class="details" id="finding-details-${index}" hidden>
            <p>${escapeHtml(finding.control.description)}</p>
            <p class="meta">
              Resource: <strong>${escapeHtml(finding.resource.address ?? `${finding.resource.type}.${finding.resource.name}`)}</strong>
              &nbsp;&middot;&nbsp;
              ${renderLocation(finding.file, finding.line)}
            </p>
            <div class="evaluation">
              <div class="value">
                <span>Observed</span>
                <code>${escapeHtml(formatValue(finding.actual))}</code>
              </div>
              <div class="value">
                <span>Expected</span>
                <code>${escapeHtml(formatExpectation(finding))}</code>
              </div>
            </div>
            ${
              finding.outcome === "unresolved"
                ? finding.file.scanKind === "plan"
                  ? `<div class="remediation apply-time-explanation">
                      <strong>Apply-time value: Terraform cannot know this value until Azure creates the resource</strong>
                      <p>The plan completed successfully, but the AzureRM provider returned this specific attribute as <em>known after apply</em>. Azure IaC Guardrail therefore cannot confirm or reject this control from the current plan.</p>
                      <div class="apply-time-scenario"><strong>Example scenario</strong><br>A new storage account does not have its final Azure resource ID until it is created. A private endpoint can reference that ID in Terraform, but the resolved relationship may remain unknown in the pre-deployment plan. The private-endpoint control is reported as an apply-time value instead of incorrectly passing or failing.</div>
                      <p class="apply-time-next"><strong>What to do:</strong> review the planned configuration and dependency, then verify the deployed resource or scan a later plan after the resource exists. Running the same unchanged pre-deployment plan usually produces the same result.</p>
                    </div>`
                  : `<div class="remediation"><strong>Runtime value required</strong><br>Run <em>Azure IaC Guardrail: Create and Scan Local Terraform Plan</em> and select the applicable .tfvars file.</div>`
                : ""
            }
            ${
              finding.outcome === "noncompliant" &&
              finding.control.remediation
                ? `<div class="remediation"><strong>Remediation</strong><br>${escapeHtml(finding.control.remediation)}</div>`
                : ""
            }
            ${renderFixPreviewButton(finding, index)}
            ${
              finding.control.reference
                ? `<p class="reference"><button class="link" type="button" data-reference="${escapeAttribute(finding.control.reference)}">Microsoft guidance</button></p>`
                : ""
            }
            ${
              finding.control.benchmarkReference
                ? `<p class="reference"><button class="link" type="button" data-reference="${escapeAttribute(finding.control.benchmarkReference)}">Aqua AVD rule</button></p>`
                : ""
            }
          </div>
        </article>`,
            )
            .join("")}
          </div></section>`
    }
    </div>
    ${analysis ? renderArchitectureView(analysis) : ""}
    ${analysis ? renderChangeView(analysis) : ""}
    <dialog id="fixDialog">
      <h2 id="fixTitle">Safe fix preview</h2>
      <p id="fixResource" class="meta"></p>
      <div class="diff">
        <div class="before"><strong>Current</strong><pre id="fixBefore"></pre></div>
        <div class="after"><strong>Suggested</strong><pre id="fixAfter"></pre></div>
      </div>
      <p id="fixNote" class="meta"></p>
      <div class="dialog-actions"><button class="export" type="button" data-close-fix>Close Preview</button></div>
    </dialog>
  </main>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.addEventListener("click", (event) => {
      const filter = event.target.closest("[data-filter]");
      if (filter) {
        const selected = filter.dataset.filter;
        document.querySelectorAll("[data-filter]").forEach((button) => {
          button.classList.toggle("active", button === filter);
        });
        document.querySelectorAll("[data-outcome]").forEach((card) => {
          card.hidden = selected !== "all" && card.dataset.outcome !== selected;
        });
        return;
      }
      const viewTab = event.target.closest("[data-view-tab]");
      if (viewTab) {
        document.querySelectorAll("[data-view-tab]").forEach(button => {
          const active = button === viewTab;
          button.classList.toggle("active", active);
          button.setAttribute("aria-pressed", String(active));
        });
        document.querySelectorAll("[data-view]").forEach(view => {
          view.hidden = view.dataset.view !== viewTab.dataset.viewTab;
        });
        return;
      }
      const findingToggle = event.target.closest("[data-finding-toggle]");
      if (findingToggle) {
        const card = findingToggle.closest("[data-finding-card]");
        const details = card.querySelector(".details");
        const expanded = findingToggle.getAttribute("aria-expanded") !== "true";
        findingToggle.setAttribute("aria-expanded", String(expanded));
        card.classList.toggle("expanded", expanded);
        details.hidden = !expanded;
        return;
      }
      const fix = event.target.closest("[data-fix-preview]");
      if (fix) {
        document.getElementById("fixTitle").textContent = fix.dataset.title;
        document.getElementById("fixResource").textContent = fix.dataset.resource;
        document.getElementById("fixBefore").textContent = fix.dataset.before;
        document.getElementById("fixAfter").textContent = fix.dataset.after;
        document.getElementById("fixNote").textContent = fix.dataset.note;
        document.getElementById("fixDialog").showModal();
        return;
      }
      if (event.target.closest("[data-close-fix]")) {
        document.getElementById("fixDialog").close();
        return;
      }
      const exportPdf = event.target.closest("[data-export-pdf]");
      if (exportPdf) {
        vscode.postMessage({ type: "exportPdf" });
        return;
      }
      if (event.target.closest("[data-export-evidence]")) {
        vscode.postMessage({ type: "exportEvidence" });
        return;
      }
      const rescan = event.target.closest("[data-rescan]");
      if (rescan) {
        vscode.postMessage({ type: "rescan" });
        return;
      }
      const target = event.target.closest("[data-uri]");
      if (target) {
        vscode.postMessage({
          type: "openFinding",
          uri: target.dataset.uri,
          line: Number(target.dataset.line)
        });
        return;
      }
      const reference = event.target.closest("[data-reference]");
      if (reference) {
        vscode.postMessage({
          type: "openReference",
          url: reference.dataset.reference
        });
      }
    });
  </script>
</body>
</html>`;
}

function metric(value: number, label: string, className: string): string {
  return `<div class="metric ${className}"><strong>${value}</strong><span>${label}</span></div>`;
}

function renderFixPreviewButton(
  finding: Finding,
  index: number,
): string {
  const preview = createSafeFixPreview(finding);
  if (!preview) {
    return "";
  }
  return `<button class="fix-preview" type="button" data-fix-preview="${index}" data-title="${escapeAttribute(preview.title)}" data-resource="${escapeAttribute(preview.resourceAddress)}" data-before="${escapeAttribute(preview.before)}" data-after="${escapeAttribute(preview.after)}" data-note="${escapeAttribute(preview.note)}">Preview Safe Fix</button>`;
}

function renderArchitectureView(analysis: PlanAnalysis): string {
  const riskClass =
    analysis.riskScore >= 60
      ? "high"
      : analysis.riskScore >= 25
        ? "medium"
        : "low";
  return `<section class="view" data-view="architecture" hidden>
    <div class="diagram-action">
      <div><strong>Interactive Terraform topology</strong><span>A full-size architecture diagram with relationships, risk, change actions, and resource details is coming soon.</span></div>
      <button class="export diagram-preview" type="button" disabled aria-disabled="true">Open Architecture Diagram · Preview</button>
    </div>
    <div class="analysis-grid">
      <div class="analysis-card risk-score ${riskClass}"><strong>${analysis.riskScore}/100</strong><span>Architecture risk score</span></div>
      <div class="analysis-card"><strong>${analysis.nodes.length}</strong><span>Azure resources</span></div>
      <div class="analysis-card"><strong>${analysis.edges.length}</strong><span>Inferred relationships</span></div>
    </div>
    <h2>Resource topology</h2>
    <div class="graph">
      ${analysis.nodes
        .map(
          (node) => `<article class="node ${node.risk}">
            <strong>${escapeHtml(node.service)}</strong>
            <code>${escapeHtml(node.address)}</code>
            <div class="node-meta">
              <span class="chip">${escapeHtml(node.changeAction)}</span>
              <span class="chip">${escapeHtml(node.risk)} risk</span>
              ${node.publicExposure ? '<span class="chip">public</span>' : ""}
            </div>
          </article>`,
        )
        .join("")}
    </div>
    <div class="connections">
      <h2>Relationships</h2>
      ${
        analysis.edges.length
          ? analysis.edges
              .map(
                (edge) => `<div class="connection"><span class="chip">${escapeHtml(edge.label)}</span><code>${escapeHtml(edge.source)} → ${escapeHtml(edge.target)}</code></div>`,
              )
              .join("")
          : '<p class="meta">No cross-resource relationships were inferred from resolved plan values.</p>'
      }
    </div>
  </section>`;
}

function renderChangeView(analysis: PlanAnalysis): string {
  return `<section class="view" data-view="changes" hidden>
    <div class="analysis-grid">
      <div class="analysis-card"><strong>${analysis.changes.create}</strong><span>Create</span></div>
      <div class="analysis-card"><strong>${analysis.changes.update}</strong><span>Update</span></div>
      <div class="analysis-card"><strong>${analysis.changes.delete + analysis.changes.replace}</strong><span>Delete or replace</span></div>
    </div>
    <h2>Blast-radius assessment</h2>
    <div class="impact-list">
      ${
        analysis.blastRadius.length
          ? analysis.blastRadius
              .map(
                (item) => `<div class="impact"><strong class="risk-${item.risk}">${escapeHtml(item.risk.toUpperCase())}</strong><code>${escapeHtml(item.address)}</code><span>${escapeHtml(item.reason)}</span></div>`,
              )
              .join("")
          : '<p class="meta">No material resource changes or architecture risks were detected.</p>'
      }
    </div>
  </section>`;
}

function filterButton(
  filter: string,
  label: string,
  count: number,
  active = false,
): string {
  return `<button class="filter${active ? " active" : ""}" data-filter="${filter}" type="button">${label} (${count})</button>`;
}

function findingClass(finding: Finding): string {
  if (finding.outcome !== "noncompliant") {
    return finding.outcome;
  }
  return finding.control.severity;
}

function outcomeLabel(
  finding: Finding,
  scanKind: FileScanResult["scanKind"],
): string {
  if (finding.outcome === "unresolved") {
    return scanKind === "plan" ? "APPLY-TIME VALUE" : "PLAN REQUIRED";
  }
  if (finding.outcome === "compliant") {
    return "COMPLIANT";
  }
  return finding.control.severity.toUpperCase();
}

function scanSubtitle(results: FileScanResult[]): string {
  const kinds = new Set(results.map((result) => result.scanKind));
  if (kinds.size > 1) {
    return "Static Terraform and resolved plan controls scan";
  }
  return kinds.has("plan")
    ? "Resolved Terraform plan controls scan"
    : "Static Terraform file controls scan";
}

function renderLocation(result: FileScanResult, line: number): string {
  if (result.scanKind === "static" && result.uri) {
    return `<button class="link" data-uri="${escapeAttribute(result.uri)}" data-line="${line}">
                ${escapeHtml(result.filePath)}:${line + 1}
              </button>`;
  }
  return `<span>${escapeHtml(result.filePath)}</span>`;
}

function formatExpectation(finding: Finding): string {
  if (finding.control.operator === "notEquals") {
    return `not ${formatValue(finding.expected)}`;
  }
  if (finding.control.operator === "oneOf") {
    return `one of ${formatValue(finding.expected)}`;
  }
  if (finding.control.operator === "contains") {
    return `contains ${formatValue(finding.expected)}`;
  }
  return formatValue(finding.expected);
}

function formatValue(value: unknown): string {
  if (value === undefined) {
    return "attribute missing";
  }
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

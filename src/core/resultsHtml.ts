import type { Finding } from "../types";

export interface FileScanResult {
  scanKind: "static" | "plan";
  filePath: string;
  uri?: string;
  findings: Finding[];
}

export function renderLoadingHtml(nonce: string): string {
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
    main { padding: 32px; text-align: center; }
    h1 { margin: 0 0 10px; font-size: 22px; font-weight: 600; }
    p { margin: 0; color: var(--vscode-descriptionForeground); }
  </style>
</head>
<body>
  <main>
    <h1>Azure IaC Guardrail is scanning</h1>
    <p>Reading Terraform files and evaluating compliance...</p>
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
        ? "Plan required"
        : "Compliant";

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
    .metric { padding: 16px; }
    .metric strong { display: block; font-size: 24px; margin-bottom: 4px; }
    .metric span { color: var(--vscode-descriptionForeground); }
    h2 { margin: 0 0 14px; font-size: 17px; }
    .finding { margin-bottom: 12px; overflow: hidden; }
    .finding.error { border-left: 4px solid var(--vscode-testing-iconFailed); }
    .finding.warning { border-left: 4px solid var(--vscode-editorWarning-foreground); }
    .finding.information { border-left: 4px solid var(--vscode-editorInfo-foreground); }
    .finding.unresolved { border-left: 4px solid var(--vscode-editorWarning-foreground); }
    .finding.compliant { border-left: 4px solid var(--vscode-testing-iconPassed); }
    .finding[hidden] { display: none; }
    .finding-header { padding: 15px 17px 10px; }
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
    .finding h3 { margin: 9px 0 0; font-size: 16px; }
    .details { padding: 0 17px 15px; }
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
    .empty { padding: 36px; text-align: center; }
    .empty h2 { color: var(--vscode-testing-iconPassed); }
    @media (max-width: 650px) {
      body { padding: 18px; }
      .header { display: block; }
      .status { display: inline-block; margin-top: 14px; }
      .summary { grid-template-columns: repeat(2, 1fr); }
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
      <span class="status ${statusClass}">${statusText}</span>
    </header>
    <section class="summary" aria-label="Scan summary">
      ${metric(results.length, "Sources scanned")}
      ${metric(findings.length, "Checks evaluated")}
      ${metric(compliant.length, "Compliant")}
      ${metric(noncompliant.length, "Non-compliant")}
      ${metric(unresolved, "Plan required")}
    </section>
    ${
      findings.length === 0
        ? `<section class="empty"><h2>No applicable controls</h2><p>No supported Terraform resources were found in this scan.</p></section>`
        : `<section>
          <h2>Compliance checks</h2>
          <div class="filters" role="group" aria-label="Filter compliance checks">
            ${filterButton("all", "All", findings.length, true)}
            ${filterButton("noncompliant", "Non-compliant", noncompliant.length)}
            ${filterButton("compliant", "Compliant", compliant.length)}
            ${filterButton("unresolved", "Plan required", unresolved)}
          </div>
          ${findings
            .map(
              (finding) => `
        <article class="finding ${findingClass(finding)}" data-outcome="${finding.outcome}">
          <div class="finding-header">
            <span class="badge">${escapeHtml(outcomeLabel(finding))}</span>
            <span class="control-id">${escapeHtml(finding.control.id)}</span>
            <h3>${escapeHtml(finding.control.title)}</h3>
          </div>
          <div class="details">
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
                ? `<div class="remediation"><strong>Runtime value required</strong><br>Run <em>Azure IaC Guardrail: Create and Scan Local Terraform Plan</em> and select the applicable .tfvars file.</div>`
                : ""
            }
            ${
              finding.outcome === "noncompliant" &&
              finding.control.remediation
                ? `<div class="remediation"><strong>Remediation</strong><br>${escapeHtml(finding.control.remediation)}</div>`
                : ""
            }
          </div>
        </article>`,
            )
            .join("")}</section>`
    }
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
      const target = event.target.closest("[data-uri]");
      if (target) {
        vscode.postMessage({
          type: "openFinding",
          uri: target.dataset.uri,
          line: Number(target.dataset.line)
        });
      }
    });
  </script>
</body>
</html>`;
}

function metric(value: number, label: string): string {
  return `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`;
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

function outcomeLabel(finding: Finding): string {
  if (finding.outcome === "unresolved") {
    return "PLAN REQUIRED";
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

import type { Finding, PlanAnalysis } from "../types";

export interface CloudCanvasDiagramPayload {
  label: string;
  sourceKind: "configuration";
  analysis: PlanAnalysis;
  findings: Finding[];
  graphvizDot?: string;
  graphvizSvg?: string;
}

export function renderSketchHtml(nonce: string, cspSource: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>Cloud Canvas</title>
  <style nonce="${nonce}">
${renderStyles()}
  </style>
</head>
<body>
  <div class="shell">
    <header class="hero">
      <div class="hero-icon" aria-hidden="true">AZ</div>
      <div class="hero-copy">
        <h1>Cloud Canvas</h1>
        <p id="subtitle">Generate a static GraphViz Azure architecture diagram from the Terraform configuration in this workspace.</p>
      </div>
      <button id="fromConfig" type="button">Generate From Terraform</button>
    </header>
    <section id="summary" class="summary" hidden>
      <div><strong id="resourceCount">0</strong><span>Resources</span></div>
      <div><strong id="connectionCount">0</strong><span>Connections</span></div>
      <div><strong id="riskScore">0</strong><span>Risk score</span></div>
      <div><strong id="sourceKind">Terraform</strong><span>Source</span></div>
    </section>
    <section class="toolbar" id="toolbar" hidden>
      <strong id="diagramTitle">Architecture diagram</strong>
      <span class="spacer"></span>
      <button id="editSvg" type="button" class="secondary">Edit SVG</button>
      <button id="exportDot" type="button" class="secondary">Export DOT</button>
      <button id="exportSvg" type="button">Export SVG</button>
    </section>
    <main>
      <section id="empty" class="empty">
        <div class="empty-panel">
          <h2>Azure Architecture</h2>
          <button id="fromConfigEmpty" type="button">Generate From Terraform</button>
        </div>
      </section>
      <section id="preview" class="preview" hidden>
        <div class="diagram-frame">
          <div id="svgHost" class="svg-host" aria-label="Generated Azure architecture diagram"></div>
        </div>
      </section>
    </main>
  </div>
  <script nonce="${nonce}">
${renderScript()}
  </script>
</body>
</html>`;
}

function renderStyles(): string {
  return `    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--vscode-foreground); background: var(--vscode-editor-background); font-family: var(--vscode-font-family); }
    .shell { display: grid; grid-template-rows: auto auto auto minmax(0, 1fr); gap: 12px; height: 100vh; padding: 16px; }
    .hero, .summary, .toolbar, .empty, .preview { border: 1px solid var(--vscode-widget-border); background: color-mix(in srgb, var(--vscode-editorWidget-background) 96%, #0078d4); box-shadow: 0 14px 34px #0003; }
    .hero { display: flex; gap: 16px; align-items: center; padding: 16px 18px; border-radius: 8px; }
    .hero-icon { display: grid; width: 44px; height: 44px; place-items: center; color: #fff; background: #0078d4; font-weight: 800; border-radius: 6px; box-shadow: inset 0 -10px 18px #00457855; }
    .hero-copy { min-width: 0; flex: 1; }
    h1, h2, p { margin: 0; }
    h1 { font-size: 22px; }
    h2 { font-size: 18px; }
    #subtitle { margin-top: 4px; color: var(--vscode-descriptionForeground); line-height: 1.45; }
    button { min-height: 36px; border: 1px solid var(--vscode-input-border, var(--vscode-widget-border)); border-radius: 5px; padding: 8px 12px; color: var(--vscode-button-foreground); background: var(--vscode-button-background); cursor: pointer; font: inherit; font-weight: 650; }
    button.secondary { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
    button:hover { filter: brightness(1.08); }
    .summary { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); overflow: hidden; border-radius: 8px; }
    .summary div { padding: 12px 16px; border-right: 1px solid var(--vscode-widget-border); background: color-mix(in srgb, var(--vscode-editor-background) 58%, transparent); }
    .summary div:last-child { border-right: 0; }
    .summary strong, .summary span { display: block; }
    .summary strong { font-size: 21px; }
    .summary span { margin-top: 3px; color: var(--vscode-descriptionForeground); font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .toolbar { display: flex; gap: 8px; align-items: center; padding: 10px 12px; border-radius: 8px; }
    .toolbar strong { overflow-wrap: anywhere; }
    .spacer { flex: 1; }
    main { min-height: 0; }
    .empty { display: grid; align-content: start; min-height: 0; height: 100%; padding: 18px; border-radius: 8px; background-color: color-mix(in srgb, var(--vscode-editor-background) 92%, #0078d4); background-image: linear-gradient(#ffffff0d 1px, transparent 1px), linear-gradient(90deg, #ffffff0d 1px, transparent 1px); background-size: 24px 24px; }
    .empty-panel { display: flex; gap: 12px; align-items: center; justify-content: space-between; max-width: 680px; padding: 18px; border: 1px solid var(--vscode-widget-border); border-radius: 8px; background: var(--vscode-editorWidget-background); box-shadow: 0 12px 28px #0003; }
    .preview { height: 100%; min-height: 0; overflow: auto; padding: 18px; border-radius: 8px; background-color: color-mix(in srgb, var(--vscode-editor-background) 92%, #0078d4); background-image: linear-gradient(#ffffff0d 1px, transparent 1px), linear-gradient(90deg, #ffffff0d 1px, transparent 1px); background-size: 24px 24px; }
    .diagram-frame { display: inline-block; min-width: 100%; min-height: 100%; padding: 28px; border: 1px solid #d0d7de; background: #ffffff; box-shadow: 0 18px 42px #0005; }
    .svg-host { min-width: max-content; }
    .svg-host svg { display: block; max-width: none; height: auto; }
    @media (max-width: 760px) { .hero { align-items: flex-start; flex-direction: column; } .summary { grid-template-columns: repeat(2, minmax(120px, 1fr)); } .toolbar { flex-wrap: wrap; } }`;
}

function renderScript(): string {
  return `    const vscode = acquireVsCodeApi();
    let model = null;
    const generate = () => vscode.postMessage({ type: "generateFromConfiguration" });
    document.getElementById("fromConfig").addEventListener("click", generate);
    document.getElementById("fromConfigEmpty").addEventListener("click", generate);
    document.getElementById("editSvg").addEventListener("click", editSvg);
    document.getElementById("exportDot").addEventListener("click", exportDot);
    document.getElementById("exportSvg").addEventListener("click", exportSvg);
    window.addEventListener("message", event => {
      if (event.data?.type !== "diagramGenerated") return;
      model = event.data.payload;
      document.getElementById("empty").hidden = true;
      document.getElementById("preview").hidden = false;
      document.getElementById("toolbar").hidden = false;
      document.getElementById("summary").hidden = false;
      document.getElementById("diagramTitle").textContent = model.label;
      document.getElementById("subtitle").textContent = model.label;
      document.getElementById("resourceCount").textContent = model.analysis.nodes.length;
      document.getElementById("connectionCount").textContent = model.analysis.edges.length;
      document.getElementById("riskScore").textContent = model.analysis.riskScore;
      document.getElementById("sourceKind").textContent = "Terraform";
      document.getElementById("svgHost").innerHTML = model.graphvizSvg || fallbackSvg(model);
    });
    function exportDot() {
      if (!model?.graphvizDot) return;
      download("azure-architecture-diagram.dot", model.graphvizDot, "text/vnd.graphviz");
    }
    function exportSvg() {
      if (!model) return;
      download("azure-architecture-diagram.svg", model.graphvizSvg || fallbackSvg(model), "image/svg+xml");
    }
    function editSvg() {
      if (!model) return;
      vscode.postMessage({
        type: "editSvg",
        svg: model.graphvizSvg || fallbackSvg(model),
        label: model.label
      });
    }
    function download(filename, content, type) {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([content], { type }));
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    }
    function fallbackSvg(payload) {
      const nodes = payload.analysis.nodes || [];
      const width = 980;
      const height = Math.max(220, 92 + nodes.length * 72);
      const rows = nodes.map((node, index) => {
        const y = 56 + index * 72;
        return '<rect x="32" y="' + y + '" width="720" height="48" rx="4" fill="#ffffff" stroke="#64748b"/>' +
          '<text x="52" y="' + (y + 20) + '" font-family="Segoe UI" font-size="14" font-weight="700" fill="#0f172a">' + escapeText(node.service) + '</text>' +
          '<text x="52" y="' + (y + 38) + '" font-family="Segoe UI" font-size="11" fill="#475569">' + escapeText(node.address) + '</text>';
      }).join("");
      return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '">' +
        '<rect width="100%" height="100%" fill="#f8fafc"/>' +
        '<text x="32" y="30" font-family="Segoe UI" font-size="18" font-weight="700" fill="#0f172a">' + escapeText(payload.label) + '</text>' +
        rows +
        '</svg>';
    }
    function escapeText(value) {
      return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
    }`;
}

export function createNonce(): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    { length: 32 },
    () => characters[Math.floor(Math.random() * characters.length)],
  ).join("");
}

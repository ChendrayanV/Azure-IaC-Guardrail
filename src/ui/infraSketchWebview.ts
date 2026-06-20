import type { Finding, PlanAnalysis } from "../types";

export interface CloudCanvasDiagramPayload {
  label: string;
  sourceKind: "configuration" | "plan";
  analysis: PlanAnalysis;
  findings: Finding[];
}

export function renderSketchHtml(
  nonce: string,
  cspSource: string,
): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource}; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
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
        <p id="subtitle">Generate a professional Azure architecture diagram from local Terraform configuration or a local Terraform plan.</p>
      </div>
      <div class="hero-actions">
        <button id="fromConfig" type="button">Generate From Terraform</button>
        <button id="fromPlan" type="button" class="secondary">Generate From Plan File</button>
      </div>
    </header>
    <section id="summary" class="summary" hidden>
      <div><strong id="resourceCount">0</strong><span>Resources</span></div>
      <div><strong id="connectionCount">0</strong><span>Connections</span></div>
      <div><strong id="riskScore">0</strong><span>Risk score</span></div>
      <div><strong id="sourceKind">-</strong><span>Source</span></div>
    </section>
    <section class="toolbar" id="toolbar" hidden>
      <input id="search" type="search" placeholder="Search resource, service, or type" aria-label="Search resources">
      <select id="risk" aria-label="Filter by risk">
        <option value="">All risks</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
        <option value="none">None</option>
      </select>
      <select id="exposure" aria-label="Filter by exposure">
        <option value="">All exposure</option>
        <option value="public">Public signal</option>
        <option value="private">No public signal</option>
      </select>
      <span class="spacer"></span>
      <button id="fit" type="button" class="secondary">Fit</button>
      <button id="exportSvg" type="button">Export SVG</button>
    </section>
    <main>
      <section id="empty" class="empty">
        <h2>Generate An Azure Architecture Diagram</h2>
        <p>Select a local Terraform configuration or plan file. Cloud Canvas will infer resources, relationships, public exposure signals, and change risk, then render a review-ready Azure architecture diagram.</p>
      </section>
      <section id="workspace" class="workspace" hidden>
        <div id="viewport">
          <svg id="diagram" role="img" aria-label="Azure architecture diagram">
            <defs>
              <marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto">
                <path d="M0,0 L0,8 L9,4 z" fill="#5f87b8"></path>
              </marker>
            </defs>
            <g id="edges"></g>
            <g id="edgeLabels"></g>
            <g id="nodes"></g>
          </svg>
        </div>
        <aside class="inspector">
          <h2 id="detailTitle">Architecture overview</h2>
          <p id="detailSubtitle">Select a resource to inspect relationships.</p>
          <dl id="details"></dl>
          <div class="legend">
            <span style="--dot:#e5484d">High risk</span>
            <span style="--dot:#d99b00">Medium risk</span>
            <span style="--dot:#22a06b">Low risk</span>
            <span style="--dot:#5f6b7a">No risk</span>
          </div>
        </aside>
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
    .hero, .summary, .toolbar, .empty, .inspector { border: 1px solid var(--vscode-widget-border); background: linear-gradient(145deg, color-mix(in srgb, var(--vscode-editorWidget-background) 96%, #1683ff), var(--vscode-editorWidget-background)); box-shadow: 0 14px 34px #0003; }
    .hero { display: flex; gap: 16px; align-items: center; padding: 18px; border-radius: 12px; }
    .hero-icon { display: grid; width: 52px; height: 52px; place-items: center; border-radius: 14px; color: #fff; background: linear-gradient(145deg, #1683ff, #3154c9); font-weight: 800; box-shadow: 0 10px 24px #1683ff55; }
    .hero-copy { min-width: 0; flex: 1; }
    h1, h2 { margin: 0; }
    h1 { font-size: 24px; letter-spacing: -.02em; }
    #subtitle, .empty p, #detailSubtitle { color: var(--vscode-descriptionForeground); line-height: 1.5; }
    .hero-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    button, input, select { min-height: 36px; border: 1px solid var(--vscode-input-border, var(--vscode-widget-border)); border-radius: 5px; padding: 8px 11px; font: inherit; }
    button { color: var(--vscode-button-foreground); background: var(--vscode-button-background); cursor: pointer; font-weight: 650; }
    button.secondary { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
    button:hover { filter: brightness(1.08); }
    .summary { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 1px; overflow: hidden; border-radius: 10px; }
    .summary div { padding: 13px 16px; background: color-mix(in srgb, var(--vscode-editor-background) 72%, transparent); }
    .summary strong, .summary span { display: block; }
    .summary strong { font-size: 22px; }
    .summary span { margin-top: 3px; color: var(--vscode-descriptionForeground); font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .toolbar { display: flex; gap: 8px; align-items: center; padding: 10px 12px; border-radius: 9px; }
    input { min-width: 280px; flex: 1; color: var(--vscode-input-foreground); background: var(--vscode-input-background); }
    select { color: var(--vscode-input-foreground); background: var(--vscode-input-background); }
    .spacer { flex: 1; }
    main { min-height: 0; }
    .empty { display: grid; place-content: center; min-height: 0; height: 100%; padding: 42px; border-radius: 12px; text-align: center; }
    .empty h2 { font-size: 22px; }
    .empty p { max-width: 760px; margin: 10px auto 0; }
    .workspace { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 12px; min-height: 0; height: 100%; }
    #viewport { position: relative; overflow: auto; border: 1px solid var(--vscode-widget-border); border-radius: 12px; background-color: color-mix(in srgb, var(--vscode-editor-background) 94%, #08111f); background-image: radial-gradient(color-mix(in srgb, var(--vscode-descriptionForeground) 22%, transparent) 1px, transparent 1px); background-size: 20px 20px; box-shadow: inset 0 0 70px #0004; }
    #diagram { display: block; min-width: 100%; min-height: 100%; }
    .edge { fill: none; stroke: #6f8fb8; stroke-width: 2; opacity: .76; marker-end: url(#arrow); }
    .edge-label { fill: var(--vscode-descriptionForeground); font-size: 10px; paint-order: stroke; stroke: var(--vscode-editor-background); stroke-width: 4px; stroke-linejoin: round; }
    .muted { opacity: .16; }
    .active.edge { stroke: #48a4ff; stroke-width: 3; opacity: 1; }
    .node { cursor: pointer; outline: none; }
    .node .surface { fill: color-mix(in srgb, var(--vscode-sideBar-background) 94%, #10243d); stroke: #5f6b7a; stroke-width: 1.5; rx: 10; filter: drop-shadow(0 8px 12px #0005); }
    .node.high .surface { stroke: #e5484d; } .node.medium .surface { stroke: #d99b00; } .node.low .surface { stroke: #22a06b; }
    .node.selected .surface { stroke: #4ca1ff; stroke-width: 3; filter: drop-shadow(0 0 12px #1683ff77); }
    .node text { fill: var(--vscode-foreground); pointer-events: none; }
    .node .service { font-size: 14px; font-weight: 750; }
    .node .meta { fill: var(--vscode-descriptionForeground); font-size: 10px; }
    .node .badge { font-size: 9px; font-weight: 750; letter-spacing: .03em; }
    .node .icon { fill: color-mix(in srgb, #1683ff 24%, var(--vscode-editor-background)); stroke: #1683ff; }
    .node .icon-text { fill: #8bc2ff; font-size: 10px; font-weight: 800; text-anchor: middle; }
    .inspector { overflow: auto; padding: 18px; border-radius: 12px; }
    .inspector h2 { font-size: 16px; overflow-wrap: anywhere; }
    dl { display: grid; grid-template-columns: 90px 1fr; gap: 10px; margin: 16px 0 0; }
    dt { color: var(--vscode-descriptionForeground); }
    dd { margin: 0; overflow-wrap: anywhere; }
    .legend { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 22px; color: var(--vscode-descriptionForeground); font-size: 11px; }
    .legend span::before { content: ""; display: inline-block; width: 9px; height: 9px; margin-right: 6px; border-radius: 50%; background: var(--dot); }
    @media (max-width: 980px) { .hero { align-items: flex-start; flex-direction: column; } .summary { grid-template-columns: repeat(2, minmax(120px, 1fr)); } .workspace { grid-template-columns: 1fr; } .inspector { max-height: 250px; } }`;
}

function renderScript(): string {
  return `    const vscode = acquireVsCodeApi();
    const svgNs = "http://www.w3.org/2000/svg";
    let model = null;
    let selectedAddress = "";
    document.getElementById("fromConfig").addEventListener("click", () => vscode.postMessage({ type: "generateFromConfiguration" }));
    document.getElementById("fromPlan").addEventListener("click", () => vscode.postMessage({ type: "generateFromPlan" }));
    document.getElementById("search").addEventListener("input", render);
    document.getElementById("risk").addEventListener("input", render);
    document.getElementById("exposure").addEventListener("input", render);
    document.getElementById("fit").addEventListener("click", fit);
    document.getElementById("exportSvg").addEventListener("click", exportSvg);
    window.addEventListener("message", event => {
      if (event.data?.type !== "diagramGenerated") return;
      model = positionModel(event.data.payload);
      selectedAddress = "";
      document.getElementById("empty").hidden = true;
      document.getElementById("workspace").hidden = false;
      document.getElementById("toolbar").hidden = false;
      document.getElementById("summary").hidden = false;
      document.getElementById("subtitle").textContent = event.data.payload.label;
      document.getElementById("resourceCount").textContent = model.nodes.length;
      document.getElementById("connectionCount").textContent = model.edges.length;
      document.getElementById("riskScore").textContent = event.data.payload.analysis.riskScore;
      document.getElementById("sourceKind").textContent = event.data.payload.sourceKind;
      resetDetails();
      render();
      requestAnimationFrame(fit);
    });
    function positionModel(payload) {
      const nodes = payload.analysis.nodes || [];
      const edges = payload.analysis.edges || [];
      const levels = new Map();
      const deps = new Map(nodes.map(node => [node.address, edges.filter(edge => edge.source === node.address).map(edge => edge.target)]));
      const levelFor = (address, visiting = new Set()) => {
        if (levels.has(address)) return levels.get(address);
        if (visiting.has(address)) return 0;
        const targets = deps.get(address) || [];
        const next = new Set(visiting); next.add(address);
        const level = targets.length ? Math.min(7, 1 + Math.max(...targets.map(target => levelFor(target, next)))) : 0;
        levels.set(address, level); return level;
      };
      nodes.forEach(node => levelFor(node.address));
      const groups = new Map();
      nodes.forEach(node => {
        const level = levels.get(node.address) || 0;
        if (!groups.has(level)) groups.set(level, []);
        groups.get(level).push(node);
      });
      const positioned = [];
      [...groups.entries()].sort(([a], [b]) => a - b).forEach(([level, group]) => {
        group.sort((a, b) => a.address.localeCompare(b.address)).forEach((node, index) => {
          positioned.push({ ...node, x: 70 + level * 310, y: 70 + index * 140 });
        });
      });
      const width = Math.max(1000, 380 + Math.max(0, ...groups.keys()) * 310);
      const height = Math.max(640, 160 + Math.max(1, ...[...groups.values()].map(group => group.length)) * 140);
      return { ...payload, nodes: positioned, edges, width, height };
    }
    function render() {
      if (!model) return;
      const diagram = document.getElementById("diagram");
      diagram.setAttribute("width", model.width);
      diagram.setAttribute("height", model.height);
      diagram.setAttribute("viewBox", "0 0 " + model.width + " " + model.height);
      const edgesLayer = document.getElementById("edges");
      const labelsLayer = document.getElementById("edgeLabels");
      const nodesLayer = document.getElementById("nodes");
      edgesLayer.replaceChildren(); labelsLayer.replaceChildren(); nodesLayer.replaceChildren();
      const byAddress = new Map(model.nodes.map(node => [node.address, node]));
      const shown = new Set(model.nodes.filter(visible).map(node => node.address));
      const connected = selectedAddress ? connectedAddresses(selectedAddress) : new Set();
      model.edges.filter(edge => shown.has(edge.source) && shown.has(edge.target)).forEach(edge => {
        const source = byAddress.get(edge.source), target = byAddress.get(edge.target);
        if (!source || !target) return;
        const active = selectedAddress && (edge.source === selectedAddress || edge.target === selectedAddress);
        const muted = selectedAddress && !active;
        const path = element("path", { class: "edge" + (active ? " active" : "") + (muted ? " muted" : ""), d: pathFor(source, target) });
        edgesLayer.appendChild(path);
        const label = element("text", { class: "edge-label" + (muted ? " muted" : ""), x: (source.x + target.x + 220) / 2, y: (source.y + target.y) / 2 + 38, "text-anchor": "middle" });
        label.textContent = edge.label.replaceAll("_", " ");
        labelsLayer.appendChild(label);
      });
      model.nodes.filter(visible).forEach(node => {
        const muted = selectedAddress && !connected.has(node.address);
        const group = element("g", { class: "node " + node.risk + (node.address === selectedAddress ? " selected" : "") + (muted ? " muted" : ""), transform: "translate(" + node.x + " " + node.y + ")", tabindex: "0", role: "button" });
        group.appendChild(element("rect", { class: "surface", width: 230, height: 98 }));
        group.appendChild(element("rect", { class: "icon", x: 12, y: 14, width: 34, height: 34, rx: 9 }));
        const icon = element("text", { class: "icon-text", x: 29, y: 35 }); icon.textContent = initials(node.service); group.appendChild(icon);
        const service = element("text", { class: "service", x: 56, y: 27 }); service.textContent = node.service; group.appendChild(service);
        const address = element("text", { class: "meta", x: 56, y: 45 }); address.textContent = trim(node.address, 30); group.appendChild(address);
        const badge = element("text", { class: "badge", x: 14, y: 77 }); badge.textContent = node.risk.toUpperCase() + (node.publicExposure ? " · PUBLIC" : "") + " · " + node.changeAction.toUpperCase(); group.appendChild(badge);
        group.addEventListener("click", () => selectNode(node));
        group.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectNode(node); } });
        nodesLayer.appendChild(group);
      });
    }
    function visible(node) {
      const query = document.getElementById("search").value.trim().toLowerCase();
      const risk = document.getElementById("risk").value;
      const exposure = document.getElementById("exposure").value;
      return (!query || (node.address + " " + node.service + " " + node.type).toLowerCase().includes(query))
        && (!risk || node.risk === risk)
        && (!exposure || (exposure === "public" ? node.publicExposure : !node.publicExposure));
    }
    function connectedAddresses(address) {
      const values = new Set([address]);
      model.edges.forEach(edge => {
        if (edge.source === address) values.add(edge.target);
        if (edge.target === address) values.add(edge.source);
      });
      return values;
    }
    function pathFor(source, target) {
      const x1 = source.x + 230, y1 = source.y + 49, x2 = target.x, y2 = target.y + 49;
      const bend = Math.max(60, Math.abs(x2 - x1) * .45);
      const direction = x2 >= x1 ? 1 : -1;
      return "M " + x1 + " " + y1 + " C " + (x1 + bend * direction) + " " + y1 + ", " + (x2 - bend * direction) + " " + y2 + ", " + x2 + " " + y2;
    }
    function selectNode(node) {
      selectedAddress = selectedAddress === node.address ? "" : node.address;
      if (!selectedAddress) { resetDetails(); render(); return; }
      const incoming = model.edges.filter(edge => edge.target === node.address);
      const outgoing = model.edges.filter(edge => edge.source === node.address);
      document.getElementById("detailTitle").textContent = node.address;
      document.getElementById("detailSubtitle").textContent = node.service;
      document.getElementById("details").innerHTML =
        "<dt>Type</dt><dd>" + escapeText(node.type) + "</dd><dt>Risk</dt><dd>" + escapeText(node.risk) +
        "</dd><dt>Exposure</dt><dd>" + (node.publicExposure ? "Public signal detected" : "No public signal") +
        "</dd><dt>Action</dt><dd>" + escapeText(node.changeAction) +
        "</dd><dt>Depends on</dt><dd>" + (outgoing.map(edge => escapeText(edge.target)).join("<br>") || "None inferred") +
        "</dd><dt>Used by</dt><dd>" + (incoming.map(edge => escapeText(edge.source)).join("<br>") || "None inferred") + "</dd>";
      render();
    }
    function resetDetails() {
      document.getElementById("detailTitle").textContent = "Architecture overview";
      document.getElementById("detailSubtitle").textContent = "Select a resource to inspect relationships.";
      document.getElementById("details").innerHTML = "";
    }
    function fit() {
      if (!model) return;
      const viewport = document.getElementById("viewport");
      viewport.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    }
    function exportSvg() {
      if (!model) return;
      const diagram = document.getElementById("diagram").cloneNode(true);
      const content = new XMLSerializer().serializeToString(diagram);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([content], { type: "image/svg+xml" }));
      link.download = "azure-architecture-diagram.svg";
      link.click();
      URL.revokeObjectURL(link.href);
    }
    function element(name, attributes = {}) {
      const item = document.createElementNS(svgNs, name);
      Object.entries(attributes).forEach(([key, value]) => item.setAttribute(key, String(value)));
      return item;
    }
    function initials(value) { return value.split(/\\s+/).map(part => part[0] || "").join("").slice(0, 3).toUpperCase(); }
    function trim(value, length) { return value.length > length ? value.slice(0, length - 1) + "…" : value; }
    function escapeText(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;"); }`;
}

export function createNonce(): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    { length: 32 },
    () => characters[Math.floor(Math.random() * characters.length)],
  ).join("");
}

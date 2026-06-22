import * as vscode from "vscode";
import type {
  ArchitectureEdge,
  ArchitectureNode,
  Finding,
  PlanAnalysis,
} from "../types";
import { renderGraphvizDot } from "../core/graphvizDiagram";

interface PositionedNode extends ArchitectureNode {
  findingCount: number;
  x: number;
  y: number;
}

export class PlanArchitecturePanel implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;

  dispose(): void {
    this.panel?.dispose();
  }

  show(analysis: PlanAnalysis, findings: Finding[], label: string): void {
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        "infraCompliance.planArchitecture",
        "Plan Architecture",
        vscode.ViewColumn.Active,
        { enableScripts: true, retainContextWhenHidden: true },
      );
      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });
    }
    this.panel.title = `Plan Architecture: ${label}`;
    this.panel.webview.html = renderPlanArchitecture(
      analysis,
      findings,
      label,
      createNonce(),
    );
    this.panel.reveal(vscode.ViewColumn.Active, false);
  }
}

function renderPlanArchitecture(
  analysis: PlanAnalysis,
  findings: Finding[],
  label: string,
  nonce: string,
): string {
  const failureCounts = new Map<string, number>();
  findings
    .filter((finding) => finding.outcome === "noncompliant")
    .forEach((finding) => {
      const address =
        finding.resource.address ??
        `${finding.resource.type}.${finding.resource.name}`;
      failureCounts.set(address, (failureCounts.get(address) ?? 0) + 1);
    });
  const layout = layoutArchitecture(
    analysis.nodes.map((node) => ({
      ...node,
      findingCount: failureCounts.get(node.address) ?? 0,
    })),
    analysis.edges,
  );
  const payload = JSON.stringify({
    ...layout,
    edges: analysis.edges,
    graphvizDot: renderGraphvizDot(analysis, { title: label }),
  }).replaceAll("<", "\\u003c");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plan Architecture</title>
  <style nonce="${nonce}">
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--vscode-foreground); background: var(--vscode-editor-background); font-family: var(--vscode-font-family); }
    .shell { display: grid; grid-template-rows: auto auto minmax(0, 1fr); height: 100vh; padding: 14px; gap: 12px; }
    .hero, .toolbar, .inspector { border: 1px solid var(--vscode-widget-border); background: linear-gradient(145deg, color-mix(in srgb, var(--vscode-editorWidget-background) 96%, #1683ff), var(--vscode-editorWidget-background)); box-shadow: 0 12px 30px #0003; }
    .hero { display: flex; gap: 15px; align-items: center; padding: 16px 18px; border-radius: 12px; }
    .hero-icon { display: grid; width: 46px; height: 46px; place-items: center; border-radius: 13px; color: white; background: linear-gradient(145deg, #1683ff, #3154c9); box-shadow: 0 8px 22px #1683ff55; font-size: 21px; font-weight: 800; }
    .hero-copy { min-width: 0; }
    h1 { margin: 0; font-size: 21px; letter-spacing: -.02em; }
    .subtitle { margin: 4px 0 0; color: var(--vscode-descriptionForeground); }
    .metrics { display: flex; gap: 9px; margin-left: auto; }
    .metric { min-width: 92px; padding: 9px 12px; border: 1px solid var(--vscode-widget-border); border-radius: 8px; background: color-mix(in srgb, var(--vscode-editor-background) 74%, transparent); }
    .metric strong, .metric span { display: block; }
    .metric strong { font-size: 18px; } .metric span { margin-top: 2px; color: var(--vscode-descriptionForeground); font-size: 10px; text-transform: uppercase; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 10px 12px; border-radius: 9px; }
    .toolbar-spacer { flex: 1; }
    input, select, button { min-height: 34px; color: var(--vscode-input-foreground); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, var(--vscode-widget-border)); border-radius: 5px; padding: 7px 10px; font: inherit; }
    input { min-width: 240px; }
    button { color: var(--vscode-button-foreground); background: var(--vscode-button-background); cursor: pointer; font-weight: 600; }
    button.secondary { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
    button:hover { filter: brightness(1.08); }
    .zoom-label { min-width: 48px; color: var(--vscode-descriptionForeground); text-align: center; font-size: 11px; }
    main { display: grid; grid-template-columns: minmax(0, 1fr) 310px; min-height: 0; gap: 12px; }
    #viewport { position: relative; overflow: auto; border: 1px solid var(--vscode-widget-border); border-radius: 10px; background-color: color-mix(in srgb, var(--vscode-editor-background) 94%, #08111f); background-image: radial-gradient(color-mix(in srgb, var(--vscode-descriptionForeground) 24%, transparent) 1px, transparent 1px); background-size: 20px 20px; box-shadow: inset 0 0 70px #0003; cursor: grab; }
    #viewport.panning { cursor: grabbing; }
    #diagram { display: block; transform-origin: top left; transition: transform .16s ease; }
    .edge { fill: none; stroke: #5f87b8; stroke-width: 2; opacity: .72; marker-end: url(#arrow); transition: opacity .15s ease, stroke .15s ease, stroke-width .15s ease; }
    .edge-label { fill: var(--vscode-descriptionForeground); font-size: 10px; paint-order: stroke; stroke: var(--vscode-editor-background); stroke-width: 4px; stroke-linejoin: round; }
    .edge.muted, .edge-label.muted { opacity: .12; }
    .edge.active { stroke: #45a2ff; stroke-width: 3; opacity: 1; }
    .node { cursor: pointer; outline: none; transition: opacity .15s ease; }
    .node.muted { opacity: .2; }
    .node .surface { fill: color-mix(in srgb, var(--vscode-sideBar-background) 94%, #10243d); stroke: #5f6b7a; stroke-width: 1.5; rx: 10; filter: drop-shadow(0 8px 12px #0005); }
    .node.create .surface { stroke: #22a06b; } .node.update .surface { stroke: #d99b00; }
    .node.delete .surface, .node.replace .surface { stroke: #e5484d; }
    .node.selected .surface { stroke: #4ca1ff; stroke-width: 3; filter: drop-shadow(0 0 12px #1683ff77); }
    .node text { fill: var(--vscode-foreground); pointer-events: none; }
    .node .service { font-size: 14px; font-weight: 700; }
    .node .meta { fill: var(--vscode-descriptionForeground); font-size: 10px; }
    .node .badge { font-size: 9px; font-weight: 700; letter-spacing: .03em; }
    .node .icon { fill: color-mix(in srgb, #1683ff 24%, var(--vscode-editor-background)); stroke: #1683ff; }
    .node .icon-text { fill: #8bc2ff; font-size: 10px; font-weight: 800; text-anchor: middle; }
    .inspector { overflow: auto; padding: 18px; border-radius: 10px; }
    .inspector h2 { margin: 0; font-size: 16px; overflow-wrap: anywhere; }
    .inspector .service-name { margin: 5px 0 18px; color: var(--vscode-descriptionForeground); }
    dl { display: grid; grid-template-columns: 92px 1fr; gap: 10px; margin: 0; }
    dt { color: var(--vscode-descriptionForeground); } dd { margin: 0; overflow-wrap: anywhere; }
    .empty-detail { color: var(--vscode-descriptionForeground); line-height: 1.55; }
    .legend { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 20px; color: var(--vscode-descriptionForeground); font-size: 11px; }
    .legend span::before { content: ""; display: inline-block; width: 9px; height: 9px; margin-right: 6px; border-radius: 50%; background: var(--legend); }
    @media (max-width: 900px) { .metrics { display: none; } main { grid-template-columns: 1fr; } .inspector { max-height: 240px; } input { min-width: 170px; flex: 1; } }
  </style>
</head>
<body>
  <div class="shell">
    <header class="hero">
      <div class="hero-icon" aria-hidden="true">◇</div>
      <div class="hero-copy"><h1>Terraform Plan Architecture</h1><p class="subtitle">${escapeHtml(label)} · Select a node to trace its connectivity</p></div>
      <div class="metrics">
        <div class="metric"><strong>${analysis.nodes.length}</strong><span>Resources</span></div>
        <div class="metric"><strong>${analysis.edges.length}</strong><span>Connections</span></div>
        <div class="metric"><strong>${analysis.riskScore}</strong><span>Risk score</span></div>
      </div>
    </header>
    <div class="toolbar">
      <input id="search" type="search" placeholder="Search resource or service" aria-label="Search resources">
      <select id="action" aria-label="Filter by action"><option value="">All actions</option><option>create</option><option>update</option><option>replace</option><option>delete</option><option>no-op</option></select>
      <select id="risk" aria-label="Filter by risk"><option value="">All risks</option><option>high</option><option>medium</option><option>low</option><option>none</option></select>
      <div class="toolbar-spacer"></div>
      <button id="zoomOut" class="secondary" type="button" title="Zoom out">−</button>
      <span id="zoomLabel" class="zoom-label">100%</span>
      <button id="zoomIn" class="secondary" type="button" title="Zoom in">+</button>
      <button id="fit" class="secondary" type="button">Fit</button>
      <button id="exportDot" class="secondary" type="button">Export DOT</button>
      <button id="export" type="button">Export SVG</button>
    </div>
    <main>
      <div id="viewport">
        <svg id="diagram" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-label="Terraform plan architecture">
          <defs>
            <marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0,0 L0,8 L9,4 z" fill="#5f87b8"></path></marker>
          </defs>
          <g id="edges"></g><g id="edgeLabels"></g><g id="nodes"></g>
        </svg>
      </div>
      <aside class="inspector">
        <h2 id="title">Architecture connectivity</h2>
        <p id="serviceName" class="service-name">Select a resource</p>
        <div id="emptyDetail" class="empty-detail">Connections are directional: the resource at the line origin depends on the resource at the arrowhead. Selecting a node highlights both dependencies and dependants.</div>
        <dl id="details"></dl>
        <div class="legend">
          <span style="--legend:#22a06b">Create</span><span style="--legend:#d99b00">Update</span>
          <span style="--legend:#e5484d">Delete / replace</span><span style="--legend:#5f6b7a">No change</span>
        </div>
      </aside>
    </main>
  </div>
  <script nonce="${nonce}">
    const model = ${payload};
    const svgNs = "http://www.w3.org/2000/svg";
    const byAddress = new Map(model.nodes.map(node => [node.address, node]));
    const edgesLayer = document.getElementById("edges");
    const labelsLayer = document.getElementById("edgeLabels");
    const nodesLayer = document.getElementById("nodes");
    const viewport = document.getElementById("viewport");
    const diagram = document.getElementById("diagram");
    const search = document.getElementById("search");
    const action = document.getElementById("action");
    const risk = document.getElementById("risk");
    let selectedAddress = "";
    let zoom = 1;
    function element(name, attributes = {}) {
      const item = document.createElementNS(svgNs, name);
      Object.entries(attributes).forEach(([key, value]) => item.setAttribute(key, String(value)));
      return item;
    }
    function visible(node) {
      const query = search.value.trim().toLowerCase();
      return (!query || node.address.toLowerCase().includes(query) || node.service.toLowerCase().includes(query))
        && (!action.value || node.changeAction === action.value)
        && (!risk.value || node.risk === risk.value);
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
      const x1 = source.x + 220, y1 = source.y + 48, x2 = target.x, y2 = target.y + 48;
      const bend = Math.max(55, Math.abs(x2 - x1) * .45);
      const direction = x2 >= x1 ? 1 : -1;
      return "M " + x1 + " " + y1 + " C " + (x1 + bend * direction) + " " + y1 + ", " + (x2 - bend * direction) + " " + y2 + ", " + x2 + " " + y2;
    }
    function render() {
      edgesLayer.replaceChildren(); labelsLayer.replaceChildren(); nodesLayer.replaceChildren();
      const shownNodes = model.nodes.filter(visible);
      const shown = new Set(shownNodes.map(node => node.address));
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
      shownNodes.forEach(node => {
        const muted = selectedAddress && !connected.has(node.address);
        const group = element("g", { class: "node " + node.changeAction + (node.address === selectedAddress ? " selected" : "") + (muted ? " muted" : ""), transform: "translate(" + node.x + " " + node.y + ")", tabindex: "0", role: "button", "aria-label": node.address });
        group.appendChild(element("rect", { class: "surface", width: 220, height: 96 }));
        group.appendChild(element("rect", { class: "icon", x: 12, y: 14, width: 34, height: 34, rx: 9 }));
        const icon = element("text", { class: "icon-text", x: 29, y: 35 }); icon.textContent = initials(node.service); group.appendChild(icon);
        const title = element("text", { x: 56, y: 27, class: "service" }); title.textContent = node.service; group.appendChild(title);
        const address = element("text", { x: 56, y: 45, class: "meta" }); address.textContent = trim(node.address, 28); group.appendChild(address);
        const badges = element("text", { x: 14, y: 76, class: "badge" }); badges.textContent = node.changeAction.toUpperCase() + "  ·  " + node.risk.toUpperCase() + (node.publicExposure ? "  ·  PUBLIC" : "") + (node.findingCount ? "  ·  " + node.findingCount + " FAIL" : ""); group.appendChild(badges);
        group.addEventListener("click", () => selectNode(node));
        group.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectNode(node); } });
        nodesLayer.appendChild(group);
      });
    }
    function initials(value) { return value.split(/\\s+/).map(part => part[0] || "").join("").slice(0, 3).toUpperCase(); }
    function trim(value, length) { return value.length > length ? value.slice(0, length - 1) + "…" : value; }
    function escapeText(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;"); }
    function selectNode(node) {
      selectedAddress = selectedAddress === node.address ? "" : node.address;
      if (!selectedAddress) {
        document.getElementById("title").textContent = "Architecture connectivity";
        document.getElementById("serviceName").textContent = "Select a resource";
        document.getElementById("emptyDetail").hidden = false;
        document.getElementById("details").innerHTML = "";
        render();
        return;
      }
      const incoming = model.edges.filter(edge => edge.target === node.address);
      const outgoing = model.edges.filter(edge => edge.source === node.address);
      document.getElementById("title").textContent = node.address;
      document.getElementById("serviceName").textContent = node.service;
      document.getElementById("emptyDetail").hidden = true;
      document.getElementById("details").innerHTML =
        "<dt>Action</dt><dd>" + escapeText(node.changeAction) + "</dd><dt>Risk</dt><dd>" + escapeText(node.risk) +
        "</dd><dt>Exposure</dt><dd>" + (node.publicExposure ? "Public signal" : "No public signal") +
        "</dd><dt>Findings</dt><dd>" + Number(node.findingCount) + "</dd><dt>Depends on</dt><dd>" + (outgoing.map(edge => escapeText(edge.target)).join("<br>") || "None inferred") +
        "</dd><dt>Used by</dt><dd>" + (incoming.map(edge => escapeText(edge.source)).join("<br>") || "None inferred") +
        "</dd><dt>Changed</dt><dd>" + ((node.changedAttributes || []).length ? node.changedAttributes.map(escapeText).join(", ") : "No resolved attribute changes") + "</dd>";
      render();
    }
    function setZoom(value) {
      zoom = Math.max(.45, Math.min(1.6, value));
      diagram.style.transform = "scale(" + zoom + ")";
      document.getElementById("zoomLabel").textContent = Math.round(zoom * 100) + "%";
    }
    function fit() {
      const availableWidth = Math.max(300, viewport.clientWidth - 30);
      const availableHeight = Math.max(220, viewport.clientHeight - 30);
      setZoom(Math.min(1, availableWidth / model.width, availableHeight / model.height));
      viewport.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    }
    [search, action, risk].forEach(input => input.addEventListener("input", () => { selectedAddress = ""; render(); }));
    document.getElementById("zoomIn").addEventListener("click", () => setZoom(zoom + .1));
    document.getElementById("zoomOut").addEventListener("click", () => setZoom(zoom - .1));
    document.getElementById("fit").addEventListener("click", fit);
    document.getElementById("exportDot").addEventListener("click", () => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([model.graphvizDot], { type: "text/vnd.graphviz" }));
      link.download = "terraform-plan-architecture.dot";
      link.click();
      URL.revokeObjectURL(link.href);
    });
    viewport.addEventListener("pointerdown", event => {
      if (event.button !== 0 || event.target.closest(".node")) return;
      const startX = event.clientX, startY = event.clientY, left = viewport.scrollLeft, top = viewport.scrollTop;
      viewport.classList.add("panning");
      const move = moveEvent => { viewport.scrollLeft = left - (moveEvent.clientX - startX); viewport.scrollTop = top - (moveEvent.clientY - startY); };
      const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); viewport.classList.remove("panning"); };
      window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
    });
    document.getElementById("export").addEventListener("click", () => {
      const clone = diagram.cloneNode(true); clone.style.transform = "";
      const content = new XMLSerializer().serializeToString(clone);
      const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([content], { type: "image/svg+xml" })); link.download = "terraform-plan-architecture.svg"; link.click(); URL.revokeObjectURL(link.href);
    });
    render();
    requestAnimationFrame(fit);
  </script>
</body>
</html>`;
}

function layoutArchitecture(
  nodes: Array<ArchitectureNode & { findingCount: number }>,
  edges: ArchitectureEdge[],
): { nodes: PositionedNode[]; width: number; height: number } {
  const addresses = new Set(nodes.map((node) => node.address));
  const dependencies = new Map<string, string[]>();
  for (const node of nodes) {
    dependencies.set(
      node.address,
      edges
        .filter(
          (edge) =>
            edge.source === node.address && addresses.has(edge.target),
        )
        .map((edge) => edge.target),
    );
  }
  const memo = new Map<string, number>();
  const levelFor = (address: string, visiting = new Set<string>()): number => {
    const known = memo.get(address);
    if (known !== undefined) {
      return known;
    }
    if (visiting.has(address)) {
      return 0;
    }
    const next = new Set(visiting).add(address);
    const targets = dependencies.get(address) ?? [];
    const level =
      targets.length === 0
        ? 0
        : Math.min(
            7,
            1 + Math.max(...targets.map((target) => levelFor(target, next))),
          );
    memo.set(address, level);
    return level;
  };
  const groups = new Map<number, typeof nodes>();
  for (const node of nodes) {
    const level = levelFor(node.address);
    groups.set(level, [...(groups.get(level) ?? []), node]);
  }
  const positioned: PositionedNode[] = [];
  const horizontalGap = 300;
  const verticalGap = 138;
  for (const [level, group] of [...groups.entries()].sort(
    ([left], [right]) => left - right,
  )) {
    group
      .sort((left, right) => left.address.localeCompare(right.address))
      .forEach((node, index) => {
        positioned.push({
          ...node,
          x: 70 + level * horizontalGap,
          y: 70 + index * verticalGap,
        });
      });
  }
  const maxLevel = Math.max(0, ...groups.keys());
  const maxRows = Math.max(1, ...[...groups.values()].map((group) => group.length));
  return {
    nodes: positioned,
    width: Math.max(900, 360 + maxLevel * horizontalGap),
    height: Math.max(560, 150 + maxRows * verticalGap),
  };
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
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    { length: 32 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join("");
}

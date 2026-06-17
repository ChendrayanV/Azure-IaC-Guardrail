import type { InfraSketch } from "../core/infraSketch";
import {
  mappedParameterDefinitions,
  serviceCatalog,
} from "./infraSketchCatalog";

export function renderSketchHtml(
  sketch: InfraSketch,
  nonce: string,
  montserratUri: string,
  iconBaseUri: string,
  cspSource: string,
): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${cspSource}; img-src ${cspSource}; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>Cloud Canvas</title>
  <style nonce="${nonce}">
${renderSketchStyles(montserratUri)}
  </style>
</head>
<body>
${renderSketchBody()}
  <script nonce="${nonce}">
${renderSketchScript(sketch, iconBaseUri)}
  </script>
</body>
</html>`;
}

function renderSketchStyles(montserratUri: string): string {
  return `    @font-face { font-family: "Montserrat"; src: url("${montserratUri}") format("truetype"); font-style: normal; font-weight: 100 900; font-display: swap; }
    :root { color-scheme: light dark; --azure: #1683ff; --ink: #171717; --muted: #77808c; --line: #d8dde5; --panel: #f4f5f7; --surface: #ffffff; --surface-muted: #f3f3f3; --surface-soft: #ffffffef; --surface-elevated: #ffffffed; --panel-fill: #f8fbff; --grid-dot: #cfd5dc; --canvas-base: #ffffff; --text-strong: #111111; --text-muted: #65707c; --toolbar-text: #26313f; --border-strong: #d7dce3; --border-soft: #d9dee5; --shadow: #17203316; }
    body[data-theme="dark"] { --ink: #edf2f8; --muted: #9eb0c3; --line: #314559; --panel: #15202b; --surface: #18222d; --surface-muted: #111922; --surface-soft: #18222df0; --surface-elevated: #18222df0; --panel-fill: #12202d; --grid-dot: #314559; --canvas-base: #0e141b; --text-strong: #edf2f8; --text-muted: #a7b7c7; --toolbar-text: #edf2f8; --border-strong: #314559; --border-soft: #314559; --shadow: #00000040; }
    * { box-sizing: border-box; }
    body { margin: 0; overflow: hidden; color: var(--ink); background: var(--canvas-base); font-family: "Montserrat", "Segoe UI", var(--vscode-font-family), sans-serif; }
    button, input, select { font: inherit; }
    .shell { display: grid; grid-template-columns: 350px minmax(0, 1fr); height: 100vh; }
    .palette { min-height: 0; overflow: auto; padding: 20px 16px 28px; border-right: 1px solid var(--border-strong); background: var(--surface-muted); }
    .brand { padding: 5px 6px 24px; }
    .brand h1 { margin: 0; font-size: 25px; font-weight: 650; }
    .search-wrap { position: relative; margin-bottom: 18px; }
    .search-wrap::before { content: ""; position: absolute; left: 16px; top: 15px; width: 13px; height: 13px; border: 1.8px solid #768394; border-radius: 50%; }
    .search-wrap::after { content: ""; position: absolute; left: 28px; top: 28px; width: 8px; height: 2px; background: #768394; transform: rotate(45deg); }
    #search { width: 100%; height: 52px; padding: 0 15px 0 50px; border: 1px solid var(--border-strong); border-radius: 5px; outline: none; color: var(--text-strong); background: var(--surface); font-size: 17px; }
    #search:focus { border-color: var(--azure); box-shadow: 0 0 0 2px #1683ff22; }
    .category { margin-bottom: 9px; overflow: hidden; border: 1px solid var(--border-strong); border-radius: 8px; background: var(--surface); box-shadow: 0 2px 7px color-mix(in srgb, var(--shadow) 70%, transparent); }
    .category-toggle { display: grid; grid-template-columns: 34px 1fr auto 18px; width: 100%; min-height: 58px; align-items: center; padding: 0 12px; border: 0; color: var(--ink); background: var(--surface); text-align: left; cursor: pointer; font-size: 15px; font-weight: 650; }
    .category-toggle:hover { background: color-mix(in srgb, var(--surface) 86%, var(--azure)); }
    .category-icon { display: grid; place-items: center; width: 24px; height: 24px; border: 1.6px solid #30343a; border-radius: 5px; font-size: 8px; font-weight: 800; }
    .category-count { min-width: 25px; padding: 3px 7px; border-radius: 999px; color: #586575; background: #eef2f6; text-align: center; font-size: 10px; }
    .chevron { width: 9px; height: 9px; border-right: 1.7px solid currentColor; border-bottom: 1.7px solid currentColor; transform: rotate(45deg) translateY(-3px); transition: transform .15s ease; }
    .category.open .chevron { transform: rotate(225deg) translate(-2px, -1px); }
    .service-list { display: none; gap: 9px; padding: 4px 10px 12px; border-top: 1px solid #edf0f4; }
    .category.open .service-list { display: grid; }
    .service { position: relative; display: grid; grid-template-columns: 12px 42px 1fr; gap: 10px; min-height: 68px; align-items: center; padding: 9px 10px; border: 1px solid var(--border-strong); border-radius: 8px; background: var(--surface); box-shadow: 0 2px 5px color-mix(in srgb, var(--shadow) 70%, transparent); cursor: grab; }
    .service:hover { border-color: #8abcf0; box-shadow: 0 2px 6px #00000012; }
    .grip { color: #89929d; font-size: 16px; line-height: 10px; letter-spacing: -1px; }
    .service-icon, .node-icon { position: relative; display: grid; overflow: hidden; place-items: center; color: var(--service-color); background: transparent; font-size: 9px; font-weight: 800; }
    .service-icon { width: 38px; height: 38px; }
    .icon-image { position: absolute; z-index: 2; width: 100%; height: 100%; object-fit: contain; background: transparent; }
    .icon-fallback { position: relative; z-index: 1; display: grid; width: 100%; height: 100%; place-items: center; color: var(--service-color); background: transparent; }
    .service-copy { min-width: 0; }
    .service-copy strong { display: block; overflow: hidden; color: var(--text-strong); font-size: 16px; text-overflow: ellipsis; white-space: nowrap; }
    .service-copy small { display: block; overflow: hidden; margin-top: 5px; color: var(--text-muted); font-size: 10px; font-weight: 700; letter-spacing: .15px; text-overflow: ellipsis; white-space: nowrap; }
    .diagram-key { margin: 18px 4px 0; padding: 12px; border: 1px solid var(--border-strong); border-radius: 5px; background: var(--surface); color: var(--muted); font-size: 11px; line-height: 1.45; }
    .diagram-key strong { display: block; margin-bottom: 8px; color: #202833; font-size: 12px; }
    .key-row { display: flex; align-items: center; gap: 7px; margin-top: 6px; }
    .status-dot { display: inline-block; width: 11px; height: 11px; flex: 0 0 11px; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 0 1px #9aa4af; }
    .status-dot.approved { background: #22a447; }
    .status-dot.under-review { background: #f5c542; }
    .status-dot.not-approved { background: #d92d20; }
    .workspace { position: relative; min-width: 0; min-height: 0; overflow: hidden; background: var(--canvas-base); }
    .toolbar { position: absolute; z-index: 20; top: 14px; left: 16px; right: 16px; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
    .toolbar-row { display: flex; justify-content: space-between; gap: 12px; }
    .toolbar-group { display: flex; gap: 7px; padding: 6px; border: 1px solid var(--border-soft); border-radius: 7px; background: var(--surface-elevated); box-shadow: 0 5px 18px var(--shadow); pointer-events: auto; backdrop-filter: blur(8px); align-items: center; flex-wrap: wrap; }
    .toolbar button { min-height: 34px; padding: 0 12px; border: 0; border-radius: 4px; color: var(--toolbar-text); background: transparent; cursor: pointer; font-size: 12px; font-weight: 600; }
    .toolbar button:hover { background: #edf4fc; color: #0067b8; }
    .toolbar button.primary { color: #fff; background: #0078d4; }
    .toolbar button.active { color: #fff; background: #6657c8; }
    .toolbar select { min-height: 34px; padding: 0 10px; border: 1px solid var(--border-strong); border-radius: 4px; color: var(--toolbar-text); background: var(--surface); font-size: 12px; font-weight: 600; }
    .toolbar-label { color: var(--muted); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .2px; }
    .toolbar-tip { max-width: 560px; padding: 10px 12px; border: 1px solid var(--border-soft); border-radius: 7px; color: var(--muted); background: var(--surface-elevated); box-shadow: 0 5px 18px var(--shadow); font-size: 11px; line-height: 1.45; pointer-events: auto; backdrop-filter: blur(8px); }
    .toolbar-tip strong { color: #1f2937; }
    body[data-theme="dark"] .toolbar-tip strong { color: #edf2f8; }
    .canvas-wrap { width: 100%; height: 100%; overflow: auto; touch-action: none; background-color: var(--canvas-base); background-image: radial-gradient(var(--grid-dot) 1px, transparent 1px); background-size: 16px 16px; cursor: grab; }
    .canvas-wrap.panning { cursor: grabbing; }
    #canvas { position: relative; width: 2400px; height: 1500px; }
    .reference-image { position: absolute; z-index: 0; top: 0; left: 0; border: 1px dashed #87a4c4; border-radius: 4px; background: #ffffffaa; cursor: move; user-select: none; }
    .reference-image.selected { outline: 2px solid #1683ff; outline-offset: 2px; }
    .reference-image img { display: block; width: 100%; height: auto; pointer-events: none; }
    .reference-badge { position: absolute; top: -11px; left: 12px; padding: 3px 7px; border-radius: 999px; color: #0f3d67; background: #dbeafe; font-size: 9px; font-weight: 700; letter-spacing: .2px; text-transform: uppercase; }
    .draft-panel { position: absolute; z-index: 18; top: 132px; left: 16px; width: 360px; max-height: calc(100vh - 160px); overflow: auto; padding: 14px; border: 1px solid #d9dee5; border-radius: 6px; background: #ffffffef; box-shadow: 0 8px 24px #17203316; backdrop-filter: blur(8px); }
    .draft-panel[hidden] { display: none; }
    .draft-panel h2 { margin: 0 0 6px; font-size: 13px; }
    .draft-panel p { margin: 0; color: #5b6774; font-size: 11px; line-height: 1.45; }
    .draft-meta { margin-top: 10px; color: #66717e; font-size: 10px; }
    .draft-list { display: grid; gap: 8px; margin-top: 12px; }
    .draft-item { padding: 9px 10px; border: 1px solid #dbe3ec; border-radius: 5px; background: #f9fbfd; }
    .draft-item strong { display: block; color: #1f2937; font-size: 11px; }
    .draft-item small { display: block; margin-top: 4px; color: #65707c; font-size: 10px; line-height: 1.4; }
    .confidence { display: inline-block; margin-top: 6px; padding: 2px 7px; border-radius: 999px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .2px; }
    .confidence.high { color: #166534; background: #dcfce7; }
    .confidence.medium { color: #92400e; background: #fef3c7; }
    .confidence.low { color: #1d4ed8; background: #dbeafe; }
    .draft-actions { display: flex; gap: 8px; margin-top: 12px; }
    .draft-actions button { flex: 1 1 0; min-height: 32px; border: 1px solid #c6d7ea; border-radius: 4px; color: #075ea8; background: #fff; cursor: pointer; font-size: 11px; font-weight: 700; }
    .draft-actions button.primary { border-color: #0078d4; color: #fff; background: #0078d4; }
    #connections { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
    .edge { fill: none; stroke: #4a90ff; stroke-width: 2; marker-end: url(#arrow); stroke-linecap: round; }
    .edge.dotted, .edge.preview.dotted { stroke-dasharray: 2 8; }
    .edge.dashed, .edge.preview.dashed { stroke-dasharray: 10 8; }
    .edge.animated-dotted, .edge.preview.animated-dotted { stroke-dasharray: 2 8; animation: edge-flow .9s linear infinite; }
    .edge.preview { marker-end: none; opacity: .8; }
    @keyframes edge-flow { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -20; } }
    .edge-hit { fill: none; stroke: transparent; stroke-width: 14; pointer-events: stroke; cursor: pointer; }
    .node { position: absolute; width: 240px; height: 76px; border: 1px solid #d9dfe7; border-radius: 3px; background: #fff; box-shadow: 0 7px 15px #24364d16; cursor: move; user-select: none; }
    .node::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 12px; background: #eef3f8; }
    .node.selected { outline: 2px solid #1683ff; outline-offset: 2px; }
    .node-status { position: absolute; z-index: 6; top: -6px; left: -6px; }
    .node-head { position: relative; z-index: 1; display: grid; grid-template-columns: 38px 1fr; gap: 10px; align-items: center; height: 62px; padding: 8px 12px; }
    .node-icon { width: 34px; height: 34px; }
    .node-copy { min-width: 0; }
    .node strong { display: block; overflow: hidden; font-size: 13px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
    .node small { display: block; overflow: hidden; margin-top: 3px; color: #7d8793; font-size: 8px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
    .port { position: absolute; z-index: 4; top: 28px; right: -7px; width: 14px; height: 14px; padding: 0; border: 2px solid #fff; border-radius: 50%; background: #4a90ff; box-shadow: 0 0 0 1px #4a90ff; cursor: crosshair; opacity: 0; transition: opacity .12s; }
    .node:hover .port, .node.selected .port, body.connecting .port { opacity: 1; }
    .empty { position: absolute; top: 160px; left: 50%; width: 430px; transform: translateX(-50%); padding: 28px; border: 1px dashed var(--border-strong); border-radius: 8px; color: var(--text-muted); background: color-mix(in srgb, var(--surface) 90%, transparent); text-align: center; }
    .empty strong { color: #26313f; font-size: 18px; }
    .empty p { margin: 8px 0 0; line-height: 1.5; }
    .inspector { position: absolute; z-index: 19; top: 72px; right: 16px; width: 300px; max-height: calc(100vh - 90px); overflow: auto; padding: 14px; border: 1px solid var(--border-soft); border-radius: 6px; background: var(--surface-soft); box-shadow: 0 8px 24px var(--shadow); backdrop-filter: blur(8px); }
    .inspector h2 { margin: 0 0 11px; font-size: 13px; }
    .inspector-service { margin: -5px 0 12px; color: #65707c; font-size: 11px; }
    .guidance-card { margin: 0 0 14px; padding: 12px; border: 1px solid var(--border-soft); border-radius: 6px; background: var(--panel-fill); }
    .guidance-card strong { display: block; margin-bottom: 4px; color: #1f2937; font-size: 12px; }
    .guidance-copy { margin: 0; color: #566474; font-size: 10px; line-height: 1.5; }
    .guidance-note { margin: 10px 0 0; color: #5d6a78; font-size: 10px; line-height: 1.45; }
    .guidance-note strong { display: inline; margin: 0; font-size: inherit; }
    .impact-heading { margin: 14px 0 6px; color: #26313f; font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .impact-list { display: grid; gap: 6px; margin-top: 6px; }
    .impact-item { padding: 8px 9px; border: 1px solid var(--border-soft); border-radius: 5px; background: var(--surface); color: var(--muted); font-size: 10px; line-height: 1.45; }
    .dependency-heading { margin: 12px 0 6px; color: #26313f; font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .dependency-list { display: grid; gap: 6px; margin-top: 6px; }
    .dependency-item { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; padding: 8px 9px; border: 1px solid var(--border-soft); border-radius: 5px; background: var(--surface); }
    .dependency-name { color: var(--text-strong); font-size: 11px; font-weight: 600; }
    .dependency-meta { margin-top: 3px; color: #61707f; font-size: 9px; line-height: 1.4; }
    .dependency-node { font-weight: 700; }
    .dependency-status { padding: 2px 7px; border-radius: 999px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .2px; }
    .dependency-status.connected { color: #166534; background: #dcfce7; }
    .dependency-status.missing { color: #9a3412; background: #ffedd5; }
    .dependency-status.reused { color: #1d4ed8; background: #dbeafe; }
    .dependency-status.auto { color: #7c3aed; background: #ede9fe; }
    .dependency-status.manual { color: #0f766e; background: #ccfbf1; }
    .dependency-status.draft { color: #92400e; background: #fef3c7; }
    .dependency-actions { display: flex; gap: 8px; margin-top: 10px; }
    .dependency-actions button { flex: 1 1 0; min-height: 32px; border: 1px solid #c6d7ea; border-radius: 4px; color: #075ea8; background: #fff; cursor: pointer; font-size: 11px; font-weight: 700; }
    .dependency-actions button.primary { border-color: #0078d4; color: #fff; background: #0078d4; }
    .dependency-actions button:disabled { border-color: #dde3ea; color: #93a1af; background: #f7f8fa; cursor: default; }
    .parameter-heading { margin: 16px 0 2px; padding-top: 12px; border-top: 1px solid #e0e5eb; color: #26313f; font-size: 11px; text-transform: uppercase; }
    .parameter-empty { margin: 10px 0 0; color: #7b8591; font-size: 11px; line-height: 1.4; }
    .parameter-help { margin: 4px 0 0; color: #7b8591; font-size: 9px; line-height: 1.4; }
    .required-mark { margin-left: 3px; color: #c4312f; }
    .field { margin-top: 10px; }
    .field label { display: block; margin-bottom: 4px; color: #65707c; font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .field input, .field select, .field textarea { width: 100%; min-height: 32px; padding: 6px 8px; border: 1px solid var(--border-strong); border-radius: 3px; color: var(--text-strong); background: var(--surface); }
    .field textarea { min-height: 76px; resize: vertical; font-family: var(--vscode-editor-font-family), monospace; font-size: 11px; }
    .field.checkbox { display: grid; grid-template-columns: minmax(0, 1fr) 22px; gap: 10px 12px; align-items: center; }
    .field.checkbox label { margin: 0; text-transform: none; line-height: 1.35; }
    .field.checkbox input { width: 18px; height: 18px; margin: 0; }
    .field.checkbox .parameter-help { grid-column: 1 / -1; margin-top: 0; }
    .danger { width: 100%; margin-top: 12px; padding: 7px; border: 1px solid #d92d20; border-radius: 3px; color: #b42318; background: #fff; cursor: pointer; }
    @media (max-width: 900px) { .shell { grid-template-columns: 285px minmax(0, 1fr); } .palette { padding-left: 10px; padding-right: 10px; } .toolbar-group.optional { display: none; } }`;
}

function renderSketchBody(): string {
  return `  <div class="shell">
    <aside class="palette">
      <div class="brand"><h1>Cloud Canvas</h1></div>
      <p class="pattern-intro">Start with a blank canvas, then search, drag, connect, and shape the Azure services you need.</p>
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
    </aside>
    <main class="workspace">
      <div class="toolbar">
        <div class="toolbar-row">
          <div class="toolbar-group optional">
            <button id="undo" type="button" title="Undo (Ctrl+Z)">Undo</button>
            <button id="redo" type="button" title="Redo (Ctrl+Y)">Redo</button>
            <button id="zoomOut" type="button" title="Zoom out (Ctrl+-)">Zoom -</button>
            <button id="zoomIn" type="button" title="Zoom in (Ctrl++)">Zoom +</button>
            <button id="twoWay" type="button">Two-way arrows</button>
            <span class="toolbar-label">Arrow style</span>
            <select id="arrowStyle" aria-label="Arrow style">
              <option value="solid">Solid</option>
              <option value="dotted">Dotted</option>
              <option value="animated-dotted">Running dotted</option>
              <option value="dashed">Dashed</option>
            </select>
            <button id="themeToggle" type="button">Dark view</button>
            <button id="clearCanvas" type="button">Clear canvas</button>
          </div>
          <div class="toolbar-group">
            <button id="importReferenceImage" type="button">Import Image</button>
            <button id="removeReferenceImage" type="button">Remove Image</button>
            <button id="generateDraftFromImage" type="button">Draft From Image</button>
            <button id="exportPng" type="button">Export PNG</button>
            <button id="validate" type="button">Validate + Static Scan</button>
            <button id="preview" type="button">Preview Terraform</button>
            <button id="generate" class="primary" type="button">Generate Terraform</button>
          </div>
        </div>
        <div class="toolbar-tip"><strong>Preview</strong> opens generated Terraform without writing files. <strong>Validate</strong> runs Terraform validation and the built-in static scan so you can catch syntax, nested block, and control issues earlier.</div>
      </div>
      <div class="canvas-wrap">
        <div id="canvas">
          <svg id="connections"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#4a90ff"></path></marker><marker id="arrowStart" markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto"><path d="M8,0 L0,4 L8,8 z" fill="#4a90ff"></path></marker></defs></svg>
          <div id="empty" class="empty"><strong>Build a cloud architecture</strong><p>Drag services from the catalog, connect them to define Terraform dependencies, and drag the blank canvas to move around.</p></div>
        </div>
      </div>
      <section id="imageDraftPanel" class="draft-panel" hidden></section>
      <section id="inspector" class="inspector" hidden>
        <h2>Selected Azure service</h2>
        <p id="inspectorService" class="inspector-service"></p>
        <div class="field"><label for="nodeName">Resource name</label><input id="nodeName"></div>
        <div class="field"><label for="nodeRegion">Azure region</label><input id="nodeRegion" value="uksouth"></div>
        <div id="serviceGuidance"></div>
        <h3 class="parameter-heading">Service parameters</h3>
        <div id="serviceParameters"></div>
        <button id="deleteNode" class="danger" type="button">Delete service</button>
      </section>
    </main>
  </div>`;
}

function renderSketchScript(
  sketch: InfraSketch,
  iconBaseUri: string,
): string {
  return [
    renderSketchScriptBootstrap(sketch, iconBaseUri),
    renderSketchScriptPalette(),
    renderSketchScriptInspector(),
    renderSketchScriptParameters(),
    renderSketchScriptDependencyFlow(),
    renderSketchScriptEvents(),
    renderSketchScriptState(),
    renderSketchScriptExport(),
  ].join("\n");
}

function renderSketchScriptBootstrap(
  sketch: InfraSketch,
  iconBaseUri: string,
): string {
  return `    const vscode = acquireVsCodeApi();
    const catalog = ${JSON.stringify(serviceCatalog(iconBaseUri))};
    const parameterDefinitions = ${safeJson(mappedParameterDefinitions())};
    let sketch = ${safeJson(sketch)};
    let selectedId = null;
    let connectionDraft = null;
    let bidirectionalConnections = false;
    let connectionStyle = "solid";
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
    const serviceGuidance = document.getElementById("serviceGuidance");
    const serviceParameters = document.getElementById("serviceParameters");
    const imageDraftPanel = document.getElementById("imageDraftPanel");
    const themeToggle = document.getElementById("themeToggle");
    let imageDraft = null;
    let isDarkTheme = false;`;
}

function renderSketchScriptPalette(): string {
  return `    function renderPalette() {
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
        category.innerHTML = '<button class="category-toggle" type="button"><span class="category-icon">' + escapeText(initials) + '</span><span>' + escapeText(categoryName) + '</span><span class="category-count">' + items.length + '</span><span class="chevron"></span></button><div class="service-list"></div>';
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
          card.innerHTML = '<span class="grip">::</span>' + iconMarkup(item, "service-icon") + '<span class="service-copy"><strong>' + escapeText(item.title) + '</strong><small>' + escapeText(item.description) + '</small></span>';
          card.addEventListener('dragstart', event => event.dataTransfer.setData('text/service', item.type));
          card.addEventListener('dblclick', () => addNode(item, 440, 160 + sketch.nodes.length * 28));
          list.appendChild(card);
        });
        categories.appendChild(category);
      });
    }

    function render() {
      canvas.style.zoom = zoom;
      canvas.querySelectorAll(".reference-image").forEach(item => item.remove());
      canvas.querySelectorAll(".node").forEach(node => node.remove());
      document.getElementById("empty").hidden = sketch.nodes.length > 0 || Boolean(sketch.referenceImage);
      renderReferenceImage();
      sketch.nodes.forEach(node => {
        const service = catalog.find(item => item.type === node.serviceType);
        if (!service) return;
        const card = document.createElement("div");
        card.className = "node" + (node.id === selectedId ? " selected" : "");
        card.dataset.id = node.id;
        card.style.left = node.x + "px";
        card.style.top = node.y + "px";
        card.style.setProperty("--service-color", service.color);
        card.innerHTML = '<span class="node-status status-dot ' + service.status + '" title="' + escapeText(statusLabel(service.status)) + '"></span><div class="node-head">' + iconMarkup(service, "node-icon") + '<div class="node-copy"><strong>' + escapeText(node.name) + '</strong><small>' + escapeText(service.description) + '</small></div></div><button class="port" type="button" title="Drag to create a Terraform dependency"></button>';
        card.addEventListener("pointerdown", event => beginDrag(event, node));
        card.addEventListener("click", event => selectNode(event, node));
        card.querySelector('.port').addEventListener('pointerdown', event => beginConnection(event, node));
        canvas.appendChild(card);
      });
      renderConnections();
      renderImageDraft();
      renderInspector();
    }

    function renderImageDraft() {
      imageDraftPanel.hidden = !imageDraft;
      if (!imageDraft) {
        imageDraftPanel.innerHTML = "";
        return;
      }
      const noteMarkup = (imageDraft.notes || []).map(note => '<p class="draft-meta">' + escapeText(note) + '</p>').join('');
      const suggestionMarkup = (imageDraft.suggestions || []).map(item =>
        '<div class="draft-item"><strong>' + escapeText(item.title) + '</strong><small>Matched on: ' + escapeText((item.matchedOn || []).join(', ')) + '</small><span class="confidence ' + escapeText(item.confidence) + '">' + escapeText(item.confidence) + '</span></div>'
      ).join('');
      imageDraftPanel.innerHTML = '<h2>Draft From Image</h2><p>Review the detected Azure services before adding them to the canvas.</p><p class="draft-meta">Source: ' + escapeText(imageDraft.source) + '</p>' + noteMarkup + '<div class="draft-list">' + suggestionMarkup + '</div><div class="draft-actions"><button id="dismissImageDraft" type="button">Dismiss</button><button id="applyImageDraft" class="primary" type="button">Apply Suggestions</button></div>';
      document.getElementById("dismissImageDraft").addEventListener("click", () => {
        imageDraft = null;
        render();
      });
      document.getElementById("applyImageDraft").addEventListener("click", () => {
        applyImageDraft();
      });
    }

    function renderReferenceImage() {
      if (!sketch.referenceImage || !sketch.referenceImage.uri) return;
      const figure = document.createElement("div");
      figure.className = "reference-image" + (selectedId === "__reference_image__" ? " selected" : "");
      figure.style.left = sketch.referenceImage.x + "px";
      figure.style.top = sketch.referenceImage.y + "px";
      figure.style.width = sketch.referenceImage.width + "px";
      figure.style.opacity = String(sketch.referenceImage.opacity ?? 0.42);
      figure.innerHTML = '<span class="reference-badge">Reference image</span><img src="' + escapeText(sketch.referenceImage.uri) + '" alt="Imported architecture reference">';
      figure.addEventListener("pointerdown", event => beginReferenceDrag(event));
      figure.addEventListener("click", event => {
        event.stopPropagation();
        selectedId = "__reference_image__";
        render();
      });
      canvas.appendChild(figure);
    }

    function renderConnections() {
      svg.querySelectorAll(".edge, .edge-hit").forEach(edge => edge.remove());
      sketch.connections.forEach(connection => {
        const source = sketch.nodes.find(node => node.id === connection.source);
        const target = sketch.nodes.find(node => node.id === connection.target);
        if (!source || !target) return;
        const path = connectionPath(source.x + 240, source.y + 38, target.x, target.y + 38);
        const style = connection.style || 'solid';
        const visible = appendPath(path, 'edge ' + style);
        if (connection.bidirectional) visible.setAttribute('marker-start', 'url(#arrowStart)');
        const hit = appendPath(path, 'edge-hit');
        hit.addEventListener('click', event => {
          event.stopPropagation();
          remember();
          sketch.connections = sketch.connections.filter(item => item.id !== connection.id);
          renderConnections();
        });
      });
      if (connectionDraft) appendPath(connectionDraft.path, 'edge preview ' + (connectionDraft.style || 'solid'));
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
      connectionDraft = { source: node.id, path: connectionPath(startX, startY, startX, startY), style: connectionStyle };
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
            sketch.connections.push({ id: 'edge-' + Date.now(), source: node.id, target: targetId, style: connectionStyle, ...(bidirectionalConnections ? { bidirectional: true } : {}) });
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
    }`;
}

function renderSketchScriptInspector(): string {
  return `    function renderInspector() {
      const node = sketch.nodes.find(item => item.id === selectedId);
      document.getElementById("inspector").hidden = !node;
      if (node) {
        const service = catalog.find(item => item.type === node.serviceType);
        nodeName.value = node.name;
        nodeRegion.value = node.region;
        document.getElementById("inspectorService").textContent = service
          ? service.title + (service.terraformType ? " · " + service.terraformType : " · Diagram only")
          : node.serviceType;
        renderServiceGuidance(node, service);
        renderServiceParameters(node);
      }
    }

    function renderServiceGuidance(node, service) {
      serviceGuidance.innerHTML = "";
      const variant = dependencyVariant(node, service);
      if (!variant) return;
      const card = document.createElement("section");
      card.className = "guidance-card";
      const connected = connectedNodes(node);
      const connectedTypes = new Set(connected.map(item => item.serviceType));
      const requiredMissing = variant.requiredDependencies.filter(type => !connectedTypes.has(type));
      const optionalMissing = variant.optionalDependencies.filter(type => !connectedTypes.has(type));
      card.innerHTML = '<strong>' + escapeText(variant.label) + '</strong><p class="guidance-copy">' + escapeText(variant.description) + '</p>';
      const note = document.createElement("p");
      note.className = "guidance-note";
      note.innerHTML = '<strong>Terraform behavior:</strong> directional connections from this service are emitted as <code>depends_on</code>. Some connected services also populate generated arguments automatically.';
      card.appendChild(note);
      card.appendChild(renderDependencyGroup(node, "Required services", variant.requiredDependencies, connected));
      if (variant.optionalDependencies.length) {
        card.appendChild(renderDependencyGroup(node, "Recommended services", variant.optionalDependencies, connected));
      }
      const impacts = terraformImpactItems(node, connected);
      if (impacts.length) {
        const heading = document.createElement("div");
        heading.className = "impact-heading";
        heading.textContent = "Generated Terraform";
        card.appendChild(heading);
        const list = document.createElement("div");
        list.className = "impact-list";
        impacts.forEach(text => {
          const item = document.createElement("div");
          item.className = "impact-item";
          item.textContent = text;
          list.appendChild(item);
        });
        card.appendChild(list);
      }
      const actions = document.createElement("div");
      actions.className = "dependency-actions";
      const addRequired = document.createElement("button");
      addRequired.type = "button";
      addRequired.className = "primary";
      addRequired.textContent = requiredMissing.length ? 'Add required (' + requiredMissing.length + ')' : 'Required ready';
      addRequired.disabled = requiredMissing.length === 0;
      addRequired.addEventListener("click", () => addDependencies(node, variant.requiredDependencies));
      actions.appendChild(addRequired);
      const recommendedDependencies = [...variant.requiredDependencies, ...variant.optionalDependencies];
      const addRecommended = document.createElement("button");
      addRecommended.type = "button";
      addRecommended.textContent = optionalMissing.length || requiredMissing.length
        ? 'Add recommended (' + [...new Set([...requiredMissing, ...optionalMissing])].length + ')'
        : 'Recommended ready';
      addRecommended.disabled = [...new Set([...requiredMissing, ...optionalMissing])].length === 0;
      addRecommended.addEventListener("click", () => addDependencies(node, recommendedDependencies));
      actions.appendChild(addRecommended);
      card.appendChild(actions);
      serviceGuidance.appendChild(card);
    }

    function renderDependencyGroup(node, title, dependencyTypes, connected) {
      const section = document.createElement("div");
      const heading = document.createElement("div");
      heading.className = "dependency-heading";
      heading.textContent = title;
      section.appendChild(heading);
      const list = document.createElement("div");
      list.className = "dependency-list";
      dependencyTypes.forEach(type => {
        const service = catalog.find(item => item.type === type);
        const matches = connected.filter(item => item.serviceType === type);
        const item = document.createElement("div");
        item.className = "dependency-item";
        const copy = document.createElement("div");
        const name = document.createElement("div");
        name.className = "dependency-name";
        name.textContent = service ? service.title : type;
        copy.appendChild(name);
        const meta = document.createElement("div");
        meta.className = "dependency-meta";
        if (matches.length) {
          meta.textContent = dependencyMetaText(node, type, matches);
        } else {
          meta.textContent = "Not connected yet.";
        }
        copy.appendChild(meta);
        const status = document.createElement("span");
        if (!matches.length) {
          status.className = "dependency-status missing";
          status.textContent = "missing";
        } else {
          const primary = dependencyStatusLabel(matches[0]);
          status.className = "dependency-status connected " + primary.className;
          status.textContent = primary.text;
        }
        item.append(copy, status);
        list.appendChild(item);
      });
      section.appendChild(list);
      return section;
    }

    function dependencyMetaText(node, dependencyType, matches) {
      const names = matches.map(item => item.name).join(', ');
      const source = matches[0].creationSource === 'dependency'
        ? 'Auto-added for ' + friendlyServiceName(node.serviceType)
        : matches[0].creationSource === 'image-draft'
          ? 'Added from image draft'
          : 'Manually added or reused';
      const extra = dependencyType === 'subnet' && shouldInferSubnetId(node)
        ? 'Used to infer subnet integration.'
        : dependencyType === 'service_plan' && (node.serviceType === 'web_app' || node.serviceType === 'functions')
          ? 'Used to populate hosting plan arguments.'
          : dependencyType === 'storage_account' && node.serviceType === 'functions'
            ? 'Used to populate Function storage settings.'
            : dependencyType === 'sql_server' && node.serviceType === 'sql_database'
              ? 'Used to populate server_id.'
              : 'Connected for dependency-aware generation.';
      return names + ' · ' + source + ' ' + extra;
    }

    function dependencyStatusLabel(node) {
      if (node.creationSource === 'dependency') {
        return { text: 'auto', className: 'auto' };
      }
      if (node.creationSource === 'image-draft') {
        return { text: 'draft', className: 'draft' };
      }
      return { text: 'manual', className: 'manual' };
    }

    function terraformImpactItems(node, connected) {
      const impacts = [];
      if (connected.length) {
        impacts.push('Outgoing connections from ' + node.name + ' are rendered as Terraform depends_on entries.');
      }
      const plan = connected.find(item => item.serviceType === 'service_plan');
      const storage = connected.find(item => item.serviceType === 'storage_account');
      const subnet = connected.find(item => item.serviceType === 'subnet');
      const sqlServer = connected.find(item => item.serviceType === 'sql_server');
      const vnet = connected.find(item => item.serviceType === 'virtual_network');
      if (plan && (node.serviceType === 'web_app' || node.serviceType === 'functions')) {
        impacts.push('The connected App Service Plan "' + plan.name + '" sets the generated service_plan_id.');
      }
      if (storage && node.serviceType === 'functions') {
        impacts.push('The connected Storage Account "' + storage.name + '" sets storage_account_name and storage_account_access_key.');
      }
      if (subnet && shouldInferSubnetId(node)) {
        impacts.push(
          hasExplicitSubnetParameter(node)
            ? 'The connected Subnet "' + subnet.name + '" stays as a dependency link, but the explicit virtual_network_subnet_id parameter takes precedence.'
            : 'The connected Subnet "' + subnet.name + '" is used to infer virtual_network_subnet_id.'
        );
      }
      if (sqlServer && node.serviceType === 'sql_database') {
        impacts.push('The connected SQL Server "' + sqlServer.name + '" sets the generated server_id.');
      }
      if (vnet && node.serviceType === 'subnet') {
        impacts.push('The connected Virtual Network "' + vnet.name + '" sets the generated virtual_network_name.');
      }
      return impacts;
    }

    function shouldInferSubnetId(node) {
      return node.serviceType === 'web_app' || node.serviceType === 'functions';
    }

    function hasExplicitSubnetParameter(node) {
      return Boolean(
        node.parameters &&
        typeof node.parameters.virtual_network_subnet_id === 'string' &&
        node.parameters.virtual_network_subnet_id.trim()
      );
    }

    function friendlyServiceName(serviceType) {
      const service = catalog.find(item => item.type === serviceType);
      return service ? service.title : serviceType;
    }`;
}

function renderSketchScriptParameters(): string {
  return `    function renderServiceParameters(node) {
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
        label.innerHTML = escapeText(definition.label) + (definition.required ? '<span class="required-mark">*</span>' : '');
        label.htmlFor = "parameter-" + definition.key;
        const control = createParameterControl(node, definition);
        field.append(label, control);
        const guidance = [definition.controlIds?.length ? definition.controlIds.join(', ') : '', definition.nestedBlock ? 'Enter this nested Terraform block as JSON for the prototype.' : ''].filter(Boolean).join(' ');
        if (guidance) {
          const help = document.createElement("p");
          help.className = "parameter-help";
          help.textContent = guidance;
          field.appendChild(help);
        }
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
      } else if (definition.type === "json") {
        control = document.createElement("textarea");
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
      else if (definition.type === "json") control.value = JSON.stringify(current, null, 2);
      else control.value = String(current);
      control.addEventListener("change", () => {
        node.parameters = node.parameters || {};
        try {
          node.parameters[definition.key] = definition.type === "boolean"
            ? control.checked
            : definition.type === "number"
              ? Number(control.value)
              : definition.type === "json"
                ? JSON.parse(control.value || "{}")
                : control.value;
          control.setCustomValidity("");
        } catch {
          control.setCustomValidity("Enter valid JSON.");
          control.reportValidity();
          return;
        }
        remember();
      });
      return control;
    }

    function post(type) {
      vscode.postMessage({ type, sketch });
    }`;
}

function renderSketchScriptDependencyFlow(): string {
  return `    function beginReferenceDrag(event) {
      if (!sketch.referenceImage) return;
      event.preventDefault();
      event.stopPropagation();
      selectedId = "__reference_image__";
      const card = event.currentTarget;
      const startX = event.clientX, startY = event.clientY, originX = sketch.referenceImage.x, originY = sketch.referenceImage.y;
      card.setPointerCapture(event.pointerId);
      const move = moveEvent => {
        sketch.referenceImage.x = Math.max(0, originX + (moveEvent.clientX - startX) / zoom);
        sketch.referenceImage.y = Math.max(0, originY + (moveEvent.clientY - startY) / zoom);
        card.style.left = sketch.referenceImage.x + "px";
        card.style.top = sketch.referenceImage.y + "px";
      };
      const up = () => {
        card.removeEventListener("pointermove", move);
        card.removeEventListener("pointerup", up);
        remember();
      };
      card.addEventListener("pointermove", move);
      card.addEventListener("pointerup", up);
    }

    function defaultNodeName(serviceType, value) {
      const prefixes = {
        virtual_network: 'vnet',
        subnet: 'snet',
        network_security_group: 'nsg',
        storage_account: 'st',
        service_plan: 'asp',
        functions: 'func',
        web_app: 'web',
        sql_server: 'sql',
        sql_database: 'sqldb',
        log_analytics: 'log',
      };
      const prefix = prefixes[serviceType] || serviceType.replaceAll('_', '-');
      return prefix + '-' + value;
    }

    function createNode(service, x, y, overrides) {
      const id = 'node-' + Date.now() + '-' + sequence;
      return {
        id,
        serviceType: service.type,
        name: defaultNodeName(service.type, sequence++),
        region: 'uksouth',
        x: Math.max(0, x),
        y: Math.max(0, y),
        creationSource: 'manual',
        ...(overrides || {})
      };
    }

    function addNode(service, x, y) {
      remember();
      const created = createNode(service, x, y);
      sketch.nodes.push(created);
      selectedId = created.id;
      render();
    }

    function connectedNodes(node) {
      const relatedIds = sketch.connections.flatMap(connection =>
        connection.source === node.id
          ? [connection.target]
          : connection.target === node.id
            ? [connection.source]
            : []
      );
      return sketch.nodes.filter(item => relatedIds.includes(item.id));
    }

    function dependencyVariant(node, service) {
      const canvas = service && service.canvas;
      if (!canvas || !canvas.variants || !canvas.variants.length) return null;
      const parameterKey = canvas.variantParameterKey;
      const selectedVariantId = parameterKey && node.parameters && typeof node.parameters[parameterKey] === 'string'
        ? node.parameters[parameterKey]
        : canvas.variants[0].id;
      return canvas.variants.find(item => item.id === selectedVariantId) || canvas.variants[0];
    }

    function addDependencies(node, dependencyTypes) {
      const uniqueTypes = [...new Set(dependencyTypes)];
      if (!uniqueTypes.length) return;
      remember();
      uniqueTypes.forEach((type, index) => ensureDependency(node, type, index, new Set()));
      render();
    }

    function applyImageDraft() {
      if (!imageDraft || !imageDraft.suggestions || !imageDraft.suggestions.length) return;
      remember();
      const originX = sketch.referenceImage?.x ?? 120;
      const originY = sketch.referenceImage?.y ?? 140;
      imageDraft.suggestions.forEach((suggestion, index) => {
        if (sketch.nodes.some(node => node.serviceType === suggestion.serviceType)) return;
        const service = catalog.find(item => item.type === suggestion.serviceType);
        if (!service) return;
        const column = index % 3;
        const row = Math.floor(index / 3);
        const created = createNode(
          service,
          originX + column * 300,
          originY + row * 150 + 40,
          { creationSource: 'image-draft' }
        );
        sketch.nodes.push(created);
        const variant = dependencyVariant(created, service);
        if (variant) {
          variant.requiredDependencies.forEach((type, requiredIndex) => {
            ensureDependency(created, type, requiredIndex, new Set());
          });
        }
      });
      imageDraft = null;
      render();
    }

    function ensureDependency(node, dependencyType, index, trail) {
      const loopKey = node.id + ':' + dependencyType;
      if (trail.has(loopKey)) return;
      trail.add(loopKey);
      if (connectedNodes(node).some(item => item.serviceType === dependencyType)) return;
      const existing = findReusableDependencyNode(node, dependencyType);
      const target = existing || createDependencyNode(node, dependencyType, index);
      if (!target) return;
      if (!existing) {
        sketch.nodes.push(target);
      }
      if (!sketch.connections.some(item => item.source === node.id && item.target === target.id)) {
        sketch.connections.push({ id: 'edge-' + Date.now() + '-' + dependencyType + '-' + index, source: node.id, target: target.id, style: connectionStyle });
      }
      const targetService = catalog.find(item => item.type === dependencyType);
      const targetVariant = targetService ? dependencyVariant(target, targetService) : null;
      if (targetVariant) {
        targetVariant.requiredDependencies.forEach((requiredType, requiredIndex) => {
          ensureDependency(target, requiredType, requiredIndex, new Set(trail));
        });
      }
    }

    function findReusableDependencyNode(node, dependencyType) {
      const candidates = sketch.nodes.filter(item => item.id !== node.id && item.serviceType === dependencyType);
      if (!candidates.length) return null;
      return candidates
        .slice()
        .sort((left, right) =>
          dependencyCandidateScore(node, dependencyType, left) -
          dependencyCandidateScore(node, dependencyType, right)
        )[0];
    }

    function dependencyCandidateScore(node, dependencyType, candidate) {
      let score = 0;
      if (candidate.region !== node.region) score += 10000;
      if (
        dependencyType === 'subnet' &&
        !connectedNodes(candidate).some(item => item.serviceType === 'virtual_network')
      ) {
        score += 4000;
      }
      score += Math.abs(candidate.x - node.x) + Math.abs(candidate.y - node.y);
      return score;
    }

    function createDependencyNode(node, dependencyType, index) {
      const service = catalog.find(item => item.type === dependencyType);
      if (!service) return null;
      const total = 4;
      const startY = node.y - 120;
      const spacingY = 92;
      const targetY = startY + Math.min(index, total - 1) * spacingY;
      const targetX = node.x - 320;
      return createNode(service, targetX, targetY, {
        region: node.region,
        creationSource: 'dependency',
        autoCreatedFor: node.serviceType,
      });
    }`;
}

function renderSketchScriptEvents(): string {
  return `    canvas.addEventListener("dragover", event => event.preventDefault());
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
      if (!sketch.nodes.length && !sketch.connections.length && !sketch.referenceImage) return;
      sketch.nodes = [];
      sketch.connections = [];
      delete sketch.referenceImage;
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
    document.getElementById("arrowStyle").addEventListener("change", event => {
      connectionStyle = event.target.value;
    });
    themeToggle.addEventListener("click", () => {
      isDarkTheme = !isDarkTheme;
      applyTheme();
    });
    document.getElementById("importReferenceImage").addEventListener("click", () => post("importReferenceImage"));
    document.getElementById("removeReferenceImage").addEventListener("click", () => {
      if (!sketch.referenceImage) return;
      remember();
      delete sketch.referenceImage;
      if (selectedId === "__reference_image__") selectedId = null;
      render();
      post("removeReferenceImage");
    });
    document.getElementById("generateDraftFromImage").addEventListener("click", () => post("generateDraftFromImage"));
    document.getElementById("validate").addEventListener("click", () => post("validateTerraform"));
    document.getElementById("preview").addEventListener("click", () => post("previewTerraform"));
    document.getElementById("generate").addEventListener("click", () => post("generateTerraform"));
    document.getElementById("exportPng").addEventListener("click", exportPng);
    window.addEventListener("message", event => {
      const message = event.data;
      if (!message || typeof message !== "object") return;
      if (message.type === "referenceImageImported") {
        sketch.referenceImage = message.referenceImage;
        selectedId = "__reference_image__";
        render();
        remember();
        return;
      }
      if (message.type === "imageDraftGenerated") {
        imageDraft = message.draft;
        render();
      }
    });

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
    });`;
}

function renderSketchScriptState(): string {
  return `    function deleteSelectedNode() {
      if (!selectedId) return;
      if (selectedId === "__reference_image__") {
        remember();
        delete sketch.referenceImage;
        selectedId = null;
        render();
        post("removeReferenceImage");
        return;
      }
      remember();
      sketch.nodes = sketch.nodes.filter(node => node.id !== selectedId);
      sketch.connections = sketch.connections.filter(item => item.source !== selectedId && item.target !== selectedId);
      selectedId = null;
      render();
    }

    function applyTheme() {
      document.body.dataset.theme = isDarkTheme ? "dark" : "light";
      themeToggle.textContent = isDarkTheme ? "Light view" : "Dark view";
      themeToggle.classList.toggle("active", isDarkTheme);
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

    applyTheme();`;
}

function renderSketchScriptExport(): string {
  return `    function exportPng() {
      if (!sketch.nodes.length && !sketch.referenceImage) return;
      const padding = 70;
      const bounds = sketch.nodes.map(node => ({
        minX: node.x,
        minY: node.y,
        maxX: node.x + 240,
        maxY: node.y + 76,
      }));
      if (sketch.referenceImage) {
        const preview = document.querySelector('.reference-image img');
        const height = preview instanceof HTMLImageElement && preview.naturalWidth > 0
          ? sketch.referenceImage.width * (preview.naturalHeight / preview.naturalWidth)
          : sketch.referenceImage.width * 0.6;
        bounds.push({
          minX: sketch.referenceImage.x,
          minY: sketch.referenceImage.y,
          maxX: sketch.referenceImage.x + sketch.referenceImage.width,
          maxY: sketch.referenceImage.y + height,
        });
      }
      const maxX = Math.max(...bounds.map(item => item.maxX)) + padding;
      const maxY = Math.max(...bounds.map(item => item.maxY)) + padding;
      const minX = Math.min(...bounds.map(item => item.minX)) - padding;
      const minY = Math.min(...bounds.map(item => item.minY)) - padding;
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
      const referencePreview = document.querySelector('.reference-image img');
      if (sketch.referenceImage && referencePreview instanceof HTMLImageElement) {
        context.globalAlpha = sketch.referenceImage.opacity ?? 0.42;
        context.drawImage(
          referencePreview,
          sketch.referenceImage.x,
          sketch.referenceImage.y,
          sketch.referenceImage.width,
          referencePreview.naturalHeight > 0
            ? sketch.referenceImage.width * (referencePreview.naturalHeight / referencePreview.naturalWidth)
            : sketch.referenceImage.width * 0.6,
        );
        context.globalAlpha = 1;
      }
      sketch.connections.forEach(connection => {
        const source = sketch.nodes.find(node => node.id === connection.source);
        const target = sketch.nodes.find(node => node.id === connection.target);
        if (!source || !target) return;
        drawConnection(context, source.x + 240, source.y + 38, target.x, target.y + 38, connection.bidirectional === true, connection.style || 'solid');
      });
      sketch.nodes.forEach(node => drawNode(context, node));
      context.restore();
      const data = output.toDataURL('image/png').replace(/^data:image\\/png;base64,/, '');
      vscode.postMessage({ type: 'exportPng', sketch, data });
    }

    function drawConnection(context, x1, y1, x2, y2, bidirectional, style) {
      const direction = x2 >= x1 ? 1 : -1;
      const bend = Math.max(70, Math.abs(x2 - x1) * .48);
      context.beginPath();
      context.moveTo(x1, y1);
      context.bezierCurveTo(x1 + bend * direction, y1, x2 - bend * direction, y2, x2, y2);
      context.strokeStyle = '#4a90ff';
      context.lineWidth = 2;
      context.setLineDash(style === 'dotted' || style === 'animated-dotted' ? [2, 8] : style === 'dashed' ? [10, 8] : []);
      context.lineCap = 'round';
      context.stroke();
      context.setLineDash([]);
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

    function iconMarkup(service, className) {
      return '<span class="' + className + '"><span class="icon-fallback">' + escapeText(service.short) + '</span><img class="icon-image" src="' + escapeText(service.iconUri) + '" alt="" draggable="false"></span>';
    }

    function escapeText(value) {
      const span = document.createElement("span");
      span.textContent = value;
      return span.innerHTML;
    }
    renderPalette();
    render();`;
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export function createNonce(): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    { length: 32 },
    () => characters[Math.floor(Math.random() * characters.length)],
  ).join("");
}

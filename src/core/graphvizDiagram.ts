import completeCatalog from "../../azure-complete-catalog-vscode.json";
import type {
  ArchitectureEdge,
  ArchitectureNode,
  PlanAnalysis,
} from "../types";

export interface GraphvizDiagramOptions {
  title?: string;
  iconRoot?: string;
  includeIcons?: boolean;
}

export interface GraphvizRenderOptions {
  format?: "svg" | "dot" | "json" | "plain" | "canon";
  engine?:
    | "circo"
    | "dot"
    | "fdp"
    | "sfdp"
    | "neato"
    | "osage"
    | "patchwork"
    | "twopi"
    | "nop"
    | "nop2";
  images?: Array<{ path: string; width: string; height: string }>;
  files?: Array<{ path: string; data: string }>;
  yInvert?: boolean;
  nop?: number;
}

interface CatalogService {
  displayName: string;
  shortName?: string;
  color?: string;
  icon?: string;
  terraform: {
    resourceType: string | null;
  };
  controls?: Array<{
    resourceTypes?: string[];
  }>;
}

const DEFAULT_ICON_ROOT =
  "media/cloud-canvas/Azure_Public_Service_Icons/Icons";

const CATALOG_BY_RESOURCE_TYPE = buildCatalogIndex();

export function renderGraphvizDot(
  analysis: PlanAnalysis,
  options: GraphvizDiagramOptions = {},
): string {
  const iconRoot = options.iconRoot ?? DEFAULT_ICON_ROOT;
  const lines = [
    "digraph AzureArchitecture {",
    "  graph [",
    '    rankdir="LR",',
    '    bgcolor="transparent",',
    '    pad="0.35",',
    '    nodesep="0.95",',
    '    ranksep="1.25",',
    '    splines="polyline",',
    '    outputorder="edgesfirst"',
    "  ];",
    "",
    "  node [",
    '    shape="box",',
    '    style="rounded,filled",',
    '    fontname="Segoe UI",',
    '    fontsize="11",',
    '    margin="0.16,0.1",',
    '    width="2.25",',
    '    height="0.9",',
    '    color="#8a95a5",',
    '    fillcolor="#ffffff",',
    '    fontcolor="#0f172a"',
    "  ];",
    "",
    "  edge [",
    '    fontname="Segoe UI",',
    '    fontsize="10",',
    '    color="#5f87b8",',
    '    fontcolor="#334155",',
    '    arrowsize="0.8",',
    '    penwidth="2"',
    "  ];",
    "",
  ];

  if (options.title) {
    lines.push(
      `  label=${quoteDot(options.title)};`,
      '  labelloc="t";',
      '  fontsize="20";',
      '  fontname="Segoe UI Semibold";',
      '  fontcolor="#0f172a";',
      "",
    );
  }

  const includeIcons = options.includeIcons !== false;

  for (const node of [...analysis.nodes].sort((left, right) =>
    left.address.localeCompare(right.address),
  )) {
    lines.push(renderNode(node, iconRoot, includeIcons), "");
  }

  for (const edge of [...analysis.edges].sort(compareEdges)) {
    lines.push(renderEdge(edge));
  }

  lines.push("}");
  return lines.join("\n");
}

export async function renderGraphvizSvg(
  dot: string,
  options: GraphvizRenderOptions = {},
): Promise<string> {
  const { Graphviz } = await import("@hpcc-js/wasm");
  const graphviz = await Graphviz.load();
  return graphviz.layout(
    dot,
    options.format ?? "svg",
    options.engine ?? "dot",
    options,
  );
}

function buildCatalogIndex(): Map<string, CatalogService> {
  const services = completeCatalog.services as Record<string, CatalogService>;
  const index = new Map<string, CatalogService>();
  for (const service of Object.values(services)) {
    if (service.terraform.resourceType) {
      index.set(service.terraform.resourceType, service);
    }
    for (const control of service.controls ?? []) {
      for (const resourceType of control.resourceTypes ?? []) {
        if (!index.has(resourceType)) {
          index.set(resourceType, service);
        }
      }
    }
  }
  return index;
}

function renderNode(
  node: ArchitectureNode,
  iconRoot: string,
  includeIcons: boolean,
): string {
  const service = CATALOG_BY_RESOURCE_TYPE.get(node.type);
  const iconPath =
    includeIcons && service?.icon ? `${iconRoot}/${service.icon}` : undefined;
  const borderColor = riskColor(node.risk);
  const serviceLabel = service?.displayName ?? node.service;
  const shortName = service?.shortName ?? initials(serviceLabel);
  const displayName = readableName(node.name);
  const status = [
    node.risk !== "none" ? node.risk.toUpperCase() : undefined,
    node.publicExposure ? "PUBLIC" : undefined,
    node.changeAction !== "no-op" ? node.changeAction.toUpperCase() : undefined,
  ]
    .filter(Boolean)
    .join("  ");
  const iconAttributes = iconPath
    ? [
        `    image=${quoteDot(escapeHtmlAttribute(iconPath))},`,
        '    imagescale="true",',
        '    labelloc="b",',
      ]
    : [];

  return [
    `  ${quoteDot(node.address)} [`,
    ...iconAttributes,
    `    label=${quoteDot(
      [serviceLabel, displayName, status || shortName].join("\\n"),
    )},`,
    `    tooltip=${quoteDot(node.address)},`,
    `    color="${borderColor}",`,
    `    penwidth="${node.risk === "none" ? 1.2 : 2.2}",`,
    "  ];",
  ].join("\n");
}

function renderEdge(edge: ArchitectureEdge): string {
  const style = edgeStyle(edge);
  const semanticLabel = edgeLabel(edge.label);
  const label = semanticLabel ? `, label=${quoteDot(semanticLabel)}` : "";
  return `  ${quoteDot(edge.source)} -> ${quoteDot(edge.target)} [color="${style.color}", fontcolor="${style.color}", style="${style.style}", penwidth="${style.width}", arrowsize="0.7"${label}];`;
}

function edgeStyle(edge: ArchitectureEdge): {
  color: string;
  style: "solid" | "dashed" | "dotted";
  width: number;
} {
  const label = edge.label.toLowerCase();
  if (
    label.includes("subnet") ||
    label.includes("network") ||
    label.includes("ip")
  ) {
    return { color: "#1683ff", style: "solid", width: 2.4 };
  }
  if (
    label.includes("identity") ||
    label.includes("principal") ||
    label.includes("tenant")
  ) {
    return { color: "#7c3aed", style: "dashed", width: 2 };
  }
  if (
    label.includes("storage") ||
    label.includes("database") ||
    label.includes("connection")
  ) {
    return { color: "#16a34a", style: "solid", width: 2.2 };
  }
  return { color: "#64748b", style: "dotted", width: 1.8 };
}

function edgeLabel(label: string): string {
  const value = label.toLowerCase();
  if (value.includes("subnet") || value.includes("network")) {
    return "network";
  }
  if (value.includes("identity") || value.includes("principal")) {
    return "identity";
  }
  if (value.includes("private_connection")) {
    return "private link";
  }
  if (value.includes("database")) {
    return "data";
  }
  return "";
}

function riskColor(risk: ArchitectureNode["risk"]): string {
  switch (risk) {
    case "high":
      return "#e5484d";
    case "medium":
      return "#d99b00";
    case "low":
      return "#22a06b";
    default:
      return "#64748b";
  }
}

function compareEdges(left: ArchitectureEdge, right: ArchitectureEdge): number {
  return (
    left.source.localeCompare(right.source) ||
    left.target.localeCompare(right.target) ||
    left.label.localeCompare(right.label)
  );
}

function quoteDot(value: string): string {
  return JSON.stringify(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value).replaceAll("\\", "/");
}

function readableName(value: string): string {
  const cleaned = value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "resource";
  return cleaned.length > 24 ? `${cleaned.slice(0, 21)}...` : cleaned;
}

function initials(value: string): string {
  return value
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

import path from "node:path";
import completeCatalog from "../../azure-complete-catalog-vscode.json";

export interface ImageDraftSuggestion {
  serviceType: string;
  title: string;
  confidence: "high" | "medium" | "low";
  score: number;
  matchedOn: string[];
}

export interface ImageDraftExtraction {
  source: "svg-text" | "filename" | "unrecognized";
  suggestions: ImageDraftSuggestion[];
  notes: string[];
}

const EXTRA_ALIASES: Record<string, string[]> = {
  functions: ["function app", "azure functions"],
  web_app: ["app service", "web app"],
  virtual_network: ["vnet", "virtual network"],
  sql_database: ["sql db", "sql database"],
  sql_server: ["sql server"],
  storage_account: ["storage account"],
  subnet: ["snet", "subnet"],
};

interface ServiceIndexEntry {
  serviceType: string;
  title: string;
  aliases: string[];
}

const SERVICE_INDEX: ServiceIndexEntry[] = Object.values(
  completeCatalog.services,
).map((service) => ({
  serviceType: service.serviceId,
  title: service.displayName,
  aliases: uniqueAliases(service),
}));

export function extractImageDraft(
  imagePath: string,
  content: string | undefined,
): ImageDraftExtraction {
  const extension = path.extname(imagePath).toLowerCase();
  const baseName = path.basename(imagePath, extension);
  const notes: string[] = [];
  const rawParts: string[] = [];
  let source: ImageDraftExtraction["source"] = "filename";

  if (extension === ".svg" && content) {
    source = "svg-text";
    const svgText = extractSvgText(content);
    if (svgText.trim()) {
      rawParts.push(svgText);
    } else {
      rawParts.push(baseName);
    }
  } else if (content) {
    rawParts.push(baseName, content);
  } else {
    rawParts.push(baseName);
  }

  const haystack = normalize(rawParts.join(" "));
  if (!haystack.trim()) {
    return {
      source: "unrecognized",
      suggestions: [],
      notes: ["No readable labels were found in the imported image."],
    };
  }

  const suggestions = SERVICE_INDEX.map((service) =>
    scoreService(service, haystack),
  )
    .filter((item): item is ImageDraftSuggestion => item !== undefined)
    .sort((left, right) => right.score - left.score)
    .slice(0, 8);

  if (source === "svg-text") {
    notes.push(
      "Best results come from SVG diagrams with readable text labels or icon names.",
    );
  } else {
    notes.push(
      "Raster images use filename-only heuristics today, so detection confidence is lower.",
    );
  }
  if (!suggestions.length) {
    notes.push(
      "No Azure services were confidently detected. Rename the image with service names or import an SVG with labels for better results.",
    );
  }

  return { source, suggestions, notes };
}

function scoreService(
  service: ServiceIndexEntry,
  haystack: string,
): ImageDraftSuggestion | undefined {
  let score = 0;
  const matchedOn: string[] = [];
  for (const alias of service.aliases) {
    if (!alias) {
      continue;
    }
    if (haystack.includes(alias)) {
      matchedOn.push(alias);
      score = Math.max(score, alias.includes(" ") ? 100 + alias.length : 65);
      continue;
    }
    const aliasTokens = alias.split(" ").filter(Boolean);
    if (
      aliasTokens.length > 1 &&
      aliasTokens.every((token) => haystack.includes(token))
    ) {
      matchedOn.push(alias);
      score = Math.max(score, 70 + aliasTokens.length * 5);
    }
  }
  if (!matchedOn.length) {
    return undefined;
  }
  return {
    serviceType: service.serviceType,
    title: service.title,
    confidence: score >= 95 ? "high" : score >= 75 ? "medium" : "low",
    score,
    matchedOn,
  };
}

function uniqueAliases(service: {
  serviceId: string;
  displayName: string;
  shortName?: string;
  description: string;
}): string[] {
  const values = [
    service.displayName,
    service.serviceId.replaceAll("_", " "),
    ...(EXTRA_ALIASES[service.serviceId] ?? []),
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => normalize(value));
  return [...new Set(values.filter((value) => value.length >= 3))];
}

function extractSvgText(content: string): string {
  const textSegments = [
    ...content.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/gi),
    ...content.matchAll(/<(?:title|desc)[^>]*>([\s\S]*?)<\/(?:title|desc)>/gi),
  ].map((match) => stripTags(match[1]));
  return textSegments.join(" ");
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

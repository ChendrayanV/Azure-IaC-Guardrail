import {
  PDFDocument,
  PDFArray,
  PDFName,
  PDFString,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";
import type { Finding } from "../types";
import type { FileScanResult } from "./resultsHtml";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const colors = {
  navy: rgb(0.04, 0.12, 0.24),
  azure: rgb(0, 0.47, 0.84),
  blueSoft: rgb(0.91, 0.96, 1),
  text: rgb(0.12, 0.15, 0.2),
  muted: rgb(0.39, 0.43, 0.49),
  border: rgb(0.84, 0.87, 0.91),
  surface: rgb(0.97, 0.98, 0.99),
  pass: rgb(0.08, 0.55, 0.31),
  fail: rgb(0.78, 0.12, 0.18),
  warning: rgb(0.88, 0.52, 0.04),
  white: rgb(1, 1, 1),
};

interface ReportFinding extends Finding {
  source: FileScanResult;
}

interface ReportFonts {
  regular: PDFFont;
  bold: PDFFont;
  mono: PDFFont;
}

interface ReportState {
  pdf: PDFDocument;
  page: PDFPage;
  fonts: ReportFonts;
  y: number;
  pageNumber: number;
}

export interface PdfReportOptions {
  workspaceName?: string;
  generatedAt?: Date;
  logo?: Uint8Array;
}

export async function generateScanReportPdf(
  results: FileScanResult[],
  options: PdfReportOptions = {},
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fonts: ReportFonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    mono: await pdf.embedFont(StandardFonts.Courier),
  };
  const state: ReportState = {
    pdf,
    page: pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    fonts,
    y: PAGE_HEIGHT - MARGIN,
    pageNumber: 1,
  };
  const findings = results.flatMap((source) =>
    source.findings.map((finding) => ({ ...finding, source })),
  );
  const generatedAt = options.generatedAt ?? new Date();

  await renderCover(state, results, findings, options, generatedAt);
  renderExecutiveSummary(state, findings);
  renderPriorityActions(state, findings);
  renderDetailedFindings(state, findings);
  addPageNumbers(state);

  pdf.setTitle("Azure IaC Guardrail Scan Report");
  pdf.setAuthor("Azure IaC Guardrail");
  pdf.setSubject("Terraform infrastructure compliance scan");
  pdf.setCreationDate(generatedAt);
  return pdf.save();
}

async function renderCover(
  state: ReportState,
  results: FileScanResult[],
  findings: ReportFinding[],
  options: PdfReportOptions,
  generatedAt: Date,
): Promise<void> {
  const { page, fonts } = state;
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 205,
    width: PAGE_WIDTH,
    height: 205,
    color: colors.navy,
  });
  if (options.logo) {
    const logo = await state.pdf.embedPng(options.logo);
    page.drawImage(logo, {
      x: MARGIN,
      y: PAGE_HEIGHT - 86,
      width: 38,
      height: 38,
    });
  }
  page.drawText("AZURE IaC GUARDRAIL", {
    x: options.logo ? 90 : MARGIN,
    y: PAGE_HEIGHT - 63,
    size: 11,
    font: fonts.bold,
    color: colors.azure,
  });
  page.drawText("Infrastructure Compliance", {
    x: MARGIN,
    y: PAGE_HEIGHT - 126,
    size: 29,
    font: fonts.bold,
    color: colors.white,
  });
  page.drawText("Scan Report", {
    x: MARGIN,
    y: PAGE_HEIGHT - 161,
    size: 29,
    font: fonts.bold,
    color: colors.white,
  });
  page.drawText(safeText(options.workspaceName ?? "Terraform workspace"), {
    x: MARGIN,
    y: PAGE_HEIGHT - 188,
    size: 10,
    font: fonts.regular,
    color: rgb(0.74, 0.8, 0.88),
  });

  const summary = summarize(findings);
  const status =
    summary.noncompliant > 0
      ? "ACTION REQUIRED"
      : summary.unresolved > 0
        ? "REVIEW REQUIRED"
        : "COMPLIANT";
  const statusColor =
    summary.noncompliant > 0
      ? colors.fail
      : summary.unresolved > 0
        ? colors.warning
        : colors.pass;
  page.drawRectangle({
    x: MARGIN,
    y: PAGE_HEIGHT - 270,
    width: CONTENT_WIDTH,
    height: 42,
    color: statusColor,
  });
  page.drawText(status, {
    x: MARGIN + 16,
    y: PAGE_HEIGHT - 254,
    size: 15,
    font: fonts.bold,
    color: colors.white,
  });
  page.drawText(`Compliance score ${summary.score}%`, {
    x: PAGE_WIDTH - MARGIN - 150,
    y: PAGE_HEIGHT - 253,
    size: 11,
    font: fonts.bold,
    color: colors.white,
  });

  drawMetricCards(state, summary);
  state.y = PAGE_HEIGHT - 410;
  drawSectionTitle(state, "Report context");
  drawKeyValue(state, "Generated", formatDate(generatedAt));
  drawKeyValue(state, "Scan mode", scanMode(results));
  drawKeyValue(state, "Sources scanned", String(results.length));
  drawKeyValue(state, "Checks evaluated", String(findings.length));
  drawKeyValue(
    state,
    "Scope",
    results.map((result) => result.filePath).join(", "),
  );
  state.y -= 15;
  drawParagraph(
    state,
    "This report provides a concise evaluation of Terraform controls. Prioritize error findings first, then warnings. Apply-time values are not failures: they identify attributes the provider marks as known only after Azure creates or updates the resource, so post-deployment verification may be required.",
    10,
    colors.muted,
  );
}

function renderExecutiveSummary(
  state: ReportState,
  findings: ReportFinding[],
): void {
  newPage(state);
  drawSectionTitle(state, "Executive summary");
  const summary = summarize(findings);
  drawParagraph(
    state,
    summary.noncompliant > 0
      ? `${summary.noncompliant} control checks require action. ${summary.errors} are errors and ${summary.warnings} are warnings. Address exposed services, weak authentication, and missing encryption or logging controls before deployment.`
      : summary.unresolved > 0
        ? `No confirmed control failures were found. ${summary.unresolved} checks depend on values Terraform marks as known after apply and require post-deployment verification.`
        : "All evaluated controls passed. No remediation is required for the scanned Terraform scope.",
    12,
    colors.text,
  );
  state.y -= 12;

  drawSectionTitle(state, "Risk distribution");
  drawRiskBar(state, "Errors", summary.errors, findings.length, colors.fail);
  drawRiskBar(
    state,
    "Warnings",
    summary.warnings,
    findings.length,
    colors.warning,
  );
  drawRiskBar(
    state,
    "Apply-time / unresolved",
    summary.unresolved,
    findings.length,
    colors.azure,
  );
  drawRiskBar(
    state,
    "Compliant",
    summary.compliant,
    findings.length,
    colors.pass,
  );

  state.y -= 18;
  drawSectionTitle(state, "Affected service families");
  const families = groupBy(
    findings.filter((finding) => finding.outcome !== "compliant"),
    (finding) => serviceFamily(finding.resource.type),
  );
  if (families.size === 0) {
    drawParagraph(state, "No affected service families.", 10, colors.muted);
  } else {
    for (const [family, grouped] of [...families.entries()].sort(
      (a, b) => b[1].length - a[1].length,
    )) {
      drawKeyValue(state, family, `${grouped.length} checks`);
    }
  }
}

function renderPriorityActions(
  state: ReportState,
  findings: ReportFinding[],
): void {
  const actionable = findings
    .filter((finding) => finding.outcome === "noncompliant")
    .sort(compareFindings);
  newPage(state);
  drawSectionTitle(state, "Priority actions");
  if (actionable.length === 0) {
    drawParagraph(
      state,
      "No confirmed non-compliant controls were identified.",
      11,
      colors.pass,
    );
    return;
  }
  drawParagraph(
    state,
    "The following items are ordered by severity for rapid engineering triage.",
    10,
    colors.muted,
  );
  state.y -= 8;
  actionable.slice(0, 12).forEach((finding, index) => {
    drawActionCard(state, finding, index + 1);
  });
}

function renderDetailedFindings(
  state: ReportState,
  findings: ReportFinding[],
): void {
  const relevant = findings
    .filter((finding) => finding.outcome !== "compliant")
    .sort(compareFindings);
  newPage(state);
  drawSectionTitle(state, "Detailed findings");
  if (relevant.length === 0) {
    drawParagraph(
      state,
      "All evaluated controls are compliant.",
      11,
      colors.pass,
    );
    return;
  }
  relevant.forEach((finding) => drawFinding(state, finding));

  const compliant = findings.filter(
    (finding) => finding.outcome === "compliant",
  );
  if (compliant.length > 0) {
    ensureSpace(state, 120);
    drawSectionTitle(state, "Compliant controls");
    drawParagraph(
      state,
      `${compliant.length} checks passed. Compliant controls are summarized rather than expanded to keep this report focused on decisions and remediation.`,
      10,
      colors.muted,
    );
  }
}

function drawMetricCards(
  state: ReportState,
  summary: ReturnType<typeof summarize>,
): void {
  const metrics = [
    ["Evaluated", summary.total, colors.azure],
    ["Compliant", summary.compliant, colors.pass],
    ["Non-compliant", summary.noncompliant, colors.fail],
    ["Unresolved", summary.unresolved, colors.warning],
  ] as const;
  const width = (CONTENT_WIDTH - 24) / 4;
  metrics.forEach(([label, value, color], index) => {
    const x = MARGIN + index * (width + 8);
    state.page.drawRectangle({
      x,
      y: PAGE_HEIGHT - 350,
      width,
      height: 62,
      color: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
    });
    state.page.drawRectangle({
      x,
      y: PAGE_HEIGHT - 350,
      width: 4,
      height: 62,
      color,
    });
    state.page.drawText(String(value), {
      x: x + 13,
      y: PAGE_HEIGHT - 318,
      size: 19,
      font: state.fonts.bold,
      color: colors.text,
    });
    state.page.drawText(label, {
      x: x + 13,
      y: PAGE_HEIGHT - 340,
      size: 8,
      font: state.fonts.regular,
      color: colors.muted,
    });
  });
}

function drawActionCard(
  state: ReportState,
  finding: ReportFinding,
  index: number,
): void {
  const remediation =
    finding.control.remediation ?? "Review and remediate this control.";
  const titleLines = wrapText(
    finding.control.title,
    state.fonts.bold,
    10,
    415,
  );
  const remediationLines = wrapText(
    remediation,
    state.fonts.regular,
    9,
    430,
  );
  const height = Math.max(
    82,
    48 + titleLines.length * 12 + remediationLines.length * 11,
  );
  ensureSpace(state, height + 12);
  const y = state.y - height;
  const accent =
    finding.control.severity === "error" ? colors.fail : colors.warning;
  state.page.drawRectangle({
    x: MARGIN,
    y,
    width: CONTENT_WIDTH,
    height,
    color: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  });
  state.page.drawRectangle({
    x: MARGIN,
    y,
    width: 5,
    height,
    color: accent,
  });
  state.page.drawText(String(index).padStart(2, "0"), {
    x: MARGIN + 15,
    y: state.y - 27,
    size: 12,
    font: state.fonts.bold,
    color: accent,
  });
  state.page.drawText(safeText(finding.control.id), {
    x: MARGIN + 48,
    y: state.y - 18,
    size: 8,
    font: state.fonts.mono,
    color: colors.muted,
  });
  let cursor = drawTextLinesAt(
    state,
    titleLines,
    MARGIN + 48,
    state.y - 34,
    10,
    state.fonts.bold,
    colors.text,
    12,
  );
  cursor -= 6;
  drawTextLinesAt(
    state,
    remediationLines,
    MARGIN + 48,
    cursor,
    9,
    state.fonts.regular,
    colors.muted,
    11,
  );
  state.y = y - 10;
}

function drawFinding(state: ReportState, finding: ReportFinding): void {
  const remediation =
    finding.outcome === "unresolved"
      ? "Verify after deployment because Terraform marks the relationship or value as known after apply."
      : finding.control.remediation;
  const innerWidth = CONTENT_WIDTH - 24;
  const titleLines = wrapText(
    finding.control.title,
    state.fonts.bold,
    11,
    innerWidth,
  );
  const descriptionLines = wrapText(
    finding.control.description,
    state.fonts.regular,
    9,
    innerWidth,
  );
  const resource =
    finding.resource.address ??
    `${finding.resource.type}.${finding.resource.name}`;
  const resourceLines = wrapText(
    `Resource: ${resource}`,
    state.fonts.mono,
    8,
    innerWidth,
  );
  const valueColumnWidth = (innerWidth - 18) / 2;
  const observedLines = wrapText(
    `Observed: ${formatValue(finding.actual)}`,
    state.fonts.mono,
    8,
    valueColumnWidth,
  );
  const expectedLines = wrapText(
    `Expected: ${formatValue(finding.expected)}`,
    state.fonts.mono,
    8,
    valueColumnWidth,
  );
  const valueLineCount = Math.max(
    observedLines.length,
    expectedLines.length,
  );
  const remediationLines = remediation
    ? wrapText(
        `Remediation: ${remediation}`,
        state.fonts.regular,
        9,
        CONTENT_WIDTH - 40,
      )
    : [];
  const linksHeight =
    finding.control.reference || finding.control.benchmarkReference
      ? 18
      : 0;
  const remediationHeight =
    remediationLines.length > 0
      ? remediationLines.length * 11 + 16
      : 0;
  const height =
    28 +
    14 +
    titleLines.length * 13 +
    4 +
    descriptionLines.length * 11 +
    8 +
    resourceLines.length * 10 +
    7 +
    valueLineCount * 10 +
    (remediationHeight > 0 ? 10 + remediationHeight : 0) +
    linksHeight +
    10;
  ensureSpace(state, height + 14);
  const y = state.y - height;
  const accent =
    finding.outcome === "unresolved"
      ? colors.azure
      : finding.control.severity === "error"
        ? colors.fail
        : colors.warning;
  state.page.drawRectangle({
    x: MARGIN,
    y,
    width: CONTENT_WIDTH,
    height,
    color: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
  });
  state.page.drawRectangle({
    x: MARGIN,
    y: state.y - 28,
    width: CONTENT_WIDTH,
    height: 28,
    color: accent,
  });
  state.page.drawText(finding.control.id, {
    x: MARGIN + 12,
    y: state.y - 18,
    size: 9,
    font: state.fonts.bold,
    color: colors.white,
  });
  state.page.drawText(
    finding.outcome === "unresolved"
      ? "APPLY-TIME VALUE"
      : finding.control.severity.toUpperCase(),
    {
      x: PAGE_WIDTH - MARGIN - 96,
      y: state.y - 18,
      size: 8,
      font: state.fonts.bold,
      color: colors.white,
    },
  );
  let cursor = state.y - 45;
  cursor = drawTextLinesAt(
    state,
    titleLines,
    MARGIN + 12,
    cursor,
    11,
    state.fonts.bold,
    colors.text,
    13,
  );
  cursor -= 4;
  cursor = drawTextLinesAt(
    state,
    descriptionLines,
    MARGIN + 12,
    cursor,
    9,
    state.fonts.regular,
    colors.muted,
    11,
  );
  cursor -= 8;
  cursor = drawTextLinesAt(
    state,
    resourceLines,
    MARGIN + 12,
    cursor,
    8,
    state.fonts.mono,
    colors.text,
    10,
  );
  cursor -= 7;
  drawTextLinesAt(
    state,
    observedLines,
    MARGIN + 12,
    cursor,
    8,
    state.fonts.mono,
    colors.muted,
    10,
  );
  drawTextLinesAt(
    state,
    expectedLines,
    MARGIN + 12 + valueColumnWidth + 18,
    cursor,
    8,
    state.fonts.mono,
    colors.muted,
    10,
  );
  cursor -= valueLineCount * 10;
  if (remediation) {
    cursor -= 10;
    state.page.drawRectangle({
      x: MARGIN + 12,
      y: cursor - remediationHeight + 11,
      width: CONTENT_WIDTH - 24,
      height: remediationHeight,
      color: colors.blueSoft,
    });
    cursor = drawTextLinesAt(
      state,
      remediationLines,
      MARGIN + 20,
      cursor - 2,
      9,
      state.fonts.regular,
      colors.text,
      11,
    );
  }
  const linkY = y + 8;
  if (finding.control.reference) {
    addLink(
      state,
      finding.control.reference,
      "Microsoft guidance",
      MARGIN + 12,
      linkY,
      92,
      10,
    );
  }
  if (finding.control.benchmarkReference) {
    addLink(
      state,
      finding.control.benchmarkReference,
      "Aqua AVD rule",
      MARGIN + 118,
      linkY,
      72,
      10,
    );
  }
  state.y = y - 12;
}

function drawSectionTitle(state: ReportState, title: string): void {
  ensureSpace(state, 40);
  state.page.drawText(title, {
    x: MARGIN,
    y: state.y,
    size: 17,
    font: state.fonts.bold,
    color: colors.navy,
  });
  state.page.drawRectangle({
    x: MARGIN,
    y: state.y - 9,
    width: 42,
    height: 3,
    color: colors.azure,
  });
  state.y -= 30;
}

function drawParagraph(
  state: ReportState,
  text: string,
  size: number,
  color: ReturnType<typeof rgb>,
): void {
  const lines = wrapText(text, state.fonts.regular, size, CONTENT_WIDTH);
  ensureSpace(state, lines.length * (size + 4));
  for (const line of lines) {
    state.page.drawText(line, {
      x: MARGIN,
      y: state.y,
      size,
      font: state.fonts.regular,
      color,
    });
    state.y -= size + 4;
  }
}

function drawKeyValue(
  state: ReportState,
  label: string,
  value: string,
): void {
  const lines = wrapText(value, state.fonts.regular, 9, CONTENT_WIDTH - 115);
  ensureSpace(state, Math.max(18, lines.length * 11));
  state.page.drawText(label, {
    x: MARGIN,
    y: state.y,
    size: 9,
    font: state.fonts.bold,
    color: colors.muted,
  });
  lines.forEach((line, index) => {
    state.page.drawText(line, {
      x: MARGIN + 115,
      y: state.y - index * 11,
      size: 9,
      font: state.fonts.regular,
      color: colors.text,
    });
  });
  state.y -= Math.max(18, lines.length * 11 + 3);
}

function drawRiskBar(
  state: ReportState,
  label: string,
  value: number,
  total: number,
  color: ReturnType<typeof rgb>,
): void {
  ensureSpace(state, 28);
  state.page.drawText(label, {
    x: MARGIN,
    y: state.y,
    size: 9,
    font: state.fonts.regular,
    color: colors.text,
  });
  state.page.drawText(String(value), {
    x: PAGE_WIDTH - MARGIN - 20,
    y: state.y,
    size: 9,
    font: state.fonts.bold,
    color,
  });
  state.page.drawRectangle({
    x: MARGIN,
    y: state.y - 12,
    width: CONTENT_WIDTH,
    height: 6,
    color: colors.border,
  });
  state.page.drawRectangle({
    x: MARGIN,
    y: state.y - 12,
    width: total === 0 ? 0 : CONTENT_WIDTH * (value / total),
    height: 6,
    color,
  });
  state.y -= 30;
}

function drawTextLinesAt(
  state: ReportState,
  lines: string[],
  x: number,
  y: number,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>,
  lineHeight: number,
): number {
  lines.forEach((line, index) => {
    state.page.drawText(line, {
      x,
      y: y - index * lineHeight,
      size,
      font,
      color,
    });
  });
  return y - lines.length * lineHeight;
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  width: number,
): string[] {
  const words = safeText(text).replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) {
      line = candidate;
      continue;
    }
    if (line) {
      lines.push(line);
    }
    if (font.widthOfTextAtSize(word, size) <= width) {
      line = word;
      continue;
    }
    const chunks = splitLongWord(word, font, size, width);
    lines.push(...chunks.slice(0, -1));
    line = chunks.at(-1) ?? "";
  }
  if (line) {
    lines.push(line);
  }
  return lines.length > 0 ? lines : [""];
}

function splitLongWord(
  word: string,
  font: PDFFont,
  size: number,
  width: number,
): string[] {
  const chunks: string[] = [];
  let chunk = "";
  for (const character of word) {
    const candidate = `${chunk}${character}`;
    if (chunk && font.widthOfTextAtSize(candidate, size) > width) {
      chunks.push(chunk);
      chunk = character;
    } else {
      chunk = candidate;
    }
  }
  if (chunk) {
    chunks.push(chunk);
  }
  return chunks;
}

function ensureSpace(state: ReportState, required: number): void {
  if (state.y - required < MARGIN + 24) {
    newPage(state);
  }
}

function newPage(state: ReportState): void {
  state.page = state.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  state.pageNumber += 1;
  state.y = PAGE_HEIGHT - MARGIN;
  state.page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 18,
    width: PAGE_WIDTH,
    height: 18,
    color: colors.navy,
  });
}

function addPageNumbers(state: ReportState): void {
  const pages = state.pdf.getPages();
  pages.forEach((page, index) => {
    page.drawText(`Azure IaC Guardrail  |  ${index + 1} / ${pages.length}`, {
      x: MARGIN,
      y: 20,
      size: 7,
      font: state.fonts.regular,
      color: colors.muted,
    });
  });
}

function addLink(
  state: ReportState,
  url: string,
  label: string,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const annotation = state.pdf.context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: [x, y, x + width, y + height],
    Border: [0, 0, 0],
    A: {
      Type: "Action",
      S: "URI",
      URI: PDFString.of(url),
    },
  });
  const annotationRef = state.pdf.context.register(annotation);
  const annotations = state.page.node.lookupMaybe(
    PDFName.of("Annots"),
    PDFArray,
  );
  if (annotations) {
    annotations.push(annotationRef);
  } else {
    state.page.node.set(
      PDFName.of("Annots"),
      state.pdf.context.obj([annotationRef]),
    );
  }
  state.page.drawText(label, {
    x,
    y,
    size: 7,
    font: state.fonts.regular,
    color: colors.azure,
  });
}

function summarize(findings: ReportFinding[]) {
  const compliant = findings.filter(
    (finding) => finding.outcome === "compliant",
  ).length;
  const noncompliant = findings.filter(
    (finding) => finding.outcome === "noncompliant",
  );
  const unresolved = findings.filter(
    (finding) => finding.outcome === "unresolved",
  ).length;
  const evaluated = compliant + noncompliant.length;
  return {
    total: findings.length,
    compliant,
    noncompliant: noncompliant.length,
    unresolved,
    errors: noncompliant.filter(
      (finding) => finding.control.severity === "error",
    ).length,
    warnings: noncompliant.filter(
      (finding) => finding.control.severity === "warning",
    ).length,
    score:
      evaluated === 0 ? 100 : Math.round((compliant / evaluated) * 100),
  };
}

function compareFindings(a: ReportFinding, b: ReportFinding): number {
  const rank = { error: 0, warning: 1, information: 2 };
  if (a.outcome !== b.outcome) {
    return a.outcome === "noncompliant" ? -1 : 1;
  }
  return (
    rank[a.control.severity] - rank[b.control.severity] ||
    a.control.id.localeCompare(b.control.id)
  );
}

function serviceFamily(resourceType: string): string {
  return resourceType
    .replace(/^azurerm_/, "")
    .split("_")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function groupBy<T>(
  values: T[],
  keyFor: (value: T) => string,
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const value of values) {
    const key = keyFor(value);
    groups.set(key, [...(groups.get(key) ?? []), value]);
  }
  return groups;
}

function scanMode(results: FileScanResult[]): string {
  const kinds = new Set(results.map((result) => result.scanKind));
  if (kinds.size > 1) {
    return "Static Terraform and resolved plan";
  }
  return kinds.has("plan") ? "Resolved Terraform plan" : "Static Terraform";
}

function formatDate(date: Date): string {
  return date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

function formatValue(value: unknown): string {
  if (value === undefined) {
    return "Not resolved";
  }
  return typeof value === "string" ? value : JSON.stringify(value);
}

function safeText(value: string): string {
  return value
    .replaceAll("\u2013", "-")
    .replaceAll("\u2014", "-")
    .replaceAll("\u2018", "'")
    .replaceAll("\u2019", "'")
    .replaceAll("\u201c", '"')
    .replaceAll("\u201d", '"')
    .replace(/[^\x20-\x7E]/g, "?");
}

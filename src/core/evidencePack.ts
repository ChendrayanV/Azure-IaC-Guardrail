import type { WorkspacePolicyProfile } from "../controls/workspacePolicy";
import type { PlanAnalysis } from "../types";
import type { FileScanResult } from "./resultsHtml";

export interface EvidencePack {
  json: string;
  markdown: string;
}

interface EvidenceFinding {
  source: string;
  scanKind: string;
  outcome: string;
  controlId: string;
  title: string;
  severity: string;
  resource: string;
  observed: unknown;
  expected: unknown;
  remediation?: string;
  reference?: string;
  benchmarkReference?: string;
}

interface EvidenceException {
  controlId: string;
  owner: string;
  expiresOn: string;
  justification: string;
  ticket?: string;
  status: "active" | "expired";
}

export function generateEvidencePack(
  results: FileScanResult[],
  options: {
    workspaceName?: string;
    generatedAt?: Date;
    profile?: WorkspacePolicyProfile;
  } = {},
): EvidencePack {
  const generatedAt = options.generatedAt ?? new Date();
  const findings: EvidenceFinding[] = results.flatMap((result) =>
    result.findings.map((finding) => ({
      source: result.filePath,
      scanKind: result.scanKind,
      outcome: finding.outcome,
      controlId: finding.control.id,
      title: finding.control.title,
      severity: finding.control.severity,
      resource:
        finding.resource.address ??
        `${finding.resource.type}.${finding.resource.name}`,
      observed: finding.actual,
      expected: finding.expected,
      remediation: finding.control.remediation,
      reference: finding.control.reference,
      benchmarkReference: finding.control.benchmarkReference,
    })),
  );
  const summary = {
    total: findings.length,
    compliant: findings.filter((finding) => finding.outcome === "compliant")
      .length,
    noncompliant: findings.filter(
      (finding) => finding.outcome === "noncompliant",
    ).length,
    unresolved: findings.filter(
      (finding) => finding.outcome === "unresolved",
    ).length,
  };
  const architectureRisk = results.find(
    (result) => result.analysis,
  )?.analysis;
  const governedExceptions: EvidenceException[] = (
    options.profile?.exceptions ?? []
  ).map((exception) => ({
    ...exception,
    status:
      new Date(`${exception.expiresOn}T23:59:59.999Z`) < generatedAt
        ? "expired"
        : "active",
  }));
  const document = {
    schemaVersion: "1.0",
    report: {
      title: "Azure IaC Guardrail Auditor Evidence Pack",
      workspace: options.workspaceName ?? "Terraform workspace",
      generatedAt: generatedAt.toISOString(),
      localOnly: true,
    },
    summary,
    architectureRisk,
    policy: {
      requiredTags: options.profile?.requiredTags ?? [],
      enforcedTagValues: options.profile?.tagValues ?? {},
      directSkips: options.profile?.skippedControlIds ?? [],
      governedExceptions,
    },
    findings,
  };

  return {
    json: `${JSON.stringify(document, null, 2)}\n`,
    markdown: renderMarkdown({
      workspace: document.report.workspace,
      generatedAt: document.report.generatedAt,
      summary,
      architectureRisk,
      governedExceptions,
      findings,
    }),
  };
}

function renderMarkdown(document: {
  workspace: string;
  generatedAt: string;
  summary: {
    total: number;
    compliant: number;
    noncompliant: number;
    unresolved: number;
  };
  architectureRisk?: PlanAnalysis;
  governedExceptions: EvidenceException[];
  findings: EvidenceFinding[];
}): string {
  return [
    "# Azure IaC Guardrail Auditor Evidence Pack",
    "",
    `- Workspace: ${document.workspace}`,
    `- Generated: ${document.generatedAt}`,
    "- Execution: Local-only; no Azure tenant authentication",
    `- Checks evaluated: ${document.summary.total}`,
    `- Compliant: ${document.summary.compliant}`,
    `- Non-compliant: ${document.summary.noncompliant}`,
    `- Unresolved: ${document.summary.unresolved}`,
    `- Architecture risk score: ${document.architectureRisk?.riskScore ?? "Not available"}`,
    "",
    "## Governed Exceptions",
    "",
    ...(document.governedExceptions.length
      ? document.governedExceptions.map(
          (exception) =>
            `- ${exception.controlId}: ${exception.status}; owner ${exception.owner}; expires ${exception.expiresOn}; ${exception.justification}${exception.ticket ? `; ticket ${exception.ticket}` : ""}`,
        )
      : ["No governed exceptions recorded."]),
    "",
    "## Findings",
    "",
    "| Outcome | Control | Severity | Resource |",
    "|---|---|---|---|",
    ...document.findings.map(
      (finding) =>
        `| ${finding.outcome} | ${finding.controlId} | ${finding.severity} | ${finding.resource.replaceAll("|", "\\|")} |`,
    ),
    "",
  ].join("\n");
}

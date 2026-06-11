import * as vscode from "vscode";
import type { Control, Finding } from "../types";

export class TerraformLanguageFeatures implements vscode.Disposable {
  private readonly diagnostics =
    vscode.languages.createDiagnosticCollection("azureIacGuardrail");
  private controls: Control[] = [];
  private findings = new Map<string, Finding[]>();

  constructor(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      this.diagnostics,
      vscode.languages.registerHoverProvider(
        terraformDocumentSelector(),
        { provideHover: (document, position) => this.hover(document, position) },
      ),
      vscode.languages.registerCodeActionsProvider(
        terraformDocumentSelector(),
        { provideCodeActions: (document, range) => this.actions(document, range) },
        { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] },
      ),
      vscode.languages.registerCompletionItemProvider(
        { language: "terraform", scheme: "file" },
        {
          provideCompletionItems: (document, position) =>
            this.completions(document, position),
        },
        " ",
        "=",
        '"',
      ),
    );
  }

  dispose(): void {
    this.diagnostics.dispose();
  }

  setControls(controls: Control[]): void {
    this.controls = controls;
  }

  update(uri: vscode.Uri, findings: Finding[]): void {
    this.findings.set(uri.toString(), findings);
    this.diagnostics.set(
      uri,
      editorFindings(findings).map((entry) => {
          if ("planCount" in entry) {
            const diagnostic = new vscode.Diagnostic(
              new vscode.Range(
                entry.line,
                0,
                entry.line,
                1,
              ),
              `${entry.planCount} checks need a resolved Terraform plan. Static scanning found no editable value yet.`,
              vscode.DiagnosticSeverity.Information,
            );
            diagnostic.source = "Azure IaC Guardrail";
            diagnostic.code = "PLAN REQUIRED";
            return diagnostic;
          }
          const finding = entry;
          const diagnostic = new vscode.Diagnostic(
            new vscode.Range(
              finding.line,
              finding.startCharacter,
              finding.line,
              Math.max(finding.startCharacter + 1, finding.endCharacter),
            ),
            diagnosticMessage(finding),
            finding.outcome === "noncompliant"
              ? severity(finding.control.severity)
              : vscode.DiagnosticSeverity.Information,
          );
          diagnostic.source = "Azure IaC Guardrail";
          diagnostic.code = finding.control.id;
          diagnostic.relatedInformation = relatedInformation(finding, uri);
          return diagnostic;
        }),
    );
  }

  clear(uri: vscode.Uri): void {
    this.findings.delete(uri.toString());
    this.diagnostics.delete(uri);
  }

  replace(entries: Map<string, Finding[]>): void {
    this.findings.clear();
    this.diagnostics.clear();
    for (const [uri, findings] of entries) {
      this.update(vscode.Uri.parse(uri), findings);
    }
  }

  private hover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.Hover | undefined {
    const finding = (this.findings.get(document.uri.toString()) ?? []).find(
      (item) => item.line === position.line,
    );
    if (!finding) {
      return undefined;
    }
    const markdown = new vscode.MarkdownString(undefined, true);
    markdown.appendMarkdown(`### ${finding.control.title}\n\n`);
    markdown.appendMarkdown(`${plainOutcome(finding)}\n\n`);
    markdown.appendMarkdown(`**Current value:** \`${display(finding.actual)}\`  \n`);
    markdown.appendMarkdown(`**Required value:** \`${display(finding.expected)}\``);
    if (finding.resolvedFrom) {
      markdown.appendMarkdown(
        `  \n**Where this value comes from:** \`${finding.resolvedFrom}\``,
      );
    }
    if (finding.control.remediation) {
      markdown.appendMarkdown(
        `\n\n**How to fix it:** ${finding.control.remediation}`,
      );
    }
    markdown.appendMarkdown(
      `\n\n<sub>${finding.control.id} · Azure IaC Guardrail</sub>`,
    );
    return new vscode.Hover(markdown);
  }

  private actions(
    document: vscode.TextDocument,
    range: vscode.Range,
  ): vscode.CodeAction[] {
    const finding = (this.findings.get(document.uri.toString()) ?? []).find(
      (item) => item.line >= range.start.line && item.line <= range.end.line,
    );
    if (!finding) {
      return [];
    }
    const actions: vscode.CodeAction[] = [];
    const automaticFix = this.fixAction(document, finding);
    if (automaticFix) {
      actions.push(automaticFix);
    }
    const rescan = new vscode.CodeAction(
      "Rescan Azure requirements",
      vscode.CodeActionKind.QuickFix,
    );
    rescan.command = {
      command: "infraCompliance.scanWorkspace",
      title: rescan.title,
    };
    const plan = new vscode.CodeAction(
      "Check the resolved value with a Terraform plan",
      vscode.CodeActionKind.QuickFix,
    );
    plan.command = {
      command: "infraCompliance.createAndScanPlan",
      title: plan.title,
    };
    const configure = new vscode.CodeAction(
      "Choose environment variable files",
      vscode.CodeActionKind.QuickFix,
    );
    configure.command = {
      command: "infraCompliance.configureStaticVariables",
      title: configure.title,
    };
    if (finding.control.id === "IAC-MODULE-001") {
      const initialize = new vscode.CodeAction(
        "Download module source and rescan",
        vscode.CodeActionKind.QuickFix,
      );
      initialize.command = {
        command: "infraCompliance.initializeAndScanWorkspace",
        title: initialize.title,
      };
      return [initialize, plan, rescan];
    }
    return finding.outcome === "unresolved"
      ? [...actions, configure, plan, rescan]
      : [...actions, rescan, plan];
  }

  private fixAction(
    document: vscode.TextDocument,
    finding: Finding,
  ): vscode.CodeAction | undefined {
    if (!finding.fix) {
      return undefined;
    }
    const value = terraformValue(finding.fix.value);
    const action = new vscode.CodeAction(
      finding.fix.kind === "insert-attribute"
        ? `Add ${finding.fix.attribute} = ${value}`
        : `Change value to ${value}`,
      vscode.CodeActionKind.QuickFix,
    );
    const edit = new vscode.WorkspaceEdit();
    if (finding.fix.kind === "replace-value") {
      const line = document.lineAt(finding.line);
      const equals = line.text.indexOf("=");
      if (equals < 0) {
        return undefined;
      }
      const comment = inlineCommentStart(line.text, equals + 1);
      edit.replace(
        document.uri,
        new vscode.Range(
          finding.line,
          equals + 1,
          finding.line,
          comment < 0 ? line.text.length : comment,
        ),
        ` ${value}${comment < 0 ? "" : " "}`,
      );
    } else {
      const resourceLine = document.lineAt(finding.resource.startLine);
      const indentation =
        resourceLine.text.match(/^\s*/)?.[0] ?? "";
      edit.insert(
        document.uri,
        new vscode.Position(finding.resource.startLine + 1, 0),
        `${indentation}  ${finding.fix.attribute} = ${value}\n`,
      );
    }
    action.edit = edit;
    action.isPreferred = true;
    return action;
  }

  private completions(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.CompletionItem[] {
    const context = enclosingTerraformContext(document, position.line);
    if (!context) {
      return [];
    }
    const seen = new Set<string>();
    return this.controls
      .flatMap((control) => {
        if (!control.resourceTypes.includes(context.resourceType)) {
          return [];
        }
        const attribute = completionAttribute(
          control.attribute,
          context.blockPath,
        );
        return attribute ? [{ control, attribute }] : [];
      })
      .flatMap((control) => {
        const expected = Array.isArray(control.control.expected)
          ? control.control.expected
          : control.control.expected === undefined
            ? []
            : [control.control.expected];
        return expected.flatMap((value) => {
          const key = `${control.attribute}:${String(value)}`;
          if (seen.has(key)) {
            return [];
          }
          seen.add(key);
          const item = new vscode.CompletionItem(
            humanAttribute(control.attribute),
            vscode.CompletionItemKind.Property,
          );
          item.insertText = `${control.attribute} = ${terraformValue(value)}`;
          item.filterText = control.attribute;
          item.sortText = `${severityOrder(control.control.severity)}-${control.attribute}`;
          item.detail = `Recommended: ${control.attribute} = ${terraformValue(value)}`;
          const documentation = new vscode.MarkdownString();
          documentation.appendMarkdown(`**${control.control.title}**\n\n`);
          documentation.appendMarkdown(`${control.control.description}\n\n`);
          if (control.control.remediation) {
            documentation.appendMarkdown(`**Why:** ${control.control.remediation}\n\n`);
          }
          documentation.appendMarkdown(`<sub>${control.control.id}</sub>`);
          item.documentation = documentation;
          return [item];
        });
      });
  }
}

function terraformDocumentSelector(): vscode.DocumentSelector {
  return [
    { language: "terraform", scheme: "file" },
    { language: "terraform-vars", scheme: "file" },
    { pattern: "**/*.tfvars", scheme: "file" },
    { pattern: "**/*.tfvars.json", scheme: "file" },
  ];
}

function editorFindings(
  findings: Finding[],
): Array<Finding | { line: number; planCount: number }> {
  const visible = findings.filter(
    (finding) =>
      finding.outcome !== "compliant" &&
      !(
        finding.outcome === "unresolved" &&
        finding.control.planOnly &&
        finding.actual === undefined
      ),
  );
  const planGroups = new Map<number, number>();
  for (const finding of findings) {
    if (
      finding.outcome === "unresolved" &&
      finding.control.planOnly &&
      finding.actual === undefined
    ) {
      planGroups.set(
        finding.resource.startLine,
        (planGroups.get(finding.resource.startLine) ?? 0) + 1,
      );
    }
  }
  return [
    ...visible,
    ...[...planGroups].map(([line, planCount]) => ({
      line,
      planCount,
    })),
  ];
}

function diagnosticMessage(finding: Finding): string {
  if (finding.outcome === "unresolved") {
    return `Needs more information: ${finding.control.title}`;
  }
  if (finding.fix?.kind === "replace-value") {
    return `${finding.control.title}. Change this value to ${display(finding.fix.value)}.`;
  }
  if (finding.fix?.kind === "insert-attribute") {
    return `${finding.control.title}. Add ${finding.fix.attribute} = ${display(finding.fix.value)}.`;
  }
  return `${finding.control.title}. ${finding.control.remediation ?? "Review this setting."}`;
}

function plainOutcome(finding: Finding): string {
  if (finding.outcome === "unresolved") {
    return "Guardrail cannot confirm this requirement from the current files. Choose the applicable environment values or run a local plan.";
  }
  return finding.fix
    ? "This setting does not meet the Azure requirement. A safe suggested value is available below."
    : "This setting does not meet the Azure requirement and needs review.";
}

function relatedInformation(
  finding: Finding,
  uri: vscode.Uri,
): vscode.DiagnosticRelatedInformation[] | undefined {
  if (!finding.resolvedFrom || uri.toString() === finding.resource.sourceUri) {
    return undefined;
  }
  return [
    new vscode.DiagnosticRelatedInformation(
      new vscode.Location(
        vscode.Uri.parse(finding.resource.sourceUri ?? uri.toString()),
        new vscode.Position(finding.resource.startLine, 0),
      ),
      `Used by ${finding.resource.type}.${finding.resource.name}`,
    ),
  ];
}

function inlineCommentStart(line: string, start: number): number {
  const hash = line.indexOf("#", start);
  const slash = line.indexOf("//", start);
  if (hash < 0) return slash;
  if (slash < 0) return hash;
  return Math.min(hash, slash);
}

function humanAttribute(attribute: string): string {
  return attribute
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function severityOrder(value: Control["severity"]): string {
  return value === "error" ? "0" : value === "warning" ? "1" : "2";
}

function enclosingTerraformContext(
  document: vscode.TextDocument,
  lineNumber: number,
): { resourceType: string; blockPath: string[] } | undefined {
  let resourceType: string | undefined;
  let resourceDepth = -1;
  let depth = 0;
  let blocks: Array<{ name: string; depth: number }> = [];
  for (let line = 0; line <= lineNumber; line += 1) {
    const text = document.lineAt(line).text;
    const match = text.match(
      /^\s*resource\s+"([^"]+)"\s+"[^"]+"\s*\{/,
    );
    if (match) {
      resourceType = match[1];
      resourceDepth = depth;
      blocks = [];
    } else if (resourceType) {
      const block = text.match(
        /^\s*([A-Za-z][A-Za-z0-9_-]*)(?:\s+"[^"]+")?\s*\{/,
      );
      if (block) {
        blocks.push({ name: block[1], depth });
      }
    }
    depth += braceDelta(text);
    blocks = blocks.filter((block) => block.depth < depth);
    if (resourceType && depth <= resourceDepth) {
      resourceType = undefined;
      resourceDepth = -1;
      blocks = [];
    }
  }
  return resourceType
    ? {
        resourceType,
        blockPath: blocks.map((block) => block.name),
      }
    : undefined;
}

function completionAttribute(
  attribute: string,
  blockPath: string[],
): string | undefined {
  const segments = attribute.split(".");
  if (blockPath.length === 0) {
    return segments.length === 1 ? attribute : undefined;
  }
  if (
    segments.length !== blockPath.length + 1 ||
    blockPath.some((block, index) => segments[index] !== block)
  ) {
    return undefined;
  }
  return segments.at(-1);
}

function braceDelta(line: string): number {
  const code = line.replace(/#.*$/, "").replace(/\/\/.*$/, "");
  return (code.match(/\{/g) ?? []).length - (code.match(/\}/g) ?? []).length;
}

function severity(value: Control["severity"]): vscode.DiagnosticSeverity {
  return value === "error"
    ? vscode.DiagnosticSeverity.Error
    : value === "warning"
      ? vscode.DiagnosticSeverity.Warning
      : vscode.DiagnosticSeverity.Information;
}

function display(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function terraformValue(value: unknown): string {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

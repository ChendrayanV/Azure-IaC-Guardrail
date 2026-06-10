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
        { language: "terraform", scheme: "file" },
        { provideHover: (document, position) => this.hover(document, position) },
      ),
      vscode.languages.registerCodeActionsProvider(
        { language: "terraform", scheme: "file" },
        { provideCodeActions: (document, range) => this.actions(document, range) },
        { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] },
      ),
      vscode.languages.registerCompletionItemProvider(
        { language: "terraform", scheme: "file" },
        { provideCompletionItems: () => this.completions() },
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
      findings
        .filter((finding) => finding.outcome !== "compliant")
        .map((finding) => {
          const diagnostic = new vscode.Diagnostic(
            new vscode.Range(
              finding.line,
              finding.startCharacter,
              finding.line,
              Math.max(finding.startCharacter + 1, finding.endCharacter),
            ),
            `${finding.control.id}: ${finding.control.title}`,
            finding.outcome === "noncompliant"
              ? severity(finding.control.severity)
              : vscode.DiagnosticSeverity.Information,
          );
          diagnostic.source = "Azure IaC Guardrail";
          diagnostic.code = finding.control.id;
          return diagnostic;
        }),
    );
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
    markdown.appendMarkdown(`**${finding.control.id}: ${finding.control.title}**\n\n`);
    markdown.appendMarkdown(`${finding.control.description}\n\n`);
    markdown.appendMarkdown(`Outcome: **${finding.outcome}**  \n`);
    markdown.appendMarkdown(`Observed: \`${display(finding.actual)}\`  \n`);
    markdown.appendMarkdown(`Expected: \`${display(finding.expected)}\``);
    if (finding.resolvedFrom) {
      markdown.appendMarkdown(`  \nResolved from: \`${finding.resolvedFrom}\``);
    }
    if (finding.control.remediation) {
      markdown.appendMarkdown(`\n\n${finding.control.remediation}`);
    }
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
    const rescan = new vscode.CodeAction(
      "Azure IaC Guardrail: Rescan Terraform files",
      vscode.CodeActionKind.QuickFix,
    );
    rescan.command = {
      command: "infraCompliance.scanWorkspace",
      title: rescan.title,
    };
    const plan = new vscode.CodeAction(
      "Azure IaC Guardrail: Resolve with a Terraform plan",
      vscode.CodeActionKind.QuickFix,
    );
    plan.command = {
      command: "infraCompliance.createAndScanPlan",
      title: plan.title,
    };
    const configure = new vscode.CodeAction(
      "Azure IaC Guardrail: Select static variable files",
      vscode.CodeActionKind.QuickFix,
    );
    configure.command = {
      command: "infraCompliance.configureStaticVariables",
      title: configure.title,
    };
    return finding.outcome === "unresolved"
      ? [configure, plan, rescan]
      : [rescan, plan];
  }

  private completions(): vscode.CompletionItem[] {
    const seen = new Set<string>();
    return this.controls.flatMap((control) => {
      const expected = Array.isArray(control.expected)
        ? control.expected
        : control.expected === undefined
          ? []
          : [control.expected];
      return expected.flatMap((value) => {
        const key = `${control.attribute}:${String(value)}`;
        if (seen.has(key)) {
          return [];
        }
        seen.add(key);
        const item = new vscode.CompletionItem(
          `${control.attribute} = ${terraformValue(value)}`,
          vscode.CompletionItemKind.Value,
        );
        item.insertText = `${control.attribute} = ${terraformValue(value)}`;
        item.detail = `${control.id}: ${control.title}`;
        item.documentation = new vscode.MarkdownString(control.description);
        return [item];
      });
    });
  }
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

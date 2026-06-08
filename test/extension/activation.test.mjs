import assert from "node:assert/strict";
import * as vscode from "vscode";

suite("Azure IaC Guardrail extension", () => {
  test("activates and registers the workspace scan command", async () => {
    const extension = vscode.extensions.getExtension(
      "your-publisher.azure-iac-guardrail",
    );

    assert.ok(extension, "Development extension was not discovered");
    await extension.activate();

    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("infraCompliance.scanWorkspace"));
    assert.ok(commands.includes("infraCompliance.scanPlan"));
    assert.ok(commands.includes("infraCompliance.createAndScanPlan"));
    assert.ok(commands.includes("infraCompliance.exportPdf"));
    assert.ok(commands.includes("infraCompliance.exportEvidence"));
    assert.ok(commands.includes("infraCompliance.analyzePrChanges"));
    assert.ok(commands.includes("infraCompliance.configureWorkspace"));
  });

  test("opens the results pane after a Terraform file scan", async () => {
    await assert.doesNotReject(
      vscode.commands.executeCommand("infraCompliance.scanWorkspace"),
    );
  });
});

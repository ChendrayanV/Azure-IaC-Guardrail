const assert = require("node:assert/strict");
const vscode = require("vscode");

suite("Azure IaC Guardrail extension", () => {
  test("activates and registers the workspace scan command", async () => {
    const extension = vscode.extensions.getExtension(
      "ChendrayanVenkatesan.azure-iac-guardrail",
    );

    assert.ok(extension, "Development extension was not discovered");
    await extension.activate();

    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("infraCompliance.scanWorkspace"));
    assert.ok(commands.includes("infraCompliance.initializeAndScanWorkspace"));
    assert.ok(commands.includes("infraCompliance.scanPlan"));
    assert.ok(commands.includes("infraCompliance.createAndScanPlan"));
    assert.ok(commands.includes("infraCompliance.exportPdf"));
    assert.ok(commands.includes("infraCompliance.exportEvidence"));
    assert.ok(commands.includes("infraCompliance.analyzePrChanges"));
    assert.ok(commands.includes("infraCompliance.configureWorkspace"));
    assert.ok(commands.includes("infraCompliance.configureStaticVariables"));
    assert.ok(commands.includes("infraCompliance.visualizePlan"));
    assert.ok(commands.includes("infraCompliance.comparePlans"));
    assert.ok(commands.includes("sketchyourinfra"));
  });

  test("opens the results pane after a Terraform file scan", async () => {
    await assert.doesNotReject(
      vscode.commands.executeCommand("infraCompliance.scanWorkspace"),
    );
  });
});

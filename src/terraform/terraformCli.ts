import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { getConfigurationValue } from "../configuration";

export async function showTerraformPlan(
  terraformPath: string,
  planPath: string,
  cwd: string,
): Promise<string> {
  return runTerraform(terraformPath, ["show", "-json", planPath], cwd);
}

export async function initializeTerraform(
  terraformPath: string,
  cwd: string,
): Promise<void> {
  await runTerraform(
    terraformPath,
    ["init", "-input=false", "-no-color"],
    cwd,
  );
}

export async function validateTerraformConfiguration(
  terraformPath: string,
  cwd: string,
): Promise<string> {
  await runTerraform(terraformPath, ["fmt", "-no-color"], cwd);
  await runTerraform(
    terraformPath,
    ["init", "-backend=false", "-input=false", "-no-color"],
    cwd,
  );
  return runTerraform(terraformPath, ["validate", "-no-color"], cwd);
}

export async function createTerraformPlanJson(
  terraformPath: string,
  cwd: string,
  outputDirectory: string,
  varFile?: string,
  retainedPlanPath?: string,
): Promise<{ planJson: string; planPath?: string }> {
  const planPath =
    retainedPlanPath ??
    path.join(
      outputDirectory,
      `azure-iac-guardrail-${Date.now()}.tfplan`,
    );
  await fs.mkdir(path.dirname(planPath), { recursive: true });
  const args = [
    "plan",
    "-input=false",
    "-lock=false",
    "-no-color",
    `-out=${planPath}`,
  ];
  if (varFile) {
    args.push(`-var-file=${varFile}`);
  }

  try {
    await runTerraform(terraformPath, args, cwd);
    return {
      planJson: await showTerraformPlan(terraformPath, planPath, cwd),
      planPath: retainedPlanPath ? planPath : undefined,
    };
  } finally {
    if (!retainedPlanPath) {
      await fs.rm(planPath, { force: true });
    }
  }
}

function runTerraform(
  terraformPath: string,
  args: string[],
  cwd: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      terraformPath,
      args,
      { cwd, maxBuffer: 20 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          const details = stderr.trim() || stdout.trim() || error.message;
          reject(new Error(details));
          return;
        }
        resolve(stdout);
      },
    );
  });
}

export function terraformPathFor(uri: vscode.Uri): string {
  return getConfigurationValue(uri, "terraformPath", "terraform") as string;
}

export function initializeBeforePlanFor(uri: vscode.Uri): boolean {
  return getConfigurationValue(uri, "initializeBeforePlan", true) as boolean;
}

export function retainGeneratedPlanFor(uri: vscode.Uri): boolean {
  return getConfigurationValue(uri, "retainGeneratedPlan", false) as boolean;
}

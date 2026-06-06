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

export async function createTerraformPlanJson(
  terraformPath: string,
  cwd: string,
  outputDirectory: string,
  varFile?: string,
): Promise<string> {
  await fs.mkdir(outputDirectory, { recursive: true });
  const planPath = path.join(
    outputDirectory,
    `azure-iac-guardrail-${Date.now()}.tfplan`,
  );
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
    return await showTerraformPlan(terraformPath, planPath, cwd);
  } finally {
    await fs.rm(planPath, { force: true });
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

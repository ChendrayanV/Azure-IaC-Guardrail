import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import process from "node:process";

const terraformFilePattern = /\.(?:tf|tfvars|hcl)(?:\.example)?$/;
const uuidPattern =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const sensitiveContextPattern =
  /\b(?:subscription_id|tenant_id)\s*=|\/subscriptions\//i;
const findings = [];

const candidateFiles = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { cwd: process.cwd(), encoding: "utf8" },
)
  .split(/\r?\n/)
  .filter((fileName) => terraformFilePattern.test(fileName));

for (const fileName of candidateFiles) {
  scanFile(fileName);
}

if (findings.length > 0) {
  process.stderr.write(
    "Potential Azure subscription or tenant identifiers found in Terraform configuration:\n",
  );
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  process.exitCode = 1;
} else {
  process.stdout.write(
    "No Azure subscription or tenant UUIDs found in Terraform configuration.\n",
  );
}

function scanFile(fileName) {
  const entryPath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(entryPath)) {
    return;
  }
  const lines = fs.readFileSync(entryPath, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (sensitiveContextPattern.test(line) && uuidPattern.test(line)) {
      findings.push(`${fileName}:${index + 1}`);
    }
  });
}

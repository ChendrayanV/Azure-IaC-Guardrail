import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync(
  process.execPath,
  [path.join(root, "scripts", "build-service-catalog.mjs")],
  { cwd: root, encoding: "utf8" },
);
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}

const generated = fs.readFileSync(
  path.join(root, "azure-complete-catalog-vscode.json"),
  "utf8",
);
const before = process.env.CATALOG_COMPARE_PATH;
if (before && fs.existsSync(before)) {
  const expected = fs.readFileSync(before, "utf8");
  if (generated !== expected) {
    console.error("Generated catalog is out of date.");
    process.exit(1);
  }
}
process.stdout.write(result.stdout);

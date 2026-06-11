import * as path from "node:path";
import type { Finding } from "../types";

export interface ResolvedSourceFinding {
  filePath: string;
  finding: Finding;
}

export function resolvedSourceFinding(
  workspacePath: string,
  finding: Finding,
): ResolvedSourceFinding | undefined {
  if (
    finding.outcome === "compliant" ||
    !finding.resolvedFrom ||
    !finding.fix
  ) {
    return undefined;
  }
  const source = finding.resolvedFrom.match(/^(.+):(\d+)$/);
  if (!source) {
    return undefined;
  }
  const filePath = path.resolve(workspacePath, source[1]);
  const relative = path.relative(workspacePath, filePath);
  if (
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    !/\.(?:tf|tfvars|tfvars\.json)$/i.test(filePath)
  ) {
    return undefined;
  }
  return {
    filePath,
    finding: {
      ...finding,
      line: Number(source[2]) - 1,
      startCharacter: 0,
      endCharacter: 1,
      fix: {
        kind: "replace-value",
        value: finding.fix.value,
      },
    },
  };
}

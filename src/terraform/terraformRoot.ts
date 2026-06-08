import * as fs from "node:fs/promises";
import * as path from "node:path";

export async function findTerraformRoot(
  workspaceRoot: string,
  startPath: string,
): Promise<string | undefined> {
  const workspace = path.resolve(workspaceRoot);
  let current = path.resolve(startPath);

  try {
    if ((await fs.stat(current)).isFile()) {
      current = path.dirname(current);
    }
  } catch {
    current = path.dirname(current);
  }

  if (!isWithin(workspace, current)) {
    current = workspace;
  }

  let nearestTerraformDirectory: string | undefined;
  while (isWithin(workspace, current)) {
    const terraformFiles = await filesWithExtension(current, ".tf");
    if (terraformFiles.length > 0) {
      nearestTerraformDirectory ??= current;
      const contents = await Promise.all(
        terraformFiles.map((fileName) =>
          fs.readFile(path.join(current, fileName), "utf8"),
        ),
      );
      if (contents.some((content) => /\bterraform\s*\{/.test(content))) {
        return current;
      }
    }

    if (samePath(current, workspace)) {
      break;
    }
    current = path.dirname(current);
  }

  return nearestTerraformDirectory;
}

async function filesWithExtension(
  directory: string,
  extension: string,
): Promise<string[]> {
  try {
    return (await fs.readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

function isWithin(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function samePath(left: string, right: string): boolean {
  return path.relative(left, right) === "";
}

import type { TerraformResource } from "../types";

const resourcePattern =
  /^\s*resource\s+"([^"]+)"\s+"([^"]+)"\s*\{/;
const attributePattern = /^(\s*)([A-Za-z0-9_-]+)\s*=\s*(.+?)\s*$/;

export function parseTerraform(source: string): TerraformResource[] {
  const lines = source.split(/\r?\n/);
  const resources: TerraformResource[] = [];
  let current: TerraformResource | undefined;
  let depth = 0;

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    const line = lines[lineNumber];

    if (!current) {
      const resourceMatch = line.match(resourcePattern);
      if (!resourceMatch) {
        continue;
      }

      current = {
        type: resourceMatch[1],
        name: resourceMatch[2],
        startLine: lineNumber,
        attributes: new Map(),
      };
      depth = braceDelta(line);
      resources.push(current);
      continue;
    }

    if (depth === 1) {
      const attributeMatch = line.match(attributePattern);
      if (attributeMatch) {
        const [, whitespace, name, rawValue] = attributeMatch;
        const normalised = normaliseValue(rawValue);
        current.attributes.set(name, {
          name,
          value: normalised.value,
          resolved: normalised.resolved,
          line: lineNumber,
          startCharacter: whitespace.length,
          endCharacter: line.length,
        });
      }
    }

    depth += braceDelta(line);
    if (depth <= 0) {
      current = undefined;
      depth = 0;
    }
  }

  return resources;
}

function braceDelta(line: string): number {
  const code = line.replace(/#.*$/, "").replace(/\/\/.*$/, "");
  return (code.match(/\{/g) ?? []).length - (code.match(/\}/g) ?? []).length;
}

function normaliseValue(value: string): {
  value: string;
  resolved: boolean;
} {
  const withoutComment = value.replace(/\s+(?:#|\/\/).*$/, "").trim();
  if (
    (withoutComment.startsWith('"') && withoutComment.endsWith('"')) ||
    (withoutComment.startsWith("'") && withoutComment.endsWith("'"))
  ) {
    return {
      value: withoutComment.slice(1, -1),
      resolved: true,
    };
  }
  return {
    value: withoutComment,
    resolved:
      withoutComment === "true" ||
      withoutComment === "false" ||
      !Number.isNaN(Number(withoutComment)),
  };
}

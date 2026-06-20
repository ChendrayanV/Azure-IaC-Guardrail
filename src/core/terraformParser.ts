import type { TerraformResource } from "../types";
import {
  evaluateStaticExpression,
  type StaticResolutionContext,
} from "./staticResolution";

const resourcePattern =
  /^\s*resource\s+"([^"]+)"\s+"([^"]+)"\s*\{/;
const attributePattern = /^(\s*)([A-Za-z0-9_-]+)\s*=\s*(.+?)\s*$/;
const nestedBlockPattern =
  /^\s*([A-Za-z][A-Za-z0-9_-]*)(?:\s+"[^"]+")?\s*\{/;

export function parseTerraform(
  source: string,
  context?: StaticResolutionContext,
  origin?: {
    sourcePath?: string;
    sourceUri?: string;
    moduleAddress?: string;
  },
): TerraformResource[] {
  const lines = source.split(/\r?\n/);
  const resources: TerraformResource[] = [];
  let current: TerraformResource | undefined;
  let depth = 0;
  let blocks: Array<{ name: string; depth: number }> = [];

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
        ...origin,
        startLine: lineNumber,
        attributes: new Map(),
      };
      depth = braceDelta(line);
      blocks = [];
      resources.push(current);
      continue;
    }

    let depthDeltaSource = line;
    const attributeMatch = line.match(attributePattern);
    if (attributeMatch) {
      const [, whitespace, name, rawValue] = attributeMatch;
      const collected = collectExpression(lines, lineNumber, rawValue);
      depthDeltaSource = collected.expression;
      const attributeName = [...blocks.map((block) => block.name), name].join(
        ".",
      );
      const normalised = normaliseValue(collected.expression, context);
      current.attributes.set(attributeName, {
        name: attributeName,
        value: normalised.value,
        resolved: normalised.resolved,
        source: normalised.source,
        line: lineNumber,
        startCharacter: whitespace.length,
        endCharacter:
          collected.endLine === lineNumber
            ? line.length
            : lines[collected.endLine].length,
      });
      lineNumber = collected.endLine;
    } else {
      const blockMatch = line.match(nestedBlockPattern);
      if (blockMatch) {
        blocks.push({ name: blockMatch[1], depth });
      }
    }

    depth += braceDelta(depthDeltaSource);
    blocks = blocks.filter((block) => block.depth < depth);
    if (depth <= 0) {
      current = undefined;
      depth = 0;
      blocks = [];
    }
  }

  return resources;
}

function braceDelta(line: string): number {
  const code = line.replace(/#.*$/, "").replace(/\/\/.*$/, "");
  return (code.match(/\{/g) ?? []).length - (code.match(/\}/g) ?? []).length;
}

function collectExpression(
  lines: string[],
  startLine: number,
  first: string,
): { expression: string; endLine: number } {
  const parts = [first];
  let balance = bracketDelta(first);
  let endLine = startLine;
  while (balance > 0 && endLine + 1 < lines.length) {
    endLine += 1;
    parts.push(lines[endLine]);
    balance += bracketDelta(lines[endLine]);
  }
  return { expression: parts.join("\n"), endLine };
}

function bracketDelta(value: string): number {
  return [...value].reduce(
    (balance, character) =>
      balance +
      ("{[(".includes(character) ? 1 : "}])".includes(character) ? -1 : 0),
    0,
  );
}

function normaliseValue(
  value: string,
  context?: StaticResolutionContext,
): {
  value: unknown;
  resolved: boolean;
  source?: string;
} {
  const withoutComment = value.replace(/\s+(?:#|\/\/).*$/, "").trim();
  if (context) {
    const evaluated = evaluateStaticExpression(withoutComment, context);
    if (evaluated.resolved) {
      return evaluated;
    }
  }
  if (
    (withoutComment.startsWith('"') && withoutComment.endsWith('"')) ||
    (withoutComment.startsWith("'") && withoutComment.endsWith("'"))
  ) {
    return {
      value: withoutComment.slice(1, -1),
      resolved: true,
    };
  }
  if (
    (withoutComment.startsWith("[") && withoutComment.endsWith("]")) ||
    (withoutComment.startsWith("{") && withoutComment.endsWith("}"))
  ) {
    const evaluated = evaluateStaticExpression(
      withoutComment,
      context ?? { variables: new Map(), locals: new Map() },
    );
    if (evaluated.resolved) {
      return evaluated;
    }
  }
  return {
    value: withoutComment,
    resolved:
      withoutComment === "true" ||
      withoutComment === "false" ||
      !Number.isNaN(Number(withoutComment)),
  };
}

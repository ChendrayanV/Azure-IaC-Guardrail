export interface StaticSource {
  path: string;
  content: string;
}

export interface ResolvedStaticValue {
  value: unknown;
  source: string;
}

export interface StaticResolutionContext {
  variables: Map<string, ResolvedStaticValue>;
  locals: Map<string, ResolvedStaticValue>;
}

export function createStaticResolutionContext(
  terraformSources: StaticSource[],
  variableSources: StaticSource[] = [],
): StaticResolutionContext {
  const variables = new Map<string, ResolvedStaticValue>();
  for (const source of terraformSources) {
    for (const assignment of parseVariableDefaults(source)) {
      const value = evaluateStaticExpression(assignment.expression, {
        variables,
        locals: new Map(),
      });
      if (value.resolved) {
        variables.set(assignment.name, {
          value: value.value,
          source: `${source.path}:${assignment.line + 1}`,
        });
      }
    }
  }

  for (const source of variableSources) {
    for (const assignment of parseVariableFile(source.content)) {
      const value = evaluateStaticExpression(assignment.expression, {
        variables,
        locals: new Map(),
      });
      if (value.resolved) {
        variables.set(assignment.name, {
          value: value.value,
          source: `${source.path}:${assignment.line + 1}`,
        });
      }
    }
  }

  const locals = new Map<string, ResolvedStaticValue>();
  const pending = terraformSources.flatMap((source) =>
    parseLocalAssignments(source).map((assignment) => ({
      ...assignment,
      path: source.path,
    })),
  );
  for (let pass = 0; pass <= pending.length; pass += 1) {
    let changed = false;
    for (const assignment of pending) {
      if (locals.has(assignment.name)) {
        continue;
      }
      const value = evaluateStaticExpression(assignment.expression, {
        variables,
        locals,
      });
      if (value.resolved) {
        locals.set(assignment.name, {
          value: value.value,
          source: `${assignment.path}:${assignment.line + 1}`,
        });
        changed = true;
      }
    }
    if (!changed) {
      break;
    }
  }
  return { variables, locals };
}

function parseVariableFile(content: string): Assignment[] {
  if (content.trimStart().startsWith("{")) {
    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;
      return Object.entries(parsed).map(([name, value]) => ({
        name,
        expression: JSON.stringify(value),
        line: 0,
      }));
    } catch {
      return [];
    }
  }
  return parseAssignments(content);
}

export function evaluateStaticExpression(
  expression: string,
  context: StaticResolutionContext,
): { resolved: boolean; value: unknown; source?: string } {
  const value = stripComment(expression).trim();
  const conditional = splitConditional(value);
  if (conditional) {
    const condition = evaluateStaticExpression(conditional.condition, context);
    if (!condition.resolved || typeof condition.value !== "boolean") {
      return { resolved: false, value };
    }
    return evaluateStaticExpression(
      condition.value ? conditional.whenTrue : conditional.whenFalse,
      context,
    );
  }

  const reference = value.match(/^(var|local)\.([A-Za-z0-9_-]+)$/);
  if (reference) {
    const resolved =
      reference[1] === "var"
        ? context.variables.get(reference[2])
        : context.locals.get(reference[2]);
    return resolved
      ? { resolved: true, value: resolved.value, source: resolved.source }
      : { resolved: false, value };
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    const unquoted = value.slice(1, -1);
    const matches = [...unquoted.matchAll(/\$\{([^}]+)\}/g)];
    if (matches.length === 0) {
      return { resolved: true, value: unquoted };
    }
    let rendered = unquoted;
    for (const match of matches) {
      const resolved = evaluateStaticExpression(match[1], context);
      if (!resolved.resolved) {
        return { resolved: false, value };
      }
      rendered = rendered.replace(match[0], String(resolved.value));
    }
    return { resolved: true, value: rendered };
  }
  if (value === "true" || value === "false") {
    return { resolved: true, value: value === "true" };
  }
  if (value === "null") {
    return { resolved: true, value: null };
  }
  if (value !== "" && !Number.isNaN(Number(value))) {
    return { resolved: true, value: Number(value) };
  }
  if (
    (value.startsWith("[") && value.endsWith("]")) ||
    (value.startsWith("{") && value.endsWith("}"))
  ) {
    return evaluateCollection(value, context);
  }
  return { resolved: false, value };
}

function evaluateCollection(
  expression: string,
  context: StaticResolutionContext,
): { resolved: boolean; value: unknown } {
  const isList = expression.startsWith("[");
  const body = expression.slice(1, -1).trim();
  if (!body) {
    return { resolved: true, value: isList ? [] : {} };
  }
  const parts = splitTopLevel(body);
  if (isList) {
    const values = parts.map((part) => evaluateStaticExpression(part, context));
    return values.every((item) => item.resolved)
      ? { resolved: true, value: values.map((item) => item.value) }
      : { resolved: false, value: expression };
  }
  const result: Record<string, unknown> = {};
  for (const part of parts) {
    const match = part.match(/^\s*"?([A-Za-z0-9_-]+)"?\s*(?:=|:)\s*([\s\S]+)$/);
    if (!match) {
      return { resolved: false, value: expression };
    }
    const resolved = evaluateStaticExpression(match[2], context);
    if (!resolved.resolved) {
      return { resolved: false, value: expression };
    }
    result[match[1]] = resolved.value;
  }
  return { resolved: true, value: result };
}

interface Assignment {
  name: string;
  expression: string;
  line: number;
}

function parseVariableDefaults(source: StaticSource): Assignment[] {
  return parseNamedBlocks(source.content, "variable").flatMap((block) => {
    const assignment = parseAssignments(block.body).find(
      (item) => item.name === "default",
    );
    return assignment
      ? [{ ...assignment, name: block.name, line: block.line + assignment.line }]
      : [];
  });
}

function parseLocalAssignments(source: StaticSource): Assignment[] {
  return parseAnonymousBlocks(source.content, "locals").flatMap((block) =>
    parseAssignments(block.body).map((assignment) => ({
      ...assignment,
      line: block.line + assignment.line,
    })),
  );
}

function parseAssignments(content: string): Assignment[] {
  const lines = content.split(/\r?\n/);
  const assignments: Assignment[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^\s*([A-Za-z0-9_-]+)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }
    const collected = collectExpression(lines, index, match[2]);
    assignments.push({
      name: match[1],
      expression: collected.expression,
      line: index,
    });
    index = collected.endLine;
  }
  return assignments;
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

function parseNamedBlocks(
  content: string,
  type: string,
): Array<{ name: string; body: string; line: number }> {
  const pattern = new RegExp(`^\\s*${type}\\s+"([^"]+)"\\s*\\{`, "m");
  return parseBlocks(content, pattern).map((block) => ({
    name: block.match[1],
    body: block.body,
    line: block.line,
  }));
}

function parseAnonymousBlocks(
  content: string,
  type: string,
): Array<{ body: string; line: number }> {
  const pattern = new RegExp(`^\\s*${type}\\s*\\{`, "m");
  return parseBlocks(content, pattern).map((block) => ({
    body: block.body,
    line: block.line,
  }));
}

function parseBlocks(
  content: string,
  pattern: RegExp,
): Array<{ match: RegExpMatchArray; body: string; line: number }> {
  const blocks: Array<{
    match: RegExpMatchArray;
    body: string;
    line: number;
  }> = [];
  let offset = 0;
  while (offset < content.length) {
    const fragment = content.slice(offset);
    const match = fragment.match(pattern);
    if (!match || match.index === undefined) {
      break;
    }
    const start = offset + match.index;
    const open = content.indexOf("{", start);
    let depth = 1;
    let cursor = open + 1;
    while (cursor < content.length && depth > 0) {
      depth += content[cursor] === "{" ? 1 : content[cursor] === "}" ? -1 : 0;
      cursor += 1;
    }
    blocks.push({
      match,
      body: content.slice(open + 1, Math.max(open + 1, cursor - 1)),
      line: content.slice(0, open + 1).split(/\r?\n/).length - 1,
    });
    offset = cursor;
  }
  return blocks;
}

function splitConditional(
  expression: string,
): { condition: string; whenTrue: string; whenFalse: string } | undefined {
  const question = findTopLevel(expression, "?");
  const colon = question >= 0 ? findTopLevel(expression, ":", question + 1) : -1;
  return question >= 0 && colon > question
    ? {
        condition: expression.slice(0, question),
        whenTrue: expression.slice(question + 1, colon),
        whenFalse: expression.slice(colon + 1),
      }
    : undefined;
}

function splitTopLevel(value: string): string[] {
  const result: string[] = [];
  let start = 0;
  let depth = 0;
  let quote = "";
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if ((character === '"' || character === "'") && value[index - 1] !== "\\") {
      quote = quote === character ? "" : quote || character;
      continue;
    }
    if (quote) {
      continue;
    }
    depth += "{[(".includes(character) ? 1 : "}])".includes(character) ? -1 : 0;
    if (depth === 0 && (character === "," || character === "\n")) {
      result.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  result.push(value.slice(start).trim());
  return result.filter(Boolean);
}

function findTopLevel(value: string, token: string, start = 0): number {
  let depth = 0;
  let quote = "";
  for (let index = start; index < value.length; index += 1) {
    const character = value[index];
    if ((character === '"' || character === "'") && value[index - 1] !== "\\") {
      quote = quote === character ? "" : quote || character;
      continue;
    }
    if (quote) {
      continue;
    }
    depth += "{[(".includes(character) ? 1 : "}])".includes(character) ? -1 : 0;
    if (depth === 0 && character === token) {
      return index;
    }
  }
  return -1;
}

function bracketDelta(value: string): number {
  return [...value].reduce(
    (balance, character) =>
      balance +
      ("{[(".includes(character) ? 1 : "}])".includes(character) ? -1 : 0),
    0,
  );
}

function stripComment(value: string): string {
  return value.replace(/\s+(?:#|\/\/).*$/, "");
}

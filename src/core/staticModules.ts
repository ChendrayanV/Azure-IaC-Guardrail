import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  createStaticResolutionContext,
  evaluateStaticExpression,
  type StaticResolutionContext,
  type StaticSource,
} from "./staticResolution";

export interface StaticModuleSource {
  filePath: string;
  displayPath: string;
  moduleAddress?: string;
  content: string;
  context: StaticResolutionContext;
}

export interface StaticModuleIssue {
  callerFilePath: string;
  callerDisplayPath: string;
  moduleAddress: string;
  source: string;
  line: number;
  reason:
    | "not-installed"
    | "dynamic-source"
    | "missing-local-source"
    | "multiple-instances";
}

export interface StaticModuleWorkspace {
  sources: StaticModuleSource[];
  issues: StaticModuleIssue[];
  variableSources: StaticSource[];
}

interface ModuleCall {
  name: string;
  source?: string;
  sourceExpression?: string;
  line: number;
  inputs: Map<string, string>;
  multipleInstances: boolean;
}

interface TerraformModuleManifest {
  Modules?: Array<{
    Key?: string;
    Source?: string;
    Dir?: string;
  }>;
}

export async function loadStaticModuleWorkspace(
  workspacePath: string,
  configuredVarFiles: string[],
): Promise<StaticModuleWorkspace> {
  const variableSources = await loadVariableSources(
    workspacePath,
    configuredVarFiles,
  );
  const manifest = await loadModuleManifest(workspacePath);
  const sources: StaticModuleSource[] = [];
  const issues: StaticModuleIssue[] = [];
  const active = new Set<string>();

  await visitModule({
    workspacePath,
    directory: workspacePath,
    moduleKey: "",
    variableSources,
    manifest,
    sources,
    issues,
    active,
  });

  return { sources, issues, variableSources };
}

async function visitModule(options: {
  workspacePath: string;
  directory: string;
  moduleKey: string;
  variableSources: StaticSource[];
  manifest: Map<string, string>;
  sources: StaticModuleSource[];
  issues: StaticModuleIssue[];
  active: Set<string>;
}): Promise<void> {
  const moduleIdentity = path.resolve(options.directory).toLowerCase();
  if (options.active.has(moduleIdentity)) {
    return;
  }
  options.active.add(moduleIdentity);

  const files = await terraformFiles(options.directory);
  const terraformSources = await Promise.all(
    files.map(async (filePath): Promise<StaticSource & { filePath: string }> => ({
      filePath,
      path: displayPath(options.workspacePath, filePath),
      content: await fs.readFile(filePath, "utf8"),
    })),
  );
  const context = createStaticResolutionContext(
    terraformSources,
    options.variableSources,
  );

  for (const source of terraformSources) {
    options.sources.push({
      filePath: source.filePath,
      displayPath: source.path,
      moduleAddress: options.moduleKey
        ? moduleAddress(options.moduleKey)
        : undefined,
      content: source.content,
      context,
    });
  }

  for (const caller of terraformSources) {
    for (const call of parseModuleCalls(caller.content)) {
      const childKey = options.moduleKey
        ? `${options.moduleKey}.${call.name}`
        : call.name;
      const childAddress = moduleAddress(childKey);
      if (!call.source) {
        options.issues.push({
          callerFilePath: caller.filePath,
          callerDisplayPath: caller.path,
          moduleAddress: childAddress,
          source: call.sourceExpression ?? "dynamic expression",
          line: call.line,
          reason: "dynamic-source",
        });
        continue;
      }

      const local = isLocalModuleSource(call.source);
      const directory = local
        ? path.resolve(options.directory, call.source)
        : options.manifest.get(childKey);
      if (!directory || !(await directoryExists(directory))) {
        options.issues.push({
          callerFilePath: caller.filePath,
          callerDisplayPath: caller.path,
          moduleAddress: childAddress,
          source: call.source,
          line: call.line,
          reason: local ? "missing-local-source" : "not-installed",
        });
        continue;
      }
      if (call.multipleInstances) {
        options.issues.push({
          callerFilePath: caller.filePath,
          callerDisplayPath: caller.path,
          moduleAddress: childAddress,
          source: call.source,
          line: call.line,
          reason: "multiple-instances",
        });
      }

      const inputValues: Record<string, unknown> = {};
      for (const [name, expression] of call.inputs) {
        const evaluated = evaluateStaticExpression(expression, context);
        if (evaluated.resolved) {
          inputValues[name] = evaluated.value;
        }
      }
      const moduleVariableSources = Object.keys(inputValues).length
        ? [
            {
              path: `${caller.path}:${call.line + 1} (${childAddress} inputs)`,
              content: JSON.stringify(inputValues),
            },
          ]
        : [];

      await visitModule({
        ...options,
        directory,
        moduleKey: childKey,
        variableSources: moduleVariableSources,
      });
    }
  }

  options.active.delete(moduleIdentity);
}

export function parseModuleCalls(source: string): ModuleCall[] {
  const lines = source.split(/\r?\n/);
  const calls: ModuleCall[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(
      /^\s*module\s+"([^"]+)"\s*\{/,
    );
    if (!match) {
      continue;
    }
    const call: ModuleCall = {
      name: match[1],
      line: index,
      inputs: new Map(),
      multipleInstances: false,
    };
    let depth = braceDelta(lines[index]);
    for (index += 1; index < lines.length && depth > 0; index += 1) {
      const line = lines[index];
      if (depth === 1) {
        const attribute = line.match(
          /^\s*([A-Za-z0-9_-]+)\s*=\s*(.+?)\s*$/,
        );
        if (attribute) {
          const name = attribute[1];
          let expression = stripComment(attribute[2]);
          while (
            !expressionComplete(expression) &&
            index + 1 < lines.length
          ) {
            index += 1;
            expression += `\n${stripComment(lines[index])}`;
          }
          if (name === "source") {
            call.sourceExpression = expression;
            const literal = expression.match(/^"([^"]+)"$/);
            call.source = literal?.[1];
          } else if (name === "count" || name === "for_each") {
            call.multipleInstances = true;
          } else if (!["version", "providers", "depends_on"].includes(name)) {
            call.inputs.set(name, expression);
          }
        }
      }
      depth += braceDelta(line);
    }
    index -= 1;
    calls.push(call);
  }
  return calls;
}

function moduleAddress(key: string): string {
  return key
    .split(".")
    .map((part) => `module.${part}`)
    .join(".");
}

function isLocalModuleSource(source: string): boolean {
  return source.startsWith("./") || source.startsWith("../");
}

async function terraformFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".tf"))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

async function loadVariableSources(
  workspacePath: string,
  configuredVarFiles: string[],
): Promise<StaticSource[]> {
  const entries = await fs.readdir(workspacePath, { withFileTypes: true });
  const automatic = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        (entry.name === "terraform.tfvars" ||
          entry.name.endsWith(".auto.tfvars") ||
          entry.name.endsWith(".auto.tfvars.json")),
    )
    .map((entry) => entry.name);
  const files = [...new Set([...automatic, ...configuredVarFiles])];
  const loaded = await Promise.all(
    files.map(async (file): Promise<StaticSource | undefined> => {
      const filePath = path.resolve(workspacePath, file);
      try {
        return {
          path: displayPath(workspacePath, filePath),
          content: await fs.readFile(filePath, "utf8"),
        };
      } catch {
        return undefined;
      }
    }),
  );
  return loaded.filter((source): source is StaticSource => source !== undefined);
}

async function loadModuleManifest(
  workspacePath: string,
): Promise<Map<string, string>> {
  const modulesRoot = path.resolve(
    workspacePath,
    ".terraform",
    "modules",
  );
  try {
    const content = await fs.readFile(
      path.join(workspacePath, ".terraform", "modules", "modules.json"),
      "utf8",
    );
    const manifest = JSON.parse(content) as TerraformModuleManifest;
    return new Map(
      (manifest.Modules ?? [])
        .filter(
          (entry): entry is { Key: string; Dir: string; Source?: string } =>
            Boolean(entry.Key && entry.Dir),
        )
        .map((entry) => {
          const directory = path.resolve(workspacePath, entry.Dir);
          return directory === modulesRoot ||
            directory.startsWith(`${modulesRoot}${path.sep}`)
            ? ([entry.Key, directory] as const)
            : undefined;
        })
        .filter(
          (
            entry,
          ): entry is readonly [string, string] => entry !== undefined,
        ),
    );
  } catch {
    return new Map();
  }
}

function displayPath(workspacePath: string, filePath: string): string {
  return path.relative(workspacePath, filePath).replaceAll("\\", "/");
}

async function directoryExists(directory: string): Promise<boolean> {
  try {
    return (await fs.stat(directory)).isDirectory();
  } catch {
    return false;
  }
}

function braceDelta(line: string): number {
  const code = stripComment(line);
  return (code.match(/\{/g) ?? []).length - (code.match(/\}/g) ?? []).length;
}

function stripComment(value: string): string {
  return value.replace(/\s+(?:#|\/\/).*$/, "").trim();
}

function expressionComplete(expression: string): boolean {
  let braces = 0;
  let brackets = 0;
  let parentheses = 0;
  let quoted = false;
  let escaped = false;
  for (const character of expression) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (quoted) {
      continue;
    }
    if (character === "{") braces += 1;
    if (character === "}") braces -= 1;
    if (character === "[") brackets += 1;
    if (character === "]") brackets -= 1;
    if (character === "(") parentheses += 1;
    if (character === ")") parentheses -= 1;
  }
  return braces <= 0 && brackets <= 0 && parentheses <= 0 && !quoted;
}

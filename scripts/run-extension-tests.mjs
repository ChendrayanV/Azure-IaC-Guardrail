import path from "node:path";
import { spawn } from "node:child_process";
import { downloadAndUnzipVSCode } from "@vscode/test-electron";

const root = process.cwd();
const extensionTestsPath = path.join(
  root,
  "scripts",
  "extension-test-runner.cjs",
);

delete process.env.ELECTRON_RUN_AS_NODE;
delete process.env.VSCODE_CLI;

function profileArguments(args) {
  const hasArg = (name) =>
    args.some((arg) => arg === `--${name}` || arg.startsWith(`--${name}=`));
  const profileRoot = path.join(root, ".vscode-test");
  return [
    ...(hasArg("extensions-dir")
      ? []
      : [`--extensions-dir=${path.join(profileRoot, "extensions")}`]),
    ...(hasArg("user-data-dir")
      ? []
      : [`--user-data-dir=${path.join(profileRoot, "user-data")}`]),
  ];
}

function runCode(executable, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      env: { ...process.env, ...env },
      shell: false,
      stdio: "inherit",
      windowsHide: true,
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          signal
            ? `Extension Host tests terminated with signal ${signal}.`
            : `Extension Host tests failed with code ${code}.`,
        ),
      );
    });
  });
}

try {
  const vscodeExecutablePath = await downloadAndUnzipVSCode({
    version: "1.100.0",
    extensionDevelopmentPath: root,
  });
  const args = [
    path.join(root, "test", "fixtures", "noncompliant"),
    "--no-sandbox",
    "--disable-gpu-sandbox",
    "--disable-updates",
    "--disable-extensions",
    "--disable-gpu",
    "--disable-workspace-trust",
    "--skip-release-notes",
    "--skip-welcome",
    `--extensionTestsPath=${extensionTestsPath}`,
    `--extensionDevelopmentPath=${root}`,
  ];
  args.push(...profileArguments(args));

  await runCode(vscodeExecutablePath, args, {
    VSCODE_TEST_OPTIONS: JSON.stringify({
      colorDefault: true,
      files: [
        path.join(root, "test", "extension", "activation.test.cjs"),
      ],
      mochaOpts: {
        timeout: 20000,
      },
      preload: [],
    }),
  });
} catch (error) {
  console.error("Extension Host tests failed.", error);
  process.exit(1);
}

import path from "node:path";
import { runTests } from "@vscode/test-electron";

const root = process.cwd();
const extensionTestsPath = path.join(
  root,
  "scripts",
  "extension-test-runner.cjs",
);

delete process.env.ELECTRON_RUN_AS_NODE;
delete process.env.VSCODE_CLI;

try {
  await runTests({
    version: "1.100.0",
    extensionDevelopmentPath: root,
    extensionTestsPath,
    extensionTestsEnv: {
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
    },
    launchArgs: [
      path.join(root, "test", "fixtures", "noncompliant"),
      "--disable-extensions",
      "--disable-gpu",
      "--disable-workspace-trust",
      "--skip-release-notes",
      "--skip-welcome",
    ],
  });
} catch (error) {
  console.error("Extension Host tests failed.", error);
  process.exit(1);
}

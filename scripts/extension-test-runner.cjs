"use strict";

const Mocha = require("mocha");

async function run() {
  const options = JSON.parse(process.env.VSCODE_TEST_OPTIONS ?? "{}");
  const mocha = new Mocha({
    ui: "tdd",
    color: true,
    ...(options.mochaOpts ?? {}),
  });

  for (const file of options.files ?? []) {
    mocha.addFile(file);
  }

  await new Promise((resolve, reject) => {
    mocha.run((failures) => {
      if (failures) {
        reject(new Error(`${failures} Extension Host test(s) failed.`));
        return;
      }
      resolve();
    });
  });
}

module.exports = { run };

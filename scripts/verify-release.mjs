import fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync("package.json", "utf8"));
const tag = (process.env.RELEASE_TAG ?? "").trim();
const publisher = (process.env.VSCE_PUBLISHER ?? "").trim();

if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(publisher)) {
  throw new Error(
    "Set the VSCE_PUBLISHER repository variable to the Visual Studio Marketplace publisher ID.",
  );
}

if (publisher === "your-publisher") {
  throw new Error("VSCE_PUBLISHER must not use the placeholder publisher.");
}

if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
  throw new Error(
    `package.json version "${manifest.version}" must use major.minor.patch.`,
  );
}

if (tag && tag !== `v${manifest.version}`) {
  throw new Error(
    `Release tag "${tag}" does not match package.json version "v${manifest.version}".`,
  );
}

const version = manifest.version;
const vsix = `azure-iac-guardrail-${version}.vsix`;
const output = process.env.GITHUB_OUTPUT;

if (output) {
  fs.appendFileSync(output, `version=${version}\nvsix=${vsix}\n`);
}

console.log(`Release metadata validated for ${publisher}.${manifest.name} v${version}.`);

import fs from "node:fs";

const EXPECTED_PUBLISHER = "ChendrayanVenkatesan";
const manifest = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lockfile = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const tag = (process.env.RELEASE_TAG ?? "").trim();
const publisher = (process.env.VSCE_PUBLISHER ?? "").trim();

if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(manifest.publisher)) {
  throw new Error(
    `package.json publisher "${manifest.publisher}" is not a valid Marketplace publisher ID.`,
  );
}

if (manifest.publisher !== EXPECTED_PUBLISHER) {
  throw new Error(
    `package.json publisher must be "${EXPECTED_PUBLISHER}", found "${manifest.publisher}".`,
  );
}

if (publisher && publisher !== manifest.publisher) {
  throw new Error(
    `VSCE_PUBLISHER "${publisher}" does not match package.json publisher "${manifest.publisher}".`,
  );
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

if (
  lockfile.version !== manifest.version ||
  lockfile.packages?.[""]?.version !== manifest.version
) {
  throw new Error(
    `package-lock.json version must match package.json version "${manifest.version}".`,
  );
}

const version = manifest.version;
const vsix = `azure-iac-guardrail-${version}.vsix`;
const output = process.env.GITHUB_OUTPUT;

if (output) {
  fs.appendFileSync(output, `version=${version}\nvsix=${vsix}\n`);
}

console.log(
  `Release metadata validated for publisher ${EXPECTED_PUBLISHER} v${version}.`,
);

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const servicesDirectory = path.join(root, "catalog", "services");
const productionServicesDirectory = path.join(servicesDirectory, "production");
const draftServicesDirectory = path.join(servicesDirectory, "draft");
const outputPath = path.join(root, "azure-complete-catalog-vscode.json");

const productionFiles = serviceFiles(productionServicesDirectory);
const draftFiles = serviceFiles(draftServicesDirectory);
const productionServices = productionFiles.map(({ file, fullPath }) => {
  const value = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  validateService(value, file);
  if (!Array.isArray(value.controls) || value.controls.length === 0) {
    fail(`${file}: production services must define at least one control.`);
  }
  return value;
});
const draftServices = [];
for (const { file, fullPath } of draftFiles) {
  const value = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  validateService(value, file);
  draftServices.push({
    ...value,
    controls: [],
    assurances: [],
  });
}
const services = [...productionServices, ...draftServices].sort((left, right) =>
  left.serviceId.localeCompare(right.serviceId),
);

function serviceFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }
  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => ({ file, fullPath: path.join(directory, file) }));
}

const serviceIds = new Set();
const controlIds = new Set();
for (const service of services) {
  if (serviceIds.has(service.serviceId)) {
    fail(`Duplicate serviceId "${service.serviceId}".`);
  }
  serviceIds.add(service.serviceId);
  for (const control of service.controls) {
    if (controlIds.has(control.id)) {
      fail(`Duplicate control ID "${control.id}".`);
    }
    controlIds.add(control.id);
  }
}

const runtime = {
  version: 1,
  catalogVersion: readCatalogVersion(),
  generatedFrom: "catalog/services/{production,draft}/*.json",
  services: Object.fromEntries(
    services.map((service) => [service.serviceId, service]),
  ),
  controls: productionServices.flatMap((service) => service.controls),
  assurances: productionServices.flatMap((service) => service.assurances ?? []),
};

fs.writeFileSync(outputPath, `${JSON.stringify(runtime, null, 2)}\n`);
console.log(
  `Built ${path.basename(outputPath)} with ${services.length} services and ${runtime.controls.length} controls.`,
);

function validateService(service, file) {
  const requiredStrings = [
    "serviceId",
    "displayName",
    "category",
    "description",
    "icon",
  ];
  for (const key of requiredStrings) {
    if (typeof service[key] !== "string" || !service[key].trim()) {
      fail(`${file}: ${key} must be a non-empty string.`);
    }
  }
  if (!/^[a-z0-9_]+$/.test(service.serviceId)) {
    fail(`${file}: serviceId must use lowercase snake_case.`);
  }
  if (file !== `${service.serviceId}.json`) {
    fail(`${file}: filename must match serviceId.`);
  }
  if (!service.terraform || !Array.isArray(service.terraform.parameters)) {
    fail(`${file}: terraform.parameters must be an array.`);
  }
  if (!Array.isArray(service.controls)) {
    fail(`${file}: controls must be an array.`);
  }
  const parameterKeys = new Set();
  for (const parameter of service.terraform.parameters) {
    if (!parameter.key || parameterKeys.has(parameter.key)) {
      fail(`${file}: parameter keys must be non-empty and unique.`);
    }
    parameterKeys.add(parameter.key);
  }
  for (const control of service.controls) {
    for (const key of [
      "id",
      "title",
      "description",
      "severity",
      "resourceTypes",
      "attribute",
      "operator",
      "reference",
    ]) {
      if (control[key] === undefined) {
        fail(`${file}: control ${control.id ?? "<unknown>"} lacks ${key}.`);
      }
    }
  }
}

function readCatalogVersion() {
  return fs
    .readFileSync(path.join(root, "catalog", "VERSION"), "utf8")
    .trim();
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

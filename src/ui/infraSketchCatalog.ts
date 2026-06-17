import completeCatalog from "../../azure-complete-catalog-vscode.json";
import {
  SKETCH_PARAMETER_DEFINITIONS,
  SKETCH_SERVICES,
} from "../core/infraSketch";

export function mappedParameterDefinitions() {
  return Object.fromEntries(
    SKETCH_SERVICES.map((service) => [
      service.type,
      SKETCH_PARAMETER_DEFINITIONS[service.type] ?? [],
    ]),
  );
}

export function serviceCatalog(iconBaseUri: string) {
  const mapped = completeCatalog.services as Record<
    string,
    {
      icon: string;
      governanceStatus: "approved" | "under-review" | "not-approved";
      terraform: { resourceType: string | null };
      controls: unknown[];
      canvas?: {
        variantParameterKey?: string;
        variants: Array<{
          id: string;
          label: string;
          description: string;
          requiredDependencies: string[];
          optionalDependencies: string[];
        }>;
      };
    }
  >;
  return SKETCH_SERVICES.map((service) => ({
    ...service,
    iconUri: `${iconBaseUri}/${mapped[service.type].icon
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
    terraformType: mapped[service.type].terraform.resourceType,
    controls: mapped[service.type].controls,
    status: mapped[service.type].governanceStatus,
    canvas: mapped[service.type].canvas,
  }));
}

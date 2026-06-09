import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["dist/**", "node_modules/**", ".vscode-test/**"],
  },
  {
    files: ["*.mjs", "scripts/**/*.mjs", "test/extension/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        suite: "readonly",
        test: "readonly",
      },
    },
  },
);

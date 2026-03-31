import js from "@eslint/js";
import tseslint from "typescript-eslint";

import { fileScopeOverrides } from "./eslint/configs/fileScopeOverrides.ts";
import { sharedTypeScriptConfig } from "./eslint/configs/sharedTypeScriptConfig.ts";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", ".vite/**", ".vscode/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  sharedTypeScriptConfig,
  ...fileScopeOverrides,
);

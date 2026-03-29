import globals from "globals";
import type { ConfigWithExtends } from "typescript-eslint";

import primaryFunctionFirst from "../rules/primaryFunctionFirst.ts";

export const sharedTypeScriptConfig: ConfigWithExtends = {
  files: ["**/*.{ts,tsx}"],
  plugins: {
    local: {
      rules: {
        "primary-function-first": primaryFunctionFirst,
      },
    },
  },
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    globals: {
      ...globals.browser,
    },
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
  rules: {
    eqeqeq: ["error", "always"],
    "no-restricted-syntax": [
      "error",
      {
        selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
        message: "Do not inject HTML with dangerouslySetInnerHTML.",
      },
      {
        selector:
          "AssignmentExpression[left.property.name='innerHTML'], AssignmentExpression[left.property.name='outerHTML']",
        message: "Do not inject HTML by assigning to innerHTML or outerHTML.",
      },
      {
        selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
        message: "Do not inject HTML with insertAdjacentHTML.",
      },
    ],
    "@typescript-eslint/explicit-function-return-type": [
      "error",
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
      },
    ],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-this-alias": "off",
    "local/primary-function-first": "warn",
  },
};

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

import primaryFunctionFirst from "./eslint/rules/primaryFunctionFirst.ts";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", ".vite/**", ".vscode/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
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
  },
  {
    files: ["eslint.config.ts", "vite.config.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["scripts/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/logger.ts", "src/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "console",
          property: "debug",
          message: "Use src/logger.ts instead of calling console.* directly.",
        },
        {
          object: "console",
          property: "error",
          message: "Use src/logger.ts instead of calling console.* directly.",
        },
        {
          object: "console",
          property: "info",
          message: "Use src/logger.ts instead of calling console.* directly.",
        },
        {
          object: "console",
          property: "log",
          message: "Use src/logger.ts instead of calling console.* directly.",
        },
        {
          object: "console",
          property: "warn",
          message: "Use src/logger.ts instead of calling console.* directly.",
        },
      ],
    },
  },
  {
    files: ["src/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "test",
          property: "only",
          message: "Do not commit focused tests.",
        },
        {
          object: "test",
          property: "skip",
          message: "Do not commit skipped tests.",
        },
        {
          object: "it",
          property: "only",
          message: "Do not commit focused tests.",
        },
        {
          object: "it",
          property: "skip",
          message: "Do not commit skipped tests.",
        },
        {
          object: "describe",
          property: "only",
          message: "Do not commit focused suites.",
        },
        {
          object: "describe",
          property: "skip",
          message: "Do not commit skipped suites.",
        },
      ],
    },
  },
);

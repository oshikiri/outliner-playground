import globals from "globals";
import type { ConfigWithExtends } from "typescript-eslint";

const consoleRestrictions = [
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
];

const focusedTestRestrictions = [
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
];

const blockSelectionRestrictions = [
  {
    object: "document",
    property: "getSelection",
    message:
      "Read Selection in components or event handlers and pass it into helpers so the helpers remain easy to test.",
  },
];

export const fileScopeOverrides: ConfigWithExtends[] = [
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
      "no-restricted-properties": ["error", ...consoleRestrictions],
    },
  },
  {
    files: ["src/block/**/*.ts"],
    ignores: [
      "src/block/**/*.test.ts",
      "src/block/BlockKeydownHandlerFactory.ts",
    ],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "window",
          message:
            "Read window in components or event handlers and pass plain values into helpers so the helpers remain easy to test.",
        },
      ],
      "no-restricted-properties": [
        "error",
        ...consoleRestrictions,
        ...blockSelectionRestrictions,
      ],
    },
  },
  {
    files: ["src/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-properties": ["error", ...focusedTestRestrictions],
    },
  },
];

import { RuleTester } from "eslint";

import rule from "./primaryFunctionFirst.ts";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
    sourceType: "module",
  },
});

ruleTester.run("primary-function-first", rule, {
  invalid: [
    {
      code: `
        function helper() {
          return null;
        }

        export default function App() {
          return helper();
        }
      `,
      errors: [
        {
          message:
            "Define primary top-level function App before helper implementations.",
        },
      ],
    },
    {
      code: `
        function helper() {
          return null;
        }

        export function run() {
          return helper();
        }
      `,
      errors: [
        {
          message:
            "Define primary top-level function run before helper implementations.",
        },
      ],
    },
    {
      code: `
        function parseMatchedSegment() {
          return null;
        }

        function parseInlineMarkdown() {
          return parseMatchedSegment();
        }
      `,
      errors: [
        {
          message:
            "Define primary top-level function parseInlineMarkdown before helper implementations.",
        },
      ],
      filename: "/project/src/parseInlineMarkdown.ts",
    },
  ],
  valid: [
    {
      code: `
        export default function App() {
          return helper();
        }

        function helper() {
          return null;
        }
      `,
    },
    {
      code: `
        export function run() {
          return helper();
        }

        function helper() {
          return null;
        }
      `,
    },
    {
      code: `
        function parseInlineMarkdown() {
          return parseMatchedSegment();
        }

        function parseMatchedSegment() {
          return null;
        }
      `,
      filename: "/project/src/parseInlineMarkdown.ts",
    },
    {
      code: `
        export function first() {
          return null;
        }

        export function second() {
          return null;
        }

        function helper() {
          return null;
        }
      `,
    },
  ],
});

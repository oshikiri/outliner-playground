# AGENTS.md

- Specifications are stored under `docs/specs/`.
- Using `console.log` and `console.warn` is allowed.
  - Consider introducing a logging library in the future.

## Completion Criteria

- Run the following before responding to the user. If any command fails, fix the issue and confirm that the error is resolved before replying.
  - `npm run format`
  - `npm run lint`
  - `npm run knip`
  - `npm run build`
  - `npm run test`
  - `npm run check:traceability:strict`
- If the change is limited to Markdown files, the commands above may be skipped.
- If the Markdown-only change includes `docs/specs/`, still run `npm run check:traceability:strict` before replying.

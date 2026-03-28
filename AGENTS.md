# AGENTS.md

- Specifications are stored under `docs/specs/`.
- Coding conventions: `docs/coding-standards.md`

## Completion Criteria

- After code changes, run `npm run verify` before replying.
- If it fails, fix the issue and rerun it before replying.
- If the change is limited to Markdown files, you may skip `npm run verify`.
- If a Markdown-only change includes `docs/specs/`, run `npm run check:traceability:strict` before replying.

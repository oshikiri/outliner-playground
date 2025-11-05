# AGENTS.md

## Coding styles

- Follow these best practices:
  - JavaScript / TypeScript
  - React (baseline: Preact 10.x with Vite 7.x)
    - Place side effects outside render using `useEffect`, etc.
    - Prefer immutable updates for recursive structures such as the block tree.
  - Tailwind CSS v4
  - Web security standards

### TypeScript

- Public methods should declare explicit return types.
- Use precise unions (`T | null`, `T | undefined`) instead of relying on implicit `any`.
- Guard optional returns before chaining (e.g., check for `undefined` before calling methods).
- Do not export types or helpers unless they are used outside the module. Keep internal details unexported to minimize surface area.
- Align default export class/function names with the filename (e.g., `BlockEntity.ts` exports `BlockEntity`) to reduce cognitive overhead.

## Testing

- Use Vitest for unit tests.
- Do not remove tests, and do not commit focused/skipped tests (`test.only`, `test.skip`).

## Commits

- Use Conventional Commit prefixes:
  - `feat:` for user-visible functionality changes.
  - `fix:` for bug fixes or styling changes that affect the UI.
  - `test:` for adding or modifying tests.
  - `chore:` for maintenance updates (dependencies, tooling, token tweaks without visual impact).
  - `docs:` for documentation or comment changes.
  - `refactor:` for internal restructuring without modifying behaviour.
- Append `!` when a change is breaking.

See Conventional Commits https://www.conventionalcommits.org/ja/v1.0.0/

# AGENTS.md

- Always communicate in Japanese.
- 仕様は src/block/data.ts に記載している。仕様と実際の実装が乖離していないかを確認すること。

## Coding styles

### JavaScript/TypeScript

- Public methods should declare explicit return types.
- Use precise unions (`T | null`, `T | undefined`) instead of relying on implicit `any`.
- Guard optional returns before chaining (e.g., check for `undefined` before calling methods).
- Do not export types or helpers unless they are used outside the module. Keep internal details unexported to minimize surface area.
- 型のみを利用するモジュールは `import type` を使ってインポートし、不要な実行時依存をできるだけ減らす
- Align default export class/function names with the filename (e.g., `BlockEntity.ts` exports `BlockEntity`) to reduce cognitive overhead.
- Prefer `find*` naming for lookup methods that may return `null` (e.g., `findBlockById`), and keep naming consistent across entities and store selectors.
- Present the primary export (component/function) before helper implementations so readers encounter high-level intent first.
- Use strict comparisons (`===`, `!==`) unless there is a clear need for loose equality, and keep that policy consistent across files.
- console.log と console.warn を使うことは許容する。将来的にログライブラリを使うことを検討する
- DOMヘルパーは `Selection` や `window` に直接依存させず、必要な値だけを引数で受け取ってテストしやすくしておく。

### React

- Place side effects outside render using `useEffect`, etc.
- Prefer immutable updates for recursive structures such as the block tree.
- Memoize event handlers/factories passed down the tree (`useCallback`, `useMemo`) so we do not recreate them every render.
- Only use `key` props for array/iterator children; avoid attaching `key` to solitary elements.
- Provide semantic landmarks/ARIA attributes and keep accessibility in sync with README guidance.
- Extract repeated or branch-heavy JSX (e.g., map renderers) into focused child components to keep primary component bodies easy to scan.
- Group domain-specific UI pieces (e.g., markdown renderers) into dedicated subdirectories so the src root stays tidy and discoverable.
- Move helper components and pure parsing logic into their own modules when they are conceptually separate, so primary components remain focused.

### jotai

- Keep the model layer and state layer responsibilities separate, and confine storage/serialization helpers to the state layer (or document clearly when you cannot).
- Avoid creating setter-only hooks; prefer a single `useAtom`-based hook that returns both value and updater in one tuple. Setter-only hooks are acceptable for derived/action hooks (e.g., actions that do not need to return the atom value).
- setterの型シグネチャにはJotaiの`SetStateAction<Value>`をそのまま使い、値/更新関数の両方を受け付けられるようにする。

### Testing

- Use Vitest for unit tests.
- Do not remove tests, and do not commit focused/skipped tests (`test.only`, `test.skip`).

### Web security standards

- Avoid XSS

## Commits

Use Conventional Commit prefixes:

- `feat:` for user-visible functionality changes.
- `fix:` for bug fixes or styling changes that affect the UI.
- `test:` for adding or modifying tests.
- `chore:` for maintenance updates (dependencies, tooling, token tweaks without visual impact).
- `docs:` for documentation or comment changes.
- `refactor:` for internal restructuring without modifying behaviour.

Append `!` when a change is breaking.

See Conventional Commits https://www.conventionalcommits.org/ja/v1.0.0/

---
name: code-style-reviewer
description: Review code changes against this repository's coding style rules (TypeScript/React/Jotai/Testing/Web security). Use when asked to review, enforce, or check coding style compliance.
---

# Code Style Reviewer

- 仕様は src/block/data.ts に記載している。仕様と実際の実装が乖離していないかを確認すること。

## JavaScript/TypeScript

- Public methods should declare explicit return types.
- Model nullable states explicitly with `T | null` or `T | undefined`.
- Align default export class/function names with the filename (e.g., `BlockEntity.ts` exports `BlockEntity`) to reduce cognitive overhead.
- Prefer `find*` naming for lookup methods that may return `null` (e.g., `findBlockById`), and keep naming consistent across entities and store selectors.
- Present the primary export (component/function) before helper implementations so readers encounter high-level intent first.
- console.log と console.warn を使うことは許容する。将来的にログライブラリを使うことを検討する
- DOMヘルパーは `Selection` や `window` に直接依存させず、必要な値だけを引数で受け取ってテストしやすくしておく。

## React

- Place side effects outside render using `useEffect`, etc.
- Prefer immutable updates for recursive structures such as the block tree.
- Memoize event handlers/factories passed down the tree (`useCallback`, `useMemo`) so we do not recreate them every render.
- Only use `key` props for array/iterator children; avoid attaching `key` to solitary elements.
- Extract repeated or branch-heavy JSX (e.g., map renderers) into focused child components to keep primary component bodies easy to scan.
- Split oversized components when they start mixing domain-specific renderers or parsing helpers with unrelated UI logic.

## jotai

- Keep the model layer and state layer responsibilities separate, and confine storage/serialization helpers to the state layer (or document clearly when you cannot).
- Avoid creating setter-only hooks; prefer a single `useAtom`-based hook that returns both value and updater in one tuple. Setter-only hooks are acceptable for derived/action hooks (e.g., actions that do not need to return the atom value).
- setterの型シグネチャにはJotaiの`SetStateAction<Value>`をそのまま使い、値/更新関数の両方を受け付けられるようにする。
- Blockを更新する際は、in-placeではなくコピーを作成した上で親の配列上で上書きする。

## Testing

- Do not remove tests.

## Web security standards

- Validate untrusted URLs before rendering links or navigation targets.

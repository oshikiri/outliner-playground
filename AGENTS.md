# AGENTS.md

- Always communicate in Japanese.
- 仕様は src/block/data.ts に記載している。仕様と実際の実装が乖離していないかを確認すること。
- 実装後、ユーザーに返す前に以下を実行する:
  - `npm run build` `npm run format` `npm run test` を実行する。エラーなどが発生した場合、それを直してエラーが解消できたことを確認してから返す。
  - 現状の未コミットの差分を確認し、この差分の内容を表す英語のコミットメッセージを作成する

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
- 実装を進める際は、入力サイズ/頻度/副作用の観点で落とし穴がないかを必ず確認すること

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
- Blockを更新する際は、in-placeではなくコピーを作成した上で親の配列上で上書きする。

### Testing

- Use Vitest for unit tests.
- Do not remove tests, and do not commit focused/skipped tests (`test.only`, `test.skip`).

### Web security standards

- Avoid XSS

## Commits

See `.codex/skills/create-git-commit/SKILL.md`

## TODOコメント

TODOコメントは `// [P1] 〇〇のケースが考慮できていない` のような形でコード内のコメントとして記載する。

TODOコメントを消した場合は、そのTOODコメントが対応済みであることを確認する。
確認内容を必ずユーザーに報告する。

### 優先度

- [P0] 致命：即時対応が必要で、放置すると被害が拡大する最優先の問題（クラッシュ/恒久的データ損失/重大セキュリティ）
- [P1] 高：ユーザー影響が大きく、日常利用で目に見える支障が出る問題（誤動作・操作不能など）
- [P2] 中：機能は動くが体験品質や仕様整合に課題が残り、違和感や軽微な不具合が継続的に発生するもの（仕様ズレ・体験劣化）
- [P3] 低（保守性・テスト性・性能の改善）

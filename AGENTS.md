# AGENTS.md

- 仕様は src/block/data.ts に記載している。仕様と実際の実装が乖離していないかを確認すること。
- 実装後、ユーザーに返す前に以下を実行する。エラーなどが発生した場合、それを直してエラーが解消できたことを確認してから返す。
  - `npm run format`
  - `npm run lint`
  - `npm run knip`
  - `npm run build`
  - `npm run test`

## Available Skills

- `create-git-commit`: コミットメッセージ規約（Conventional Commits）
- `code-style-reviewer`: コーディングスタイルのレビュー基準
- `todo-comment-policy`: TODOコメントの書式/優先度/削除ルール

## npm

- `npm install` `npm ci` などでパッケージをインストールする際は必ずユーザーに許可を取る。
- `package.json` の `dependencies` / `devDependencies` を更新するときは、 `^` と `~` を使わず、必ず `x.y.z` の固定バージョンで記述すること。

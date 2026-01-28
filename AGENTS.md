# AGENTS.md

- Always communicate in Japanese.
- 仕様は src/block/data.ts に記載している。仕様と実際の実装が乖離していないかを確認すること。
- 実装後、ユーザーに返す前に以下を実行する:
  - `npm run build` `npm run format` `npm run test` を実行する。エラーなどが発生した場合、それを直してエラーが解消できたことを確認してから返す。
  - 現状の未コミットの差分を確認し、この差分の内容を表す英語のコミットメッセージを作成する

## Skills

スキルは `.codex/skills/` 以下に定義している。

- `create-git-commit`: コミットメッセージ規約（Conventional Commits）
- `code-style-reviewer`: コーディングスタイルのレビュー基準
- `todo-comment-policy`: TODOコメントの書式/優先度/削除ルール

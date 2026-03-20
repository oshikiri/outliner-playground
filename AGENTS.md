# AGENTS.md

- 仕様は docs/specs/ 以下に保存している。
- 実装後、ユーザーに返す前に以下を実行する。エラーなどが発生した場合、それを直してエラーが解消できたことを確認してから返す。
  - `npm run format`
  - `npm run lint`
  - `npm run knip`
  - `npm run build`
  - `npm run test`
  - `npm run check:traceability:strict`
- レビューを依頼されたときは、review_manager サブエージェントが利用可能なら新しく起動してレビューを依頼する。
  - review_manager サブエージェントが利用できない環境では、通常のレビューを行う。
  - review_manager から返答があれば、省略せずにすべて表示する。
- console.log と console.warn を使うことは許容する。
  - 将来的にログライブラリを使うことを検討する

## Available Commands

- `create-git-commit`: Conventional Commits に沿ってコミットメッセージ案を作る custom prompt

## npm

- `npm install` `npm ci` などでパッケージをインストールする際は必ずユーザーに許可を取る。
- `package.json` の `dependencies` / `devDependencies` を更新するときは、 `^` と `~` を使わず、必ず `x.y.z` の固定バージョンで記述すること。

## Testing

- 既存のテストは、失敗を回避するために削除しないこと。
  - 仕様変更で見直しが必要な場合は、テストを意図に合わせて更新すること。
  - 削除が必要なときは、削除理由を説明できる状態にすること。

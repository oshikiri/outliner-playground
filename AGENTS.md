# AGENTS.md

- 仕様は docs/specs/ 以下に保存している。
- console.log と console.warn を使うことは許容する。
  - 将来的にログライブラリを使うことを検討する

## 作業の終了条件

- ユーザーに返す前に以下を実行する。エラーなどが発生した場合、それを直してエラーが解消できたことを確認してから返す。
  - `npm run format`
  - `npm run lint`
  - `npm run knip`
  - `npm run build`
  - `npm run test`
  - `npm run check:traceability:strict`

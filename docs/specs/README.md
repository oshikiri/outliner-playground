# Specs

このディレクトリには、このリポジトリの仕様書を配置する。
仕様の正本はこのディレクトリ以下の Markdown ファイルとする。

## 現在の目次

- [Outliner Editor](./outliner-editor.md)
  - 複数の block で構成される Outliner Editor 全体の編集挙動を扱う。
- [Block Markdown](./block-markdown.md)
  - 各 block 内で扱う Markdown の対応範囲と表示ルールを扱う。

## 追加予定

以下は追加を検討している spec であり、まだ正本ではない。

- `editor-state.md`
  - `rootBlock` `caretPosition` などのアプリ状態と初期化条件を整理する。
- `block-tree.md`
  - block の親子関係、走査順、インデント、アウトデントなどの構造ルールを整理する。
- `playground-ui.md`
  - エディタ領域と JSON 表示領域を含む playground としての UI を整理する。

## 運用メモ

- 仕様を追加するときは、まずこの README の目次を更新する。
- ファイル名は、責務が分かる英小文字の kebab-case にそろえる。
- 実装に先行してメモを書く場合は、未確定の内容だと分かるように記述する。
- テストで固定したい要件には、`[OE-...-001]` のような ID を付ける。
- 新しいテストを追加するときは、対応する spec ID をテスト名に含める。
- `npm run check:traceability` は spec ID と test ID の対応漏れを report する。
- `npm run check:traceability:strict` は対応漏れがあると失敗する。
- review では、ID の有無だけでなく、テスト内容がその spec を表現できているかも確認する。

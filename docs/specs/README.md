# Specs

このディレクトリには、このリポジトリの仕様書を配置する。
仕様の正本はこのディレクトリ以下の Markdown ファイルとする。

## 現在の目次

- [Outliner Editor](./outliner-editor.md)
  - 複数の block で構成される Outliner Editor 全体の編集挙動を扱う。

## 追加予定

以下は追加を検討している spec であり、まだ正本ではない。

- `markdown-inline.md`
  - 表示モードで扱う inline markdown の対応範囲と解釈ルールを整理する。
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

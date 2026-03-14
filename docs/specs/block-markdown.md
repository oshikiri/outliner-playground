# Block Markdown

この仕様は、Outliner Editor の各 block 内で扱う Markdown の現状仕様をまとめたものである。
対象は `src/markdown/` 配下の実装であり、block 全体の編集挙動は [Outliner Editor](./outliner-editor.md) で扱う。

## 対応範囲

現状で特別扱いする Markdown 記法は以下の 2 種類だけである。

- inline code
  - 形式は `` `code` `` とする。
- link
  - 形式は `[label](url)` とする。

それ以外の入力は plain text として扱う。

- [非対応] strong、emphasis、image など、対応していない記法は解釈しない。
- [非対応] escaped 記法は考慮しない。
- [非対応] nested な Markdown 解釈は行わない。
- [実装制約] parser はラフな実装であり、CommonMark 準拠は目的にしていない。

## Inline Code

- `` ` `` で囲まれた最短一致の文字列を inline code として扱う。
- 外側の backtick は描画時に除去する。
- 中身が空文字列の code も許可する。
  - 表示時は視認性のために空白 1 文字分を表示する。
- code の中で Markdown の再帰的な解釈は行わない。
- [実装制約] inline code の中に backtick を含む場合は正しく解釈しない。

## Link

- `[label](url)` の形に一致した文字列を link として扱う。
- `label` と `url` はどちらも 1 文字以上の文字列とする。
- `label` は `]` を含まない文字列とする。
- `url` は `)` を含まない文字列とする。
- [実装制約] link の `label` に `]` を含む場合や、`url` に `)` を含む場合は正しく解釈しない。

## 描画ルール

- plain text はそのまま文字列として描画する。
- inline code は `<code>` 要素で描画する。
- link は `<a>` 要素で描画する。
  - `target="_blank"` を付与する。
  - `rel="noreferrer"` を付与する。

## Link Href のサニタイズ

- 描画時に `href` を trim する。
- 制御文字と空白文字を除去して正規化する。
- 正規化後に空文字列になった場合は `"#"` を使う。
- 明示的な scheme がある場合は `http` と `https` だけを許可する。
  - それ以外の scheme は `"#"` に置き換える。
- 明示的な scheme がない場合は、そのまま許可する。
  - そのため、relative URL と protocol-relative URL は許可される。

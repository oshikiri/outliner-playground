---
name: todo-comment-policy
description: Enforce TODO comment rules and priority definitions in this repository. Use when adding, editing, or removing TODO comments, or when reviewing TODO policy compliance.
---

# TODO Comment Policy

Follow these rules when working with TODO comments.

## Format

TODOコメントは `// [P1] 〇〇のケースが考慮できていない` のような形でコード内のコメントとして記載する。

## Removal

TODOコメントを消した場合は、そのTOODコメントが対応済みであることを確認する。
確認内容を必ずユーザーに報告する。

## Priority definitions

- [P0] 致命：即時対応が必要で、放置すると被害が拡大する最優先の問題（クラッシュ/恒久的データ損失/重大セキュリティ）
- [P1] 高：ユーザー影響が大きく、日常利用で目に見える支障が出る問題（誤動作・操作不能など）
- [P2] 中：機能は動くが体験品質や仕様整合に課題が残り、違和感や軽微な不具合が継続的に発生するもの（仕様ズレ・体験劣化）
- [P3] 低（保守性・テスト性・性能の改善）

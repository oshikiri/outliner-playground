# Architecture

## Diagram

```text
                 +---------------------------+
                 | app entry: src/index.tsx  |
                 | wires browser startup     |
                 +-------------+-------------+
                               |
        +----------------------+------+-----------------------+
        |                      |                              |
        v                      v                              v
+-------+--------+    +--------+--------+    +---------------+----------------+
| ui             |    | state           |    | persistence                     |
| src/ui/        |    | src/state/      |    | src/infra/persistence.ts        |
+-------+--------+    +--------+--------+    +---------------+----------------+
        |                      |                              |
        | depends on           | depends on                   | depends on
        +----------------------+------------------------------+
                               v
                     +---------+---------+
                     | core              |
                     | src/core/         |
                     +-------------------+

app entry also depends on:
- src/keyboardShortcuts.ts
- src/logger.ts

src/infra/persistence.ts depends on:
- src/core/
- src/logger.ts
```

## Layers

- **App entry**: `src/index.tsx`
  Owns startup wiring, top-level app shell rendering, and global browser event registration.
  May depend on `ui`, `state`, `infra/persistence`, and top-level support modules, but should not own editor rules.
- **UI**: `src/ui/`
  Owns rendering, DOM event handling, caret handling, and block-level editor interaction.
  May depend on `state` and `core`.
- **State**: `src/state/`
  Owns Jotai atoms, UI-facing hooks, selectors, and update entry points.
  May depend on `core`, but `core` must not depend on `state`.
- **Core**: `src/core/`
  Owns UI-independent editor data, tree conversion, markdown parsing, and block rules.
  Must not depend on `ui`, `state`, or `infra/persistence`.
- **Persistence**: `src/infra/persistence.ts`
  Owns storage access, serialization, deserialization, and browser-specific persistence wrappers.
  May depend on `core` and shared logging, but should not depend on `state`.

## Top-Level Support Modules

- **App support**: `src/keyboardShortcuts.ts`
  Owns global shortcut interpretation used by `src/index.tsx`.
  It stays top-level because it supports app entry wiring rather than `ui`, `state`, or `infra`.
- **Shared logging**: `src/logger.ts`
  Owns logging wrappers shared by app entry, persistence, and core modules.
  It stays top-level because it is a cross-cutting utility rather than a layer of editor behavior.

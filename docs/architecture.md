# Architecture

## Overview

```text
app entry layer
  src/index.tsx
  |- depends on UI layer
  |    src/block/*.tsx
  |    src/block/BlockKeydownHandlerFactory.ts
  |- depends on state layer
  |    src/state/
  |    |- src/state/rootBlockState.ts
  |    `- src/state/editorSessionState.ts
  `- depends on persistence layer
       src/persistence.ts

state layer
  `- depends on domain layer

persistence layer
  `- depends on domain layer

domain layer
  src/block/blockStore.ts
  src/block/editorSession.ts
```

## Layers

- **App entry layer**: `src/index.tsx`
  Owns startup wiring, top-level app shell rendering, and global event registration.
  May depend on UI, state, and persistence modules, but should not own editor rules.
- **UI layer**: runtime `.tsx` modules under `src/block/`, `src/block/BlockKeydownHandlerFactory.ts`
  Owns rendering, DOM event handling, and mode switching.
  May depend on the state layer.
- **State layer**: `src/state/`
  Owns UI-facing hooks, selectors, and update entry points.
  May depend on domain modules, but domain modules must not depend on the state layer.
- **Domain layer**: `src/block/blockStore.ts`, `src/block/editorSession.ts`
  Owns UI-independent editor data and rules.
  Must not depend on UI or state modules.
- **Persistence layer**: `src/persistence.ts`
  Owns storage access, serialization, deserialization, and browser-specific persistence wrappers.
  May depend on domain types and conversion rules, but should not depend on the state layer.

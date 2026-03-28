# Coding Standards

## Block

- When updating a `BlockStore`, avoid in-place mutation. Create replacement `BlockState` objects and return a new `BlockStore`.

## JavaScript/TypeScript

- Prefer `find*` naming for lookup methods that may return `null` (e.g., `findBlockById`), and keep naming consistent across entities and store selectors.
- Read `Selection` and `window` only at component or event boundaries. Pass plain values into DOM helpers so the helpers remain easy to test.

## React

- Do not keep multiple conditional branches, deep JSX nesting, and list rendering logic in a single component body. Prefer extracting list item renderers and large conditional blocks first.

## Layer

- In this repository, the state layer means `src/state/`.
- State-layer modules may depend on model code, but model code must not depend on the state layer.
- Keep storage and serialization helpers in the state layer.

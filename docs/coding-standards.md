# Coding Standards

## Block

- When updating a `BlockStore`, avoid in-place mutation. Create replacement `BlockState` objects and return a new `BlockStore`.

## React

- Do not keep multiple conditional branches, deep JSX nesting, and list rendering logic in a single component body. Prefer extracting list item renderers and large conditional blocks first.

## Layer

- In this repository, the state layer means `src/state/`.
- State-layer modules may depend on model code, but model code must not depend on the state layer.
- Keep storage and serialization helpers in the state layer.

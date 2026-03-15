# Coding Standards

## Block

- When updating a `Block` tree, avoid in-place mutation. Clone with the shared `createBlock` helper and replace the updated node in the parent's array.

## JavaScript/TypeScript

- Prefer `find*` naming for lookup methods that may return `null` (e.g., `findBlockById`), and keep naming consistent across entities and store selectors.
- Read `Selection` and `window` only at component or event boundaries. Pass plain values into DOM helpers so the helpers remain easy to test.

## React

- Do not keep multiple conditional branches, deep JSX nesting, and list rendering logic in a single component body. Prefer extracting list item renderers and large conditional blocks first.

## jotai

- In this repository, the state layer means `src/state.ts` and `src/state/**`.
- State-layer modules may depend on model code, but model code must not depend on the state layer.
- Keep storage and serialization helpers in the state layer.
- Use Jotai's `SetStateAction<Value>` directly in setter type signatures so setters accept both plain values and updater functions.

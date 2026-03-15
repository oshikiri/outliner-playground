# Coding Standards

## JavaScript/TypeScript

- Prefer `find*` naming for lookup methods that may return `null` (e.g., `findBlockById`), and keep naming consistent across entities and store selectors.
- Keep DOM helpers independent from `Selection` and `window` by passing only the required values as arguments so they remain easy to test.

## React

- Avoid concentrating large conditional branches, nested JSX, and `map` renderers in a single component body. Extract them into focused child components before the parent component becomes hard to scan.

## jotai

- Keep the model layer and state layer responsibilities separate, and confine storage/serialization helpers to the state layer (or document clearly when you cannot).
- Use Jotai's `SetStateAction<Value>` directly in setter type signatures so setters accept both plain values and updater functions.
- When updating a `Block`, avoid in-place mutation. Create a copy and replace it in the parent's array.

## Web security standards

- Validate untrusted URLs before rendering links or navigation targets.

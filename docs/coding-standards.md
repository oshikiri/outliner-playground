# Coding Standards

## JavaScript/TypeScript

- Prefer `find*` naming for lookup methods that may return `null` (e.g., `findBlockById`), and keep naming consistent across entities and store selectors.
- Present the primary export (component/function) before helper implementations so readers encounter high-level intent first.
- DOMヘルパーは `Selection` や `window` に直接依存させず、必要な値だけを引数で受け取ってテストしやすくしておく。

## React

- Avoid concentrating large conditional branches, nested JSX, and `map` renderers in a single component body. Extract them into focused child components before the parent component becomes hard to scan.

## jotai

- Keep the model layer and state layer responsibilities separate, and confine storage/serialization helpers to the state layer (or document clearly when you cannot).
- setterの型シグネチャにはJotaiの`SetStateAction<Value>`をそのまま使い、値/更新関数の両方を受け付けられるようにする。
- Blockを更新する際は、in-placeではなくコピーを作成した上で親の配列上で上書きする。

## Web security standards

- Validate untrusted URLs before rendering links or navigation targets.

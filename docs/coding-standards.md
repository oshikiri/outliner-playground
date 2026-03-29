# Coding Standards

## Layer

- In this repository, the state layer means `src/state/`.
- State-layer modules may depend on model code, but model code must not depend on the state layer.
- Keep storage and serialization helpers in the state layer.

#!/usr/bin/env bash

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

status_output="$(git status --porcelain=1 --untracked-files=all)"

has_non_markdown=0
has_docs_specs_markdown=0

while IFS= read -r line; do
  [[ -z "$line" ]] && continue

  path="${line:3}"
  if [[ "$path" == *" -> "* ]]; then
    path="${path##* -> }"
  fi

  if [[ "$path" == *.md ]]; then
    if [[ "$path" == docs/specs/* ]]; then
      has_docs_specs_markdown=1
    fi
    continue
  fi

  has_non_markdown=1
done <<< "$status_output"

if (( has_non_markdown == 0 )); then
  if (( has_docs_specs_markdown == 1 )); then
    echo "Markdown-only changes include docs/specs. Running npm run check:traceability:strict."
    npm run check:traceability:strict
    exit $?
  fi

  echo "Markdown-only changes detected. Skipping full verification."
  exit 0
fi

echo "Non-Markdown changes detected. Running full verification."

npm run format
npm run lint
npm run knip
npm run build
npm run test
npm run check:traceability:strict

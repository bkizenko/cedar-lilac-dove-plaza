#!/usr/bin/env bash
# Fast landing gate (Grok PM): tsc + every test file touched by BRANCH vs main + core save tests.
# Usage: scripts/land-gate.sh [branch=origin/integration/2026-11-11] [base=origin/main]
set -euo pipefail
BR=${1:-origin/integration/2026-11-11}; BASE=${2:-origin/main}
CHANGED=$(git diff --name-only "$BASE"..."$BR" | grep -E '^scripts/.*\.test\.mjs$' || true)
# Tests whose name matches a touched src module (e.g. src/scene/vegetationKit.ts -> *vegetation*.test.mjs)
for m in $(git diff --name-only "$BASE"..."$BR" | grep -E '^src/.*\.tsx?$' | xargs -r -n1 basename | sed -E 's/\.(tsx?)$//; s/(Kit|View|Controls|Sheet)$//' | tr 'A-Z' 'a-z' | sort -u); do
  CHANGED="$CHANGED $(ls scripts/*.test.mjs | grep -i -- "$m" || true)"
done
SAVE="scripts/v15-save.test.mjs scripts/simulation-checkpoint-save.test.mjs scripts/autosave-worker-payload.test.mjs"
FILES=$(echo $CHANGED $SAVE | tr ' ' '\n' | grep . | sort -u | while read f; do [ -f "$f" ] && echo "$f"; done)
echo "gate files:"; echo "$FILES"
npx tsc --noEmit
node --import ./scripts/game-loader.mjs --test --test-concurrency=4 $FILES

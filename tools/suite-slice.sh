#!/usr/bin/env bash
# Time-capped suite slice with a package pre-flight (Grok PM, 11-18 15:00).
# usage: tools/suite-slice.sh <out.tap> <minutes> [from-prefix] [to-prefix]
# Per-test timeout 120 s (20:00): one slow file (proposal-answer) held back every later TAP result.
# Refuses to run without installed packages (three, react, typescript), which
# otherwise turn every renderer/UI file into a bogus "module not found" failure.
set -euo pipefail
out=${1:?out.tap}; mins=${2:-10}; from=${3:-}; to=${4:-zzzz}
cd "$(dirname "$0")/.."
if [ ! -e node_modules/three ] || [ ! -e node_modules/typescript ]; then
  for d in /tmp/hw-autopilot /workspace/hw-grok-1118 /tmp/integ; do
    if [ -e "$d/node_modules/three" ] && [ ! -e node_modules ]; then ln -s "$d/node_modules" node_modules; echo "linked node_modules from $d"; break; fi
  done
fi
[ -e node_modules/three ] && [ -e node_modules/typescript ] || { echo "no installed packages: refusing to run a misleading slice" >&2; exit 2; }
files=$(ls scripts/*.test.mjs | awk -F/ -v a="$from" -v b="$to" '$2>=a && $2<b')
echo "slice: $(echo "$files" | wc -l) files, cap ${mins} min" >&2
timeout $((mins*60)) node --import ./scripts/game-loader.mjs --test --test-concurrency=4 --test-timeout=120000 --test-reporter=tap $files > "$out" 2>&1 || true
pass=$(grep -c '^ok ' "$out" || true); fail=$(grep -c '^not ok ' "$out" || true); env=$(grep -c ERR_MODULE_NOT_FOUND "$out" || true)
echo "top-level: $pass pass / $fail fail; module-not-found lines: $env"
git status --short | grep -v '^??' >/dev/null && echo "WARNING: suite left tracked-file changes; restore them before committing" || true

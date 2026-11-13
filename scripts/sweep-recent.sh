#!/usr/bin/env bash
# Lane D / PM sweep: run the newest N test files (by git log), 4 at a time, print a compact summary.
# Usage: scripts/sweep-recent.sh [N=40]
# Sandbox needs three@0.185.1 + typescript@5.6 (0.170 lacks OutputPass.isOutputPass and fails graphics-quality) in a scratch install symlinked as node_modules (see scripts/tsc-diff.mjs).
set -u
N="${1:-40}"
files=$(git log --name-only --pretty=format: -n 400 -- 'scripts/*.test.mjs' 'src/**/*.test.ts' 'src/**/*.test.tsx' 2>/dev/null | grep -E '\.test\.(mjs|tsx?)$' | awk '!s[$0]++' | while read -r f; do [ -f "$f" ] && echo "$f"; done | head -n "$N")
[ -z "$files" ] && { echo "sweep: no test files found"; exit 1; }
out=$(mktemp -d)
echo "$files" | xargs -P 4 -I{} sh -c 'f="{}"; n=$(echo "$f" | tr / _); if timeout 180 node --import ./scripts/game-loader.mjs --experimental-strip-types --test "$f" >"'"$out"'/$n.log" 2>&1; then echo "PASS $f"; else echo "FAIL $f"; fi' | sort > "$out/summary.txt"
pass=$(grep -c '^PASS' "$out/summary.txt"); fail=$(grep -c '^FAIL' "$out/summary.txt")
echo "sweep: $pass pass, $fail fail of $(echo "$files" | wc -l) (logs in $out)"
grep '^FAIL' "$out/summary.txt"

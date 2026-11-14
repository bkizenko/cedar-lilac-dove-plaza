#!/usr/bin/env bash
# Lane D / PM sweep: run the newest N test files (by git log), 4 at a time, print a compact summary.
# Usage: scripts/sweep-recent.sh [N=40]
# Slow files (rulers-runtime, ~80s alone) run SOLO after the parallel batch so 4-wide load cannot time them out.
# Fails whose log shows a missing react/typescript package are reported as NATIVE-ONLY (sandbox env), not as failures.
# Sandbox needs three@0.185.1 + typescript@5.6 (0.170 lacks OutputPass.isOutputPass and fails graphics-quality) in a scratch install symlinked as node_modules (see scripts/tsc-diff.mjs).
set -u
N="${1:-40}"
SOLO='scripts/rulers-runtime.test.mjs'
files=$(git log --name-only --pretty=format: -n 400 -- 'scripts/*.test.mjs' 'src/**/*.test.ts' 'src/**/*.test.tsx' 2>/dev/null | grep -E '\.test\.(mjs|tsx?)$' | awk '!s[$0]++' | while read -r f; do [ -f "$f" ] && echo "$f"; done | head -n "$N")
[ -z "$files" ] && { echo "sweep: no test files found"; exit 1; }
out=$(mktemp -d)
run1() { f="$1"; n=$(echo "$f" | tr / _); if timeout 300 node --import ./scripts/game-loader.mjs --experimental-strip-types --test "$f" >"$out/$n.log" 2>&1; then echo "PASS $f"; elif grep -qE "Cannot find (package|module) '(react|typescript|react-dom)" "$out/$n.log"; then echo "NATIVE-ONLY $f"; else echo "FAIL $f"; fi; }
export -f run1; export out
echo "$files" | grep -vxF "$SOLO" | xargs -P 4 -I{} bash -c 'run1 {}' | sort > "$out/summary.txt"
if echo "$files" | grep -qxF "$SOLO"; then run1 "$SOLO" >> "$out/summary.txt"; fi
pass=$(grep -c '^PASS' "$out/summary.txt"); fail=$(grep -c '^FAIL' "$out/summary.txt"); nat=$(grep -c '^NATIVE-ONLY' "$out/summary.txt")
echo "sweep: $pass pass, $fail fail, $nat native-only of $(echo "$files" | wc -l) (logs in $out)"
grep '^FAIL' "$out/summary.txt"
[ "$nat" -gt 0 ] && { echo "native-only (need react/typescript, Codex native run must verify):"; grep '^NATIVE-ONLY' "$out/summary.txt" | sed 's/^NATIVE-ONLY /  /'; }
exit 0

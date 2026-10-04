#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)' 2>/dev/null; then
  bundled_node="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
  if [ -x "$bundled_node/node" ]; then
    PATH="$bundled_node:$PATH"
    export PATH
  fi
fi
DAWN_PORT="${DAWN_PORT:-8080}"
case "$DAWN_PORT" in ''|*[!0-9]*) echo "DAWN_PORT must be a port number" >&2; exit 1;; esac
if [ "${DAWN_FOREGROUND:-0}" = "1" ]; then
  exec npm run dev -- --port "$DAWN_PORT" --strictPort
fi
if curl -sf -o /dev/null --max-time 2 "http://127.0.0.1:$DAWN_PORT/"; then
  exit 0
fi
mkdir -p .preview
export DAWN_PORT
node scripts/start-dev.mjs
i=0
while [ "$i" -lt 40 ]; do
  if curl -sf -o /dev/null --max-time 1 "http://127.0.0.1:$DAWN_PORT/"; then
    exit 0
  fi
  i=$((i + 1))
  sleep 0.25
done
exit 1

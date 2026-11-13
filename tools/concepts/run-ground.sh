#!/bin/sh
# usage: run-ground.sh <shots.json> <out-dir> [attempts]   (repo root; env NODE_PATH=/opt/npm-tools/node_modules THREE_DIR=...three)
# ground.mjs on a shared, memory-starved box: renderer pages crash ("Target crashed"); re-run only the shots whose PNG is still missing.
S=$1; O=$2; N=${3:-8}; mkdir -p "$O"; i=0
while [ $i -lt $N ]; do
  MISS=$(python3 - "$S" "$O" <<'PY'
import json,os,sys
s=json.load(open(sys.argv[1]));print(','.join(k for k in s if not os.path.exists(os.path.join(sys.argv[2],k+'.png')) or ('eval' in s[k] and not os.path.exists(os.path.join(sys.argv[2],k+'.eval')))))
PY
)
  [ -z "$MISS" ] && { echo "all done"; exit 0; }
  echo "attempt $i missing: $MISS"
  node tools/concepts/ground.mjs "$S" --out="$O" --only="$MISS" 2>&1 | grep -v "^\[page\]" | tee -a "$O/run.log" | grep -E "EVAL|rror|crash" | cut -c1-4000
  i=$((i+1))
done
echo "gave up"; exit 1

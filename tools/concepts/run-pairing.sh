#!/bin/sh
# usage: run-pairing.sh <ui-dir (has css/)> <graded-dir> <out-dir>  (from repo root; same env as run-ui-palettes.sh)
UI=$1; G=$2; OUT=$3; mkdir -p "$OUT"
pair() { # name palette backdrop scenario
  node tools/concepts/ui-palette-shot.mjs "$4" "$OUT/pair-$1.png" --css="$UI/css/$2.css" --bg="$G/$3.png" > /dev/null
  echo "pair $1 done"
}
pair A-v1-summer-p1 p1-honey-charcoal hero-v1-summer building
pair A-v1-winter-p1 p1-honey-charcoal hero-v1-winter building
pair B-v3-summer-p5 p5-indigo-amber hero-v3-summer building
pair C-v2-summer-p3 p3-slate-bronze hero-v2-summer building

#!/bin/sh
# usage: run-ui-palettes.sh <out-dir> <bg.png>   (run from repo root; needs NODE_PATH=/opt/npm-tools/node_modules THREE_DIR=...three)
# Renders the real Hearth HUD under each palette: desktop glance, desktop selected-building, phone glance. Plus a measure json per palette (font/icon floors).
OUT=$1; BG=$2
python3 tools/concepts/ui_palettes.py "$OUT/css" > /dev/null
for P in $(ls "$OUT/css" | grep '\.css$' | sed 's/\.css$//'); do
  node tools/concepts/ui-palette-shot.mjs glance "$OUT/$P-glance.png" --css="$OUT/css/$P.css" --bg="$BG" --measure="$OUT/$P-measure.json" > /dev/null
  node tools/concepts/ui-palette-shot.mjs building "$OUT/$P-building.png" --css="$OUT/css/$P.css" --bg="$BG" > /dev/null
  node tools/concepts/ui-palette-shot.mjs glance "$OUT/$P-phone.png" --w=390 --h=844 --css="$OUT/css/$P.css" --bg="$BG" > /dev/null
  echo "$P done"
done

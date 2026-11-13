#!/bin/sh
# usage: NODE_PATH=/opt/npm-tools/node_modules tools/render-preview/materials-sheets.sh [list]   -> docs/renders/materials/{before,after}-*.png
# before = legacy shared grain + hut variety off; after = per-material set + hut variety (Standard detail unless noted)
out=docs/renders/materials; mkdir -p $out
r(){ node tools/render-preview/materials.mjs "$@" 2>&1 | grep -E "materials\]|rror" | cut -c1-200; }
for s in huts houses halls markets mills; do
  r $s $out/before-$s-mid.png --tier=1 --mode=legacy --hutvar=off --h=900
  r $s $out/after-$s-mid.png --tier=1 --h=900
done
for s in huts houses halls; do
  r $s $out/before-$s-close.png --tier=0 --mode=legacy --hutvar=off --spacing=12 --h=900
  r $s $out/after-$s-close.png --tier=0 --spacing=12 --h=900
  r $s $out/after-$s-close-high.png --tier=0 --spacing=12 --h=900 --detail=high
done
for c in nilemark hanrei quillan skoldar sandrill mekhari; do
  r row:$c $out/before-row-$c-mid.png --tier=1 --mode=legacy --hutvar=off --spacing=9 --dist=70 --h=700
  r row:$c $out/after-row-$c-mid.png --tier=1 --spacing=9 --dist=70 --h=700
done

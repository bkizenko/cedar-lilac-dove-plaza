#!/bin/sh
# usage: tools/render-preview/building-detail-sheets.sh before|after [mute]   (needs NODE_PATH and THREE_DIR, see README)
set -e
tag=${1:-after}; out=docs/renders/building-detail; mkdir -p $out
for s in hut-variety-mid-a hut-variety-mid-b hut-variety-close-1 hut-variety-close-2 hut-variety-close-3 hut-variety-close-4 hut-variety-close-5 hut-variety-close-6 hut-variety-close-7 house-variety-mid-a house-variety-mid-b; do
  node tools/render-preview/render-three.mjs $s $out/$tag-${s#hut-variety-}.png 2>&1 | grep -E "wrote|rror" || true
done

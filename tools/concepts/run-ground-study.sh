#!/bin/sh
# Grass/ground study end to end (repo root). One browser process per palette (the shader lush tint is fixed per process). Slow: ~2-4 min per palette on a shared box.
export NODE_PATH=/opt/npm-tools/node_modules THREE_DIR=/mnt/user-data/uploads/hearthwild.nosync/node_modules/three
python3 tools/concepts/mkground.py /tmp/gshots
for k in g9-hearth-ramp g0-shipped g2-olive-grey-meadow g1-dry-season-dun-straw g5-sun-bleached-steppe g3-boreal-blue-green-moss g4-heather-bracken-brown g6-wet-dark-pasture g7-autumn-rust g8-winter-frost g9b-hearth-ramp-nolush; do
  sh tools/concepts/run-ground.sh /tmp/gshots/shots-$k.json /tmp/gout 6
done

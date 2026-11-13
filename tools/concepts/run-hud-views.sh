#!/bin/sh
# HUD directions end to end (repo root): CSS for 4 directions, then every screen for the shipped base + 4 directions in ONE browser (the sim warm-up, ~90 s, runs once).
# usage: run-hud-views.sh <out-dir> <backdrop.png>
export NODE_PATH=/opt/npm-tools/node_modules THREE_DIR=/mnt/user-data/uploads/hearthwild.nosync/node_modules/three
python3 tools/concepts/ui_directions.py "$1/css" > /dev/null
node tools/concepts/hud-views.mjs --out="$1" --bg="$2" --css=base,$1/css/d1-forged-iron.css,$1/css/d2-weathered-leather.css,$1/css/d3-carved-slate.css,$1/css/d4-war-room-table.css

#!/usr/bin/env python3
"""Generate a harness shots.json: same village (prep buildings around the player camp), 3 cameras, N looks.
usage: mkshots.py seed cx cz preset|- out.json looks.json
looks.json = {"suffix": {extra spec keys...}, ...}   (renderStyle, mapStyle, treeSet, season, hour, light ...)"""
import json, sys

def village(cx, cz):
    ring = [('hut', -12, 8), ('hut', -18, -2), ('hut', -8, 16), ('hut', 10, 14), ('hut', 18, 6), ('hut', 16, -6),
            ('hut', -4, -14), ('hut', -14, -12), ('workshop', 24, -14), ('warehouse', -24, 14), ('hearth', -9, -4),
            ('temple', 30, 12), ('market', -2, 26), ('forge', 28, -2), ('hut', -22, -8), ('hut', 8, -18)]
    b = [{'type': t, 'x': round(cx + dx * 1.2, 1), 'z': round(cz + dz * 1.2, 1)} for t, dx, dz in ring]
    f = [{'x': round(cx - 40, 1), 'z': round(cz + 6, 1), 'stage': 'ripe'}, {'x': round(cx + 38, 1), 'z': round(cz + 30, 1), 'stage': 'mature'},
         {'x': round(cx - 34, 1), 'z': round(cz + 34, 1), 'stage': 'young'}]
    return {'buildings': b, 'farms': f, 'age': 3}

CAMS = {'close': (0.9, 0.38, 26), 'mid': (0.8, 0.42, 75), 'vista': (0.7, 0.3, 260)}
seed, cx, cz, preset, out, looks = int(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3]), sys.argv[4], sys.argv[5], json.load(open(sys.argv[6]))
only = sys.argv[7].split(',') if len(sys.argv) > 7 else list(CAMS)
shots = {}
for suf, extra in looks.items():
    for cam in only:
        yaw, pitch, dist = CAMS[cam]
        s = {'seed': seed, 'width': 960, 'height': 540, 'quality': 'med', 'season': 'summer', 'hour': 15.5, 'settle': 2,
             'prep': village(cx, cz), 'look': [cx, cz], 'yaw': yaw, 'pitch': pitch, 'dist': dist}
        if preset != '-': s['preset'] = preset
        s.update(extra); shots[f'{cam}-{suf}'] = s
json.dump(shots, open(out, 'w'))

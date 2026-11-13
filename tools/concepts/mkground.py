#!/usr/bin/env python3
"""Shots for the grass/ground study: one JSON per palette (the shader lush tint is fixed per browser process, so one process per palette).
usage: mkground.py <outdir>   -> <outdir>/shots-<key>.json   Scene: seed 7, river-valley, worldgen v21 (camp on a 30 m hill, alpine rise east, scrub south, woodland north)."""
import json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from ground_palettes import P, build

def village(cx, cz):
    """Six buildings and one field only: a 16-building village crashes the renderer page on this memory-starved box (see CONCEPTS_ADULT_2.md)."""
    b = [{'type': t, 'x': round(cx + dx, 1), 'z': round(cz + dz, 1)} for t, dx, dz in [('hearth', -8, -4), ('hut', -14, 8), ('hut', -6, 16), ('hut', 10, 14), ('hut', 18, 4), ('workshop', 22, -14)]]
    return {'buildings': b, 'farms': [{'x': round(cx - 40, 1), 'z': round(cz + 6, 1), 'stage': 'ripe'}], 'age': 3}

CAMP = (192.0, -28.0)
LIGHT = {  # same light for every palette; only the ground changes
 'mid':    {'summer': dict(hour=12.5, light={'sun': 1.0, 'sunColor': '#fff3df', 'hemi': 1.25, 'exposure': 1.3, 'sky': '#e9eef2', 'ground': '#7a6a55'}),
            'winter': dict(hour=12.0, light={'sun': 1.0, 'sunColor': '#fff3df', 'hemi': 1.25, 'exposure': 1.3, 'sky': '#e6ebef', 'ground': '#7a6a55'})},
 'gold':   {'summer': dict(hour=18.4, light={'sun': 1.45, 'sunColor': '#ffb868', 'hemi': 1.1, 'exposure': 1.3, 'sky': '#f0c99a', 'ground': '#6a4c34'}),
            'winter': dict(hour=15.5, light={'sun': 1.45, 'sunColor': '#ffb868', 'hemi': 1.1, 'exposure': 1.3, 'sky': '#e8cfb0', 'ground': '#6a5848'})},
}
# camera presets: (look x, z, yaw, pitch, dist)
CAMS = {
 'hill':  (CAMP[0] + 2, CAMP[1] + 6, .95, .32, 58),     # village on the hill, rock rise and trees in frame
 'alpine': (235, 50, .6, .30, 70), 'alpine2': (195, 62, 2.7, .22, 120), 'scrub': (205, 28, 1.9, .30, 70), 'wood': (-20, -215, .8, .30, 70), 'wet': (45, 38, .9, .30, 70),
}
def shot(cam, light, season, spec, extra=None):
    x, z, yaw, pitch, dist = CAMS[cam]; L = LIGHT[light]['winter' if season == 'winter' else 'summer']
    s = {'seed': 7, 'preset': 'river-valley', 'version': 21, 'width': 800, 'height': 450, 'quality': 'low', 'settle': 2, 'prep': village(*CAMP), 'look': [x, z], 'yaw': yaw, 'pitch': pitch, 'dist': dist,
         'mapStyle': 'painterly', 'season': season, 'renderStyle': 'village', 'hour': L['hour'], 'light': L['light']}
    if spec is not None: s['ground'] = spec
    if extra: s.update(extra)
    return s

PLAN = {  # key -> list of (name, cam, light, season)
 'g0-shipped': [('hill-mid', 'hill', 'mid', 'summer'), ('hill-gold', 'hill', 'gold', 'summer'), ('alpine-mid', 'alpine', 'mid', 'summer'), ('scrub-mid', 'scrub', 'mid', 'summer'), ('wood-mid', 'wood', 'mid', 'summer'), ('wet-mid', 'wet', 'mid', 'summer')],
 'g1-dry-season-dun-straw': [('hill-mid', 'hill', 'mid', 'summer'), ('hill-gold', 'hill', 'gold', 'summer')],
 'g2-olive-grey-meadow': [('hill-mid', 'hill', 'mid', 'summer'), ('hill-gold', 'hill', 'gold', 'summer')],
 'g3-boreal-blue-green-moss': [('hill-mid', 'hill', 'mid', 'summer'), ('hill-gold', 'hill', 'gold', 'summer'), ('wood-mid', 'wood', 'mid', 'summer')],
 'g4-heather-bracken-brown': [('hill-mid', 'hill', 'mid', 'autumn'), ('hill-gold', 'hill', 'gold', 'autumn'), ('alpine-mid', 'alpine', 'mid', 'autumn')],
 'g5-sun-bleached-steppe': [('hill-mid', 'hill', 'mid', 'summer'), ('hill-gold', 'hill', 'gold', 'summer'), ('scrub-mid', 'scrub', 'mid', 'summer')],
 'g6-wet-dark-pasture': [('hill-mid', 'hill', 'mid', 'summer'), ('hill-gold', 'hill', 'gold', 'summer'), ('wet-mid', 'wet', 'mid', 'summer')],
 'g7-autumn-rust': [('hill-mid', 'hill', 'mid', 'autumn'), ('hill-gold', 'hill', 'gold', 'autumn')],
 'g8-winter-frost': [('hill-mid', 'hill', 'mid', 'winter'), ('hill-gold', 'hill', 'gold', 'winter')],
 'g9-hearth-ramp': [('hill-mid', 'hill', 'mid', 'summer'), ('hill-gold', 'hill', 'gold', 'summer'), ('alpine-mid', 'alpine', 'mid', 'summer'), ('scrub-mid', 'scrub', 'mid', 'summer'), ('wood-mid', 'wood', 'mid', 'summer'), ('wet-mid', 'wet', 'mid', 'summer'),
                    ('hill-spring', 'hill', 'mid', 'spring'), ('hill-autumn', 'hill', 'mid', 'autumn'), ('hill-winter', 'hill', 'mid', 'winter')],
 'g9b-hearth-ramp-nolush': [('hill-mid', 'hill', 'mid', 'summer'), ('hill-gold', 'hill', 'gold', 'summer')],
}
if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    for key, rows in PLAN.items():
        spec = None
        if key != 'g0-shipped':
            spec, _ = build('g9-hearth-ramp' if key.startswith('g9b') else key)
            if key.startswith('g9b'): spec['lush'] = '1,1,1'
        shots = {}
        for name, cam, light, season in rows:
            s = shot(cam, light, season, spec)
            if season in ('spring', 'autumn') and 'hour' in s: s['hour'] = LIGHT[light]['summer']['hour']
            shots[f'{key}__{name}'] = s
        json.dump(shots, open(os.path.join(out, f'shots-{key}.json'), 'w'))
    print('wrote', len(PLAN), 'shot files')

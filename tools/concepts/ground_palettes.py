#!/usr/bin/env python3
"""Ground/grass palette study. Every palette is specified in HSL (degrees, %, %) from real vegetation colour, then expanded to the game's eight province kinds
(PAINTER_PALETTE in src/scene/painterGround.ts: grass[spring,summer,autumn,winter], dry, litter, sand, rock, rockWarm) plus leaf colours, with a saturation cap check.
Output: ground specs (for ground.mjs spec.ground), swatch table. Nothing here touches src/; the override is applied at runtime by tools/concepts/ground-entry.ts.
Real-colour anchors (colorimetry from field photographs and Munsell grass/soil charts, rounded): green summer pasture H75-95 S25-40 L30-40; olive-grey meadow H65-80 S14-22 L38-45;
dry-season dun/straw H38-48 S26-40 L48-60; sun-bleached steppe H44-52 S18-26 L58-68; boreal moss/needle floor H110-160 S12-26 L20-32; heather/bracken H18-30 S28-45 L28-38;
wet dark pasture H92-110 S22-30 L20-28; autumn bracken/rust H16-28 S40-52 L32-40; frosted winter grass H190-210 S6-12 L68-78 over dead straw H35-42 S14-20 L48-54."""
import colorsys, json, sys

def hsl(h, s, l):
    r, g, b = colorsys.hls_to_rgb((h % 360) / 360, l / 100, s / 100); return '#%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255))
def to_hsl(hexc):
    h = hexc.lstrip('#'); r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)); hh, l, s = colorsys.rgb_to_hls(r, g, b); return round(hh * 360), round(s * 100), round(l * 100)
def shift(c, dh=0, ds=0, dl=0, ms=1.0):
    h, s, l = c; return (h + dh, max(0, min(100, s * ms + ds)), max(4, min(95, l + dl)))

# palette = grass seasonal [spring, summer, autumn, winter] as (H,S,L) for meadow, + dry/litter/sand/rock/rockWarm, + tree leaf colours, + shader lush tint
P = {
 'g1-dry-season-dun-straw': dict(name='Dry-season dun and straw', season='summer', hour_note='late dry season', biome='steppe edge, dry-summer lowlands, Mediterranean hills', cap=36,
   grass=[(62, 24, 46), (44, 30, 52), (36, 32, 44), (38, 16, 50)], dry=(46, 34, 58), litter=(34, 28, 36), sand=(40, 34, 70), rock=(36, 8, 52), rockWarm=(30, 30, 54),
   leaf=dict(broadleaf=(78, 22, 34), conifer=(130, 14, 26), willow=(70, 22, 38), scrub=(54, 18, 40), acacia=(60, 20, 40), birch=(72, 24, 40)), lush='1.0,1.0,.9'),
 'g2-olive-grey-meadow': dict(name='Olive-grey meadow', season='summer', biome='temperate river valley, lowland meadow, mixed woodland edge', cap=28,
   grass=[(80, 24, 44), (72, 20, 42), (50, 26, 40), (62, 10, 46)], dry=(52, 28, 54), litter=(32, 24, 32), sand=(42, 28, 68), rock=(40, 6, 50), rockWarm=(30, 22, 50),
   leaf=dict(broadleaf=(86, 24, 32), conifer=(140, 16, 24), willow=(80, 22, 38), scrub=(62, 14, 40), birch=(80, 24, 40)), lush='1.0,1.0,.92'),
 'g3-boreal-blue-green-moss': dict(name='Cool blue-green boreal moss', season='summer', biome='boreal conifer forest, taiga, wet northern uplands', cap=26,
   grass=[(112, 22, 34), (128, 16, 30), (60, 18, 32), (170, 8, 44)], dry=(70, 16, 42), litter=(26, 24, 26), sand=(44, 20, 62), rock=(190, 6, 46), rockWarm=(24, 12, 44),
   leaf=dict(broadleaf=(110, 22, 28), conifer=(150, 22, 20), willow=(104, 22, 32), scrub=(90, 16, 30), birch=(96, 26, 36)), lush='.92,1.02,.98', moss='.14,.24,.14'),
 'g4-heather-bracken-brown': dict(name='Heather and bracken browns', season='autumn', biome='highland moor, upland heath, Atlantic hills', cap=46,
   grass=[(70, 20, 36), (30, 26, 34), (24, 38, 34), (30, 14, 40)], dry=(34, 28, 42), litter=(22, 34, 24), sand=(38, 24, 62), rock=(28, 6, 44), rockWarm=(20, 24, 42),
   leaf=dict(broadleaf=(60, 22, 30), conifer=(150, 16, 20), willow=(70, 20, 34), scrub=(24, 24, 32), birch=(48, 28, 40)), lush='1.0,.96,.86'),
 'g5-sun-bleached-steppe': dict(name='Sun-bleached steppe', season='summer', biome='continental steppe, dry plateau, semi-arid grassland', cap=28,
   grass=[(68, 22, 52), (48, 22, 62), (42, 24, 56), (40, 12, 64)], dry=(46, 28, 68), litter=(36, 22, 44), sand=(42, 30, 74), rock=(40, 8, 58), rockWarm=(32, 26, 58),
   leaf=dict(broadleaf=(70, 18, 38), conifer=(140, 12, 26), willow=(66, 18, 42), scrub=(50, 16, 46), acacia=(52, 18, 46), birch=(62, 20, 46)), lush='1.0,1.0,.95'),
 'g6-wet-dark-pasture': dict(name='Wet dark pasture', season='summer', biome='oceanic pasture, river bottoms, wet lowland after rain', cap=32,
   grass=[(96, 28, 28), (100, 26, 25), (62, 22, 26), (110, 10, 30)], dry=(64, 20, 36), litter=(26, 26, 22), sand=(40, 22, 54), rock=(150, 4, 38), rockWarm=(24, 16, 38),
   leaf=dict(broadleaf=(100, 28, 24), conifer=(150, 22, 18), willow=(92, 26, 28), scrub=(82, 18, 28), birch=(88, 26, 32)), lush='.94,1.02,.92', moss='.12,.2,.1'),
 'g7-autumn-rust': dict(name='Autumn rust and bracken', season='autumn', biome='temperate deciduous country in October, upland bracken', cap=52, autumn=('#b88a3a', '#8e4a2a', '#78803e'),
   grass=[(80, 24, 42), (72, 20, 40), (24, 46, 36), (40, 14, 44)], dry=(38, 36, 46), litter=(22, 40, 28), sand=(40, 28, 64), rock=(30, 8, 46), rockWarm=(20, 28, 44),
   leaf=dict(broadleaf=(32, 56, 38), conifer=(140, 16, 22), willow=(48, 40, 40), scrub=(36, 30, 36), birch=(42, 62, 50)), lush='1.0,.96,.84'),
 'g8-winter-frost': dict(name='Winter frost over dead grass', season='winter', biome='any temperate or boreal biome in deep winter, upland frost', cap=14,
   grass=[(70, 16, 46), (64, 12, 44), (40, 18, 42), (200, 8, 74)], dry=(38, 18, 52), litter=(28, 18, 30), sand=(38, 16, 66), rock=(210, 6, 52), rockWarm=(30, 10, 48),
   leaf=dict(broadleaf=(30, 14, 30), conifer=(160, 18, 20), willow=(40, 14, 34), scrub=(34, 12, 34), birch=(38, 10, 44)), lush='.96,1.0,1.0'),
 'g9-hearth-ramp': dict(name='RECOMMENDED: Hearth ramp (olive-sage)', season='summer', biome='default for every biome; varied by province, geology and season (see biome table)', cap=34,
   grass=[(84, 30, 46), (76, 28, 42), (38, 34, 44), (56, 10, 56)], dry=(46, 34, 56), litter=(30, 28, 32), sand=(40, 30, 68), rock=(36, 6, 50), rockWarm=(28, 26, 52),
   leaf=dict(broadleaf=(86, 28, 32), conifer=(145, 20, 22), willow=(80, 26, 38), scrub=(60, 16, 40), acacia=(58, 22, 42), birch=(80, 28, 40)), lush='1.0,1.0,.9', moss='.14,.22,.11'),
}
# province offsets from the meadow row (dH, dS, dL, S multiplier): woodland shadier, conifer darker/cooler, alpine paler/greyer, wetland darker/bluer, scrub warmer/drier, arid toward sand, coast brighter/yellower
KIND = {'meadow': (0, 0, 0, 1), 'mixed-woodland': (-6, 0, -6, .95), 'conifer-forest': (14, -2, -13, .85), 'alpine': (4, -4, 4, .7), 'wetland': (8, 0, -6, 1.0),
        'dry-scrub': (-16, 0, 6, .9), 'arid': (-28, -4, 14, .8), 'warm-coast': (-8, 0, 3, 1.0)}
def clamp_cap(c, cap):
    h, s, l = c; return (h, min(s, cap), l)

def build(key, shift_biome=None):
    p = P[key]; cap = p['cap']; spec = {'palette': {}, 'leaf': {}}; sw = {}
    for kind, (dh, ds, dl, ms) in KIND.items():
        row = {}
        gr = [clamp_cap(shift(c, dh, ds, dl, ms), cap) for c in p['grass']]
        row['grass'] = [hsl(*c) for c in gr]
        for nm in ('dry', 'litter', 'sand', 'rock', 'rockWarm'):
            c = p[nm]; c = clamp_cap(shift(c, dh * .4 if nm in ('dry', 'litter') else 0, 0, dl * .5 if nm in ('dry', 'litter') else 0), cap + 6) if nm not in ('sand', 'rock', 'rockWarm') else c
            row[nm] = hsl(*c)
        spec['palette'][kind] = row
        if kind == 'meadow': sw['grass'] = [to_hsl(x) for x in row['grass']]
    for f, c in p['leaf'].items(): spec['leaf'][f] = hsl(*c)
    spec['lush'] = p.get('lush', '1.0,1.0,.9')
    spec['foliage'] = {'top': [1.04, 1.03, .92], 'bottom': [.62, .70, .68]}   # shipped FOLIAGE vertex tint is top [1.2,1.15,.82] (a yellow push > 1) bottom [.62,.74,.72]
    if 'moss' in p: spec['moss'] = p['moss']
    if 'autumn' in p: spec['autumn'] = list(p['autumn'])
    else: spec['autumn'] = [hsl(40, 38, 44), hsl(22, 40, 36), hsl(66, 28, 38)]
    sat_max = max(to_hsl(x)[1] for k in spec['palette'].values() for x in k['grass'])
    return spec, dict(name=p['name'], season=p['season'], biome=p['biome'], cap=cap, satMaxGrass=sat_max,
        swatches={'spring': to_hsl(spec['palette']['meadow']['grass'][0]), 'summer': to_hsl(spec['palette']['meadow']['grass'][1]), 'autumn': to_hsl(spec['palette']['meadow']['grass'][2]), 'winter': to_hsl(spec['palette']['meadow']['grass'][3]),
                  'dry': to_hsl(spec['palette']['meadow']['dry']), 'litter': to_hsl(spec['palette']['meadow']['litter']), 'rock': to_hsl(spec['palette']['meadow']['rock']), 'rockWarm': to_hsl(spec['palette']['meadow']['rockWarm']),
                  'tree broadleaf': to_hsl(spec['leaf']['broadleaf']), 'tree conifer': to_hsl(spec['leaf']['conifer'])},
        hex={'spring': spec['palette']['meadow']['grass'][0], 'summer': spec['palette']['meadow']['grass'][1], 'autumn': spec['palette']['meadow']['grass'][2], 'winter': spec['palette']['meadow']['grass'][3],
             'dry': spec['palette']['meadow']['dry'], 'litter': spec['palette']['meadow']['litter'], 'rock': spec['palette']['meadow']['rock'], 'rockWarm': spec['palette']['meadow']['rockWarm'],
             'tree broadleaf': spec['leaf']['broadleaf'], 'tree conifer': spec['leaf']['conifer']})

if __name__ == '__main__':
    out = {}
    for k in P:
        spec, meta = build(k); out[k] = dict(spec=spec, meta=meta)
        print(k, 'sat max', meta['satMaxGrass'], '<= cap', meta['cap'], 'OK' if meta['satMaxGrass'] <= meta['cap'] else 'OVER')
    json.dump(out, open(sys.argv[1] if len(sys.argv) > 1 else 'ground-palettes.json', 'w'), indent=1)

#!/usr/bin/env python3
"""Boards for CONCEPTS_ADULT_2. usage: make_boards2.py <grass-dir> <hud-dir> <out-dir> [<pair-dir> <scene-shipped.png> <scene-masculine.png>]
Boards written: grass-overview.png, grass-biomes.png, hud-overview.png, hud-d1..d4.png (all screens per direction), masculine-scene.png (compare), recommended-pairing.png.
Missing renders are skipped (a board is only made when its core images exist). Mean luminance of every board is printed and must be >= 0.12."""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image, ImageDraw
from grade import mean_lum
from sheet import font
from ground_palettes import P, build, to_hsl

GR, HUD, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
BG, FG, DIM = (30, 29, 27), (236, 232, 222), (170, 166, 156)
HONEST = 'Harness render: real game terrain/trees/buildings (three.js, SwiftShader, worldgen v21 seed 7) with a runtime palette override. Not shipped game output.'
made = []

def img(p):
    return Image.open(p).convert('RGB') if os.path.exists(p) else None
def fit(im, w): return im.resize((w, round(w * im.height / im.width)), Image.LANCZOS)
def save(im, name):
    p = os.path.join(OUT, name); im.save(p); lum = mean_lum(im); made.append((name, lum)); print(f'{lum:.3f} {"NEAR-BLACK" if lum < .12 else "ok"} {name} {im.width}x{im.height}')

def swatch_panel(w, h, key):
    spec, meta = build(key); p = Image.new('RGB', (w, h), BG); d = ImageDraw.Draw(p)
    d.text((14, 10), meta['name'], fill=FG, font=font(21)); d.text((14, 40), 'suits: ' + meta['biome'], fill=DIM, font=font(14))
    d.text((14, 62), f"season rendered: {meta['season']}   grass S cap {meta['cap']}%   max S used {meta['satMaxGrass']}%", fill=DIM, font=font(14))
    x0, y0, sz = 14, 92, 54
    for i, (nm, hx) in enumerate(meta['hex'].items()):
        col, row = i % 5, i // 5; x, y = x0 + col * 122, y0 + row * 118
        d.rectangle([x, y, x + sz + 52, y + sz], fill=tuple(int(hx[j:j + 2], 16) for j in (1, 3, 5)), outline=(90, 88, 82))
        hh, ss, ll = meta['swatches'][nm]
        d.text((x, y + sz + 4), nm, fill=FG, font=font(13)); d.text((x, y + sz + 20), f'{hx}', fill=DIM, font=font(13)); d.text((x, y + sz + 36), f'H{hh} S{ss} L{ll}', fill=DIM, font=font(13))
    return p

def grass_overview():
    keys = ['g0-shipped'] + list(P) + ['g9b-hearth-ramp-nolush']
    tw = 560; rows = []
    for k in keys:
        a, b = img(f'{GR}/{k}__hill-mid.png'), img(f'{GR}/{k}__hill-gold.png')
        if a is None or b is None: print('skip', k); continue
        rows.append((k, a, b))
    if not rows: return
    th = round(tw * rows[0][1].height / rows[0][1].width); W = tw * 2 + 700; H = 70 + len(rows) * (th + 8)
    B = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(B)
    d.text((14, 8), 'Ground and grass palettes: same scene (hill village, rock rise, woodland), mid-day | golden hour | swatches (HSL)', fill=FG, font=font(22)); d.text((14, 40), HONEST, fill=DIM, font=font(14))
    for i, (k, a, b) in enumerate(rows):
        y = 70 + i * (th + 8); B.paste(fit(a, tw), (0, y)); B.paste(fit(b, tw), (tw, y))
        if k == 'g0-shipped':
            pn = Image.new('RGB', (700, th), BG); dd = ImageDraw.Draw(pn); dd.text((14, 10), 'SHIPPED default (no override)', fill=FG, font=font(21))
            dd.text((14, 42), 'meadow summer #8da44a = H72 S37 L47; broadleaf #6f9c3f = H88 S43 L42', fill=DIM, font=font(15)); dd.text((14, 66), 'plus shader lush tint x(1.09,1.02,.74): pushes grass toward lime', fill=DIM, font=font(15))
        elif k.startswith('g9b'):
            pn = Image.new('RGB', (700, th), BG); dd = ImageDraw.Draw(pn); dd.text((14, 10), 'Hearth ramp, lush tint REMOVED (1,1,1)', fill=FG, font=font(21))
            dd.text((14, 42), 'same palette as the row above; only the shader yellow-green push differs', fill=DIM, font=font(15))
        else: pn = swatch_panel(700, th, k)
        B.paste(pn, (tw * 2, y))
    save(B, 'grass-overview.png')

def grass_biomes():
    biomes = [('alpine / highland', 'alpine-mid', 'g4-heather-bracken-brown'), ('dry scrub / steppe edge', 'scrub-mid', 'g5-sun-bleached-steppe'), ('woodland / stand-in for boreal', 'wood-mid', 'g3-boreal-blue-green-moss'), ('wetland / river bottom', 'wet-mid', 'g6-wet-dark-pasture')]
    tw = 520; cells = []
    for nm, shot, fit_key in biomes:
        a, b, c = img(f'{GR}/g0-shipped__{shot}.png'), img(f'{GR}/{fit_key}__{shot}.png'), img(f'{GR}/g9-hearth-ramp__{shot}.png')
        if a is None and b is None and c is None: continue
        cells.append((nm, fit_key, [a, b, c]))
    seasons = [img(f'{GR}/g9-hearth-ramp__hill-{s}.png') for s in ('spring', 'mid', 'autumn', 'winter')]
    if not cells and not any(seasons): return
    th = round(tw * 450 / 800); H = 80 + len(cells) * (th + 36) + (th + 60 if any(seasons) else 0) + 330; W = tw * 3 + 40
    B = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(B)
    d.text((14, 8), 'Biome check: shipped | best-fit real-colour palette | recommended Hearth ramp (mid-day)', fill=FG, font=font(22)); d.text((14, 40), HONEST, fill=DIM, font=font(14))
    y = 72
    for nm, fk, ims in cells:
        d.text((14, y), f'{nm}   (middle = {fk})', fill=FG, font=font(17)); y += 26
        for i, im in enumerate(ims):
            if im is not None: B.paste(fit(im, tw), (i * (tw + 10) + 10, y))
            else: d.rectangle([i * (tw + 10) + 10, y, i * (tw + 10) + 10 + tw, y + th], outline=(90, 88, 82)); d.text((i * (tw + 10) + 24, y + 10), 'not rendered', fill=DIM, font=font(15))
        y += th + 10
    if any(seasons):
        d.text((14, y), 'Hearth ramp by season (same hill, mid-day): spring | summer | autumn | winter', fill=FG, font=font(17)); y += 26
        sw = (W - 50) // 4
        for i, im in enumerate(seasons):
            if im is not None: B.paste(fit(im, sw), (10 + i * (sw + 10), y))
        y += round(sw * 450 / 800) + 14
    spec, meta = build('g9-hearth-ramp'); rows = [
     'RECOMMENDED BASE RAMP (meadow row, HSL): spring H84 S30 L46 | summer H76 S28 L42 | autumn H38 S34 L44 | winter H56 S10 L56 | dry H46 S34 L56 | litter H30 S28 L32. Hard cap grass S <= 34%, never > 45% anywhere; shader lush tint 1,1,.9 (shipped 1.09,1.02,.74).',
     'BY BIOME (province offset on the base): woodland dH-6 L-6 | conifer dH+14 L-13 S x.85 | alpine L+4 S x.7 | wetland dH+8 L-6 | dry-scrub dH-16 L+6 | arid dH-28 L+14 S x.8 | warm coast dH-8 L+3.',
     'BY GEOLOGY (soil + rock tone under the grass, game ROCK_PALETTE): sandstone/arid: warm soil, grass drier (dry-scrub row) | limestone: cream soil, olive-grey grass | basalt/shale: dark soil, wet-dark pasture row | granite: grey-pink rock, heather/bracken row.',
     'BY SEASON: spring H84 S30 (greenest allowed) -> summer H76 S28 -> late summer drift toward dry H46 -> autumn H38 S34 with rust patches (#8e4a2a) -> winter H56 S10 L56 straw, frost over it. Saturation falls through the year; luminance holds mid (L 42-56).',
     'Trees follow the ramp: broadleaf H86 S28 L32, conifer H145 S20 L22 (shipped broadleaf is S43). Needs a tree material pass in the game, not only the ground vertex colour.']
    yy = H - 320
    for r in rows:
        words = r.split(' '); line = ''
        for wd in words:
            if d.textlength(line + wd, font=font(15)) > W - 28: d.text((14, yy), line, fill=FG, font=font(15)); yy += 20; line = ''
            line += wd + ' '
        d.text((14, yy), line, fill=FG, font=font(15)); yy += 28
    save(B.crop((0, 0, W, min(H, yy + 10))), 'grass-biomes.png')

VIEWS = ['glance', 'build', 'sel-building', 'council', 'contact', 'village', 'trade', 'ages', 'sel-unit', 'menu', 'testlab', 'alerts', 'map-closed']
DIRS = [('base', 'Shipped (current)'), ('d1-forged-iron', 'D1 Forged iron and charcoal'), ('d2-weathered-leather', 'D2 Weathered leather, bone, sinew'), ('d3-carved-slate', 'D3 Carved basalt and slate, ochre'), ('d4-war-room-table', 'D4 War-room map table')]
def hud_boards():
    key = ['glance', 'build', 'sel-building', 'council', 'contact']
    have = [(k, n) for k, n in DIRS if img(f'{HUD}/{k}-glance.png') is not None]
    if not have: return
    tw = 520; th = round(tw * 900 / 1440); W = 190 + tw * len(key); H = 70 + len(have) * (th + 8)
    B = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(B); d.text((14, 8), 'HUD directions on the real Hearth HUD: glance | build tray | building card | council | first contact (1440x900, desktop)', fill=FG, font=font(21)); d.text((14, 40), 'Harness render of src/ui/hearth with injected CSS only. Backdrop is a terrain still, not live.', fill=DIM, font=font(14))
    for r, (k, n) in enumerate(have):
        y = 70 + r * (th + 8); d.text((8, y + 8), n, fill=FG, font=font(15))
        for c, v in enumerate(key):
            im = img(f'{HUD}/{k}-{v}.png')
            if im is not None: B.paste(fit(im, tw), (190 + c * tw, y))
    save(B, 'hud-overview.png')
    for k, n in have[1:]:
        ims = [(v, img(f'{HUD}/{k}-{v}.png')) for v in VIEWS]; ims = [(v, i) for v, i in ims if i is not None]
        if not ims: continue
        cols = 3; tw2 = 620; th2 = round(tw2 * 900 / 1440); rows = (len(ims) + cols - 1) // cols
        m = {}
        try: m = json.load(open(f'{HUD}/{k}-measure.json'))
        except Exception: pass
        B = Image.new('RGB', (cols * tw2 + (cols + 1) * 8, 120 + rows * (th2 + 34)), BG); d = ImageDraw.Draw(B)
        d.text((14, 8), n + '  (all screens)', fill=FG, font=font(24))
        cm = [m[v]['contrastMin'] for v in m if isinstance(m[v], dict) and 'contrastMin' in m[v]]
        c10 = [m[v]['contrastP10'] for v in m if isinstance(m[v], dict) and 'contrastP10' in m[v]]
        if cm: d.text((14, 44), f"pixel-sampled text contrast over {len(cm)} screens: worst min {min(cm)}, worst p10 {min(c10)}; min text px {min(m[v]['minText'] for v in m if 'minText' in m[v])}, min icon px {min(m[v]['minIcon'] for v in m if 'minIcon' in m[v])}, min tap px {min(m[v]['minTap'] for v in m if 'minTap' in m[v])}", fill=DIM, font=font(15))
        for i, (v, im) in enumerate(ims):
            x, y = 8 + (i % cols) * (tw2 + 8), 120 + (i // cols) * (th2 + 34); B.paste(fit(im, tw2), (x, y)); mv = m.get(v, {})
            d.text((x + 2, y + th2 + 4), f"{v}   contrast min {mv.get('contrastMin','-')} p10 {mv.get('contrastP10','-')}   text<16: {mv.get('textBelow16','-')}  tap<52: {mv.get('tapsBelow52','-')}", fill=FG, font=font(14))
        save(B, 'hud-' + k.split('-')[0] + '.png')


def pairing(pair_dir, scene_raw, scene_masc):
    """masculine-scene.png (shipped vs masculine, scene alone and with HUD) and recommended-pairing.png (ramp + HUD tokens + grade numbers + luminance)."""
    from ui_directions import DIRS as UD
    a, b = img(f'{pair_dir}/base-glance.png'), img(f'{pair_dir}/d1-forged-iron-glance.png')
    a2, b2 = img(f'{pair_dir}/base-sel-building.png'), img(f'{pair_dir}/d1-forged-iron-sel-building.png')
    b3, a3 = img(f'{pair_dir}/d1-forged-iron-build.png'), img(f'{pair_dir}/base-build.png')
    sa, sb = img(scene_raw), img(scene_masc)
    if not (a and b and sa and sb): print('skip pairing'); return
    tw = 900; th = round(tw * 900 / 1440); W = tw * 2 + 30; rows = [(sa, sb, 'scene alone: shipped | masculine (Hearth ramp + post building remap + restrained grade)'), (a, b, 'glance: shipped HUD on shipped scene | D1 Forged iron on masculine scene'), (a2, b2, 'building card'), (a3, b3, 'build tray')]
    H = 70 + sum((round(tw * (i.height / i.width)) + 34) for i, _, _ in [(r[0], 0, 0) for r in rows if r[0] and r[1]])
    B = Image.new('RGB', (W, H + 20), BG); d = ImageDraw.Draw(B); d.text((14, 8), 'Same view, same camera, same light: current look vs the masculine variant (desktop 1440x900)', fill=FG, font=font(22)); d.text((14, 40), HONEST + ' Building remap and grade are POST on a PNG.', fill=DIM, font=font(14))
    y = 70
    for l, r, cap in rows:
        if l is None or r is None: continue
        d.text((14, y), cap, fill=FG, font=font(16)); y += 24; B.paste(fit(l, tw), (10, y)); B.paste(fit(r, tw), (tw + 20, y)); y += round(tw * l.height / l.width) + 10
    save(B.crop((0, 0, W, y + 6)), 'masculine-scene.png')
    # recommended pairing board
    spec, meta = build('g9-hearth-ramp'); from ui_directions import DIRS as DD
    p = DD['d1-forged-iron']['pal']
    W2, H2 = 1800, 1480; C = Image.new('RGB', (W2, H2), BG); dc = ImageDraw.Draw(C)
    dc.text((14, 8), 'Recommended pairing: Hearth ramp (ground) + D1 Forged iron (HUD) + masculine scene grade', fill=FG, font=font(26)); dc.text((14, 44), 'Concept only. Nothing here is wired into the game. ' + HONEST, fill=DIM, font=font(14))
    C.paste(fit(b, 1100), (14, 80)); lum = {'scene shipped': mean_lum(sa), 'scene masculine': mean_lum(sb), 'HUD+scene glance': mean_lum(b), 'HUD+scene build tray': mean_lum(b3) if b3 else 0}
    x0 = 1140; y0 = 86
    dc.text((x0, y0), 'Ground ramp (meadow row, HSL)', fill=FG, font=font(18)); y0 += 30
    for i, nm in enumerate(['spring', 'summer', 'autumn', 'winter', 'dry', 'litter', 'rock', 'tree broadleaf', 'tree conifer']):
        hx = meta['hex'][nm]; hh, ss, ll = meta['swatches'][nm]; xx, yy = x0 + (i % 3) * 215, y0 + (i // 3) * 74
        dc.rectangle([xx, yy, xx + 60, yy + 52], fill=tuple(int(hx[j:j + 2], 16) for j in (1, 3, 5)), outline=(90, 88, 82)); dc.text((xx + 68, yy + 4), nm, fill=FG, font=font(13)); dc.text((xx + 68, yy + 22), hx, fill=DIM, font=font(13)); dc.text((xx + 68, yy + 38), f'H{hh} S{ss} L{ll}', fill=DIM, font=font(13))
    y0 += 3 * 74 + 14; dc.text((x0, y0), 'HUD tokens (D1 Forged iron)', fill=FG, font=font(18)); y0 += 30
    for i, (nm, k) in enumerate([('panel', 'panel'), ('panel2', 'panel2'), ('text', 'text'), ('dim', 'dim'), ('bronze accent', 'accent'), ('accent hi', 'accent2')]):
        hx = p[k]; xx, yy = x0 + (i % 3) * 215, y0 + (i // 3) * 64
        dc.rectangle([xx, yy, xx + 60, yy + 44], fill=tuple(int(hx[j:j + 2], 16) for j in (1, 3, 5)), outline=(90, 88, 82)); dc.text((xx + 68, yy + 6), nm, fill=FG, font=font(13)); dc.text((xx + 68, yy + 24), hx, fill=DIM, font=font(13))
    y0 += 2 * 64 + 18; dc.text((x0, y0), 'Scene grade (post): sat .90, contrast .35, vignette .20,', fill=DIM, font=font(13)); dc.text((x0, y0 + 18), 'shadow #566070, highlight #f1cd9c; building remap hue 30-62 -> 34, sat x.42, val x.82', fill=DIM, font=font(13)); y0 += 50
    dc.text((x0, y0), 'Mean luminance (0-1, near-black threshold 0.12)', fill=FG, font=font(18)); y0 += 28
    for k, v in lum.items(): dc.text((x0, y0), f'{k}: {v:.3f}  {"ok" if v >= .12 else "NEAR-BLACK"}', fill=FG, font=font(15)); y0 += 22
    C.paste(fit(sb, 560), (x0, y0 + 14))
    if b2: C.paste(fit(b2, 1100), (14, 80 + round(1100 * 900 / 1440) + 14))
    save(C, 'recommended-pairing.png')

if __name__ == '__main__':
    grass_overview(); grass_biomes(); hud_boards()
    if len(sys.argv) > 6: pairing(sys.argv[4], sys.argv[5], sys.argv[6])
    bad = [n for n, l in made if l < .12]
    if bad: print('NEAR-BLACK boards:', bad); sys.exit(1)

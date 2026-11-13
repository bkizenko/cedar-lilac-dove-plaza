#!/usr/bin/env python3
"""Assemble the concept boards. usage: make_boards.py <graded-dir> <ui-dir> <out-dir>
Boards: h-grown-v1..v4.png (per variant), h-grown-overview.png, ui-palettes-board.png, recommended-pairing.png (needs pair-*.png from run-pairing)."""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image, ImageDraw, ImageFont
from grade import mean_lum
from recipes import H_VARIANTS, recipe
from ui_palettes import PALETTES, checks
from sheet import font, sheet

G, U, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
BG, FG, DIM = (26, 24, 22), (240, 232, 214), (176, 166, 148)
HONEST = 'Harness render: real game scene (three.js, SwiftShader) with experimental light and colour grade applied in tools/concepts. Not an illustration, not shipped game output.'

def fit(im, w, h=None):
    if h is None: h = round(w * im.height / im.width)
    return im.resize((w, h), Image.LANCZOS)

def swatches(im, n=6):
    q = im.convert('RGB').resize((200, 112)).quantize(colors=n, method=Image.Quantize.MEDIANCUT).convert('RGB')
    cols = sorted(q.getcolors(), reverse=True)[:n]
    return [c for _, c in cols]

def hexof(c): return '#%02x%02x%02x' % c

def variant_board(v):
    d = H_VARIANTS[v]
    hs, hw = Image.open(f'{G}/hero-{v}-summer.png').convert('RGB'), Image.open(f'{G}/hero-{v}-winter.png').convert('RGB')
    cs, cw = Image.open(f'{G}/close-{v}-summer.png').convert('RGB'), Image.open(f'{G}/close-{v}-winter.png').convert('RGB')
    W, H = 1920, 1130
    b = Image.new('RGB', (W, H), BG); dr = ImageDraw.Draw(b)
    dr.text((24, 14), f"Option H, grown up  /  {v.upper()}  {d['name']}", fill=FG, font=font(28))
    dr.text((24, 54), d['note'], fill=DIM, font=font(17))
    b.paste(fit(hs, 1100), (24, 92)); dr.text((30, 100 + 4), 'SUMMER', fill=(255, 255, 255), font=font(15))
    b.paste(fit(cs, 543), (24, 92 + 619 + 12)); b.paste(fit(cw, 543), (24 + 557, 92 + 619 + 12))
    b.paste(fit(hw, 760), (1148, 92))
    y = 92 + 428 + 14
    sw = swatches(hs)
    for i, c in enumerate(sw):
        dr.rectangle((1148 + i * 127, y, 1148 + i * 127 + 120, y + 56), fill=c); dr.text((1148 + i * 127, y + 60), hexof(c), fill=DIM, font=font(14))
    y += 96
    s, w = recipe(v, 'summer'), recipe(v, 'winter')
    lines = [f"mean luminance  summer {mean_lum(hs):.2f}   winter {mean_lum(hw):.2f}   (0 black, 1 white; none near-black)",
             f"light override  see tools/concepts/looks-h-grown.json  ({v}-summer / {v}-winter)",
             f"grade summer    exp {s['exposure']}  sat {s['sat']}  contrast {s['contrast']}  bloom {s['bloom']}  vignette {s['vignette']}",
             f"grade winter    exp {w['exposure']}  sat {w['sat']}  contrast {w['contrast']}  bloom {w.get('bloom', 0)}  vignette {w['vignette']}",
             f"material remap  timber -> plaster/clay: sat x{s['wood']['sat']}  hue->{s['wood']['hue_to']} deg;  greens -> sage: sat x{s['green']['sat']}  hue->{s['green']['hue_to']} deg",
             'forms           Option H legacy building grammar (Codex proportions) + painterly terrain; no wood grain, no carved terraces',
             'trees           game lobed set; still blocky at the start camp (grade cannot round them: needs a model pass)']
    import textwrap
    yy = y
    for i, t in enumerate(lines):
        for k, part in enumerate(textwrap.wrap(t, 70, subsequent_indent='                ')):
            dr.text((1148, yy), part, fill=FG if i < 2 else DIM, font=font(15)); yy += 22
        yy += 4
    dr.text((1154, 100), 'WINTER', fill=(255, 255, 255), font=font(15))
    dr.text((24, H - 28), HONEST, fill=DIM, font=font(14))
    p = f'{OUT}/h-grown-{v}-{d["name"].lower().replace(",", "").replace(" ", "-")}.png'; b.save(p); return p

def overview():
    items = []
    for season in ('summer', 'winter'):
        for v in H_VARIANTS:
            items.append((f"{v} {H_VARIANTS[v]['name']} / {season}", f'{G}/hero-{v}-{season}.png'))
    p = f'{OUT}/h-grown-overview.png'; sheet(p, 4, 470, 'Option H, grown up: four variants x summer / winter (harness renders + experimental grade)', items); return p

def ui_board():
    keys = list(PALETTES)
    cw, ph = 700, 394          # desktop thumb 700x437 (1440x900), phone thumb
    cell_w = 940; W = 2 * cell_w + 3 * 12; rowh = 530
    H = 70 + 3 * rowh
    b = Image.new('RGB', (W, H), BG); dr = ImageDraw.Draw(b)
    dr.text((24, 12), 'Hearth HUD colour schemes: same content, flat matte panels, hard edges, serif or humanist type, text floor 16px, icons 24px+', fill=FG, font=font(22))
    dr.text((24, 44), 'Real HudHearth components re-tinted by tools/concepts/ui_palettes.py over a graded harness render. Minimap canvas stays the shipped dark navy.', fill=DIM, font=font(15))
    for i, k in enumerate(keys):
        p = PALETTES[k]; x, y = 12 + (i % 2) * (cell_w + 12), 70 + (i // 2) * rowh
        g = Image.open(f'{U}/{k}-glance.png').convert('RGB'); ph_im = Image.open(f'{U}/{k}-phone.png').convert('RGB')
        dr.rectangle((x, y, x + cell_w - 1, y + rowh - 8), fill=(34, 32, 29))
        dr.text((x + 10, y + 6), f"{k[:2].upper()}  {p['name']}   ({p['mode']})", fill=FG, font=font(20))
        b.paste(fit(g, 640), (x + 10, y + 36)); b.paste(fit(ph_im, 214, 463), (x + 10 + 640 + 12, y + 36 - 0 if False else y + 36))
        c = checks(p); m = json.load(open(f'{U}/{k}-measure.json'))
        fs = min(r[3] for r in m if r[3]); ic = min(min(r[1], r[2]) for r in m if r[0].startswith('svg'))
        dr.text((x + 10, y + 36 + 400 + 6), f"contrast text {c['text/panel']:.1f}  dim {c['dim/panel']:.1f}  accent on panel {c['accent/panel']:.1f}  ink on accent {c['accent_ink/accent']:.1f}   min text {fs:.0f}px  min icon {ic}px", fill=DIM, font=font(13))
        sx = x + 10
        for j, col in enumerate((p['panel'], p['panel2'], p['text'], p['accent'], p['accent2'], p['good'], p['bad'])):
            dr.rectangle((sx + j * 36, y + 36 + 424, sx + j * 36 + 30, y + 36 + 424 + 26), fill=col, outline=(90, 86, 80))
        dr.text((sx, y + 36 + 456), p['note'][:96], fill=DIM, font=font(13))
    pth = f'{OUT}/ui-palettes-board.png'; b.save(pth); return pth

def pairing(P):
    cells = [('A  RECOMMENDED: V1 Honey stone and plaster + P1 Honey and charcoal  (summer)', 'pair-A-v1-summer-p1.png'),
             ('A  same pairing in winter', 'pair-A-v1-winter-p1.png'),
             ('B  evening alternative: V3 Golden hour + P5 Indigo dusk and amber', 'pair-B-v3-summer-p5.png'),
             ('C  quiet alternative: V2 Earth tones + P3 Slate and bronze', 'pair-C-v2-summer-p3.png')]
    cw = 940; W = 2 * cw + 36; ch = 36 + 587 + 14; H = 150 + 2 * ch + 40
    b = Image.new('RGB', (W, H), BG); dr = ImageDraw.Draw(b)
    dr.text((24, 12), 'Recommended pairing: scene look + HUD scheme (harness renders, real Hearth HUD over graded real scene)', fill=FG, font=font(24))
    why = ['Why A: honey key light carries H warmth; plaster and sage greens drop the toy brightness; charcoal flat panels with a single honey accent keep the controls minimal like H.',
           'No wood anywhere: panels are matte flat fills, 4px corners, Lora headings + Inter body, text >= 16px, icons >= 24px, text contrast 13.7:1.',
           'B is the moodier time-of-day set; C is the safest if honey UI accents feel too yellow against the plaster. Light-panel schemes (P2, P4, P6) are on the palette board.']
    for i, t in enumerate(why): dr.text((24, 56 + i * 26), t, fill=DIM if i else FG, font=font(16))
    for i, (t, f) in enumerate(cells):
        x, y = 12 + (i % 2) * (cw + 12), 150 + (i // 2) * ch
        dr.text((x + 4, y), t, fill=FG, font=font(18)); b.paste(fit(Image.open(f'{U}/../pair/{f}').convert('RGB'), cw - 8), (x + 4, y + 30))
    dr.text((24, H - 26), HONEST, fill=DIM, font=font(14))
    pth = f'{OUT}/recommended-pairing.png'; b.save(pth); return pth

if __name__ == '__main__':
    what = sys.argv[4] if len(sys.argv) > 4 else 'all'
    outs = []
    if what in ('all', 'h'):
        outs += [variant_board(v) for v in H_VARIANTS] + [overview()]
    if what in ('all', 'ui'):
        outs.append(ui_board())
    if what in ('all', 'pair'):
        outs.append(pairing(None))
    print('\n'.join(outs))

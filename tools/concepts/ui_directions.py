#!/usr/bin/env python3
"""Four 'masculine' HUD directions applied to the REAL Hearth HUD (src/ui/hearth/*.css untouched). Each is a coherent system (tokens + structure + type),
built on ui_palettes.build_css (flatten gradients/shadows, text floor 16px) plus a direction layer. Output: <out>/d1..d4.css and rules.json (printed numbers).
Design rules shared by all four (docs/concepts/CONCEPTS_ADULT_2.md): radius 0-4px, flat matte fills, no gradients, hard 2-3px strokes, one accent, text 16px+, icons 24px+, taps 52px+.
Harness font note: the condensed face is TeX Gyre Heros Cn (installed here). The repo allows Inter, Lora, Cormorant Garamond, Outfit; a condensed grotesque is NOT in the repo's font list yet."""
import os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from ui_palettes import build_css, contrast

def rgb(h): h = h.lstrip('#'); return ','.join(str(int(h[i:i + 2], 16)) for i in (0, 2, 4))

SANS = "'Inter',system-ui,sans-serif"; SERIF = "'Lora',Georgia,serif"; COND = "'TeX Gyre Heros Cn','Inter Display','Inter',sans-serif"

DIRS = {
 'd1-forged-iron': dict(name='Forged iron and charcoal', pal=dict(mode='dark', panel='#1d1f21', panel2='#292c2f', text='#e7e4dd', dim='#b9b5ab', accent='#b7803f', accent2='#d09a55', accent_ink='#16110b',
     good='#a9c58a', bad='#e08a6c', warn='#d7a95a', water='#8fb9c8', parch='#d9d4c7', ink='#1d1f21', sans=SANS, display=COND),
   radii=(1, 2, 2), line='#55595d', note='charcoal plate, 2px hard-cut corners, bronze as the only accent, stencil-condensed uppercase headers, rivet-less and flat'),
 'd2-weathered-leather': dict(name='Weathered leather, bone and sinew', pal=dict(mode='dark', panel='#352a20', panel2='#42352a', text='#eee3cd', dim='#cbbca1', accent='#cdb98c', accent2='#e0cfa4', accent_ink='#241a10',
     good='#adc48a', bad='#e49a7c', warn='#dcb766', water='#94bcc6', parch='#e3d6b8', ink='#2b2016', sans=SANS, display=SERIF),
   radii=(2, 3, 4), line='#6b5a46', note='matte oiled leather, stitched edge (dashed inset), bone and sinew text/accent, serif bold headers'),
 'd3-carved-slate': dict(name='Carved basalt and slate, ochre pigment', pal=dict(mode='dark', panel='#23272a', panel2='#2d3236', text='#e4e6e4', dim='#b1b8b9', accent='#c88f3b', accent2='#dea854', accent_ink='#1a1409',
     good='#a7c78e', bad='#e58f72', warn='#dcb05c', water='#8fbfd0', parch='#d8dad4', ink='#23272a', sans=SANS, display=SERIF),
   radii=(0, 0, 0), line='#5b6367', note='cut stone: zero radius, etched double line (inset hairline), ochre pigment fills only for the active/primary state, tracked serif capitals'),
 'd4-war-room-table': dict(name='War-room map table', pal=dict(mode='dark', panel='#1c2520', panel2='#26312b', text='#ece1c8', dim='#c3b99f', accent='#b8944a', accent2='#d1ae63', accent_ink='#17130a',
     good='#a9c58a', bad='#e08c70', warn='#d9b05f', water='#8fbccb', parch='#dccdab', ink='#2a2519', sans=SERIF, display=SERIF),
   radii=(2, 2, 3), line='#6a6a52', note='dark baize felt, parchment cards with ink text, brass hairlines, wax-seal red only for danger, serif everywhere'),
}

def common(k, d):
    p = d['pal']; r1, r2, r3 = d['radii']; line = d['line']; lr = rgb(line)
    return f"""
:root:not([data-hw-ui]){{--hw-r-s:{r1}px;--hw-r-m:{r2}px;--hw-r-l:{r3}px;--hw-hit:52px;--hw-line:{line};--hw-line-strong:{p['dim']}66;--hw-shadow:0 2px 0 rgba(0,0,0,.55);--hw-fs-xl:30px}}
.hw-res,.hw-time,.hw-speed,.hw-rail,.hw-dock,.hw-tray,.hw-place,.hw-sel,.hw-map,.hw-flag,.hw-paused,.hw-restore{{border:2px solid {line};box-shadow:0 2px 0 rgba(0,0,0,.55)}}
.hw-screen{{border:2px solid {line};box-shadow:0 6px 0 rgba(0,0,0,.5)}}
.hw-scrim{{background:rgba(8,9,9,.62)}}
.hw .hw-chip{{border-radius:{r1}px;border-width:1px}}
.hw .hw-badge{{border-radius:{r1}px;top:3px;right:8px}}
.hw .hw-tile-icon,.hw .hw-medal,.hw .hw-medal-s,.hw .hw-medal-l{{border-radius:{r2}px;background:{p['panel2']}!important;border:2px solid {line}!important;color:{p['accent2']}!important}}
.hw .hw-bar{{border-radius:0;height:12px;background:#0d0e0e}}.hw .hw-bar i{{border-radius:0;background:{p['good']}}}.hw .hw-bar i.t-bad{{background:{p['bad']}}}
.hw .hw-tile{{border-width:2px;border-radius:{r2}px;background:{p['panel2']}}}.hw .hw-tile.is-on{{border-color:{p['accent2']};background:{p['panel2']};box-shadow:inset 0 -4px 0 {p['accent']}}}
.hw .hw-tile:hover:not(:disabled){{transform:none;background:{p['panel2']};border-color:{p['accent']}}}
.hw .hw-dock-btn{{width:96px;height:78px;border-radius:{r2}px;border:2px solid transparent}}
.hw .hw-dock-btn.is-on,.hw .hw-btn.is-on,.hw .hw-primary{{background:{p['accent']};color:{p['accent_ink']};border-color:{p['accent']}}}
.hw .hw-btn,.hw .hw-btn-wide,.hw .hw-primary{{border-width:2px;border-radius:{r2}px;min-height:52px}}
.hw .hw-btn{{width:52px;height:52px}}.hw .hw-era{{min-height:52px;border-width:2px;border-radius:{r2}px}}.hw .hw-note-x{{width:52px;height:52px}}
.hw .hw-tabs button{{border-radius:0;border-bottom-width:4px;min-height:52px}}
.hw .hw-res-cell{{border-radius:{r1}px}}.hw .hw-res-cell b{{font-weight:800}}
.hw .hw-sel{{max-height:min(58dvh,560px)}}
.hw .hw-note{{border-radius:{r2}px;border:2px solid {line};border-left-width:8px;box-shadow:0 2px 0 rgba(0,0,0,.55)}}
.hw .hw-map-frame{{border:2px solid {p['accent']};border-radius:{r1}px;box-shadow:none}}
.hw .hw-map-collapse,.hw .hw-map-reopen{{border-radius:{r2}px}}
.hw .hw-screen-head{{border-bottom:2px solid {line}}}
.hw .hw-card{{border-radius:{r2}px;border:2px solid {line};background:{p['panel2']}}}
.hw-screen-head h1,.hw-sel-title h2,.hw-card h3,.hw-tabs button,.hw-dock-btn span,.hw-tile-name,.hw-time-text b,.hw-note-main b{{font-family:var(--font-display)}}
"""

SPEC = {
 'd1-forged-iron': lambda p: f"""
.hw-screen-head h1,.hw-card h3,.hw-sel-title h2,.hw-dock-btn span,.hw-tabs button,.hw-era span,.hw-tile-name{{text-transform:uppercase;letter-spacing:.09em;font-weight:700}}
.hw-screen-head h1{{font-size:30px;color:{p['accent2']};letter-spacing:.14em}}
.hw-res-cell b,.hw-time-text b{{font-family:{COND};font-size:26px;letter-spacing:.02em}}
.hw-sel-title h2{{font-size:24px}}
.hw-res,.hw-time,.hw-speed,.hw-rail,.hw-dock,.hw-tray,.hw-sel,.hw-map{{background:{p['panel']}}}
.hw-res,.hw-dock,.hw-sel,.hw-time{{border-top:4px solid {p['accent']}}}
.hw-note{{background:{p['panel2']};color:{p['text']}}}.hw-note .hw-chip{{background:{p['panel']};color:{p['text']};border-color:#55595d}}.hw-note-x{{color:{p['text']}}}.hw-note .t-bad,.hw-note .hw-chip.t-bad{{color:{p['bad']}}}
.hw-note.n-bad{{border-left-color:{p['bad']}}}.hw-note.n-good{{border-left-color:{p['good']}}}
.hw-note.hw-crit{{background:{p['panel2']};border-color:{p['bad']};border-left:10px solid {p['bad']}}}.hw-note.hw-crit *{{color:{p['text']}}}.hw-note.hw-crit .hw-chip{{background:{p['bad']};color:#1a120d;border-color:{p['bad']}}}
""",
 'd2-weathered-leather': lambda p: f"""
.hw-res,.hw-time,.hw-speed,.hw-rail,.hw-dock,.hw-tray,.hw-sel,.hw-map,.hw-screen,.hw-note{{background:{p['panel']};position:relative}}
.hw-res,.hw-time,.hw-speed,.hw-rail,.hw-dock,.hw-tray,.hw-sel,.hw-map,.hw-screen{{border:2px solid #1b140d;outline:2px dashed {p['accent']}99;outline-offset:-7px}}
.hw-rail,.hw-rail{{position:absolute}}.hw-res,.hw-time,.hw-speed,.hw-dock,.hw-tray,.hw-sel,.hw-map{{padding-block:10px}}
.hw-screen-head h1,.hw-card h3,.hw-sel-title h2{{font-weight:700;letter-spacing:.02em}}
.hw-screen-head h1{{color:{p['accent2']};font-size:32px}}
.hw-card{{background:{p['panel2']};border-color:#1b140d;outline:1px dashed {p['accent']}77;outline-offset:-5px}}
.hw-dock-btn span,.hw-tabs button{{font-family:{SERIF};font-weight:700}}
.hw-note{{background:#e3d6b8;color:#2b2016;border-color:#1b140d;outline:2px dashed #7a6546aa;outline-offset:-6px}}.hw-note.n-bad{{border-left-color:#9a3a22}}.hw-note.hw-crit{{background:#dcc3a6;border-left:10px solid #9a3a22}}
""",
 'd3-carved-slate': lambda p: f"""
.hw-res,.hw-time,.hw-speed,.hw-rail,.hw-dock,.hw-tray,.hw-sel,.hw-map,.hw-screen,.hw-note,.hw-card{{background:{p['panel']};box-shadow:inset 0 0 0 4px {p['panel']},inset 0 0 0 5px #6d777c66,0 2px 0 rgba(0,0,0,.6)}}
.hw-card{{background:{p['panel2']};box-shadow:inset 0 0 0 3px {p['panel2']},inset 0 0 0 4px #6d777c55}}
.hw-screen-head h1,.hw-card h3,.hw-sel-title h2,.hw-dock-btn span,.hw-tabs button,.hw-tile-name{{text-transform:uppercase;letter-spacing:.13em;font-weight:700;font-family:{SERIF}}}
.hw-screen-head h1{{font-size:28px;color:{p['text']};letter-spacing:.2em}}
.hw-dock-btn span,.hw-tile-name{{font-size:16px;letter-spacing:.08em}}
.hw-tabs button[aria-selected=true]{{color:{p['accent2']};border-bottom-color:{p['accent']}}}
.hw-note{{background:{p['panel2']};color:{p['text']}}}.hw-note .hw-chip{{background:{p['panel']};color:{p['text']};border-color:#5b6367}}.hw-note-x{{color:{p['text']}}}.hw-note .t-bad,.hw-note .hw-chip.t-bad{{color:{p['bad']}}}
.hw-note.n-bad{{border-left-color:{p['bad']}}}
.hw-note.hw-crit{{background:{p['panel2']};border-color:{p['bad']};border-left:10px solid {p['bad']}}}.hw-note.hw-crit *{{color:{p['text']}}}.hw-note.hw-crit .hw-chip{{background:{p['bad']};color:#1a120d;border-color:{p['bad']}}}
.hw-chip{{border-color:#5b6367}}
""",
 'd4-war-room-table': lambda p: f"""
.hw-res,.hw-time,.hw-speed,.hw-rail,.hw-dock,.hw-tray,.hw-sel,.hw-map,.hw-screen{{background:{p['panel']};border:2px solid {p['accent']}88;box-shadow:inset 0 0 0 4px {p['panel']},inset 0 0 0 5px {p['accent']}55,0 3px 0 rgba(0,0,0,.55)}}
.hw-screen-head h1,.hw-card h3,.hw-sel-title h2,.hw-dock-btn span,.hw-tabs button,.hw-tile-name{{font-variant:small-caps;letter-spacing:.07em;font-weight:700}}
.hw-screen-head h1{{font-size:32px;color:{p['accent2']}}}
.hw .hw-card{{background:{p['parch']};color:{p['ink']};border:2px solid #7a6a45;box-shadow:inset 0 0 0 3px {p['parch']},inset 0 0 0 4px #7a6a4577}}
.hw-card h3,.hw-card p,.hw-card b,.hw-card span,.hw-card li,.hw-card label,.hw-card em,.hw-card small{{color:{p['ink']}!important}}
.hw .hw-card .hw-chip{{background:#c9b98f;border-color:#7a6a45;color:{p['ink']}}}.hw .hw-card svg{{color:#5a4a2a!important}}
.hw-card .t-bad{{color:#8f2f25!important}}.hw-card .t-good{{color:#3d5f2a!important}}
.hw-note.hw-crit{{background:#d9bf9c}}
.hw-note{{background:{p['parch']};color:{p['ink']};border-color:#7a6a45;border-left:8px solid #8f2f25}}.hw-note.n-good{{border-left-color:#4f6f36}}
.hw-note .hw-chip{{background:#c9b98f;border-color:#7a6a45;color:{p['ink']}}}
.hw-badge{{background:#8f2f25;color:#f4e8d0}}
.hw-time-text b,.hw-res-cell b{{font-family:{SERIF}}}
""",
}

def build(k):
    d = DIRS[k]; p = dict(d['pal']); p['tint'] = rgb(p['text']); p['acc_rgb'] = rgb(p['accent'])
    return build_css(p) + common(k, d) + SPEC[k](p), p

if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True); rep = {}
    for k in DIRS:
        css, p = build(k); open(os.path.join(out, k + '.css'), 'w').write(css)
        rep[k] = {'name': DIRS[k]['name'], 'note': DIRS[k]['note'], 'radii_px': DIRS[k]['radii'], 'tokens': {a: p[a] for a in ('panel', 'panel2', 'text', 'dim', 'accent', 'accent2', 'accent_ink', 'ink', 'parch')},
                  'token_contrast': {'text/panel': round(contrast(p['text'], p['panel']), 2), 'dim/panel': round(contrast(p['dim'], p['panel']), 2), 'accent/panel': round(contrast(p['accent2'], p['panel']), 2),
                                    'accent_ink/accent': round(contrast(p['accent_ink'], p['accent']), 2), 'ink/parch': round(contrast(p['ink'], p['parch']), 2)}}
    json.dump(rep, open(os.path.join(out, 'rules.json'), 'w'), indent=1); print(json.dumps({k: v['token_contrast'] for k, v in rep.items()}, indent=1))

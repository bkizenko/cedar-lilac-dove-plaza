#!/usr/bin/env python3
"""Six UI/UX colour schemes applied to the REAL Hearth HUD (src/ui/hearth/*.css) without touching game code.
build_css(p) re-tints the shipped CSS text (hard-coded cream/gold rgba overlays -> palette tint/accent), flattens gradients and
shadows, hardens radii, sets serif/humanist type and a 16px text floor, then appends token overrides. Injected by ui-palette-shot.mjs --css.
Also exposes contrast() so every palette prints its WCAG ratios (no claim without the numbers)."""
import re, os, json, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CSS_FILES = ['hearth.css', 'glance.css', 'wildPanel.css']

PALETTES = {
 'p1-honey-charcoal': dict(name='Honey and charcoal', mode='dark', panel='#23211e', panel2='#2c2926', text='#f3ecdd', dim='#cfc5b2', accent='#e2a53d', accent2='#f2c463', accent_ink='#1c1915',
     tint='243,236,221', acc_rgb='226,165,61', good='#b7d68f', bad='#f2a58a', warn='#f2c66d', water='#8fcde0', parch='#efe6d2', ink='#27221b', sans="'Inter',system-ui,sans-serif", display="'Lora',Georgia,serif",
     note='dark neutral charcoal, honey as the single accent; closest to H controls but matte and hard-edged'),
 'p2-parchment-walnut': dict(name='Parchment and walnut ink', mode='light', panel='#eadfc7', panel2='#e0d3b6', text='#33261a', dim='#62503b', accent='#8b4a1d', accent2='#a65d2a', accent_ink='#fbf3e1',
     tint='51,38,26', acc_rgb='139,74,29', good='#3d6b2d', bad='#a23a22', warn='#8a5a0a', water='#2a6178', parch='#f6eed9', ink='#33261a', sans="'Lora',Georgia,serif", display="'Lora',Georgia,serif",
     note='light parchment panels, walnut-brown ink, rust accent; scholarly, closest to a printed map legend'),
 'p3-slate-bronze': dict(name='Slate and bronze', mode='dark', panel='#222a31', panel2='#2b343c', text='#e8ebec', dim='#b0bac0', accent='#c0914f', accent2='#d9ad6e', accent_ink='#1a1f24',
     tint='232,235,236', acc_rgb='192,145,79', good='#a9d199', bad='#f0a392', warn='#ecc377', water='#86c7dc', parch='#e9e6dd', ink='#222a31', sans="'Inter',system-ui,sans-serif", display="'Inter Display','Inter',sans-serif",
     note='cool blue-grey slate with a bronze accent; the most neutral, best against warm honey terrain'),
 'p4-sage-bone': dict(name='Sage and bone', mode='light', panel='#e6e6d8', panel2='#dadcc9', text='#2c372b', dim='#566451', accent='#4f6f4a', accent2='#668a60', accent_ink='#f5f5ea',
     tint='44,55,43', acc_rgb='79,111,74', good='#3a6a35', bad='#a5412b', warn='#86610c', water='#2b6479', parch='#f3f2e6', ink='#2c372b', sans="'Inter',system-ui,sans-serif", display="'Lora',Georgia,serif",
     note='bone panels with deep sage; calm, botanical, reads well over greens'),
 'p5-indigo-amber': dict(name='Indigo dusk and amber', mode='dark', panel='#1e2040', panel2='#272a52', text='#ece8f2', dim='#b9b6d2', accent='#f0a53d', accent2='#f7c36b', accent_ink='#17142b',
     tint='236,232,242', acc_rgb='240,165,61', good='#aedb99', bad='#f4a696', warn='#f3c86f', water='#8fd0ea', parch='#ece7f0', ink='#1e2040', sans="'Inter',system-ui,sans-serif", display="'Lora',Georgia,serif",
     note='deep indigo with amber; pairs with the dusk-amber scene, the most atmospheric'),
 'p6-terracotta-cream': dict(name='Terracotta and cream', mode='light', panel='#f4e9d7', panel2='#ecdcc3', text='#3a2519', dim='#745644', accent='#a84a27', accent2='#c0592f', accent_ink='#fff5e6',
     tint='58,37,25', acc_rgb='168,74,39', good='#3f6a30', bad='#9e3622', warn='#85590a', water='#2a6074', parch='#fbf3e3', ink='#3a2519', sans="'Lora',Georgia,serif", display="'Lora',Georgia,serif",
     note='cream panels with terracotta; warmest light option, nearest to H warmth without any wood'),
}

def _lin(c):
    c /= 255; return c / 12.92 if c <= .03928 else ((c + .055) / 1.055) ** 2.4
def _L(h):
    h = h.lstrip('#'); r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4)); return .2126 * _lin(r) + .7152 * _lin(g) + .0722 * _lin(b)
def contrast(a, b):
    la, lb = _L(a), _L(b); hi, lo = max(la, lb), min(la, lb); return (hi + .05) / (lo + .05)

def checks(p):
    return {'text/panel': contrast(p['text'], p['panel']), 'dim/panel': contrast(p['dim'], p['panel']), 'accent_ink/accent': contrast(p['accent_ink'], p['accent']),
            'ink/parch': contrast(p['ink'], p['parch']), 'accent/panel': contrast(p['accent2'] if p['mode'] == 'dark' else p['accent'], p['panel'])}

def build_css(p):
    src = '\n'.join(open(os.path.join(ROOT, 'src/ui/hearth', f), encoding='utf8').read() for f in CSS_FILES)
    for pat in (r'rgba\(255,\s*236,\s*190,', r'rgba\(246,\s*226,\s*184,'): src = re.sub(pat, f"rgba({p['tint']},", src)
    for pat in (r'rgba\(227,\s*173,\s*79,', r'rgba\(242,\s*199,\s*107,', r'rgba\(246,\s*213,\s*140,'): src = re.sub(pat, f"rgba({p['acc_rgb']},", src)
    src = re.sub(r'linear-gradient\(180deg,\s*var\(--hw-gold-2\),\s*var\(--hw-gold\)\)', 'var(--hw-gold)', src)   # flat matte accent fills
    # keep only rules; token block is appended below so the retinted copy wins by source order
    dark = p['mode'] == 'dark'
    line = f"rgba({p['tint']},{.22 if dark else .30})"; line2 = f"rgba({p['tint']},{.42 if dark else .52})"
    tokens = f""":root:not([data-hw-ui]){{
 --hw-wood-950:{p['panel']};--hw-wood-900:{p['panel']};--hw-wood-800:{p['panel']};--hw-wood-700:{p['panel2']};--hw-wood-600:{p['panel2']};
 --hw-line:{line};--hw-line-strong:{line2};--hw-parch:{p['parch']};--hw-parch-2:{p['panel2']};--hw-ink:{p['ink']};
 --hw-text:{p['text']};--hw-dim:{p['dim']};--hw-gold:{p['accent']};--hw-gold-2:{p['accent2']};--hw-gold-ink:{p['accent_ink']};
 --hw-good:{p['good']};--hw-bad:{p['bad']};--hw-warn:{p['warn']};--hw-water:{p['water']};
 --hw-r-s:3px;--hw-r-m:4px;--hw-r-l:6px;--hw-fs-s:16px;--hw-fs:16px;--hw-fs-m:18px;--hw-fs-l:22px;
 --hw-panel:{p['panel']};--hw-shadow:0 1px 0 rgba(0,0,0,{.35 if dark else .18}),0 6px 14px rgba(0,0,0,{.28 if dark else .16});
 --font-sans:{p['sans']};--font-display:{p['display']};
 --color-ink:{p['panel']};--color-ink-soft:{p['panel2']};--color-ink-panel:{p['panel']};--color-parchment:{p['text']};--color-parchment-dim:{p['dim']};--color-bronze:{p['accent']};--color-bronze-bright:{p['accent2']};--color-blood:{p['bad']};--color-ok:{p['good']};
}}
.hw{{font-family:var(--font-sans)}}
.hw .hw-res li svg,.hw .hw-dock-btn svg,.hw .hw-rail svg{{color:{p['accent2'] if dark else p['accent']}!important}}
.hw .hw-dock-btn.is-on svg,.hw .hw-btn.is-on svg{{color:{p['accent_ink']}!important}}
.hw svg{{min-width:24px;min-height:24px}}
.hw *{{text-shadow:none!important}}
.hw [class*="hw-"]{{border-radius:var(--hw-r-m)}}
.hw .hw-badge{{border-radius:4px}}
.hw .hw-map .world-minimap-north{{color:#f3ecdd}}
"""
    if not dark:   # light palettes: the shipped icon chips are cream-on-wood; make them accent chips so they stay visible
        tokens += f".hw .hw-medal-s,.hw .hw-medal{{background:{p['accent']}!important;color:{p['accent_ink']}!important;border-color:{p['accent']}!important}}\n"
    return src + '\n' + tokens

if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    rep = {}
    for k, p in PALETTES.items():
        open(os.path.join(out, k + '.css'), 'w').write(build_css(p)); rep[k] = {a: round(b, 2) for a, b in checks(p).items()}
    json.dump(rep, open(os.path.join(out, 'contrast.json'), 'w'), indent=1); print(json.dumps(rep, indent=1))

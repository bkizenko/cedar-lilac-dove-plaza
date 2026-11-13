"""Colour-grade recipes for the four 'Option H, grown up' variants and the six UI palettes (single source for the boards)."""
H_VARIANTS = {
 'v1': dict(name='Honey stone and plaster', note='warm honey key light, pale plaster and sandstone, olive-sage greens, soft filmic shoulder',
   summer=dict(exposure=1.04, lift=.03, gamma=1.08, sat=.84, green_pull=.55, shadow_tint='#5a6b8a', high_tint='#ffcf8a', tone_amt=.22, contrast=.45, bloom=.16, bloom_thr=.62, bloom_rad=16, vignette=.28, grain=.008),
   winter=dict(exposure=.66, lift=.04, gamma=1.05, sat=.80, shadow_tint='#566888', high_tint='#ffd7a0', tone_amt=.26, contrast=.5, bloom=.10, bloom_thr=.7, vignette=.30, grain=.008)),
 'v2': dict(name='Earth tones, honey light', note='desaturated earth palette (clay, straw, slate), honey only in the light, matte and quiet',
   summer=dict(exposure=1.10, lift=.04, gamma=1.10, sat=.58, green_pull=.75, shadow_tint='#6a6f86', high_tint='#f6c98a', tone_amt=.20, contrast=.40, bloom=.10, bloom_thr=.65, vignette=.26, grain=.01),
   winter=dict(exposure=.62, lift=.05, gamma=1.05, sat=.62, shadow_tint='#626c86', high_tint='#f3d2a6', tone_amt=.22, contrast=.45, vignette=.28, grain=.01)),
 'v3': dict(name='Golden hour, painterly filmic', note='low sun, long warm highlights, cool lifted shadows, bloom and strong S-curve (E-style atmosphere)',
   summer=dict(exposure=1.0, lift=.03, gamma=1.1, sat=.86, green_pull=.65, shadow_tint='#4a5f88', high_tint='#ffb866', tone_amt=.30, contrast=.55, bloom=.30, bloom_thr=.55, bloom_rad=22, vignette=.34, grain=.01),
   winter=dict(exposure=.74, lift=.035, gamma=1.08, sat=.84, shadow_tint='#4c5f88', high_tint='#ffbd78', tone_amt=.32, contrast=.55, bloom=.24, bloom_thr=.55, bloom_rad=22, vignette=.34, grain=.01)),
 'v4': dict(name='Dusk amber', note='sun on the horizon, amber and rose highlights, plum-blue shadows, lamp-lit mood but still readable',
   summer=dict(exposure=1.2, lift=.04, gamma=1.12, sat=1.0, green_pull=.40, shadow_tint='#4a4c7c', high_tint='#ff9c4a', tone_amt=.36, contrast=.50, bloom=.26, bloom_thr=.50, bloom_rad=22, vignette=.38, grain=.012),
   winter=dict(exposure=.84, lift=.05, gamma=1.1, sat=.92, shadow_tint='#4a4c80', high_tint='#ffa45a', tone_amt=.36, contrast=.50, bloom=.22, bloom_thr=.5, bloom_rad=22, vignette=.38, grain=.012)),
}

# Material remap (hue-band) applied on top of each variant's grade: honey timber -> plaster/clay/stone, toy greens -> sage/olive.
MAT = {
 'v1': dict(wood=dict(band=(12, 50), sat=.42, val=1.14, hue_to=38, hue_amt=.55, dark_sat=.7), green=dict(band=(65, 170), sat=.62, val=.97, hue_to=88, hue_amt=.4, smin=.2)),
 'v2': dict(wood=dict(band=(12, 50), sat=.36, val=1.02, hue_to=28, hue_amt=.6, dark_sat=.55), green=dict(band=(65, 170), sat=.46, val=.94, hue_to=82, hue_amt=.5, smin=.2)),
 'v3': dict(wood=dict(band=(12, 50), sat=.58, val=1.1, hue_to=34, hue_amt=.5, dark_sat=.7), green=dict(band=(65, 170), sat=.55, val=.98, hue_to=90, hue_amt=.35, smin=.2)),
 'v4': dict(wood=dict(band=(12, 50), sat=.62, val=1.0, hue_to=26, hue_amt=.55, dark_sat=.65), green=dict(band=(65, 170), sat=.58, val=.92, hue_to=74, hue_amt=.45, smin=.2)),
}
def recipe(v, season):
    r = dict(H_VARIANTS[v][season]); r.update(MAT[v]); return r

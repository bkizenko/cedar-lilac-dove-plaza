#!/usr/bin/env python3
"""Experimental colour grade for concept boards (post only; NOT game code, NOT shipped). numpy + PIL.
grade(img, recipe) -> PIL image.  Recipes are plain dicts so a board can print its own numbers.
Steps: exposure -> lift/gamma -> saturation (+ green pull) -> split tone -> S-curve -> bloom -> vignette -> grain."""
import numpy as np
from PIL import Image, ImageFilter

def hexrgb(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255

def lum(a): return a @ np.array([.2126, .7152, .0722], np.float32)

def remap(im, r):
    """Hue-band material remap on the raw frame. 'wood': honey/orange timber -> plaster/clay/stone (desaturate, lift, shift toward target hue);
    'green': toy-bright greens -> sage/olive. Bands are in degrees; masks are soft. This is a grade, not a re-model."""
    hsv = np.asarray(im.convert('RGB').convert('HSV'), np.float32); h = hsv[..., 0] * 360 / 255; s = hsv[..., 1] / 255; v = hsv[..., 2] / 255
    for key in ('wood', 'green'):
        w = r.get(key)
        if not w: continue
        lo, hi = w['band']; soft = w.get('soft', 8)
        m = np.clip((h - (lo - soft)) / soft, 0, 1) * np.clip(((hi + soft) - h) / soft, 0, 1) * np.clip((s - w.get('smin', .25)) / .15, 0, 1)
        if 'hue_to' in w: h = h + m * (w['hue_to'] - h) * w.get('hue_amt', .6)
        s = s * (1 - m * (1 - w.get('sat', 1.0))); v = np.clip(v * (1 + m * (w.get('val', 1.0) - 1)), 0, 1)
        if 'dark_sat' in w:   # dark pixels in the band (roofs/shade) go earthier than light ones
            d = m * np.clip(1 - v / .55, 0, 1); s = s * (1 - d * (1 - w['dark_sat']))
    out = np.stack([h * 255 / 360, s * 255, v * 255], -1).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, 'HSV').convert('RGB')

def grade(im, r):
    if r.get('wood') or r.get('green'): im = remap(im, r)
    a = np.asarray(im.convert('RGB'), np.float32) / 255
    a = a * r.get('exposure', 1.0)
    lift = r.get('lift', 0.0); a = lift + a * (1 - lift)
    a = np.clip(a, 0, 1) ** (1 / r.get('gamma', 1.0))
    L = lum(a)[..., None]
    sat = r.get('sat', 1.0)
    a = L + (a - L) * sat
    gp = r.get('green_pull', 0.0)          # shift saturated greens toward olive/ochre (kills toy-bright greens)
    if gp:
        g = np.clip((a[..., 1] - np.maximum(a[..., 0], a[..., 2])) * 4, 0, 1)[..., None]
        a = a * (1 - gp * g) + (a * np.array([1.12, .94, .62], np.float32)) * (gp * g)
    L = lum(a)[..., None]
    sh, hi = hexrgb(r.get('shadow_tint', '#808080')), hexrgb(r.get('high_tint', '#808080'))
    ws = r.get('tone_amt', 0.0)
    if ws:
        wsh, whi = np.clip(1 - L * 2, 0, 1), np.clip(L * 2 - 1, 0, 1)
        a = a + ws * (wsh * (sh - .5) + whi * (hi - .5))
    c = r.get('contrast', 0.0)
    if c:
        a = np.clip(a, 0, 1); a = a + c * (a * a * (3 - 2 * a) - a)   # smoothstep S-curve blend
    a = np.clip(a, 0, 1)
    bl = r.get('bloom', 0.0)
    if bl:
        t = np.clip(lum(a) - r.get('bloom_thr', .72), 0, 1)[..., None] * a
        b = Image.fromarray((np.clip(t * 4, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r.get('bloom_rad', 14)))
        a = 1 - (1 - a) * (1 - bl * np.asarray(b, np.float32) / 255)
    v = r.get('vignette', 0.0)
    if v:
        h, w = a.shape[:2]; y, x = np.mgrid[0:h, 0:w]
        d = ((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2
        a = a * (1 - v * np.clip(d / 2, 0, 1) ** 1.5)[..., None]
    gr = r.get('grain', 0.0)
    if gr:
        rng = np.random.default_rng(7); a = a + (rng.standard_normal(a.shape[:2])[..., None] * gr)
    return Image.fromarray((np.clip(a, 0, 1) * 255 + .5).astype(np.uint8))

def mean_lum(im): return float(lum(np.asarray(im.convert('RGB'), np.float32) / 255).mean())

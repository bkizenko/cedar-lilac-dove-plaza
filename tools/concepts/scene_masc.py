#!/usr/bin/env python3
"""Masculine scene mockup: real render with the Hearth ramp (terrain, trees, rock = real material override) + a POST building-palette remap and a restrained grade.
usage: scene_masc.py <in.png (Hearth-ramp render)> <out.png>
Post steps (not game materials): honey/yellow thatch -> dusty straw/umber, cream plaster -> stone grey-tan, red trim darker; overall sat .90, shadow tint cool slate, highlight tint warm, S-curve .35, vignette .2."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
from grade import grade
R = dict(wood=dict(band=(30, 62), sat=.42, val=.82, hue_to=34, hue_amt=.5, smin=.3, dark_sat=.7), exposure=1.0, lift=.02, gamma=1.0, sat=.9, shadow_tint='#566070', high_tint='#f1cd9c', tone_amt=.2, contrast=.35, vignette=.2, grain=.006)
if __name__ == '__main__':
    im = Image.open(sys.argv[1]).convert('RGB'); out = grade(im, R); out.save(sys.argv[2]); print('wrote', sys.argv[2], R)

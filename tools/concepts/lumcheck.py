#!/usr/bin/env python3
"""Mean luminance of every concept board / render (guards against near-black frames). usage: lumcheck.py <png or dir> ..."""
import sys, os, glob
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
from grade import mean_lum
for a in sys.argv[1:]:
    for f in sorted(glob.glob(os.path.join(a, '*.png')) if os.path.isdir(a) else [a]):
        v = mean_lum(Image.open(f)); print(f'{v:.3f}  {"NEAR-BLACK" if v < .12 else "ok"}  {os.path.basename(f)}')

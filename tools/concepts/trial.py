import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
from grade import grade, mean_lum
from recipes import H_VARIANTS, recipe
from sheet import sheet
raw, cam, out = sys.argv[1], sys.argv[2], sys.argv[3]
items = []
for season in ('summer', 'winter'):
    for v, d in H_VARIANTS.items():
        g = grade(Image.open(f'{raw}/{cam}-{v}-{season}.png'), recipe(v, season)); p = f'{out}/{cam}-{v}-{season}.png'; g.save(p)
        items.append((f'{v} {season} L={mean_lum(g):.2f}', p))
sheet(f'{out}/trial-{cam}.png', 4, 480, 'trial ' + cam, items)

#!/usr/bin/env python3
"""Contact sheet: sheet.py out.png cols tileW title  label=path [label=path ...]   (rows wrap; label drawn under a dark caption bar)"""
import sys
from PIL import Image, ImageDraw, ImageFont

def font(sz):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/dejavu/DejaVuSans.ttf'):
        try: return ImageFont.truetype(p, sz)
        except Exception: pass
    return ImageFont.load_default()

def sheet(out, cols, tw, title, items, bg=(24, 22, 20)):
    ims = [(l, Image.open(p).convert('RGB')) for l, p in items]
    th = round(tw * ims[0][1].height / ims[0][1].width)
    cap, top, g = 30, 46 if title else 8, 8
    rows = (len(ims) + cols - 1) // cols
    W, H = cols * tw + (cols + 1) * g, top + rows * (th + cap + g)
    s = Image.new('RGB', (W, H), bg); d = ImageDraw.Draw(s)
    if title: d.text((g + 4, 12), title, fill=(240, 232, 214), font=font(20))
    for i, (l, im) in enumerate(ims):
        x, y = g + (i % cols) * (tw + g), top + (i // cols) * (th + cap + g)
        s.paste(im.resize((tw, th), Image.LANCZOS), (x, y)); d.text((x + 4, y + th + 6), l, fill=(226, 218, 200), font=font(15))
    s.save(out); return out

if __name__ == '__main__':
    out, cols, tw, title = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
    sheet(out, cols, tw, title, [a.split('=', 1) for a in sys.argv[5:]])

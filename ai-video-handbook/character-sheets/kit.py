# -*- coding: utf-8 -*-
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import numpy as np, os

FD = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fonts')
F = lambda n: os.path.join(FD, n)

_cache = {}
def vf(name, size, wght=400, opsz=None):
    key = (name, size, wght, opsz)
    if key in _cache: return _cache[key]
    f = ImageFont.truetype(F(name), size)
    try:
        axes = f.get_variation_axes()
        vals = []
        for ax in axes:
            tag = ax['name']
            tag = tag.decode() if isinstance(tag, bytes) else tag
            t = tag.lower()
            if 'weight' in t or t == 'wght':   vals.append(wght)
            elif 'optical' in t or t == 'opsz': vals.append(opsz if opsz else min(max(size, ax['minimum']), ax['maximum']))
            else: vals.append(ax['default'])
        f.set_variation_by_axes(vals)
    except Exception:
        pass
    _cache[key] = f
    return f

def tw(d, t, f, tr=0):
    if not t: return 0
    if tr == 0: return d.textlength(t, font=f)
    return sum(d.textlength(c, font=f) for c in t) + tr * (len(t) - 1)

def T(d, xy, t, f, fill, tr=0, anchor='ls'):
    """letterspaced text. anchor: l/m/r + s(baseline)/a(top)/m(mid)"""
    x, y = xy
    w = tw(d, t, f, tr)
    ha, va = anchor[0], anchor[1]
    if ha == 'm': x -= w / 2
    elif ha == 'r': x -= w
    if tr == 0:
        d.text((x, y), t, font=f, fill=fill, anchor='l' + va)
        return w
    for c in t:
        d.text((x, y), c, font=f, fill=fill, anchor='l' + va)
        x += d.textlength(c, font=f) + tr
    return w

def tone(img, bg, target):
    """piecewise-linear per-channel LUT mapping source bg -> target card colour."""
    a = np.asarray(img.convert('RGB')).astype(np.float32)
    out = np.empty_like(a)
    for c in range(3):
        b, t = float(bg[c]), float(target[c])
        ch = a[..., c]
        lo = ch * (t / b)
        hi = t + (ch - b) * ((255.0 - t) / (255.0 - b))
        out[..., c] = np.where(ch <= b, lo, hi)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

def bgcolor(img, box=(0, 0, 24, 24)):
    a = np.asarray(img.convert('RGB').crop(box)).reshape(-1, 3)
    return tuple(int(round(v)) for v in np.median(a, axis=0))

def trim(img, bg, tol=6, pad=0):
    a = np.asarray(img.convert('RGB')).astype(np.int16)
    d = np.abs(a - np.array(bg, dtype=np.int16)).max(axis=2)
    m = d > tol
    if not m.any(): return img
    ys, xs = np.where(m)
    y0, y1 = ys.min(), ys.max() + 1
    x0, x1 = xs.min(), xs.max() + 1
    y0 = max(0, y0 - pad); x0 = max(0, x0 - pad)
    y1 = min(img.height, y1 + pad); x1 = min(img.width, x1 + pad)
    return img.crop((x0, y0, x1, y1))

def fit(img, box, pad=0):
    """returns (resized, (x,y)) centred inside box=(x0,y0,x1,y1)"""
    x0, y0, x1, y1 = box
    bw, bh = (x1 - x0) - 2 * pad, (y1 - y0) - 2 * pad
    s = min(bw / img.width, bh / img.height)
    w, h = max(1, int(img.width * s)), max(1, int(img.height * s))
    r = img.resize((w, h), Image.LANCZOS)
    return r, (x0 + pad + (bw - w) // 2, y0 + pad + (bh - h) // 2)

def shadow(base, box, radius=26, spread=10, alpha=150):
    x0, y0, x1, y1 = box
    lay = Image.new('L', base.size, 0)
    ImageDraw.Draw(lay).rectangle((x0 - spread//2, y0 - spread//2 + 6, x1 + spread//2, y1 + spread//2 + 14), fill=alpha)
    lay = lay.filter(ImageFilter.GaussianBlur(radius))
    base.paste(Image.new('RGB', base.size, (0, 0, 0)), (0, 0), lay)

def grain(img, amount=6.0, seed=7):
    rng = np.random.default_rng(seed)
    n = rng.normal(0, amount, (img.height, img.width, 1)).astype(np.float32)
    a = np.asarray(img).astype(np.float32) + n
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

def vgrad(size, top, bot):
    h = size[1]
    t = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    col = (np.array(top, np.float32)[None, :] * (1 - t) + np.array(bot, np.float32)[None, :] * t)
    a = np.repeat(col[:, None, :], size[0], axis=1)
    return Image.fromarray(a.astype(np.uint8))

def vignette(img, strength=0.35):
    w, h = img.size
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy = w / 2, h / 2
    r = np.sqrt(((xx - cx) / cx) ** 2 + ((yy - cy) / cy) ** 2) / 1.414
    m = 1 - strength * np.clip(r, 0, 1) ** 2
    a = np.asarray(img).astype(np.float32) * m[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

# -*- coding: utf-8 -*-
import os, sys
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *

D = os.path.dirname(os.path.abspath(__file__))
W, H = 3000, 2100

# ── theme ────────────────────────────────────────────────────
THEME = (sys.argv[1] if len(sys.argv) > 1 else 'dark').lower()
RED = (226, 52, 43)      # #E2342B  — constant in both themes

if THEME == 'light':
    INK   = (237, 234, 227)   # ground bottom
    INK2  = (247, 245, 240)   # ground top
    LINE  = (216, 212, 203)   # hairline
    LINE2 = (170, 165, 154)   # dim rule / ticks
    MUT   = (122, 128, 138)   # label grey
    MUT2  = (62, 70, 82)      # body text
    PAPER = (17, 21, 27)      # primary ink
    CARD  = (250, 249, 246)
    CBORD = (221, 217, 208)
    SHA   = dict(radius=26, spread=14, alpha=46)
    VIG, GRN = 0.05, 2.6
    SUF   = '_LIGHT'
else:
    INK   = (9, 14, 18)       # #090E12
    INK2  = (21, 30, 36)      # #151E24
    LINE  = (32, 46, 56)      # #202E38
    LINE2 = (48, 64, 80)      # #304050
    MUT   = (94, 122, 166)    # #5E7AA6
    MUT2  = (151, 168, 192)   # #97A8C0
    PAPER = (233, 238, 242)   # #E9EEF2
    CARD  = (237, 235, 230)
    CBORD = (206, 204, 198)
    SHA   = dict(radius=30, spread=16, alpha=120)
    VIG, GRN = 0.30, 4.2
    SUF   = ''

PAL = ['#090E12','#151E24','#202E38','#304050','#4A5D75','#5E7AA6','#97A8C0','#E9EEF2','#E2342B']

CH = {
 'DOHA': dict(
   raw='RAW_A.png', idx='01', kr='차도하', han='車道河', en='CHA DO-HA',
   role='THE ONE MINUTE MAN', rolekr='11시 11분, 1분만 실체가 되는 남자',
   turn=(0,0,1280,910), expr=(0,947,1280,1479),
   hand=(118,1516,561,1881), ward=(672,1516,1241,1881),
   spec=[('AGE','28 · MALE'),('OCCUPATION','WATCH REPAIRER'),('HAIR','MODERN SHORT / FRINGE'),
         ('WATCH','SILVER · LEFT WRIST · NEVER REMOVED'),('SHOES','BLACK LEATHER DERBY')],
   note='말수가 거의 없고 표정이 변하지 않는다. 감정을 설명하는 대신 상대가 흘린 말을 정확히 기억해 둔다. 사진에도 영상에도 녹음에도 남지 않는다 — 다만 그가 만진 물건은 남는다.',
   noteen='Almost silent, expression unmoved. He remembers every word you let slip. He leaves no trace on film, video or tape — only the objects he touches remain.'),
 'RIN': dict(
   raw='RAW_B.png', idx='02', kr='서린', han='徐凛', en='SEO-RIN',
   role='THE ONLY ONE WHO WANTS HIM', rolekr='소원이 아니라 그를 원한 유일한 사람',
   turn=(0,0,1280,915), expr=(0,954,1280,1506),
   hand=(116,1541,480,1890), ward=(650,1541,1209,1890),
   spec=[('AGE','26 · FEMALE'),('OCCUPATION','LATE-NIGHT RADIO WRITER'),('HAIR','LONG STRAIGHT BLACK'),
         ('WATCH','SLIM SILVER · LEFT WRIST'),('SHOES','BLACK FLATS')],
   note='겉으로는 침착하고 냉담해 보이지만 한번 정하면 물러서지 않는다. 관찰력이 좋아 남들이 놓치는 디테일을 잡아낸다. 매일 밤 11시 11분에 알람을 맞춘다.',
   noteen='Composed and cold on the surface, immovable once decided. She catches the detail everyone else misses. Every night she sets an alarm for 11:11.'),
}

BOD   = 'bodoni.ttf'; INT = 'inter.ttf'; MONO = 'jbmono.ttf'
KRS   = 'notosanskr.ttf'; KRSE = 'notoserifkr.ttf'
HAN   = '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'

def hairline(d, box, col=LINE, wpx=1):
    d.rectangle(box, outline=col, width=wpx)

def ticks(d, box, col, L=22, off=10):
    x0,y0,x1,y1 = box
    for (cx,cy,sx,sy) in ((x0,y0,-1,-1),(x1,y0,1,-1),(x0,y1,-1,1),(x1,y1,1,1)):
        d.line((cx+sx*off, cy, cx+sx*(off+L), cy), fill=col, width=2)
        d.line((cx, cy+sy*off, cx, cy+sy*(off+L)), fill=col, width=2)

def panel(im, d, raw, crop, box, num, en, kr, bg):
    x0,y0,x1,y1 = box
    # label strip above the card
    T(d, (x0, y0-26), num, vf(MONO, 26, 700), RED, 2, 'la')
    T(d, (x0+52, y0-24), en, vf(INT, 21, 600), PAPER, 6.5, 'la')
    d.text((x1, y0-22), kr, font=vf(KRS, 20, 400), fill=MUT, anchor='ra')
    # card
    shadow(im, box, **SHA)
    im.paste(Image.new('RGB', (x1-x0, y1-y0), CARD), (x0, y0))
    src  = tone(trim(raw.crop(crop), bg, tol=7, pad=4), bg, CARD)
    a, p = fit(src, box, pad=26)
    im.paste(a, p)
    hairline(d, (x0, y0, x1-1, y1-1), CBORD)
    ticks(d, (x0, y0, x1-1, y1-1), LINE2)

def build(key):
    c = CH[key]
    raw = Image.open(os.path.join(D, c['raw'])).convert('RGB')
    bg  = bgcolor(raw)

    im = vgrad((W, H), INK2, INK)
    d  = ImageDraw.Draw(im)

    M  = 140                       # outer margin
    SP = 96                        # spine column
    L  = M + SP                    # content left
    R  = W - M                     # content right

    # ── spine ────────────────────────────────────────────────
    d.line((M+34, M, M+34, H-M), fill=LINE, width=2)
    sp = Image.new('RGBA', (H-2*M, 60), (0,0,0,0))
    sd = ImageDraw.Draw(sp)
    T(sd, (0, 30), 'ONE  MINUTE  STUDIO', vf(INT, 19, 600), MUT2, 7.5, 'lm')
    x = tw(sd, 'ONE  MINUTE  STUDIO', vf(INT,19,600), 7.5) + 30
    sd.line((x, 30, x+34, 30), fill=LINE2, width=2)
    T(sd, (x+52, 30), 'CHARACTER  SHEET  /  SERIES  11:11', vf(INT, 19, 400), MUT, 7.5, 'lm')
    sp = sp.rotate(90, expand=True)
    im.paste(sp, (M-14, M), sp)

    # ── masthead ─────────────────────────────────────────────
    y = M
    T(d, (L, y), 'VERTICAL  DRAMA  ·  EP 01–10  ·  1 MIN', vf(INT, 20, 500), MUT, 7.0, 'la')
    # big 11:11 mark, right
    T(d, (R, y-14), '11:11', vf(BOD, 78, 500), RED, 4, 'ra')
    T(d, (R, y+82), 'ONE  MINUTE', vf(INT, 18, 500), MUT, 8.5, 'ra')

    y += 54
    nm = vf(BOD, 168, 600)
    T(d, (L, y), c['en'], nm, PAPER, 3, 'la')
    nw = tw(d, c['en'], nm, 3)
    d.text((L + nw + 44, y + 96), c['kr'], font=vf(KRSE, 62, 500), fill=MUT2, anchor='ls')
    kw = d.textlength(c['kr'], font=vf(KRSE, 62, 500))
    hf = ImageFont.truetype(HAN, 34)
    d.text((L + nw + 44 + kw + 26, y + 90), c['han'], font=hf, fill=LINE2, anchor='ls')

    y += 216
    d.line((L, y, R, y), fill=LINE, width=2)
    d.line((L, y, L+300, y), fill=RED, width=3)
    y += 30
    T(d, (L, y), c['role'], vf(INT, 25, 600), PAPER, 4.0, 'la')
    d.text((R, y+2), c['rolekr'], font=vf(KRS, 23, 300), fill=MUT, anchor='ra')

    # ── panels ───────────────────────────────────────────────
    PY0 = 546
    PY1 = 1600
    GX  = 56
    tx1 = L + 1380
    panel(im, d, raw, c['turn'], (L, PY0, tx1, PY1), '01', 'TURNAROUND', '4방향 전신', bg)
    ex0 = tx1 + GX
    ey1 = PY0 + 516
    panel(im, d, raw, c['expr'], (ex0, PY0, R, ey1), '02', 'EXPRESSIONS', '표정 8종', bg)
    hy0 = ey1 + 84
    hx1 = ex0 + 560
    panel(im, d, raw, c['hand'], (ex0, hy0, hx1, PY1), '03', 'HANDS', '손', bg)
    panel(im, d, raw, c['ward'], (hx1 + GX, hy0, R, PY1), '04', 'WARDROBE', '의상', bg)

    # ── footer ───────────────────────────────────────────────
    fy = PY1 + 84
    d.line((L, fy, R, fy), fill=LINE, width=2)
    d.line((L, fy, L+300, fy), fill=RED, width=3)

    C1, C2, C3 = L, L + 860, L + 1620
    fy += 46
    for cx in (C2 - 60, C3 - 60):
        d.line((cx, fy - 10, cx, fy + 286), fill=LINE, width=2)

    # spec column
    T(d, (C1, fy), 'SPECIFICATION', vf(INT, 18, 600), RED, 6.5, 'la')
    sy = fy + 48
    for k, v in c['spec']:
        T(d, (C1, sy), k, vf(MONO, 19, 400), MUT, 2.2, 'la')
        T(d, (C1 + 290, sy), v, vf(MONO, 19, 600), PAPER, 2.2, 'la')
        sy += 36

    # palette column
    T(d, (C2, fy), 'PALETTE', vf(INT, 18, 600), RED, 6.5, 'la')
    cy = fy + 48
    for i, h in enumerate(PAL):
        col = tuple(int(h[1+2*j:3+2*j], 16) for j in range(3))
        bx = C2 + i * 68
        d.rectangle((bx, cy, bx+54, cy+54), fill=col, outline=RED if i == 8 else LINE2)
    T(d, (C2, cy + 82), '#E2342B', vf(MONO, 19, 700), RED, 1.6, 'la')
    T(d, (C2, cy + 116), 'THE ONLY SATURATED', vf(INT, 17, 400), MUT, 1.4, 'la')
    T(d, (C2, cy + 142), 'COLOUR ON SCREEN.', vf(INT, 17, 400), MUT, 1.4, 'la')
    d.text((C2, cy + 178), '화면에서 유일하게 채도 있는 색', font=vf(KRS, 18, 300), fill=MUT, anchor='la')

    # note column
    nx, maxw = C3, R - C3
    T(d, (nx, fy), 'CHARACTER NOTE', vf(INT, 18, 600), RED, 6.5, 'la')
    ny = fy + 48
    def wrap(txt, f, col, lh):
        nonlocal ny
        line = ''
        for wd in txt.split(' '):
            t = (line + ' ' + wd).strip()
            if d.textlength(t, font=f) > maxw and line:
                d.text((nx, ny), line, font=f, fill=col, anchor='la'); ny += lh; line = wd
            else: line = t
        if line: d.text((nx, ny), line, font=f, fill=col, anchor='la'); ny += lh
    wrap(c['note'], vf(KRS, 21, 300), MUT2, 34)
    ny += 16
    wrap(c['noteen'], vf(INT, 17, 300), MUT, 26)

    # ── baseline / crop marks ────────────────────────────────
    d.line((L, H-M+40, R, H-M+40), fill=LINE, width=2)
    T(d, (L, H-M+60), 'CHARACTER  %s  OF  02   ·   @oneminute.studio   ·   INTERNAL REFERENCE — NOT FOR DISTRIBUTION' % c['idx'],
      vf(MONO, 17, 400), LINE2, 2.0, 'la')
    T(d, (R, H-M+60), 'ONE MINUTE / 11:11 / SHEET %s' % c['idx'], vf(MONO, 17, 500), LINE2, 2.0, 'ra')
    ticks(d, (M-30, M-40, W-M+30, H-M+96), LINE2, L=28, off=0)

    if VIG: im = vignette(im, VIG)
    im = grain(im, GRN, seed=11)
    out = os.path.join(D, 'SHEET_%s%s.png' % (key, SUF))
    im.save(out)
    im.resize((W//3, H//3), Image.LANCZOS).save(os.path.join(D, '_pv_%s%s.jpg' % (key, SUF)), quality=88)
    print(out, im.size)

for k in CH: build(k)

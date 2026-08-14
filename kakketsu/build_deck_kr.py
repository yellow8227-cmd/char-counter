# -*- coding: utf-8 -*-
"""
赫血 KAKKETSU — 「그것」封神 컨셉 레퍼런스
한국 투자사 제출용 비주얼 덱 빌더. (v3 · 16 slides)

    python3 build_deck_kr.py

원칙
  · 같은 사진을 두 번 쓰지 않는다 (_src 가 강제한다)
  · 겹치는 내용은 슬라이드를 합치거나 버린다
  · 본문은 12pt 이상, 어두운 판 위에만 올린다
"""
import os
from pptx import Presentation
from pptx.util import Inches as In, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn, nsdecls
from pptx.oxml import parse_xml
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, "assets")
OUT = os.path.join(HERE, "build", "KAKKETSU_그것_컨셉레퍼런스_KR.pptx")

SW, SH = 13.3333, 7.5
ML, MR = 0.78, 0.78
TOP = 0.52
FOOT_Y = 6.98                     # 이 아래로는 푸터만 온다

INK      = RGBColor(0x0A, 0x08, 0x09)
BONE     = RGBColor(0xF4, 0xEF, 0xE6)
BONE_MID = RGBColor(0xD2, 0xCA, 0xBE)
BONE_DIM = RGBColor(0xA2, 0x99, 0x8E)
RED      = RGBColor(0xC9, 0x2E, 0x22)
RED_DIM  = RGBColor(0xAE, 0x5C, 0x4F)
DARKINK  = RGBColor(0x14, 0x11, 0x11)
DARKMID  = RGBColor(0x45, 0x3E, 0x3A)

KR, LAT = "Malgun Gothic", "Cambria"

PALETTE = [("0F0E0E", "칠흑"), ("353434", "재"), ("4B4844", "마른 회"),
           ("6F6357", "젖은 흙"), ("C4B6A6", "삼베·뼈"), ("A9635C", "빛바랜 홍"),
           ("5F686A", "색동의 청"), ("8A443B", "핏빛")]

pageno = {"n": 0}
used = []


# ── low-level ──────────────────────────────────────────────────────────────
def set_alpha(shape, pct):
    srgb = shape.fill._xPr.find(qn("a:solidFill")).find(qn("a:srgbClr"))
    srgb.append(parse_xml('<a:alpha %s val="%d"/>' % (nsdecls("a"), int(pct * 1000))))


def set_line_alpha(shape, pct):
    srgb = shape.line._get_or_add_ln().find(qn("a:solidFill")).find(qn("a:srgbClr"))
    srgb.append(parse_xml('<a:alpha %s val="%d"/>' % (nsdecls("a"), int(pct * 1000))))


def cjk(run, face):
    rPr = run._r.get_or_add_rPr()
    for tag in ("a:ea", "a:cs"):
        el = rPr.find(qn(tag))
        if el is None:
            el = parse_xml("<%s %s/>" % (tag, nsdecls("a")))
            rPr.append(el)
        el.set("typeface", face)


def textbox(slide, x, y, w, h, anchor=MSO_ANCHOR.TOP):
    box = slide.shapes.add_textbox(In(x), In(y), In(w), In(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    return tf


def para(tf, text, size, color, *, font=KR, bold=False, spc=0, line=1.4,
         before=0, align=PP_ALIGN.LEFT, first=False):
    p = tf.paragraphs[0] if first else tf.add_paragraph()
    p.alignment = align
    p.line_spacing = line
    p.space_before = Pt(before)
    p.space_after = Pt(0)
    r = p.add_run()
    r.text = text
    r.font.size, r.font.bold, r.font.name = Pt(size), bold, font
    r.font.color.rgb = color
    if spc:
        r._r.get_or_add_rPr().set("spc", str(int(spc * 100)))
    cjk(r, font if font != LAT else KR)
    return p


def tail(p, text, size, color, *, font=KR, bold=False, spc=0):
    r = p.add_run()
    r.text = text
    r.font.size, r.font.bold, r.font.name = Pt(size), bold, font
    r.font.color.rgb = color
    if spc:
        r._r.get_or_add_rPr().set("spc", str(int(spc * 100)))
    cjk(r, KR)
    return r


def _src(name):
    for ext in (".jpg", ".png"):
        p = os.path.join(A, name + ext)
        if os.path.exists(p):
            assert name not in used, "이미지 중복 사용: " + name
            used.append(name)
            return p
    raise FileNotFoundError(name)


def pic_cover(slide, name, x, y, w, h, *, focus=0.5):
    path = _src(name)
    iw, ih = Image.open(path).size
    box_ar, img_ar = w / h, iw / ih
    shp = slide.shapes.add_picture(path, In(x), In(y), In(w), In(h))
    if img_ar > box_ar:
        side = 1 - box_ar / img_ar
        shp.crop_left, shp.crop_right = side * focus, side * (1 - focus)
    else:
        side = 1 - img_ar / box_ar
        shp.crop_top, shp.crop_bottom = side * focus, side * (1 - focus)
    sp = shp._element
    sp.getparent().remove(sp)
    slide.shapes._spTree.insert(2, sp)
    return shp


def pic_fit(slide, name, x, y, w, h):
    path = _src(name)
    iw, ih = Image.open(path).size
    ar = iw / ih
    nw, nh = (w, w / ar) if ar > w / h else (h * ar, h)
    slide.shapes.add_picture(path, In(x + (w - nw) / 2), In(y + (h - nh) / 2),
                             In(nw), In(nh))
    return nw, nh


def scrim(slide, name, x=0, y=0, w=SW, h=SH):
    slide.shapes.add_picture(os.path.join(A, name + ".png"), In(x), In(y), In(w), In(h))


def rect(slide, x, y, w, h, rgb, alpha=100):
    s = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, In(x), In(y), In(w), In(h))
    s.fill.solid()
    s.fill.fore_color.rgb = rgb
    if alpha < 100:
        set_alpha(s, alpha)
    s.line.fill.background()
    s.shadow.inherit = False
    return s


def hairline(slide, x, y, w, rgb=BONE, alpha=26, weight=0.6):
    s = rect(slide, x, y, w, 0.01, rgb)
    s.height = Pt(weight)
    set_alpha(s, alpha)
    return s


def blank(prs):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    s._element.find(qn("p:cSld")).insert(0, parse_xml(
        '<p:bg %s><p:bgPr><a:solidFill><a:srgbClr val="0A0809"/></a:solidFill>'
        '<a:effectLst/></p:bgPr></p:bg>' % nsdecls("p", "a")))
    return s


# ── furniture ──────────────────────────────────────────────────────────────
def head(slide, index, eyebrow, title, *, y=TOP, x=ML, width=None, sub=None):
    w = width or (SW - x - MR)
    tf = textbox(slide, x, y, w, 0.30)
    p = para(tf, index, 12, RED, font=LAT, bold=True, spc=1.4, line=1.0, first=True)
    tail(p, "   " + eyebrow, 10, BONE_DIM, font=LAT, bold=True, spc=1.8)
    tf2 = textbox(slide, x, y + 0.38, w, 0.9)
    para(tf2, title, 34, BONE, bold=True, line=1.14, spc=-0.6, first=True)
    if sub:
        n = title.count("\n") + 1
        tf3 = textbox(slide, x, y + 0.38 + n * 0.56 + 0.06, w, 0.34)
        para(tf3, sub, 13.5, BONE_DIM, line=1.3, first=True)


def foot(slide, *, light=False, x=ML):
    pageno["n"] += 1
    c = DARKMID if light else RGBColor(0x7E, 0x76, 0x6C)
    tf = textbox(slide, x, FOOT_Y, 7.0, 0.24)
    para(tf, "赫血 KAKKETSU   ·   「그것」 封神 컨셉 레퍼런스", 7.5, c,
         spc=1.2, line=1.0, first=True)
    tf2 = textbox(slide, SW - MR - 1.6, FOOT_Y, 1.6, 0.24)
    para(tf2, "%02d" % pageno["n"], 9, c, font=LAT, spc=1.0, line=1.0,
         align=PP_ALIGN.RIGHT, first=True)


EM = 1.38          # CJK 폰트 한 줄이 차지하는 높이(em). 이 값을 빼먹으면 판이 짧아진다.
LSP = 1.40         # 주석 카드 본문 줄간


def note(slide, x, y, w, label, lines, *, size=12, alpha=86, pad=0.26):
    """주석 카드. 반환값은 카드 높이 — 다음 요소는 y + 반환값 + 여백에 놓는다."""
    cpl = max(8.0, (w - pad * 2) * 72.0 / size * 0.95)
    n = sum(max(1, -(-len(t) // int(cpl))) for t in lines)
    h = (pad * 2
         + 9 * EM / 72.0                       # 라벨
         + 8 / 72.0                            # 라벨 아래 여백
         + n * size * EM * LSP / 72.0          # 본문
         + (len(lines) - 1) * 5 / 72.0)        # 문단 사이
    rect(slide, x, y, w, h, RGBColor(0x05, 0x04, 0x04), alpha)
    tf = textbox(slide, x + pad, y + pad, w - pad * 2, h - pad * 2)
    para(tf, label, 9, RED, bold=True, spc=1.6, line=1.0, first=True)
    for i, t in enumerate(lines):
        para(tf, t, size, BONE_MID, line=LSP, before=8 if i == 0 else 5)
    return h


def bullets(tf, items, size=12, gap=9, first=False):
    for i, t in enumerate(items):
        para(tf, "·  " + t, size, BONE_MID, line=1.5,
             before=0 if (i == 0 and first) else gap, first=(i == 0 and first))


def callout(slide, tx, ty, lx, ly, lw, label, body, *, side="left"):
    d = slide.shapes.add_shape(MSO_SHAPE.OVAL, In(tx - 0.05), In(ty - 0.05),
                               In(0.10), In(0.10))
    d.fill.solid(); d.fill.fore_color.rgb = RED
    d.line.color.rgb = BONE; d.line.width = Pt(0.75)
    set_line_alpha(d, 75); d.shadow.inherit = False
    x0, x1 = (lx + lw, tx) if side == "left" else (tx, lx)
    ln = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, In(min(x0, x1)),
                                In(ty - 0.004), In(abs(x1 - x0)), Pt(0.75))
    ln.fill.solid(); ln.fill.fore_color.rgb = BONE
    set_alpha(ln, 50); ln.line.fill.background(); ln.shadow.inherit = False
    al = PP_ALIGN.RIGHT if side == "left" else PP_ALIGN.LEFT
    tf = textbox(slide, lx, ly, lw, 0.7)
    para(tf, label, 11, BONE, bold=True, line=1.15, align=al, first=True)
    para(tf, body, 9.5, BONE_MID, line=1.35, before=2, align=al)


# ═══════════════════════════════════════════════════════════════════════════
prs = Presentation()
prs.slide_width, prs.slide_height = In(SW), In(SH)


# ── 01 · COVER ─────────────────────────────────────────────────────────────
s = blank(prs)
pic_cover(s, "corridor_hospital", 0, 0, SW, SH)
scrim(s, "vignette")
scrim(s, "scrim_left", 0, 0, SW * 0.74, SH)
scrim(s, "scrim_bottom", 0, SH * 0.42, SW, SH * 0.58)

tf = textbox(s, ML, 0.58, 6.5, 0.3)
para(tf, "WALLAH PROJECT   ×   SUPERNOVA STUDIOS", 9.5, BONE_MID, font=LAT,
     bold=True, spc=2.2, line=1.0, first=True)

tf = textbox(s, ML, 1.70, 8.0, 0.34)
para(tf, "CREATURE DESIGN BIBLE", 10.5, RED, font=LAT, bold=True, spc=3.6,
     line=1.0, first=True)

s.shapes.add_picture(os.path.join(A, "title_lockup.png"), In(ML - 0.32), In(2.08),
                     In(5.6), In(2.055))

tf = textbox(s, ML, 4.22, 8.8, 1.6)
para(tf, "각혈  ·  KAKKETSU", 15, BONE_MID, spc=2.0, line=1.2, first=True)
para(tf, "「그것」 封神 · 봉신", 44, BONE, bold=True, line=1.14, spc=-0.8, before=10)

hairline(s, ML, 5.96, 2.4, BONE, 42)
tf = textbox(s, ML, 6.16, 8.6, 0.7)
para(tf, "장편 오컬트 호러 · 세대극   |   한국 – 일본   |   각본 · 감독  한동하",
     12, BONE_MID, line=1.5, first=True)
para(tf, "2026 프리프로덕션 자료   ·   대외비", 10, RED_DIM, line=1.4, before=5)


# ── 02 · LOGLINE ───────────────────────────────────────────────────────────
s = blank(prs)
pic_cover(s, "fog_white", 0, 0, SW, SH, focus=0.24)
scrim(s, "scrim_light_left", 0, 0, SW, SH)

tf = textbox(s, ML, 1.24, 3.0, 0.3)
para(tf, "LOGLINE", 11, RED, font=LAT, bold=True, spc=3.2, line=1.0, first=True)
tf = textbox(s, ML, 1.82, 6.5, 3.3)
para(tf, "대대로 이어진 가문의 저주를 끊기 위해\n싸워온 한 남자는, 그 저주라 믿었던 존재가\n"
         "사실은 가족을 지켜온 수호였음을 깨닫고\n핏줄과 죄의 진짜 의미와 마주한다.",
     23, DARKINK, bold=True, line=1.62, spc=-0.4, first=True)
hairline(s, ML, 5.46, 1.8, DARKMID, 70)
tf = textbox(s, ML, 5.70, 6.3, 0.34)
para(tf, "1582 조선  →  현재 일본   ·   4대에 걸친 핏줄, 하나의 형상",
     12, DARKMID, line=1.4, first=True)
foot(s, light=True)


# ── 03 · THE TURN ──────────────────────────────────────────────────────────
s = blank(prs)
pic_cover(s, "kneel_closeup", SW * 0.47, 0, SW * 0.53, SH, focus=0.42)
rect(s, 0, 0, SW * 0.51, SH, INK)
scrim(s, "scrim_left", SW * 0.45, 0, SW * 0.30, SH)
head(s, "01", "THE TURN", "저주가 아니라\n수호였다", width=5.7)

tf = textbox(s, ML, 2.34, 5.7, 0.8)
para(tf, "「그것」은 특정 인물도, 유령도 아니다. 가문이 쌓아 온 죄와\n"
         "원념이 형태를 얻은, 저주의 얼굴을 한 봉인이다.",
     13.5, BONE, bold=True, line=1.5, first=True)
hairline(s, ML, 3.22, 5.7, BONE, 26)

for i, (n, tag, t, b) in enumerate([
        ("01", "", "추적", "1587년 굿판에서 형상을 얻고, 이름도 얼굴도 아닌 핏줄만을 따라 이동한다."),
        ("02", "", "희생", "조부 동필, 부친 종문. 두 세대가 같은 방식으로 죽는다."),
        ("03", "", "부재", "아들이 죽자 「그것」은 걸음을 되찾고 떠난다. 지옥은 그 다음에 시작된다.")]):
    y = 3.56 + i * 1.10
    tfn = textbox(s, ML, y - 0.02, 0.62, 0.36)
    para(tfn, n, 16, RED, font=LAT, bold=True, line=1.0, first=True)
    tf = textbox(s, ML + 0.66, y - 0.06, 5.04, 0.94)
    p = para(tf, t, 15, BONE, bold=True, line=1.2, first=True)
    if tag:
        tail(p, "   " + tag, 9, RED_DIM, font=LAT, bold=True, spc=1.6)
    para(tf, b, 11, BONE_MID, line=1.5, before=5)
    if i < 2:
        hairline(s, ML, y + 0.90, 5.7, BONE, 18)
foot(s)


# ── 04 · BLOODLINE ─────────────────────────────────────────────────────────
s = blank(prs)
pic_cover(s, "corridor_wood", 0, 0, SW, SH, focus=0.45)
scrim(s, "scrim_85")
scrim(s, "vignette")
head(s, "02", "BLOODLINE", "핏줄의 계보 — 「그것」이 따라온 길")

tl = [("1582", "조선 · 평양", "처형장의 망나니.\n피와 원망이 땅에 쌓인다."),
      ("1587", "굿판", "무당이 노모의 시신을\n부적으로 봉인한다."),
      ("1945", "일제강점기", "순사 백동필.\n제복을 입고 독립투사를 고문한다."),
      ("1984", "일본 오사카", "사형집행관 백종문.\n버튼으로 사람을 죽인다."),
      ("2006", "일본 후쿠오카", "산부인과 의사 슈.\n저주를 과학으로 부정한다."),
      ("현재", "그리고 하루마", "핏줄이 끊긴 자리에\n저주가 되돌아온다.")]
cw = (SW - ML - MR) / 6
for i, (yv, place, body) in enumerate(tl):
    x = ML + i * cw
    d = s.shapes.add_shape(MSO_SHAPE.OVAL, In(x), In(2.30), In(0.11), In(0.11))
    d.fill.solid()
    d.fill.fore_color.rgb = RED if i in (1, 5) else BONE_MID
    d.line.fill.background(); d.shadow.inherit = False
    tf = textbox(s, x, 2.62, cw - 0.32, 1.9)
    para(tf, yv, 21, BONE, font=LAT, bold=True, line=1.0, first=True)
    para(tf, place, 10.5, RED_DIM, bold=True, spc=0.8, line=1.2, before=6)
    para(tf, body, 10.5, BONE_MID, line=1.55, before=8)
hairline(s, ML + 0.055, 2.352, SW - ML - MR - cw + 0.055, BONE, 26)

note(s, ML, 4.94, SW - ML - MR, "네 세대의 공통점",
     ["네 세대 모두 죽음을 다루는 자리에 있었다.  칼 → 제복 → 버튼 → 메스.",
      "도구는 문명화되었지만 하는 일은 같다. 「그것」은 그 400년을 지켜본 유일한 목격자다."],
     size=12.5)
foot(s)


# ── 05 · CHARACTER SPEC ────────────────────────────────────────────────────
s = blank(prs)
pic_cover(s, "front_stand", SW * 0.415, 0, SW * 0.585, SH)
rect(s, 0, 0, SW * 0.46, SH, INK)
scrim(s, "scrim_left", SW * 0.40, 0, SW * 0.26, SH)
head(s, "03", "CHARACTER SPEC", "封神  봉신", width=5.0)

for i, (k, v) in enumerate([("신장", "150cm  ·  연출 스케일 180 / 190 / 260cm"),
                            ("성별 · 연령", "여성 · 노인"),
                            ("정체", "망나니의 노모 — 굿판에서 봉인된 시신")]):
    y = 2.10 + i * 0.56
    tf = textbox(s, ML, y, 1.16, 0.26)
    para(tf, k, 9.5, RED, bold=True, spc=1.0, line=1.0, first=True)
    tf = textbox(s, ML + 1.26, y - 0.05, 3.74, 0.32)
    para(tf, v, 12, BONE, line=1.3, first=True)
    hairline(s, ML, y + 0.34, 5.0, BONE, 20)

tf = textbox(s, ML, 4.06, 5.0, 0.28)
para(tf, "특징", 9.5, RED, bold=True, spc=1.6, line=1.0, first=True)
tf = textbox(s, ML, 4.38, 5.0, 2.2)
bullets(tf, ["이마의 붉은 부적이 얼굴을 대신한다",
             "극도로 마른 체형, 메마른 피부",
             "빛바랜 색동저고리 누더기",
             "한쪽 다리를 절며 무겁게 이동한다",
             "등에 결박된 원혼 덩어리를 머리카락이 억누른다"], size=12, gap=9, first=True)

callout(s, 9.35, 3.02, 6.26, 2.84, 2.55, "이마의 부적 「封神」", "얼굴이 있어야 할 자리")
callout(s, 9.42, 4.44, 6.26, 4.26, 2.55, "빛바랜 색동저고리", "색이 거의 빠진 누더기")
callout(s, 10.72, 1.82, 11.00, 1.64, 1.58, "원혼 덩어리", "등에 결박된 수백의 원혼",
        side="right")
callout(s, 9.30, 6.52, 6.26, 6.34, 2.55, "뒤틀린 다리 · 짚신", "질질 끌리는 한쪽 발")
foot(s)


# ── 06 · ANCHOR 01 · 부적 ──────────────────────────────────────────────────
s = blank(prs)
pic_cover(s, "front_arms", SW * 0.46, 0, SW * 0.54, SH)
rect(s, 0, 0, SW * 0.50, SH, INK)
scrim(s, "scrim_left", SW * 0.44, 0, SW * 0.26, SH)
head(s, "04", "DESIGN ANCHOR 01", "부적 「封神」", width=5.55,
     sub="얼굴을 대신하는 봉인")

cur = 2.20
cur += note(s, ML, cur, 5.55, "문화 주석",
            ["부적은 복을 부르는 물건이 아니다.",
             "위험한 것을 눌러 가두는 물건이다.",
             "「封神」 — 봉할 봉, 귀신 신."]) + 0.24
cur += note(s, ML, cur, 5.55, "연출 의도",
            ["얼굴이 없으므로 표정 연기가 성립하지 않는다.",
             "관객은 「그것」의 의도를 끝까지 알 수 없다."]) + 0.20

pic_fit(s, "tile_empty_face", ML, cur, 0.84, 0.84)
tf = textbox(s, ML + 1.06, cur + 0.06, 4.4, 0.8)
para(tf, "3막", 12, BONE, bold=True, line=1.2, first=True)
para(tf, "머리카락을 걷어내면 부적 뒤에는 아무것도 없다.", 11, BONE_MID,
     line=1.45, before=5)
assert cur + 0.84 < FOOT_Y - 0.06, cur
foot(s)


# ── 07 · ANCHOR 02 · 색동저고리 ────────────────────────────────────────────
s = blank(prs)
pic_cover(s, "saekdong_back", 0, 0, SW * 0.60, SH, focus=0.45)
rect(s, SW * 0.555, 0, SW * 0.445, SH, INK)
scrim(s, "scrim_right", SW * 0.32, 0, SW * 0.28, SH)
CX = SW * 0.585
head(s, "05", "DESIGN ANCHOR 02", "색동저고리", x=CX, sub="아이를 지키는 옷")

cur = 2.20
cur += note(s, CX, cur, 4.75, "문화 주석",
            ["색동저고리는 아이에게 입히는 옷이다.",
             "액을 막고 무사히 자라기를 비는 옷이다.",
             "배색은 오방색 — 청·적·황·백·흑."]) + 0.24
cur += note(s, CX, cur, 4.75, "연출 의도",
            ["위협적인 형상에 가장 다정한 옷을 입힌다.",
             "색이 빠진 정도가 지켜온 시간을 보여준다."]) + 0.20

pic_fit(s, "tile_blood_jeogori", CX, cur, 0.84, 0.84)
tf = textbox(s, CX + 1.06, cur + 0.10, 3.65, 0.7)
para(tf, "1945 시퀀스", 12, BONE, bold=True, line=1.2, first=True)
para(tf, "색동은 극 중 새것으로 등장하지 않는다.", 11, BONE_MID, line=1.45, before=5)
assert cur + 0.84 < FOOT_Y - 0.06, cur
foot(s, x=CX)


# ── 08 · ANCHOR 03 · 짚신 ──────────────────────────────────────────────────
s = blank(prs)
pic_cover(s, "foot_closeup", SW * 0.52, 0, SW * 0.48, SH)
rect(s, 0, 0, SW * 0.56, SH, INK)
scrim(s, "scrim_left", SW * 0.48, 0, SW * 0.24, SH)
head(s, "06", "DESIGN ANCHOR 03", "짚신과 뒤틀린 다리", width=6.0,
     sub="업을 지고 걷는 몸")

cur = 2.20
cur += note(s, ML, cur, 5.9, "문화 주석",
            ["짚신은 신분의 바닥을 뜻하는 신발이다.",
             "업을 짊어진 채 계속 걸어가는 인간의 상징이다."]) + 0.24
cur += note(s, ML, cur, 5.9, "연출 의도 — 절룩임은 상해가 아니라 하중이다",
            ["수백의 원혼을 대신 짊어져 무거워진 결과다.",
             "핏줄이 끊어지는 순간, 걸음은 정상으로 돌아온다.",
             "관객이 대사 없이 반전을 알아채는 지점이다."]) + 0.20

pic_fit(s, "tile_shoe_walk", ML, cur, 1.36, 0.84)
tf = textbox(s, ML + 1.62, cur + 0.06, 4.3, 0.8)
para(tf, "슥……  쿵……", 16, RED, bold=True, line=1.15, first=True)
para(tf, "「그것」의 등장은 화면보다 이 소리가 먼저 알린다.", 11, BONE_MID,
     line=1.45, before=5)
assert cur + 0.84 < FOOT_Y - 0.06, cur
foot(s)


# ── 09 · THE BURDEN ────────────────────────────────────────────────────────
s = blank(prs)
pic_cover(s, "mass_closeup", 0, 0, SW, SH, focus=0.42)
scrim(s, "vignette")
scrim(s, "scrim_right", SW * 0.16, 0, SW * 0.84, SH)
CX2 = SW * 0.45
head(s, "07", "THE BURDEN", "등에 결박된\n수백의 원혼", x=CX2, width=5.6)

tf = textbox(s, CX2, 2.70, 5.6, 2.3)
for i, (k, v) in enumerate([("움직임", "고정된 실루엣 없이 액체처럼 흐른다"),
                            ("구성", "얼굴 · 사지 · 손등이 얽혀 유기적으로 변형된다"),
                            ("결박", "긴 머리카락이 덩어리 전체를 감아 억제한다"),
                            ("이동", "덩어리도 바닥을 따라 흘러 함께 움직인다")]):
    p = para(tf, k, 12, BONE, bold=True, line=1.45, before=0 if i == 0 else 11,
             first=(i == 0))
    tail(p, "   " + v, 12, BONE_MID)

note(s, CX2, 5.06, 5.6, "연출 · VFX 노트",
     ["계단 시퀀스에서 결박이 풀린다.",
      "하중을 버린 「그것」의 이동 속도가 급격히 빨라진다."])

pic_fit(s, "sheet_montage", ML, 5.06, 2.4, 1.80)
foot(s)


# ── 10 · LOOK DEVELOPMENT ──────────────────────────────────────────────────
s = blank(prs)
head(s, "08", "LOOK DEVELOPMENT", "룩 개발 — 4안")

col = (SW - ML - MR - 3 * 0.30) / 4          # 컬럼 2.72"
iw = 1.85
ih = iw / 0.5210                              # 크롭 비율 고정 — 네 컷의 하단선이 맞는다
for i, (img, t, desc, pick) in enumerate([
        ("look_a", "A · WET / BLACK",
         "젖은 흑색 점액 톤이다.\n원혼과 머리카락이 한 덩어리로 보인다.", False),
        ("look_b", "B · WET / DETAIL",
         "같은 톤에서 원혼을 개체로 분리했다.\n클로즈업 장면에 쓴다.", False),
        ("look_c", "C · SAEKDONG",
         "색동의 채도를 살렸다.\n반전 단서가 가장 먼저 읽힌다.", True),
        ("look_d", "D · MIST",
         "안개와 저채도로 실루엣만 남겼다.\n티저와 키비주얼에 쓴다.", False)]):
    cx = ML + i * (col + 0.30)
    if pick:
        tf = textbox(s, cx, 1.26, col, 0.26)
        para(tf, "본편 기준안", 10, RED, bold=True, spc=1.6, line=1.0, first=True)
    pic_fit(s, img, cx + (col - iw) / 2, 1.56, iw, ih)
    tf = textbox(s, cx, 5.34, col, 1.0)
    para(tf, t, 12, BONE, bold=True, spc=0.6, line=1.2, first=True)
    para(tf, desc, 10.5, BONE_MID, line=1.45, before=7)

hairline(s, ML, 6.40, SW - ML - MR, BONE, 20)
tf = textbox(s, ML, 6.56, 11.4, 0.3)
para(tf, "네 안은 실루엣과 비율이 동일하며, 차이는 채도와 질감에 있다.",
     12, BONE_MID, line=1.2, first=True)
foot(s)


# ── 11 · TURNAROUND & SCALE ────────────────────────────────────────────────
s = blank(prs)
head(s, "09", "TURNAROUND & SCALE", "3면도 · 크기 설계")
pic_fit(s, "sheet_size", ML, 1.56, 6.20, 3.44)
pic_fit(s, "scale_chart", ML + 6.42, 1.56, 4.98, 3.44)

tf = textbox(s, ML, 5.20, 6.20, 0.28)
para(tf, "파트별 확정 항목", 9.5, RED, bold=True, spc=1.6, line=1.0, first=True)
tf = textbox(s, ML, 5.52, 6.20, 0.9)
para(tf, "3면 실루엣  ·  이마 부적  ·  색동 탈색 단계\n"
         "피부와 관절  ·  젖은 발목  ·  원혼 밀도  ·  손등 질감",
     11.5, BONE_MID, line=1.55, first=True)

tf = textbox(s, ML + 6.42, 5.20, 4.98, 0.28)
para(tf, "스케일 운용", 9.5, RED, bold=True, spc=1.6, line=1.0, first=True)
for i, (k, v) in enumerate([("150cm", "일상과 미행. 사람 크기로, 무해해 보여야 한다."),
                            ("180cm", "대면. 인물과 눈높이가 맞는 장면에 쓴다."),
                            ("190cm", "추격. 공간이 좁아 보이는 크기다."),
                            ("260cm", "굿판과 강림. 공간 전체를 압도한다.")]):
    yy = 5.54 + i * 0.36
    tfn = textbox(s, ML + 6.42, yy, 0.80, 0.28)
    para(tfn, k, 13, RED, font=LAT, bold=True, line=1.0, first=True)
    tf2 = textbox(s, ML + 7.25, yy - 0.02, 4.15, 0.28)
    para(tf2, v, 11.5, BONE_MID, line=1.2, first=True)
foot(s)


# ── 12 · COSTUME ───────────────────────────────────────────────────────────
s = blank(prs)
head(s, "10", "COSTUME", "의상 컨셉 — 4벌")

pic_fit(s, "detail_talisman_tag", 7.10, 0.58, 0.52, 0.46)
tf = textbox(s, 7.80, 0.54, 4.75, 0.6)
para(tf, "소품 — 「封神」 부적", 11.5, BONE, bold=True, line=1.2, first=True)
para(tf, "무당이 자신의 피로 그린 부적. 색을 잃지 않는 유일한 물건.",
     10.5, BONE_MID, line=1.4, before=4)
tf = textbox(s, 7.10, 1.22, 5.45, 0.7)
para(tf, "구성 — 색동 소매 저고리 + 홍색 끈 · 술 노리개 + 갈래 치마",
     11, BONE_MID, line=1.4, first=True)
para(tf, "제작 — 동일 패턴 3벌 + 스턴트용 바지 변형 1벌",
     11, BONE_MID, line=1.4, before=5)

col = (SW - ML - MR - 3 * 0.30) / 4
gw = 1.58
gh = gw / 0.380                              # 네 벌의 비율을 통일해 놓았다
for i, (img, t, desc) in enumerate([
        ("cost_a", "A · 저고리 & 치마", "저채도 흙빛으로 세트에 묻힌다."),
        ("cost_b", "B · 저고리 & 치마", "색동 채도를 유지한 기준안이다."),
        ("cost_c", "C · 저고리 & 치마", "올이 삭아 풀린 상태다."),
        ("cost_d", "D · 저고리 & 바지", "액션과 와이어 촬영용 변형이다.")]):
    cx = ML + i * (col + 0.30)
    pic_fit(s, img, cx + (col - gw) / 2, 1.92, gw, gh)
    tf = textbox(s, cx, 6.20, col, 0.9)
    para(tf, t, 11.5, BONE, bold=True, line=1.2, first=True)
    para(tf, desc, 10.5, BONE_MID, line=1.4, before=6)
foot(s)


# ── 13 · SET PIECE ─────────────────────────────────────────────────────────
s = blank(prs)
pic_cover(s, "hall_open", 0, 0, SW, SH, focus=0.5)
scrim(s, "vignette")
scrim(s, "scrim_top", 0, 0, SW, SH * 0.34)
scrim(s, "scrim_bottom", 0, SH * 0.30, SW, SH * 0.70)
head(s, "11", "SET PIECE", "굿판 — 강림")

tf = textbox(s, ML, 1.98, 6.4, 0.26)
para(tf, "1587  ·  조선 평양", 10, RED, bold=True, spc=1.8, line=1.0, first=True)
tf = textbox(s, ML, 2.32, 6.4, 0.8)
para(tf, "무당이 자신의 피로 부적을 만들고, 망나니가 노모의 무덤을 판다.\n"
         "부적이 이마에 닿는 순간, 시신은 인간의 형상을 잃는다.",
     12.5, BONE, line=1.55, first=True)

tf = textbox(s, SW - MR - 4.4, 2.32, 4.4, 0.9)
para(tf, "“괴물이 아니다. 핏줄을 지키기 위해\n모든 원혼을 스스로 떠안은 봉인이다.”",
     12.5, BONE_MID, line=1.6, align=PP_ALIGN.RIGHT, first=True)

rect(s, 0, 3.86, SW, 3.64, RGBColor(0x05, 0x04, 0x04), 78)
fw = (SW - ML - MR - 3 * 0.22) / 4
for i, (img, n, t, b) in enumerate([
        ("hall_descend_a", "01", "하강", "천장에서 한 줄기로 쏟아진다."),
        ("hall_descend_b", "02", "전개", "부챗살처럼 벌어진다."),
        ("hall_sweep",     "03", "확산", "얼굴들이 한꺼번에 드러난다."),
        ("hall_tilt",      "04", "소산", "질량을 잃고 흩어진다.")]):
    gx = ML + i * (fw + 0.22)
    pic_fit(s, img, gx, 4.06, fw, 1.62)
    tf = textbox(s, gx, 5.78, fw, 0.6)
    p = para(tf, n, 11.5, RED, font=LAT, bold=True, line=1.0, first=True)
    tail(p, "   " + t, 12.5, BONE, bold=True)
    para(tf, b, 10, BONE_MID, line=1.4, before=4)

tf = textbox(s, ML, 6.52, 11.4, 0.34)
para(tf, "VFX 범위 — 같은 세트, 같은 렌즈에서 원혼의 양만 단계적으로 늘린다. "
         "실물 의상과 배우 연기를 바탕으로 덩어리만 CG로 처리한다.",
     10.5, BONE_MID, line=1.35, first=True)
foot(s)


# ── 14 · KEY ART & VISUAL SYSTEM ───────────────────────────────────────────
s = blank(prs)
pic_fit(s, "keyart", 0.12, 0, 6.30, SH)
scrim(s, "scrim_right", SW * 0.30, 0, SW * 0.70, SH)
KX = 7.30
tf = textbox(s, KX, 0.96, 5.2, 0.3)
p = para(tf, "12", 12, RED, font=LAT, bold=True, spc=1.4, line=1.0, first=True)
tail(p, "   KEY ART  ·  VISUAL SYSTEM", 10, BONE_DIM, font=LAT, bold=True, spc=1.8)
tf = textbox(s, KX, 1.42, 5.2, 1.9)
para(tf, "罪 · 血 · 記憶", 31, BONE, bold=True, spc=2.0, line=1.2, first=True)
para(tf, "티저에서는 「그것」을 정면으로 보여주지 않는다.\n"
         "짚신, 색동 자락, 부적, 벽에 새겨진 세 글자만 노출해\n"
         "관객이 형상을 스스로 맞추게 한다.",
     12, BONE_MID, line=1.55, before=20)

hairline(s, KX, 3.54, 5.2, BONE, 24)
tf = textbox(s, KX, 3.76, 5.2, 0.28)
para(tf, "컬러 팔레트", 9.5, RED, bold=True, spc=1.6, line=1.0, first=True)
swx = KX
for hexv, _ in PALETTE:
    rect(s, swx, 4.08, 0.56, 0.72, RGBColor.from_string(hexv))
    swx += 0.585
tf = textbox(s, KX, 4.96, 5.2, 0.4)
para(tf, "무채색 화면에 두 가지 색만 쓴다. 색동의 청과 부적의 홍이다.\n"
         "화면에서 색을 가진 것은 「그것」뿐이다.",
     11, BONE_MID, line=1.45, first=True)

tf = textbox(s, KX, 5.72, 5.2, 0.28)
para(tf, "컨셉 키워드", 9.5, RED, bold=True, spc=1.6, line=1.0, first=True)
tf = textbox(s, KX, 6.04, 5.2, 0.4)
para(tf, "원한 · 저주 · 무거움 · 억압 · 끌려다님 · 구속 · 공포", 13, BONE,
     bold=True, line=1.3, first=True)
foot(s, x=KX)


# ── 15 · IP EXTENSION ──────────────────────────────────────────────────────
s = blank(prs)
head(s, "13", "IP EXTENSION", "머천다이징 — 실루엣만으로 식별되는 캐릭터")
pic_fit(s, "goods_keyring_hanja", ML, 1.60, 4.00, 4.00)
pic_fit(s, "goods_keyring_hangul", ML + 4.24, 1.60, 4.00, 4.00)

tf = textbox(s, ML, 5.86, 8.24, 0.34)
para(tf, "封神(한자)과 봉신(국문) 패키지를 함께 준비해 한국 · 일본 동시 유통에 대응한다.",
     11, BONE_MID, line=1.4, first=True)

tf = textbox(s, ML + 8.85, 1.64, 2.92, 0.28)
para(tf, "확장 근거", 9.5, RED, bold=True, spc=1.6, line=1.0, first=True)
tf = textbox(s, ML + 8.85, 1.98, 2.92, 3.6)
bullets(tf, ["부적 · 색동 · 원혼 덩어리 세 요소가 축소 모형에서도 유지된다",
             "얼굴이 없어 배우 초상권과 무관하게 상품화할 수 있다",
             "키링, 피규어, 아크릴 순으로 전개한다",
             "티저 공개 시점부터 선판매가 가능하다"],
        size=11, gap=12, first=True)
foot(s)


# ── 16 · CLOSING ───────────────────────────────────────────────────────────
s = blank(prs)
pic_cover(s, "early_white", SW * 0.50, 0, SW * 0.50, SH)
rect(s, 0, 0, SW * 0.54, SH, INK)
scrim(s, "scrim_left", SW * 0.46, 0, SW * 0.30, SH)

tf = textbox(s, ML, 2.30, 5.9, 1.8)
para(tf, "“저주는 사라진 것이 아니다.\n다만, 형태를 바꿨을 뿐이다.”", 27, BONE,
     bold=True, line=1.5, spc=-0.5, first=True)

hairline(s, ML, 4.24, 2.1, BONE, 42)

tf = textbox(s, ML, 4.56, 6.0, 1.0)
para(tf, "赫血  KAKKETSU  ·  각혈", 19, BONE, bold=True, spc=1.4, line=1.2,
     first=True)
para(tf, "「그것」 封神 · 봉신   —   컨셉 레퍼런스", 13, BONE_MID,
     line=1.35, before=9)

hairline(s, ML, 5.86, 5.9, BONE, 18)

tf = textbox(s, ML, 6.08, 6.2, 0.8)
para(tf, "각본 · 감독   한동하", 12, BONE, line=1.35, first=True)
para(tf, "제작   WALLAH PROJECT  ×  SUPERNOVA STUDIOS", 11, BONE_DIM,
     line=1.35, before=6)
foot(s)


os.makedirs(os.path.dirname(OUT), exist_ok=True)
prs.save(OUT)
print("saved:", OUT)
print("slides:", len(prs.slides._sldIdLst), "| 사용 이미지:", len(used))
allimg = {os.path.splitext(f)[0] for f in os.listdir(A) if f.endswith((".jpg", ".png"))}
skip = {n for n in allimg if n.startswith(("scrim", "vignette", "title_lockup"))}
print("미사용:", sorted(allimg - set(used) - skip))

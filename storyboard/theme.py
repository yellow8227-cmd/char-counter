"""
赫血 스토리보드 — 컷 장의 옷을 입힌다.

화면에서 제일 밝아야 하는 것은 컷 이미지 한 장뿐이다.
그래서 바탕도, 카드도 어둡게 깔고 글자만 밝게 얹는다.
흰 카드로 두면 카드가 먼저 눈에 들어와 이미지를 이긴다.

컷 카드용 표는 슬라이드가 아니라 **레이아웃**에 그려져 있으므로
레이아웃의 표를 한 번만 다시 칠하면 모든 컷 장에 적용된다.
"""

from __future__ import annotations

from lxml import etree
from pptx.dml.color import RGBColor
from pptx.oxml.ns import qn
from pptx.util import Emu, Pt

# 팔레트 — 키 아트의 어두운 화면에서 뽑았다
INK = RGBColor(0x0B, 0x0A, 0x09)        # 제일 깊은 바닥
PLATE = RGBColor(0x15, 0x12, 0x10)      # 카드 몸통
PLATE_LABEL = RGBColor(0x1E, 0x1A, 0x17)  # 왼쪽 항목 칸
PLATE_HEAD = RGBColor(0x26, 0x20, 0x1C)  # Scene / Shot 머리
WELL = RGBColor(0x07, 0x07, 0x06)       # 그림이 앉는 자리
HAIRLINE = RGBColor(0x3A, 0x32, 0x2D)   # 칸 경계
BONE = RGBColor(0xDC, 0xD7, 0xD2)       # 본문
ASH = RGBColor(0x94, 0x8C, 0x86)        # 항목 이름
DIM = RGBColor(0x5E, 0x57, 0x52)        # 비어 있는 자리 안내

PICTURE_ROW = 1  # 표 6행 중 그림이 들어가는 행


def _set_cell(cell, fill: RGBColor, text_color: RGBColor, *, bold=None) -> None:
    cell.fill.solid()
    cell.fill.fore_color.rgb = fill
    for para in cell.text_frame.paragraphs:
        for run in para.runs:
            run.font.color.rgb = text_color
            if bold is not None:
                run.font.bold = bold


def _set_borders(cell, color: RGBColor, width_pt: float = 0.5) -> None:
    tcPr = cell._tc.get_or_add_tcPr()
    for tag in ("a:lnL", "a:lnR", "a:lnT", "a:lnB"):
        for old in tcPr.findall(qn(tag)):
            tcPr.remove(old)
    # lnL·lnR·lnT·lnB 는 tcPr 안에서 이 순서로 와야 한다
    for tag in ("a:lnL", "a:lnR", "a:lnT", "a:lnB"):
        ln = etree.SubElement(tcPr, qn(tag))
        ln.set("w", str(Pt(width_pt)))
        ln.set("cap", "flat")
        fill = etree.SubElement(ln, qn("a:solidFill"))
        clr = etree.SubElement(fill, qn("a:srgbClr"))
        clr.set("val", f"{color}")


def _kill_style_banding(table) -> None:
    """표 스타일이 머리행·줄무늬를 다시 칠하지 못하게 끈다."""
    tblPr = table._tbl.find(qn("a:tblPr"))
    if tblPr is not None:
        for attr in ("firstRow", "bandRow", "firstCol", "bandCol", "lastRow", "lastCol"):
            tblPr.attrib.pop(attr, None)


def restyle_layout(layout) -> list[tuple[int, int, int, int]]:
    """
    레이아웃의 컷 카드 6개를 어둡게 다시 칠한다.
    돌려주는 값은 패널마다의 그림 자리 (left, top, width, height).
    """
    wells = []
    tables = [s for s in layout.shapes if s.has_table]
    for shape in tables:
        table = shape.table
        _kill_style_banding(table)
        for r, row in enumerate(table.rows):
            for c, cell in enumerate(row.cells):
                if r == PICTURE_ROW:
                    fill, color = WELL, DIM
                elif r == 0:
                    fill, color = PLATE_HEAD, ASH
                elif c == 0:
                    fill, color = PLATE_LABEL, ASH
                else:
                    fill, color = PLATE, BONE
                _set_cell(cell, fill, color)
                _set_borders(cell, HAIRLINE)
                cell.margin_left = cell.margin_right = Pt(3)
                cell.margin_top = cell.margin_bottom = Pt(1)

        # 그림 자리 = 표 안에서 PICTURE_ROW 가 차지하는 영역
        top = shape.top + sum(table.rows[i].height for i in range(PICTURE_ROW))
        wells.append((shape.left, top, shape.width, table.rows[PICTURE_ROW].height))

    for ph in layout.placeholders:
        for para in ph.text_frame.paragraphs:
            para.font.color.rgb = BONE
            for run in para.runs:
                run.font.color.rgb = BONE

    return wells


def paint_background(slide, top: RGBColor = RGBColor(0x10, 0x0D, 0x0C),
                     bottom: RGBColor = RGBColor(0x05, 0x05, 0x05)) -> None:
    """
    슬라이드 바탕. 카드(PLATE #15120F)보다 확실히 어두워야
    카드가 바닥에 녹지 않고 한 장씩 떠 보인다.
    """
    fill = slide.background.fill
    fill.gradient()
    fill.gradient_angle = 90.0
    stops = fill.gradient_stops
    stops[0].color.rgb = top
    stops[0].position = 0.0
    stops[1].color.rgb = bottom
    stops[1].position = 1.0


def mark_empty_well(slide, well, label: str = "시안 필요") -> None:
    """
    이미지가 아직 없는 칸. 그림 자리표시자를 그대로 두면
    파워포인트가 「그림을 추가하려면 아이콘을 클릭하세요」를 띄운다.
    대신 어두운 판 하나와 한 줄짜리 안내만 남긴다.
    """
    from pptx.enum.shapes import MSO_SHAPE
    from pptx.enum.text import MSO_ANCHOR, PP_ALIGN

    left, top, width, height = well
    inset = Emu(int(Pt(4)))
    plate = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE,
        left + inset, top + inset, width - inset * 2, height - inset * 2,
    )
    plate.fill.solid()
    plate.fill.fore_color.rgb = WELL
    plate.line.color.rgb = HAIRLINE
    plate.line.width = Pt(0.5)
    plate.shadow.inherit = False

    tf = plate.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    para = tf.paragraphs[0]
    para.alignment = PP_ALIGN.CENTER
    run = para.add_run()
    run.text = label
    run.font.size = Pt(9)
    run.font.color.rgb = DIM
    run.font._rPr.set("spc", "200")

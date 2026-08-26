#!/usr/bin/env python3
"""
赫血 스토리보드 — 컷 목록(JSON)을 원본 PPT 템플릿에 부어 넣는다.

원본 템플릿은 슬라이드 1장에 패널 6개(3열 × 2행).
패널 하나 = 그림 개체 틀 1 + 텍스트 개체 틀 6
          (Scene / Shot / 카메라 / 장면묘사 / 디테일·메모 / 전환효과)

사용법:
    python build_deck.py                      # cuts.json -> out/storyboard.pptx
    python build_deck.py --cuts cuts.json --template AI_storyboard.pptx \
                         --images images --out out/storyboard.pptx
"""

from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path

from pptx import Presentation
from pptx.enum.text import MSO_ANCHOR
from pptx.util import Pt

HERE = Path(__file__).parent

# 패널 1개당 자리표시자 7개가 연속으로 붙어 있다. 패널 6개 × 7 = 42, 시작 idx 10.
PANELS_PER_SLIDE = 6
PH_PER_PANEL = 7
FIRST_PH_IDX = 10

# 텍스트 자리표시자 6개의 순서 (그림 틀 바로 다음부터)
FIELD_ORDER = ["scene", "shot", "camera", "desc", "note", "trans"]

# 칸별 최대 글자 크기 — 번호 칸은 크게, 설명 칸은 작게.
# 실제 크기는 칸에 들어가는 만큼 아래에서 자동으로 줄인다.
FIELD_MAX_PT = {
    "scene": 12.0,
    "shot": 12.0,
    "camera": 8.0,
    "desc": 8.0,
    "note": 8.0,
    "trans": 8.0,
}

# 텍스트 칸 한 개의 실측 크기 (템플릿 기준)
BOX_W_PT = 2.85 * 72  # 205.2pt
BOX_H_PT = 16.0       # 실측 0.26in 중 안전하게 쓰는 높이 (줄이 아래 칸을 침범하지 않도록)
LINE_RATIO = 1.15     # 줄간격
SIZE_STEPS = [12.0, 11.0, 10.0, 9.0, 8.0, 7.5, 7.0, 6.5, 6.0, 5.5, 5.0]


def text_width_units(s: str) -> float:
    """1em을 1.0으로 본 글자 폭의 합. 한글·한자·가나는 1.0, 그 외는 0.5."""
    total = 0.0
    for ch in s:
        total += 1.0 if ord(ch) > 0x2E80 else 0.5
    return total


def fit_font_pt(s: str, max_pt: float) -> float:
    """칸 안에 다 들어가는 가장 큰 글자 크기를 고른다."""
    if not s:
        return max_pt
    units = text_width_units(s)
    for pt in SIZE_STEPS:
        if pt > max_pt:
            continue
        lines_needed = -(-int(units * pt) // int(BOX_W_PT))  # ceil
        lines_fit = int(BOX_H_PT // (pt * LINE_RATIO))
        if lines_fit >= max(lines_needed, 1):
            return pt
    return SIZE_STEPS[-1]


# 그림 개체 틀 3.79 × 2.14 in
PANEL_ASPECT = 3.79 / 2.14  # 1.771:1


def fit_to_panel(path: Path, cache: Path) -> Path:
    """
    그림 칸에 넣으면 PowerPoint가 가운데를 기준으로 잘라낸다.
    시네마스코프(2.4:1) 컷은 좌우가 통째로 날아가므로,
    미리 검은 여백을 붙여 칸 비율에 맞춘 사본을 만들어 그걸 넣는다.
    """
    from PIL import Image

    with Image.open(path) as im:
        im = im.convert("RGB")
        w, h = im.size
        aspect = w / h
        if abs(aspect - PANEL_ASPECT) < 0.02:
            return path

        if aspect > PANEL_ASPECT:      # 더 넓다 -> 위아래에 여백
            nw, nh = w, round(w / PANEL_ASPECT)
        else:                          # 더 좁다 -> 좌우에 여백
            nw, nh = round(h * PANEL_ASPECT), h

        canvas = Image.new("RGB", (nw, nh), (0, 0, 0))
        canvas.paste(im, ((nw - w) // 2, (nh - h) // 2))

        cache.mkdir(parents=True, exist_ok=True)
        out = cache / (path.stem + "_fit.jpg")
        canvas.save(out, quality=92, optimize=True)
        return out


IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp"]


def resolve_image(images_dir: Path, name: str) -> Path | None:
    """확장자가 달라도 이름만 맞으면 찾아준다. png로 적어두고 jpg를 넣어도 된다."""
    exact = images_dir / name
    if exact.exists():
        return exact
    stem = Path(name).stem
    for ext in IMAGE_EXTS:
        cand = images_dir / (stem + ext)
        if cand.exists():
            return cand
    return None


def panel_placeholder_indices(panel: int) -> tuple[int, list[int]]:
    """패널 번호(0~5) -> (그림 틀 idx, 텍스트 틀 idx 6개)"""
    base = FIRST_PH_IDX + panel * PH_PER_PANEL
    return base, [base + n for n in range(1, PH_PER_PANEL)]


def clear_slide(slide) -> None:
    """템플릿에 남아 있는 기존 내용(샘플 이미지 포함)을 비운다."""
    for shape in list(slide.shapes):
        shape._element.getparent().remove(shape._element)


def clone_layout_placeholders(slide, layout) -> None:
    """레이아웃의 자리표시자를 슬라이드로 복제한다."""
    spTree = slide.shapes._spTree
    for ph in layout.placeholders:
        spTree.append(copy.deepcopy(ph._element))


def fill_text(ph, value: str, field: str) -> None:
    value = value or ""
    tf = ph.text_frame
    tf.text = value
    tf.word_wrap = True
    # 칸이 좁으니 안쪽 여백을 최대한 없앤다
    tf.margin_left = tf.margin_right = Pt(1)
    tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.TOP

    size = Pt(fit_font_pt(value, FIELD_MAX_PT.get(field, 8.0)))
    for para in tf.paragraphs:
        para.line_spacing = LINE_RATIO
        para.font.size = size
        for run in para.runs:
            run.font.size = size


def fill_panel(slide, panel: int, cut: dict, images_dir: Path, cache: Path) -> None:
    pic_idx, text_idxs = panel_placeholder_indices(panel)
    by_idx = {p.placeholder_format.idx: p for p in slide.placeholders}

    for field, idx in zip(FIELD_ORDER, text_idxs):
        ph = by_idx.get(idx)
        if ph is not None:
            fill_text(ph, str(cut.get(field, "")), field)

    pic_ph = by_idx.get(pic_idx)
    if pic_ph is None:
        return

    name = cut.get("image")
    if not name:
        return
    path = resolve_image(images_dir, name)
    if path is None:
        print(f"  · 이미지 없음, 빈 칸으로 둠: {name}", file=sys.stderr)
        return
    pic_ph.insert_picture(str(fit_to_panel(path, cache)))


def drop_unused_placeholders(slide, used_panels: int) -> None:
    """마지막 슬라이드에서 컷이 없는 패널의 자리표시자를 지운다."""
    keep = set()
    for panel in range(used_panels):
        pic_idx, text_idxs = panel_placeholder_indices(panel)
        keep.add(pic_idx)
        keep.update(text_idxs)
    for ph in list(slide.placeholders):
        if ph.placeholder_format.idx not in keep:
            ph._element.getparent().remove(ph._element)


def split_cuts(cuts: list[dict], images_dir: Path) -> tuple[list[dict], list[dict]]:
    """
    레퍼런스 덱이므로 그림 칸이 빈 패널을 줄줄이 늘어놓지 않는다.
    이미지가 있는 컷과, 시안이 꼭 있어야 하는 컷(need)만 슬라이드에 싣고
    나머지 — 그대로 촬영하면 되는 컷 — 는 목록으로만 남긴다.
    """
    on_deck, shoot_only = [], []
    for cut in cuts:
        has_image = bool(cut.get("image")) and resolve_image(images_dir, cut["image"])
        (on_deck if has_image or cut.get("need") else shoot_only).append(cut)
    return on_deck, shoot_only


def write_shoot_list(cuts: list[dict], path: Path) -> None:
    """슬라이드에서 뺀 컷을 촬영용 목록으로 남긴다."""
    lines = [
        "# 촬영 컷 목록 — 시안 없이 그대로 찍는 컷",
        "",
        "레퍼런스 덱(`storyboard.pptx`)에서는 뺐지만 컷 번호는 그대로 살아 있습니다.",
        "덱의 씬·컷 번호가 군데군데 건너뛰는 것은 여기 있는 컷들입니다.",
        "",
    ]
    scene = None
    for cut in cuts:
        if cut["scene"] != scene:
            scene = cut["scene"]
            lines += ["", f"## 씬 {scene}", "", "| 컷 | 카메라 | 장면묘사 | 디테일 / 메모 |", "|---|---|---|---|"]
        lines.append(
            f"| {cut['shot']} | {cut['camera']} | {cut['desc']} | {cut.get('note', '')} |"
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def build(cuts: list[dict], template: Path, images_dir: Path, out: Path) -> int:
    prs = Presentation(str(template))
    layout = prs.slide_layouts[0]

    # 템플릿에 딸려 온 첫 슬라이드는 비워두고 첫 장으로 재사용한다.
    base_slide = prs.slides[0]
    clear_slide(base_slide)
    clone_layout_placeholders(base_slide, layout)

    slides = [base_slide]
    total_slides = -(-len(cuts) // PANELS_PER_SLIDE)  # ceil
    for _ in range(total_slides - 1):
        s = prs.slides.add_slide(layout)
        slides.append(s)

    for i, slide in enumerate(slides):
        chunk = cuts[i * PANELS_PER_SLIDE : (i + 1) * PANELS_PER_SLIDE]
        for panel, cut in enumerate(chunk):
            fill_panel(slide, panel, cut, images_dir, out.parent / "_fit")
        if len(chunk) < PANELS_PER_SLIDE:
            drop_unused_placeholders(slide, len(chunk))

    out.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(out))
    return total_slides


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cuts", default=str(HERE / "cuts.json"))
    ap.add_argument("--template", default=str(HERE / "template.pptx"))
    ap.add_argument("--images", default=str(HERE / "images"))
    ap.add_argument("--out", default=str(HERE / "out" / "storyboard.pptx"))
    args = ap.parse_args()

    data = json.loads(Path(args.cuts).read_text(encoding="utf-8"))
    cuts = data["cuts"] if isinstance(data, dict) else data

    out = Path(args.out)
    on_deck, shoot_only = split_cuts(cuts, Path(args.images))
    write_shoot_list(shoot_only, out.parent / "촬영컷목록.md")

    blanks = sum(1 for c in on_deck if not resolve_image(Path(args.images), c.get("image") or ""))
    n = build(on_deck, Path(args.template), Path(args.images), out)
    print(
        f"전체 {len(cuts)}컷 · 덱 {len(on_deck)}컷(시안 필요 빈칸 {blanks}) · "
        f"촬영 목록 {len(shoot_only)}컷 → 슬라이드 {n}장 → {out}"
    )


if __name__ == "__main__":
    main()

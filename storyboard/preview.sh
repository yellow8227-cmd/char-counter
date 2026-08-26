#!/usr/bin/env bash
# 제일 최근에 만든 판본을 PDF·PNG로 뽑아 눈으로 확인한다.
# 사용법: ./preview.sh [슬라이드번호] [pptx 경로]   (기본 1번 · 최신 판본)
set -euo pipefail
cd "$(dirname "$0")"

PAGE="${1:-1}"
DECK="${2:-$(ls -t out/*.pptx 2>/dev/null | head -1)}"
[ -n "$DECK" ] || { echo "out/ 에 pptx가 없습니다. 먼저 python3 build_deck.py"; exit 1; }

export HOME="${HOME:-/tmp}/lo-storyboard"
mkdir -p "$HOME"

soffice --headless --norestore --convert-to pdf \
        --outdir "$PWD/out" "$PWD/$DECK" >/dev/null 2>&1

python3 - "$PAGE" "$DECK" <<'PY'
import sys, pathlib, pymupdf
page = int(sys.argv[1]) - 1
pdf = pathlib.Path("out") / (pathlib.Path(sys.argv[2]).stem + ".pdf")
doc = pymupdf.open(pdf)
out = pathlib.Path("out") / f"preview{page + 1}.png"
doc[page].get_pixmap(dpi=120).save(out)
print(f"{pdf.name} · {len(doc)}장 → {out}")
PY

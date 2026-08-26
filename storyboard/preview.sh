#!/usr/bin/env bash
# 만들어진 pptx를 PDF·PNG로 뽑아 눈으로 확인한다.
# 사용법: ./preview.sh [슬라이드번호]   (기본 1)
set -euo pipefail
cd "$(dirname "$0")"

PAGE="${1:-1}"
export HOME="${HOME:-/tmp}/lo-storyboard"
mkdir -p "$HOME"

soffice --headless --norestore --convert-to pdf \
        --outdir "$PWD/out" "$PWD/out/storyboard.pptx" >/dev/null 2>&1

python3 - "$PAGE" <<'PY'
import sys, pymupdf
page = int(sys.argv[1]) - 1
doc = pymupdf.open("out/storyboard.pdf")
doc[page].get_pixmap(dpi=120).save(f"out/preview{page + 1}.png")
print(f"슬라이드 {len(doc)}장 · out/preview{page + 1}.png 로 저장")
PY

#!/bin/sh
# src/ 조각을 한 파일로 합친다: head → style → body → data → app
cd "$(dirname "$0")"
{ cat src/head.html; echo "<style>"; cat src/style.css; echo "</style>"; cat src/body.html; echo "<script>"; cat src/data.js; cat src/app.js; echo "</script>"; } > index.html

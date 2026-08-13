#!/usr/bin/env python3
"""소개 페이지 제목용 글씨체(Jua) 만들기 — 페이지에 실제로 쓰인 글자만 담는다.

왜 필요한가
  한글 폰트는 글자 수가 많아 통째로는 2MB가 넘는다. 제목에만 쓰는데 그걸 다 받게 하면
  페이지가 느려진다. 그래서 이 페이지에 나오는 글자만 골라 담는다(보통 40KB 안쪽).
  이 파일은 이미 만들어져 저장소에 들어 있으니, 페이지 글을 고쳤을 때만 다시 돌리면 된다.

  글씨체: Jua (Copyright 2018 The Jua Project Authors, SIL OFL 1.1)
          press/fonts/OFL.txt 에 라이선스 전문이 있다. 상업적 사용·임베딩 모두 허용.

쓰기
  python3 jelly-shooting/tools/make-press-font.py [원본.ttf]
  (원본이 없으면 https://github.com/google/fonts/raw/main/ofl/jua/Jua-Regular.ttf 를 받아 쓴다)

결과
  jelly-shooting/press/fonts/Jua-subset.woff2
"""
import os, re, sys, subprocess, urllib.request

HERE  = os.path.dirname(os.path.abspath(__file__))
ROOT  = os.path.dirname(HERE)
PRESS = os.path.join(ROOT, 'press')
PAGE  = os.path.join(PRESS, 'index.html')
OUTD  = os.path.join(PRESS, 'fonts')
OUT   = os.path.join(OUTD, 'Jua-subset.woff2')
SRC   = sys.argv[1] if len(sys.argv) > 1 else os.path.join(OUTD, 'Jua-Regular.ttf')
URL   = 'https://raw.githubusercontent.com/google/fonts/main/ofl/jua/Jua-Regular.ttf'

os.makedirs(OUTD, exist_ok=True)
if not os.path.exists(SRC):
    print('원본 글씨체를 받는 중… ' + URL)
    urllib.request.urlretrieve(URL, SRC)

# 페이지에서 글자를 모은다. 태그와 CSS는 빼고, 사람이 읽는 글만.
html = open(PAGE, encoding='utf-8').read()
text = re.sub(r'<(style|script)[\s\S]*?</\1>', ' ', html)
text = re.sub(r'<[^>]+>', ' ', text)
# 제목은 Jua 로만 나오지만, 글을 조금 고쳐도 글자가 빠지지 않게 본문 글자까지 다 담는다.
chars = set(text)
chars |= set('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')
chars |= set(' .,·:;!?~-—…()[]%/&+×@#\'"’“”')
# 이모지·제어문자는 폰트에 없다(기기 이모지가 그린다) — 굳이 넣지 않는다
keep = sorted(c for c in chars if c.isprintable() and ord(c) < 0x1F000 and not (0x2600 <= ord(c) <= 0x27BF))

cmd = ['pyftsubset', SRC, '--output-file=' + OUT, '--flavor=woff2',
       '--layout-features=kern,liga', '--desubroutinize',
       '--unicodes=' + ','.join('U+%04X' % ord(c) for c in keep)]
try:
    subprocess.run(cmd, check=True)
except FileNotFoundError:
    sys.exit('pyftsubset 이 없습니다 →  pip install fonttools brotli')

print('✅ %s  %d글자  %.1fKB' % (OUT, len(keep), os.path.getsize(OUT) / 1024))

# 글자수 세기 (char-counter)

자소서나 리포트를 쓸 때 글자수를 빠르게 확인하는 작은 명령줄 도구입니다.
파이썬 표준 라이브러리만 사용하므로 따로 설치할 것이 없습니다.

## 사용법

파일의 글자수를 셀 때:

```bash
python counter.py 내파일.txt
```

키보드로 직접 입력해서 셀 때 (입력을 끝내려면 `Ctrl+Z` 후 Enter):

```bash
python counter.py
```

## 출력 예시

```
공백 포함: 128
공백 제외: 103
단어: 24
줄: 5
```

## 요구 사항

- Python 3.9 이상

## 같이 들어 있는 것

- [`blogdeck/`](blogdeck/) — ✍️ **BLOGDECK · 블로그덱**.
  키워드 고르기부터 발행 전 점검, 릴스 대본과 카드뉴스까지 한 자리에서 굴리는 단일 HTML 워크벤치입니다.
  다 쓴 글을 붙여 넣으면 **글자수 · 키워드 · 띄어쓰기 어긋남 · 문단 · 해시태그**를 훑고 고칠 자리를 짚어 줍니다.
  `blogdeck/index.html`을 더블클릭하면 바로 열리고,
  `https://<계정>.github.io/char-counter/blogdeck/` 주소로도 열립니다.
  자세한 설명은 [`blogdeck/README.md`](blogdeck/README.md)에 있습니다.

- [`scenedeck/`](scenedeck/) — 🎬 **SCENEDECK · 씬덱**.
  시나리오부터 AI 프롬프트까지 한 자리에서 굴리는 단일 HTML 워크벤치입니다.
  `scenedeck/index.html`을 더블클릭하면 바로 열리고,
  GitHub Pages를 켜면 `https://<계정>.github.io/char-counter/scenedeck/` 주소로도 열립니다.
  자세한 설명은 [`scenedeck/README.md`](scenedeck/README.md)에 있습니다.

## 라이선스

MIT

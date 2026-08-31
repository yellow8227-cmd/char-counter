# 옐로우그로브 · YELLOW GROVE

정주원의 홈페이지이자, 이 저장소에 들어 있는 것들의 입구입니다.
`index.html` 하나로 굴러갑니다 — 빌드도, 설치도, 의존성도 없습니다.

### 👉 https://yellow8227-cmd.github.io/char-counter/

| 주소 | 무엇 |
|---|---|
| `/` | 홈 — 갈래별로 골라 보는 자리 |
| `/scenedeck/` | 🎬 씬덱 — 대본에서 컷과 AI 프롬프트까지 |
| `/shot-planner/` | 📐 촬영 배치도 — 평면도·렌즈 화각 |
| `/jelly-shooting/` | 🍡 젤리슈팅 — 최대 4인 실시간 |

바깥으로 나가는 것: 포트폴리오(노션) · 블로그 «밥풀» · 인스타그램 @travelcat_kami.

## 브랜드

| | |
|---|---|
| 이름 | **YELLOW GROVE · 옐로우그로브** — grove 는 과수원입니다 |
| 마크 | 레몬나무 가지. `brand/mark.svg` |
| 색 | **`#FFC400`** — 마크·강조에만. 화면의 5% 만 |
| 글꼴 | 고운바탕(제목) · Gothic A1(본문) · Archivo(영문) |

마크는 **단색 벡터**입니다. `currentColor` 하나만 쓰므로 글자색만 바꾸면
검은 바탕·노란 바탕 어디에나 그대로 올라갑니다. 배경은 투명합니다.

```
brand/mark.svg       원본. 크기 제한 없음
brand/icon-32.png    파비콘
brand/icon-180.png   아이폰 홈 화면
brand/icon-512.png   안드로이드 · 스토어
brand/shots/         홈에 걸리는 도구 화면 (브라우저·폰 목업 안에 들어감)
og.png               카톡·슬랙에 붙였을 때 뜨는 카드
```

도구를 고쳐서 화면이 바뀌면 `brand/shots/` 의 그림도 다시 찍어야 합니다.
`node tools/capture-shots.mjs` 를 돌리면 세 도구를 열어 첫 화면을 그대로 찍습니다.

마크를 고치면 `brand/mark.svg` 와 `index.html` 안의 `<symbol id="yg">` 를 **함께**
바꾸고, 아이콘과 카드를 다시 뽑으세요 — `node tools/make-og.mjs`.

## 홈페이지를 켜려면 (한 번만)

지금 사이트는 **`gh-pages` 가지**를 보고 있어서, 뿌리 주소가 촬영 배치도로 열립니다.
홈이 뿌리가 되게 하려면 보는 곳을 `main` 으로 바꿔 주세요.

> **Settings → Pages → Build and deployment → Source: «Deploy from a branch»
> → Branch: `main` / `/ (root)` → Save**

바꾸고 나면 위 표의 주소가 전부 그대로 열립니다. 몇 분 걸립니다.
그 뒤로는 `main` 에 올리기만 하면 사이트에 자동으로 반영됩니다.

> 촬영 배치도를 쓰던 사람이 예전 뿌리 주소로 들어오면 이제 홈이 열립니다.
> 배치도는 `/shot-planner/` 로 옮겨 갑니다.

## 주소를 바꾸고 싶을 때

`index.html` 맨 위에 **고칠 곳 네 군데**를 번호로 적어 두었습니다.
파일에서 `①` `②` `③` `④` 를 찾으면 바로 그 자리입니다.

| | 무엇 | 지금 값 |
|---|---|---|
| ① | 이 페이지 주소 (미리보기 카드·검색용) | `yellow8227-cmd.github.io/char-counter/` |
| ② | 포트폴리오 노션 | 노션 페이지 주소 |
| ③ | 젤리슈팅 | netlify 주소 |
| ④ | 블로그 · 인스타그램 | `blog.naver.com/bap-pul` · `@travelcat_kami` |

---

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

홈페이지에도 같은 것이 붙어 있습니다 — 「작은 도구 · 글자수 세기」 칸에
붙여 넣으면 바로 셉니다. 셈법은 이 파일과 같습니다.

## 같이 들어 있는 것

- [`scenedeck/`](scenedeck/) — 🎬 **씬덱**. 대본에서 컷과 AI 프롬프트까지. [설명](scenedeck/README.md)
- [`shot-planner/`](shot-planner/) — 📐 **촬영 배치도**. 평면도와 렌즈 화각. [설명](shot-planner/README.md)
- [`jelly-shooting/`](jelly-shooting/) — 🍡 **젤리슈팅**. 최대 4인 실시간 게임.

## 라이선스

MIT

# YELLOW LAB · 정주원

브랜드 홈페이지이자, 이 저장소에 들어 있는 것들의 입구입니다.
`index.html` 하나로 굴러갑니다 — 빌드도, 설치도, 의존성도 없습니다.

### 👉 https://yellow8227-cmd.github.io/char-counter/

| 주소 | 무엇 |
|---|---|
| `/` | 브랜드 홈 — 갈래별로 골라 보는 자리 |
| `/scenedeck/` | 🎬 씬덱 — 대본에서 컷과 AI 프롬프트까지 |
| `/shot-planner/` | 📐 촬영 배치도 — 평면도·렌즈 화각 |
| `/jelly-shooting/` | 🍡 젤리슈팅 — 최대 4인 실시간 |

바깥으로 나가는 것: 포트폴리오(노션) · 블로그 «밥풀» · 인스타그램 @travelcat_kami.

## 홈페이지를 켜려면 (한 번만)

지금 사이트는 **`gh-pages` 가지**를 보고 있어서, 뿌리 주소가 촬영 배치도로 열립니다.
브랜드 홈이 뿌리가 되게 하려면 보는 곳을 `main` 으로 바꿔 주세요.

> **Settings → Pages → Build and deployment → Source: «Deploy from a branch»
> → Branch: `main` / `/ (root)` → Save**

바꾸고 나면 위 표의 주소가 전부 그대로 열립니다. 몇 분 걸립니다.
그 뒤로는 `main` 에 올리기만 하면 사이트에 자동으로 반영됩니다.

> 촬영 배치도를 쓰던 사람이 예전 뿌리 주소로 들어오면 이제 브랜드 홈이 열립니다.
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

## 링크 미리보기 카드 (og.png)

카톡·슬랙에 주소를 붙이면 뜨는 그림입니다. 다시 만들려면:

```bash
node tools/make-og.mjs
```

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

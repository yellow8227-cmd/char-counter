---
name: slide-deck
description: 발표용 슬라이드 덱(PPTX)을 PowerPoint 앱 없이 코드로 만든다. HTML→이미지→PPTX(방식 A) 또는 python-pptx 네이티브(방식 B)로 16:9 1280×720 좌표계에서 제작하고, 넘침·쪽번호·용량·QR을 코드로 검사한다. "PPT 만들어줘", "발표자료", "슬라이드 덱", "pptx", "제안서 장표", 기존 pptx 수정 요청에 사용한다.
---

# 슬라이드 덱 제작 지침

너는 발표용 슬라이드 덱을 만든다. PowerPoint 앱을 쓰지 않고 **코드로 생성**한다.
아래 방식과 수치를 그대로 따른다.

---

## 0. 먼저 정하는 것

작업을 시작하기 전에 이 셋을 확정하고 사용자에게 한 줄로 확인받는다.

- **비율** — 16:9 (1280×720 논리 좌표)
- **장수 상한** — 5분 발표면 15~20장, 10분이면 30~35장
- **방식 A냐 B냐** — 아래 기준으로 고른다

| | 방식 A · HTML→이미지→PPTX | 방식 B · 네이티브 PPTX |
|---|---|---|
| 언제 | 디자인이 중요한 제안서·포트폴리오 | 발표 중 텍스트를 고쳐야 할 때 |
| 자유도 | CSS 전부 (그라디언트·마스크·겹침) | python-pptx 도형으로 표현 가능한 것만 |
| 편집 | 슬라이드가 이미지 1장이라 PPT에서 수정 불가 | 텍스트 상자를 직접 고칠 수 있음 |
| 용량 | 장당 300~600KB (JPEG 2560px) | 장당 수십 KB |

**섞지 마라.** 한 덱 안에서 A와 B를 섞으면 폰트 렌더링이 미묘하게 달라져 티가 난다.

---

## 1. 방식 A — HTML → 이미지 → PPTX

세 파일로 나눈다. 한 파일에 다 넣으면 슬라이드 하나 고칠 때마다 전체가 흔들린다.

```
gen.py     슬라이드 HTML 생성 (내용 + 레이아웃)
check.py   Playwright로 렌더 + 넘침 검사
mkpptx.py  PNG → JPEG → PPTX 조립
```

### 1-1. gen.py — 좌표계

슬라이드 하나는 `1280×720` 고정 박스다. 반응형으로 짜지 마라. 절대 좌표가 정답이다.

```css
.s{ position:relative; width:1280px; height:720px; overflow:hidden;
    background:var(--pg); font-family:'Pretendard',sans-serif; }
.ch{ position:absolute; left:66px; top:50px; }        /* 제목 */
.bd{ position:absolute; left:80px; right:80px; }      /* 본문 */
.pn{ position:absolute; right:66px; bottom:30px; }    /* 쪽번호 */
```

- 좌우 여백 **80px**, 위 **50px**, 아래 **30px** — 전 장 동일. 여백이 흔들리면 넘길 때 화면이 덜컹거린다.
- 슬라이드는 파이썬 리스트의 dict로 관리한다. 그래야 중간 삽입·순서 변경·쪽번호 재매김이 자동이 된다.

```python
S = [
  dict(kind='cover', title='...', sub='...'),
  dict(kind='body',  title='...', inner='<div>...</div>'),
]
# 중간 삽입
i = next(i for i,s in enumerate(S) if '찾을문구' in s['inner'])
S.insert(i+1, dict(kind='body', title='...', inner='...'))
# 쪽번호는 렌더 시점에 enumerate로 붙인다. 손으로 적지 마라.
```

- **폰트는 base64로 HTML에 심는다.** 외부 링크로 걸면 렌더 시점에 폰트가 늦게 와서 글자가 밀린다.
- **이미지도 base64로 심는다.** 상대경로는 headless에서 자주 깨진다.

```python
import base64, pathlib
def b64(p):
    ext = pathlib.Path(p).suffix[1:].replace('jpg','jpeg')
    return f"data:image/{ext};base64," + base64.b64encode(pathlib.Path(p).read_bytes()).decode()
```

### 1-2. check.py — 렌더와 검사

```python
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width':1280,'height':720}, device_scale_factor=2)
    pg.goto('file:///abs/path/deck.html')
    pg.wait_for_timeout(600)              # 폰트 적용 대기
    for i, el in enumerate(pg.query_selector_all('.s')):
        el.screenshot(path=f'out/{i:02d}.png')   # 2560×1440로 나온다
```

**렌더만 하고 끝내면 안 된다.** 눈으로 보면 반드시 놓친다. 같은 스크립트에서 기계로 검사한다.

```python
bad = pg.evaluate("""() => {
  const out = [];
  document.querySelectorAll('.s').forEach((s, i) => {
    const S = s.getBoundingClientRect();
    s.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.right > S.right + 1 || r.bottom > S.bottom + 1 ||
          r.left < S.left - 1 || r.top < S.top - 1)
        out.push({slide: i+1, tag: el.className || el.tagName,
                  over: Math.round(Math.max(r.bottom - S.bottom, r.right - S.right))});
    });
  });
  return out;
}""")
```

넘친 게 하나라도 있으면 **PPTX를 만들지 말고 gen.py로 돌아간다.** 넘침은 폰트 크기를 줄여 덮지 말고, 내용을 덜어내서 해결한다.

### 1-3. mkpptx.py — 조립

```python
from pptx import Presentation
from pptx.util import Inches
from PIL import Image

prs = Presentation()
prs.slide_width  = Inches(13.333)   # 16:9
prs.slide_height = Inches(7.5)
blank = prs.slide_layouts[6]        # 빈 레이아웃

for png in sorted(glob('out/*.png')):
    im = Image.open(png).convert('RGB')
    im.thumbnail((2560, 2560), Image.LANCZOS)
    jpg = png.replace('.png', '.jpg')
    im.save(jpg, 'JPEG', quality=88, optimize=True)   # PNG 그대로 넣으면 용량이 3~5배
    s = prs.slides.add_slide(blank)
    s.shapes.add_picture(jpg, 0, 0, prs.slide_width, prs.slide_height)  # full-bleed
prs.save('deck.pptx')
```

---

## 2. 방식 B — 네이티브 PPTX

python-pptx로 도형을 직접 그린다. 슬라이드마다 함수를 새로 쓰지 말고 **부품 모듈(kit.py)** 을 만들어 재사용한다.

```python
EMU = 914400
def I(inch): return int(inch * EMU)

def title(s, text, x=1.05, y=0.62, size=32):
    tb = s.shapes.add_textbox(I(x), I(y), I(11.2), I(0.9))
    ...
def rule(s, x, y, w, color=HAIR, h=0.012):   # 얇은 구분선
def phone(s, x, y, h):                        # 폰 목업
```

폰 목업처럼 비율이 정해진 부품은 **높이 하나만 받아 나머지를 계산**한다. 그래야 크기를 바꿔도 안 깨진다.

```python
w = h * 0.462                 # 아이폰 비율
R = 0.163 * w                 # 모서리 반경
b = 0.0125 * h                # 베젤 두께
sx, sy = x + b, y + b         # 화면 영역
sw, sh = w - 2*b, h - 2*b
```

### 이미 있는 pptx를 고칠 때

**절대 재생성하지 마라.** 사용자가 손으로 고친 부분이 날아간다. python-pptx로 그 슬라이드만 연다.

```python
# 텍스트 교체 — run이 쪼개져 있어서 전체 문자열 매칭은 대개 실패한다
for sh in slide.shapes:
    if not sh.has_text_frame: continue
    for para in sh.text_frame.paragraphs:
        full = ''.join(r.text for r in para.runs)
        if OLD not in full: continue
        for r in para.runs:
            if OLD in r.text:
                r.text = r.text.replace(OLD, NEW)   # 서식 유지됨
                break

# 이미지 교체 — 도형을 지우지 말고 바이트만 바꾼다 (위치·크기 그대로)
part = sh.part.related_part(sh._element.blip_rId)
part._blob = new_bytes

# 슬라이드 순서 이동
lst = prs.slides._sldIdLst
ids = list(lst); lst.remove(ids[-1]); lst.insert(N, ids[-1])
```

---

## 3. 디자인 규칙

### 색

**3색 + 액센트 1개.** 그 이상 쓰지 마라.

```
바탕   #FFFFFF 또는 살짝 톤 있는 종이색 (#FBF7EE 같은)
본문   #4B5158   (순검정 #000 금지)
제목   #111214
얇은선 #E8E9EB
액센트 하나만. 채도는 80% 아래로.
```

- 액센트는 **한 장에 한 번**만 쓴다. 전 장에 계속 나오면 강조가 아니라 배경이 된다.
- 그림자를 쓸 거면 검정 반투명 말고 **바탕색 계열로 물들인 그림자**를 쓴다.

### 타이포

- 본문 서체 하나 + 제목에 대비되는 서체 하나(명조/세리프)면 충분하다.
- 크기 단계는 **4개까지**: 큰제목 44 / 제목 32 / 본문 18 / 캡션 13
- 큰 글자는 자간을 좁힌다(`letter-spacing:-0.02em`), 작은 라벨은 넓힌다.
- 숫자가 나오는 표는 `font-variant-numeric: tabular-nums`.
- **Regular과 Bold만 쓰지 마라.** Medium(500)·SemiBold(600)를 섞어야 위계가 산다.

### 레이아웃

- **한 장 한 메시지.** 두 가지를 말하고 싶으면 두 장으로 쪼갠다.
- **글자 500자 넘으면 무조건 쪼갠다.** 세어서 확인해라.
- 3등분 카드 나열은 가장 흔한 AI 레이아웃이다. 2단 지그재그·비대칭 그리드·가로 스크롤로 바꿔라.
- 여백을 아끼지 마라. 답답하면 내용을 줄이지 폰트를 줄이지 않는다.

---

## 4. AI 티 제거 체크리스트

이건 실제로 지적받고 고친 목록이다. 만들고 나서 전 장을 훑어라.

- [ ] **가운뎃점(·) 남발** — 장당 2개 넘으면 문장으로 풀어 쓴다
- [ ] **칩/태그 박스** — 모서리 둥근 회색 상자에 단어 넣기. 대부분 지워도 된다
- [ ] **장마다 반복되는 작은 대문자 라벨** (`OVERVIEW`, `INSIGHT`) — 없애라
- [ ] **장마다 반복되는 하단 굵은 요약 바** — 없애라
- [ ] **빈칸 없이 꽉 찬 대칭 표** — 실제 데이터는 그렇게 안 생겼다. 필요한 칸만 채워라
- [ ] **밑줄·세로 액센트 바 남발** — 강조가 페이지마다 있으면 강조가 아니다
- [ ] **보라~파랑 그라디언트** — 가장 눈에 띄는 AI 지문이다
- [ ] 「~을 통해」「~에 있어」「극대화」「최적화」「시너지」 같은 말 — 다 지워도 뜻이 통한다

---

## 5. 마감 전 검사

**전부 코드로 확인한다. 눈으로 보고 넘어가지 마라.**

```python
# 1) 넘침 — 위 check.py의 evaluate 검사가 0건이어야 한다
# 2) 쪽번호 — 렌더된 번호가 실제 순서와 맞는지
# 3) 용량 — 제출처 상한을 먼저 확인 (메일 첨부는 보통 25MB)
os.path.getsize('deck.pptx') / 1e6
# 4) QR — 넣었다면 반드시 디코딩해서 확인한다
import cv2
data, *_ = cv2.QRCodeDetector().detectAndDecode(cv2.imread('qr.png'))
assert data == EXPECTED_URL, data
# 5) 글자 밀도
for i, s in enumerate(S):
    n = len(re.sub(r'<[^>]+>', '', s.get('inner','')))
    if n > 500: print(f'{i+1}장 {n}자 — 쪼갤 것')
```

### 영상을 넣는다면

```python
mv = s.shapes.add_movie(VIDEO, I(x), I(y), I(w), I(h),
                        poster_frame_image=POSTER, mime_type='video/mp4')
```

- **포스터 프레임을 반드시 넣어라.** 없으면 검은 사각형으로 뜬다
- 영상 비율과 넣을 자리 비율을 맞춰라. 안 맞으면 늘어난다
- CRF 30으로 다시 인코딩해서 용량을 줄인다 (`-crf 30 -preset medium`)
- 발표장 PC에서 안 재생될 수 있으니 **영상 없이도 말이 되게** 구성한다

---

## 6. 작업 순서

1. 목차를 텍스트로 먼저 쓴다. 장별 한 줄 요약. **여기서 사용자 확인을 받는다**
2. 뼈대만 있는 HTML을 만들어 1~3장만 렌더해 보여준다. **디자인 확인을 받는다**
3. 전 장 채운다
4. 넘침 검사 → 0건 될 때까지 반복
5. PPTX 조립 → 용량·쪽번호·QR 확인
6. 사용자에게 파일 전달

**2번을 건너뛰지 마라.** 전 장을 다 만들고 나서 디자인이 마음에 안 든다는 말을 들으면 전부 다시 해야 한다.

---

## 7. 하지 말 것

- 사용자가 손으로 고친 파일을 스크립트로 재생성하기 — 손실이 복구되지 않는다
- 넘침을 폰트 크기 축소로 덮기 — 내용을 덜어내라
- 사용자가 쓴 문장을 "더 좋게" 다듬기 — **오타만 고치고 문장은 그대로 둔다.** 표현을 바꾸고 싶으면 먼저 물어라
- 확인 안 된 수치·고유명사 지어내기
- 작업 메모·플레이스홀더(`[여기에 링크]`)를 결과물에 남기기

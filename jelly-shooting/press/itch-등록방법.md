# itch.io 등록 — 순서대로 따라 하는 법

**걸리는 시간: 처음이면 20~30분.** 심사도, 등록비도 없습니다.
필요한 파일은 전부 만들어 뒀고, 넣을 글자도 아래에 그대로 적어 뒀습니다.

---

## ⓪ 올리기 전에 — 5분, 이건 꼭 먼저

**`press/upload/supabase-setup.sql` 파일 전체를 Supabase 에 붙여 넣고 한 번 실행하세요.**
랭킹 표·지킴막이·피드백 표가 한꺼번에 만들어지고, **맨 끝에서 스스로 검사해 ✅/❌ 표를 찍어 줍니다.**
여러 번 돌려도 안전합니다.
지금까지는 아는 사람만 들어왔지만, itch.io 에 올리는 순간 **모르는 사람이 랭킹에 닿습니다.**
1등이 `999,999,999` 가 된 다음에 고치면 이미 늦습니다.

- Supabase 대시보드 → 왼쪽 **SQL Editor** → **New query** → 붙여넣기 → **Run**
- 같은 문서 6장의 `feedback` 표 SQL 도 같이 돌리면 💌 피드백 창이 그때 켜집니다
- 더 확실히 보고 싶으면 `press/upload/supabase-verify.sql` 을 한 줄씩 돌려 보세요 — **앞 세 줄은 에러가 나야 정상**입니다
- 원리와 한계 설명은 `press/랭킹-지키기.md` 에 있습니다

---

## ① 계정 만들기

1. **itch.io** → 오른쪽 위 **Register**
2. 이메일 · 아이디 · 비밀번호. 아이디는 주소가 됩니다 → `아이디.itch.io/jellimo`
   - 아이디 후보: `kamigames` · `jellimo` · `kami`
3. 메일 인증까지 마치기

> 판매·후원을 받을 생각이면 나중에 **Creator → Payment** 에서 PayPal/Stripe 를 붙입니다.
> 지금은 무료 배포만 할 거라 **건너뛰어도 됩니다.**

---

## ② 새 프로젝트 열기

오른쪽 위 **내 아이디 옆 화살표 ▾ → `Upload new project`**
(또는 Dashboard → `Create new project`)

---

## ③ 칸 채우기 — 그대로 복사해서 넣으세요

| 칸 | 넣을 것 |
|---|---|
| **Title** | `Jellimo: Tap & Survive` |
| **Project URL** | `jellimo` (자동으로 채워지면 그대로 두세요) |
| **Short description or tagline** | `Tap the falling jellies. 3-minute rounds, up to 4 players, no download.` |
| **Classification** | `Games` |
| **Kind of project** | **`HTML`** ← ⚠️ 이걸 골라야 브라우저에서 돌아갑니다. 기본값은 Downloadable 입니다 |
| **Release status** | `Released` |
| **Pricing** | `No payments` |

> 후원 버튼을 달고 싶으면 `Name your own price` 를 고르고 **Suggested donation 을 비워 두세요.**
> 그래도 "무료로 받기" 가 항상 먼저 보입니다.

---

## ④ 게임 파일 올리기 — 여기가 제일 중요합니다

1. **Uploads → `Upload files`** → **`press/upload/jellimo-itch.zip`** 고르기 (1.96MB)
2. 올라간 뒤 그 줄에 생기는 체크박스 **☑ `This file will be played in the browser`** 를 **반드시** 켭니다
   - 이걸 안 켜면 게임이 안 열리고 그냥 다운로드 파일이 됩니다
3. 그러면 아래에 **Embed options** 칸이 새로 생깁니다

| Embed options | 값 |
|---|---|
| Viewport dimensions | **Manually set size** → 너비 **430** · 높이 **932** |
| Mobile friendly | ☑ 켬 (**Orientation: Default**) |
| Automatically start on page load | ☐ 꺼 둠 (사람이 누르고 시작하는 게 낫습니다) |
| Fullscreen button | ☑ 켬 |
| Enable scrollbars | ☐ 끔 |

> **왜 430×932인가** — 게임이 세로(480:720)라 이 크기가 폰 화면과 같습니다.
> 데스크톱에서는 판이 저절로 641×961까지 커지니 작아 보일 걱정은 안 하셔도 됩니다.

---

## ⑤ 그림 넣기

| 칸 | 파일 |
|---|---|
| **Cover image** | **`press/upload/cover-A.png`** (630×500) ⚠️ `cover-1200x630.png` 은 링크 미리보기용이라 itch 에서 잘립니다 |
| **Screenshots** | `press/shots/appstore-1-play.png` … `appstore-6-home.png` (6장) |
| **Trailer / video** | 유튜브에 `press/video/jelly-shooting-promo.webm` 을 먼저 올리고 **그 주소**를 넣습니다. itch 는 영상 파일 업로드를 안 받습니다 |

---

## ⑥ 설명 · 태그

- **Details(본문)**: `press/store-english.md` 1장의 전체 설명을 그대로 붙여넣기
- **Genre**: `Action`
- **Tags (10개 다 쓰세요)**

```
casual, cute, multiplayer, arcade, html5, mobile, 2d, singleplayer, local-multiplayer, no-ads
```

- **Average session**: `A few minutes`
- **Inputs**: `Mouse`, `Touchscreen`
- **Languages**: `English`, `Korean`, `Japanese`
- **Accessibility**: `Interactive tutorial`, `Configurable controls`
- **Community**: `Comments` 켜기 ← 무엇이 불편한지 알 수 있는 두 통로 중 하나입니다

---

## ⑦ 저장 전에 미리보기

맨 아래 **`Save & view page`** → 아직 아무에게도 안 보입니다(Draft).
**여기서 직접 한 판 해 보세요.** 확인할 것:

- [ ] 게임이 페이지 안에서 열리는가 (다운로드 버튼만 있으면 ④-2를 안 켠 것입니다)
- [ ] 🎓 가이드가 첫 판에 뜨는가
- [ ] 폰에서도 열어 보기 (itch 페이지 주소를 폰으로 보내서)
- [ ] 소리가 나는가 (첫 터치 뒤에 납니다)

---

## ⑧ 공개하기

**Visibility & access → `Public`** → **Save**.
끝입니다. 주소는 `내아이디.itch.io/jellimo` 입니다.

---

## ⑨ 올린 뒤 바로 할 것

1. **Devlog 한 편** — itch 는 devlog 를 새 글로 퍼뜨려 줍니다. "만들면서 겪은 것" 한 편이면 됩니다
2. **인스타 · 커뮤니티에 주소 뿌리기** — itch 자체 유입은 처음엔 거의 없습니다. 사람은 밖에서 데려옵니다
3. **댓글과 💌 피드백을 일주일 지켜보기** — 가장 싼 사용자 조사입니다
4. 게임 잼(Game Jam)에 눈여겨보기 — 잼 참가작 목록이 itch 안에서 사람을 데려오는 거의 유일한 통로입니다

---

## ⚠️ 미리 알아 둘 것 세 가지

**1. 계정(☁️ 로그인)은 itch 안에서 좀 다릅니다**
게임은 itch 의 `html.itch.zone` 이라는 다른 주소의 iframe 안에서 돕니다.
비밀번호 로그인은 그대로 되지만, **메일 링크로 로그인**하는 길은 링크가 우리 넷리파이
주소로 돌아오게 돼 있어서 itch 안에서는 매끄럽지 않습니다.
→ itch 페이지 설명에 *"계정을 만들 거면 원래 주소에서 하세요"* 한 줄을 적어 두는 게 안전합니다.

**2. 오프라인(홈 화면에 추가)은 itch 에서 기대하지 마세요**
iframe 안이라 서비스워커가 제 몫을 못 합니다. **등록이 실패해도 게임은 그대로 돕니다**(조용히 넘어가게 돼 있습니다). 다만 itch 페이지에 "오프라인 가능"이라고 쓰지는 마세요.

**3. 랭킹이 비어 보이면**
Supabase 는 anon 키로 넣는 것은 도메인을 안 가리므로 대개 그냥 됩니다.
그래도 안 되면 브라우저 콘솔을 한 번 보세요 — 게임이 손봐야 할 것을 `console` 로만 알려 줍니다
(플레이어 화면에는 절대 안 띄웁니다).

---

## 파일 위치 한눈에

```
press/upload/jellimo-itch.zip          ← ④ 에 올릴 파일
press/upload/cover-A.png               ← ⑤ 커버 (630x500)
press/upload/supabase-setup.sql        ← ⓪ 붙여넣고 Run 할 파일
press/shots/appstore-1-play.png …-6    ← ⑤ 스크린샷 6장
press/video/jelly-shooting-promo.webm  ← 유튜브에 올린 뒤 주소만
press/store-english.md                 ← ⑥ 본문·태그·칸별 값 전부
press/랭킹-지키기.md                    ← ⓪ 먼저 돌릴 SQL
```

zip 을 다시 만들려면: `node tools/make-itch-zip.mjs`

## 참고한 곳
- itch.io 첫 페이지 만들기 — https://itch.io/docs/creators/getting-started
- itch.io HTML5 게임 올리기 — https://itch.io/docs/creators/html5

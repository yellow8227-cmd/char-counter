# itch.io 「세부 설명」 칸에 넣을 것

itch 의 설명란은 **리치 텍스트 편집기**입니다 — 굵게·목록·그림·유튜브 넣기가 다 됩니다.
아래를 위에서부터 차례로 넣으면 됩니다. `[ ]` 안은 직접 채우세요.

---

## 순서 (이 순서가 중요합니다)

itch 이용자는 **설명을 안 읽습니다.** 게임 화면(iframe)이 페이지 맨 위에 이미 떠 있으니
설명은 "이미 해 본 사람이 더 알고 싶을 때" 읽는 자리예요. 그래서:

| 자리 | 무엇 | 왜 |
|---|---|---|
| 1 | **움직이는 그림 하나** (`jellimo-play-en.gif`) | 소리를 끄고 스크롤하는 사람에게 3초 안에 "이런 게임" |
| 2 | **한 줄 요약 + 도발 한 줄** | 여기서 안 잡히면 아래는 안 읽습니다 |
| 3 | **어떻게 하는지 3줄** | 조작을 모르면 첫 판에서 나갑니다 |
| 4 | 모드 목록 | 여기부터가 "더 알고 싶은 사람" 구간 |
| 5 | 유튜브 영상 | 길게 볼 사람용 |
| 6 | 없는 것(광고·결제·가입) | itch 이용자가 실제로 신경 쓰는 항목 |

---

## 1. 맨 위에 넣을 그림

`press/video/jellimo-play-en.gif` 를 **끌어다 놓기**로 올립니다.
(itch 편집기의 그림 단추 → Upload)

---

## 2~6. 그대로 붙여 넣을 글

```
Tap the falling jellies. They pop. That's the whole rule —
and you'll know it in 3 seconds.

Then try 🔥 Nuclear: 2 lives, jellies falling 3.2× faster.
Most people don't last 10 seconds.

HOW TO PLAY
• Tap a jelly → it pops. Chain them for a combo multiplier.
• Let one hit the floor → you lose a life.
• Never tap the angry face 😡 — that one's a bomb.

FIVE WAYS TO PLAY
• Solo — four difficulties: Mild · Normal · Spicy · 🔥 Nuclear
• Live Dungeon — up to 4 players on the same board, last one standing
• Throw Game — one player throws, the other pops, then you swap
• Play the AI — four skill levels, works offline
• Endless — no timer, and a giant boss drops in every 5 levels

PLAY WITH FRIENDS IN 10 SECONDS
Make a room, send the 4-letter code, play. No accounts, no friend
requests, no install. Up to 4 players share one board, and every jelly
you pop sends junk flying at the others.

THE ENDING IS THE BEST PART
When a round ends you get a picture: the winner dances, the loser folds
their arms and sulks. Face and pose change every round, and you can
share it.

MAKE YOUR OWN JELLY
9 characters, 12 hairstyles, 8 skin tones, 5 face marks, 12 accessories,
and a workshop where you build your own. Coins come from playing.
Nothing is for sale, ever.

RANKED BY HOW LONG YOU SURVIVED
The 🔥 Nuclear leaderboard doesn't rank by score. It ranks by time.
"12,400 points" means nothing. "1 minute 12 seconds" means everything.

WHAT'S NOT IN IT
No ads. No purchases. No sign-up. No install. All ages.
It's one HTML file — open a link and you're playing.

Available in English, 한국어 and 日本語.
Controls: mouse or touch. Nothing else.

Full site: [ 소개 페이지 주소 ]/en
```

---

## 5번 자리 — 유튜브 영상 넣기

itch 설명란에 **유튜브 주소만 한 줄로** 붙이면 자동으로 영상 칸이 됩니다
(파일 업로드는 안 받습니다).

1. `press/video/jellimo-promo-en.mp4` 를 유튜브에 올립니다
2. 제목: `Jellimo — Tap & Survive (browser game, no download)`
3. 공개 범위: **일부 공개(Unlisted)** 로 두어도 itch 에서는 잘 보입니다
   — 유튜브 채널을 따로 안 키울 거면 이게 편합니다
4. 나온 주소를 설명란 「FIVE WAYS TO PLAY」 아래에 한 줄로 붙여 넣기

---

## 그림 넣는 자리 (선택)

설명이 길면 중간에 스크린샷을 하나씩 끼우면 훨씬 잘 읽힙니다.

| 넣을 곳 | 파일 |
|---|---|
| HOW TO PLAY 아래 | `press/shots/appstore-1-play.png` |
| Live Dungeon 줄 아래 | `press/shots/appstore-2-dungeon.png` |
| THE ENDING 아래 | `press/shots/appstore-5-result.png` |

---

## 하지 말 것

- **한국어를 같이 넣지 마세요.** itch 는 영어권 이용자가 대부분이고, 한글이 섞이면
  "내 언어가 아닌 게임"으로 읽고 그냥 넘어갑니다. 한국어 안내가 필요하면
  소개 페이지(`/`)로 링크만 걸어 두면 됩니다.
- **오프라인으로 된다고 쓰지 마세요.** itch 는 게임을 iframe 안에서 돌리는데
  거기서는 서비스 워커가 제대로 안 붙습니다. 소개 페이지에서만 이야기하세요.
- 설명을 이보다 더 길게 쓰지 마세요. 지금도 안 읽는 사람이 대부분입니다.

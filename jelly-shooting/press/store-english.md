# English store copy — itch.io first, portals next

Everything below is ready to paste. Bracketed `[ ]` bits are the only things to fill in.
Korean copy lives in `press/스토어-등록문구.md`; this file is the English twin.

**Upload file:** `press/upload/jellimo-itch.zip` (1.96 MB) — rebuild with `node tools/make-itch-zip.mjs`

---

## 0. Name and one-liners

| Field | Limit | Text |
|---|---|---|
| Title | — | `Jellimo: Tap & Survive` |
| Short tagline (itch.io) | ~120 | `Tap the falling jellies. 3-minute rounds, up to 4 players, no download.` |
| App subtitle (iOS) | 30 | `Cute, until you hit Nuclear` |
| Short description (Play) | 80 | `Tap falling jellies. Easy in 3 seconds — but nobody survives Nuclear.` |
| Promo text (iOS) | 170 | `Open a link and you're playing. Tap the falling jellies, chain combos, dodge the bombs. Send four letters to a friend and you're both on the same board. No ads, no payments.` |

> **Why "Tap & Survive" and not "Jelly Pop":** in the English casual market *Pop · Blast · Crush ·
> Boom · Match* have hardened into "this is a match-3". Our game is an arcade reflex game.
> Using those words would put us in the wrong aisle. Full reasoning in `press/해외판-냉정한-점검.md`.

---

## 1. Full description (itch.io / Play / App Store)

```
Tap the falling jellies. They pop. That's the whole rule — and you'll know it in 3 seconds.

Then try 🔥Nuclear, where you get 2 lives and the jellies fall 3.2× faster.
Most people don't last 10 seconds. There's a leaderboard for exactly that —
ranked by how long you survived, not by score. "12,400 points" means nothing.
"1 minute 12 seconds" means everything.

▸ PLAY WITH FRIENDS IN 10 SECONDS
Make a room, send the 4-letter code, play. No accounts, no friend requests,
no install — the link opens the game itself. Up to 4 players share one board,
and every jelly you pop sends junk flying at the others. Last one alive wins.

▸ FIVE WAYS TO PLAY
· Solo — chase your best score, five difficulties from Mild to Nuclear
· Live Dungeon — up to 4 players, same board, last one standing
· Throw Game — one player throws, the other pops, then you swap
· Play the AI — four skill levels, works with no internet
· Endless — no timer, a giant boss every 5 levels

▸ MAKE YOUR OWN JELLY
9 characters, 12 hairstyles, 8 skin tones, 5 face marks, 12 accessories —
and an accessory workshop where you build your own. Coins come from playing.
Nothing is for sale, ever.

▸ THE ENDING IS THE BEST PART
When a round ends you get a picture: the winner dances, the loser folds their arms
and sulks. Face and pose change every round, and you can share the picture.

▸ WHAT'S NOT IN IT
No ads. No purchases. No sign-up. No install. All ages.
It's one HTML file — open a link and you're playing. Add it to your home screen
and solo play works with no internet at all.

Korean, English and Japanese.
```

---

## 2. itch.io — field by field

| Field | What to put |
|---|---|
| **Title** | `Jellimo: Tap & Survive` |
| **Short description** | `Tap the falling jellies. 3-minute rounds, up to 4 players, no download.` |
| **Classification** | Games |
| **Kind of project** | **HTML** ← this is what makes it playable in the browser |
| **Release status** | Released |
| **Pricing** | **No payments** (or *Name your own price* if you want a donation button — see `press/수익화-알아보기.md`) |
| **Uploads** | `jellimo-itch.zip` → tick **"This file will be played in the browser"** |
| **Embed** | Manually set size, **width 430 · height 932**, tick **Mobile friendly** and **Fullscreen button** |
| **Cover image** | `press/shots/cover-1200x630.png` (itch wants ≥315×250; a bigger one at the same ratio is better) |
| **Screenshots** | `press/shots/appstore-1-play.png` … `appstore-6-home.png` |
| **Genre** | Action |
| **Tags (max 10 — use all 10)** | `casual` `cute` `multiplayer` `arcade` `html5` `mobile` `2d` `singleplayer` `local-multiplayer` `no-ads` |
| **Average session** | A few minutes |
| **Inputs** | Mouse, Touchscreen |
| **Accessibility** | Interactive tutorial, Configurable controls (touch size) |
| **Languages** | English, Korean, Japanese |
| **Community** | Comments on — the in-game 💌 feedback window plus itch comments are your only two sources of "what's wrong" |

### Things that will actually bite you

| Thing | What to do |
|---|---|
| `index.html` must be at the **root** of the zip | Already handled — the build script fails loudly if it isn't |
| itch runs the game inside an **iframe** (`html.itch.zone`) | Verified: the zip runs in an iframe with **0 errors**, and localStorage works |
| Service worker / offline | Don't promise offline on the itch page. Registration failing is handled silently, but an iframe is not a good home for a PWA |
| Supabase (online ranking, rooms) | Works over HTTPS. If rankings look empty on itch, allow the itch domain in the Supabase dashboard |
| Screen size | 430×932 with "mobile friendly" on. On desktop the board now grows to 641×961 by itself |

---

## 3. Google Play (later, via TWA)

The manifest already meets the requirements (`standalone`, `scope`, 192/512/maskable icons,
theme and background colours). See `press/스토어-등록문구.md` §0 for the packaging route.

| Field | Text |
|---|---|
| App name (30) | `Jellimo: Tap & Survive` |
| Short description (80) | `Tap falling jellies. Easy in 3 seconds — but nobody survives Nuclear.` |
| Full description | Section 1 above |
| Category | Games → Casual (secondary: Arcade) |
| Content rating | Everyone — no violence, no gambling, no purchases |
| Data safety | Email + password (only if the player makes an account) · nickname · score. Used for rankings and cross-device save. No third-party sharing. Account is optional |

---

## 4. Keywords (App Store, 100 characters, comma-separated)

```
jelly,tap,casual,arcade,multiplayer,friends,party,browser,cute,reflex,combo,survival,ranking
```

Words people actually type. Genre-only words ("puzzle", "arcade") bury you under the big games —
`play with friends`, `no download`, `browser game` are the ones that find us.

---

## 5. Assets, all already built

| Needed | File |
|---|---|
| Playable zip | `press/upload/jellimo-itch.zip` |
| Cover 1200×630 | `press/shots/cover-1200x630.png` |
| Screenshots ×6 | `press/shots/appstore-1-play.png` … `-6-home.png` |
| Play feature graphic 1024×500 | `press/shots/play-feature-1024x500.png` |
| Icon 1024 | `press/shots/icon-1024.png` |
| Trailer | `press/video/jelly-shooting-promo.webm` — itch takes a **YouTube link**, not a file upload |
| Instagram set (EN) | `press/insta-en/` |

---

## 6. Order I'd do it in

1. **itch.io today.** No review, no fee, nothing to lose. You get your first non-Korean players and a comment box.
2. **Run the SQL in `press/랭킹-지키기.md` first** — the moment strangers can reach the leaderboard, it needs a guard.
3. Watch the 💌 feedback window for a week. That is the cheapest research you will ever get.
4. **CrazyGames** next (lower bar and faster review than Poki). By then you'll have play numbers to show.

## Sources
- itch.io · your first page (cover size, uploads) — https://itch.io/docs/creators/getting-started
- itch.io · HTML5 games (index.html at root, embed) — https://itch.io/docs/creators/html5

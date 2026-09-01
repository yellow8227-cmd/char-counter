// 소개 페이지의 영어판을 만든다 —  press/index.html  →  press/en.html
//
// 왜 이렇게 만드나
//   손으로 두 벌을 관리하면 반드시 어긋난다(한쪽만 고치게 된다). 그래서 한국어판을
//   원본으로 두고, '이 문장 → 이 문장' 표를 통째로 갈아 끼운다.
//   바꿀 문장을 하나라도 못 찾으면 그 자리에서 멈춘다 → 한국어판을 고치고 이 파일을
//   안 고치면 조용히 옛 영어가 남는 일이 생기지 않는다.
//
//   파일을 같은 폴더에 두는 이유: shots/ · video/ · fonts/ 를 그대로 가리킬 수 있다.
//   (en/ 폴더로 내리면 경로를 전부 ../ 로 바꿔야 하고, 한 곳만 놓쳐도 그림이 깨진다)
//
// 쓰기:  node tools/make-press-en.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'press', 'index.html');
const DST = join(ROOT, 'press', 'en.html');

let s = readFileSync(SRC, 'utf8');
const missed = [];
const R = (ko, en) => {
  if (!s.includes(ko)) { missed.push(ko.slice(0, 64).replace(/\s+/g, ' ')); return; }
  s = s.split(ko).join(en);
};

/* ───────── 머리말(검색·링크 미리보기) ───────── */
R('<html lang="ko">', '<html lang="en">');
R('<title>젤리모 — 가족도 연인도 친구도, 3분이면 한 판</title>',
  '<title>Jellimo — tap the falling jellies. One round, three minutes.</title>');
R('content="앱 설치도 회원가입도 없이, 열면 바로 하는 캐주얼 게임. 방 코드 네 자리만 보내면 2~4명이 같은 판에서 대전해요. 광고 없음 · 결제 없음 · 전 연령."',
  'content="A casual browser game with no app and no sign-up. Send a 4-letter room code and up to 4 players share one board. No ads, no payments, all ages."');
R('<meta property="og:site_name" content="젤리모">', '<meta property="og:site_name" content="Jellimo">');
R('<meta property="og:title" content="젤리모 — 가족도 연인도 친구도, 3분이면 한 판">',
  '<meta property="og:title" content="Jellimo — tap the falling jellies. One round, three minutes.">');
R('<meta property="og:description" content="앱도 가입도 없이 열면 바로. 방 코드 네 자리만 보내면 2~4명이 같은 판에서 대전해요.">',
  '<meta property="og:description" content="Open a link and you are playing. Send four letters and up to 4 players share one board.">');
R('content="젤리와 폭탄이 쏟아지는 젤리모 대표 그림"',
  'content="Jellimo key art — jellies and bombs raining down on a pink cat"');
R('<meta name="twitter:title" content="젤리모 — 가족도 연인도 친구도, 3분이면 한 판">',
  '<meta name="twitter:title" content="Jellimo — tap the falling jellies. One round, three minutes.">');
R('<meta name="twitter:description" content="앱도 가입도 없이 열면 바로. 방 코드 네 자리만 보내면 2~4명이 같이 해요.">',
  '<meta name="twitter:description" content="Open a link and you are playing. Four letters is the whole invite.">');
// 검색 엔진에 두 판이 짝이라고 알려 준다
R('<meta name="theme-color" content="#ffe9f2">',
  `<meta name="theme-color" content="#ffe9f2">
<link rel="alternate" hreflang="ko" href="https://dashing-quokka-c37a8b.netlify.app/">
<link rel="alternate" hreflang="en" href="https://dashing-quokka-c37a8b.netlify.app/en">
<link rel="alternate" hreflang="x-default" href="https://dashing-quokka-c37a8b.netlify.app/en">`);
// 영어 본문은 라틴 글꼴이 먼저 와야 자간이 뜨지 않는다
R(`font-family:'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic','NanumGothic',system-ui,sans-serif;`,
  `font-family:system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;`);

/* ───────── ② 이름·소개 ───────── */
R('alt="분홍 고양이에게 젤리와 폭탄이 쏟아지는 젤리모 표지 그림"',
  'alt="Jellimo cover art — jellies and bombs raining down on a pink cat"');
R('alt="젤리모 아이콘"', 'alt="Jellimo icon"');
R('<h1 class="display">젤리모</h1>', '<h1 class="display">Jellimo</h1>');
R(`<b>가족도, 연인도, 친구도 — 3분이면 한 판.</b><br>
      앱 설치도 회원가입도 없이, 열면 바로 시작이에요.<br>
      <b>그런데 귀엽다고 얕보지 마세요 — 🔥핵불닭에선 10초도 못 버틸걸요? 😏</b>`,
  `<b>Tap the falling jellies. One round is three minutes.</b><br>
      No app, no sign-up — open the link and you are already playing.<br>
      <b>It looks cute. On 🔥Nuclear you will not last 10 seconds. 😏</b>`);
R('>🍡 지금 바로 플레이<', '>🍡 Play now<');
R('>🎬 소개 영상 보기<', '>🎬 Watch the trailer<');
R('<li>설치 없음</li><li>가입 없음</li><li>광고 없음</li><li>결제 없음</li><li>전 연령</li>',
  '<li>No install</li><li>No sign-up</li><li>No ads</li><li>No payments</li><li>All ages</li>');
R('<li>아이폰 · 안드로이드 · PC</li><li>한국어 · English · 日本語</li><li>혼자 · 2~4인 실시간</li><li>순한맛 ~ 🔥핵불닭</li>',
  '<li>iPhone · Android · desktop</li><li>English · 한국어 · 日本語</li><li>Solo · 2–4 players live</li><li>Mild → 🔥Nuclear</li>');

/* ───────── ③ 누구랑 ───────── */
R('<span class="tag">이럴 때 좋아요</span>', '<span class="tag">Good for</span>');
R('<h2 class="display">같이 웃을 사람만 있으면 돼요</h2>', '<h2 class="display">All you need is someone to laugh with</h2>');
R('<p class="lead">규칙은 30초면 배워요. 오늘 처음 하는 사람과도 바로 같이 할 수 있어요.</p>',
  '<p class="lead">The rules take three seconds. Someone who has never played can join the same round.</p>');
R('<h3 class="display">가족이랑</h3>', '<h3 class="display">With family</h3>');
R(`<p>아이는 순한맛, 어른은 핵불닭. <strong>같은 게임을 각자 속도로</strong> 해요.
          광고도 결제도 없으니 아이 폰에 열어 줘도 마음이 편해요.</p>
        <p class="who">주말 거실에서 · 아이 옆에서 한 판</p>`,
  `<p>Kids on Mild, adults on Nuclear. <strong>The same game at each person's own speed.</strong>
          No ads and no payments, so handing it to a child's phone is a non-event.</p>
        <p class="who">Living room on a Saturday · one round beside your kid</p>`);
R('<h3 class="display">연인이랑</h3>', '<h3 class="display">With your partner</h3>');
R(`<p>누가 이기나 딱 한 판. 이기면 트로피 들고 춤추고, 지면 팔짱 끼고 분해해요.
          <strong>그 표정이 그림으로 남아서</strong> 두고두고 놀릴 수 있어요.</p>
        <p class="who">카페에서 · 저녁에 통화하면서</p>`,
  `<p>One round to settle it. The winner dances with a trophy, the loser folds their arms and sulks.
          <strong>That face becomes a picture</strong> you can bring up for weeks.</p>
        <p class="who">In a cafe · on the phone in the evening</p>`);
R('<h3 class="display">친구들이랑</h3>', '<h3 class="display">With friends</h3>');
R(`<p>단톡방에 <strong>방 코드 네 자리</strong>만 보내면 최대 네 명이 함께.
          앱 설치를 기다릴 일이 없으니, 하자는 말이 나오고 1분 안에 시작해요.</p>
        <p class="who">단톡방에서 · 점심시간에 · 퇴근하고</p>`,
  `<p>Drop a <strong>4-letter room code</strong> in the group chat and up to four people are in.
          Nobody waits for a download, so you go from "let's play" to playing in under a minute.</p>
        <p class="who">Group chat · lunch break · after work</p>`);
R('alt="고양이·강아지·토끼·곰·남자아이·여자아이 여섯 캐릭터"',
  'alt="Six of the characters — cat, dog, bunny, bear, boy and girl"');
R('<p>아홉 종에서 골라 머리·색깔·악세서리까지 내 마음대로</p>',
  '<p>Nine characters, plus hair, skin tone, colour and accessories</p>');

/* ───────── ③-2 한계 돌파 ───────── */
R('<span class="tag">그래서 더 오래 합니다</span>', '<span class="tag">Why people keep going</span>');
R('<h2 class="display">귀엽다고 얕보지 마세요</h2>', '<h2 class="display">Cute is not the same as easy</h2>');
R(`<p class="lead">규칙은 세 줄인데, 마지막 난이도는 아무도 1분을 못 넘깁니다.
        쉬워서 시작하고, 안 깨져서 계속합니다.</p>`,
  `<p class="lead">Three lines of rules, and almost nobody clears a minute on the hardest setting.
        You start because it is easy. You stay because it is not.</p>`);
R('<h3>핵불닭</h3>', '<h3>Nuclear</h3>');
R(`<p>목숨 <strong>2개</strong> · 시작 낙하속도 <strong>3.2배</strong> · 폭탄 <strong>15%</strong>.
          순한맛과 같은 게임이 맞나 싶어집니다.</p>
        <p class="who">10초도 못 버틸걸요? 😏</p>`,
  `<p><strong>2 lives</strong> · jellies fall <strong>3.2×</strong> faster · <strong>15%</strong> bombs.
          You will double-check that it is the same game as Mild.</p>
        <p class="who">You will not last 10 seconds 😏</p>`);
R('<h3>끝없는 모드</h3>', '<h3>Endless</h3>');
R(`<p>시간 제한이 없습니다. 5레벨마다 <strong>거대 보스</strong>가 내려오고,
          바닥까지 오면 목숨을 하나 가져갑니다.</p>
        <p class="who">한 번 앉으면 20분</p>`,
  `<p>No timer. Every 5 levels a <strong>giant boss</strong> comes down,
          and if it reaches the floor it takes a life with it.</p>
        <p class="who">Sit down for one round, look up 20 minutes later</p>`);
R('<h3>버티기 랭킹</h3>', '<h3>Survival ranking</h3>');
R(`<p>점수가 아니라 <strong>버틴 시간</strong>으로 줄을 세웁니다.
          “12,400점”은 감이 안 와도 <strong>“1분 12초”</strong>는 누구나 압니다.</p>
        <p class="who">자랑이 성립하는 숫자</p>`,
  `<p>Ranked by <strong>how long you survived</strong>, not by score.
          "12,400 points" means nothing to anyone. <strong>"1 minute 12 seconds"</strong> means everything.</p>
        <p class="who">A number you can actually brag with</p>`);

/* ───────── ④ 초대 3단계 ───────── */
R('<span class="tag">1분 안에 시작</span>', '<span class="tag">Playing within a minute</span>');
R('<h2 class="display">링크 하나, 코드 네 자리</h2>', '<h2 class="display">One link, four letters</h2>');
R('<p class="lead">초대장을 보내거나 친구 추가를 할 필요가 없어요.</p>',
  '<p class="lead">No invites to send, no friend requests to accept.</p>');
R('<div><b>방 만들기</b><p>실시간 던전이나 던지기 게임에서 방을 만들어요.</p></div>',
  '<div><b>Make a room</b><p>Start a room in Live Dungeon or the Throw Game.</p></div>');
R('<div><b>코드 보내기</b><p>네 자리 코드가 나와요. 단톡방에 그대로 붙여 넣으면 돼요.</p>',
  '<div><b>Send the code</b><p>You get four characters. Paste them into the group chat.</p>');
R('<div><b>같이 시작</b><p>친구가 코드를 넣으면 같은 판이 동시에 시작돼요.</p></div>',
  '<div><b>Start together</b><p>They type it in and the same round starts for everyone.</p></div>');
R(`<p class="stepnote">앱 설치 · 회원가입 · 친구 추가 <strong>없음</strong>.
      계정을 만들면 폰과 노트북에서 이어 할 수 있어요(선택).</p>`,
  `<p class="stepnote"><strong>No</strong> install, sign-up or friend requests.
      Make an account only if you want to carry your character between phone and laptop.</p>`);

/* ───────── ⑤ 영상 ───────── */
R('<span class="tag">1분 35초</span>', '<span class="tag">Trailer</span>');
R('<h2 class="display">영상으로 먼저 보세요</h2>', '<h2 class="display">See it before you play it</h2>');
R('<p class="lead">따로 편집한 화면이 아니라, 실제로 플레이한 화면을 그대로 녹화했어요.</p>',
  '<p class="lead">Not a mock-up. A script actually played the game and this is the recording.</p>');
R('src="video/jellimo-promo-ko-web.webm"', 'src="video/jellimo-promo-en-web.webm"');
R('poster="video/frames/ko/01-cover.png"', 'poster="video/frames/en/01-cover.png"');
R(`<p class="videonote">소리를 켜고 보세요 🔊 — 게임 안의 효과음과 배경음악이 그대로 담겨 있어요.<br>꾸미기 → 혼자 하기 → 거대 보스 → 🔥핵불닭 → 실시간 던전 → 던지기 게임 → 승리 그림</p>`,
  `<p class="videonote">Turn the sound on 🔊 — the effects and music are the game's own.<br>Dress up → solo → giant boss → 🔥Nuclear → live dungeon → throw game → the ending picture</p>`);

/* ───────── ⑥ 놀이 방법 ───────── */
R('<span class="tag">놀이 방법 세 가지</span>', '<span class="tag">Three ways to play</span>');
R('<h2 class="display">혼자여도 재미있고, 둘이면 더 재미있게</h2>', '<h2 class="display">Good alone. Better with someone.</h2>');
R('<p class="lead">떨어지는 젤리를 톡. 연달아 터지면 콤보가 붙고, 폭탄은 피해야 해요.</p>',
  '<p class="lead">Tap a falling jelly and it pops. Chain them for a combo. Leave the bombs alone.</p>');
R('alt="혼자 하기 플레이 화면"', 'alt="Solo play screen"');
R('<h3 class="display">혼자 하기 — 딱 3분</h3>', '<h3 class="display">Solo — exactly three minutes</h3>');
R(`<p>줄 서서 기다리는 3분, 자기 전 3분. 난이도 네 단계라 처음이면 순한맛,
            손이 풀리면 핵불닭으로 올려요.</p>
          <p class="how">아이템 다섯 가지를 들고 들어가요 —
            <strong>하트팩</strong>으로 목숨을 늘리고, <strong>슬로우</strong>로 시간을 벌고,
            <strong>폭탄청소 · 2배 점수 · 자석</strong>으로 위기를 넘겨요.</p>`,
  `<p>Three minutes in a queue, three minutes before bed. Four difficulties: start on Mild,
            move up to Nuclear once your hands warm up.</p>
          <p class="how">You bring five items in —
            <strong>heart pack</strong> for lives, <strong>slow-mo</strong> to buy time, and
            <strong>bomb sweep · double score · magnet</strong> for when it goes wrong.</p>`);
R('alt="실시간 던전 화면"', 'alt="Live dungeon screen"');
R('<h3 class="display">실시간 던전 — 2~4명이 같은 판에서</h3>', '<h3 class="display">Live Dungeon — 2 to 4 on one board</h3>');
R(`<p>같은 젤리가 모두의 화면에 동시에 떨어져요. 옆에 있는 사람 점수가 실시간으로 올라가는 걸
            보면서 하니까, 마지막 10초가 제일 시끄러워요.</p>
          <p class="how">게이지를 모아 방해를 던져요 —
            <strong>지그재그</strong>로 젤리를 흔들고, <strong>안개</strong>로 시야를 가리고,
            <strong>스피드업</strong>으로 젤리를 빠르게 떨어뜨려요.</p>`,
  `<p>The same jellies fall on everyone's screen at the same moment, and you watch the other
            scores climb while you play. The last ten seconds are always the loudest.</p>
          <p class="how">Fill the gauge and throw junk at them —
            <strong>zigzag</strong> to make jellies swerve, <strong>fog</strong> to blind them,
            <strong>speed-up</strong> to drop everything faster.</p>`);
R('alt="던지기 게임 화면"', 'alt="Throw Game screen"');
R('<h3 class="display">던지기 게임 — 역할을 나눠서</h3>', '<h3 class="display">Throw Game — split the roles</h3>');
R(`<p>한 명은 던지고, 한 명은 막아요. 던지는 쪽은 상대 화면을 보면서 빈틈에 떨어뜨리고,
            막는 쪽은 쏟아지는 걸 다 터뜨려야 해요. 실력이 서로 달라도 재미있는 쪽이에요.</p>
          <p class="how">다시 할 때 <strong>역할 바꾸기</strong>를 누르면 바로 자리가 바뀌어요.
            무기는 일반 · 폭탄 · 유령 · 젤리비 네 가지.</p>`,
  `<p>One person throws, the other defends. The thrower watches your screen and aims for the gaps;
            the defender has to pop everything. This is the mode that works when two people are
            nowhere near the same skill level.</p>
          <p class="how">Hit <strong>swap roles</strong> on the rematch and you trade sides.
            Four things to throw: plain, bomb, ghost and jelly rain.</p>`);

/* ───────── ⑦ 계속 하게 되는 이유 ───────── */
R('<span class="tag">계속 하게 되는 이유</span>', '<span class="tag">The part people screenshot</span>');
R('<h2 class="display">이기면 춤추고, 지면 분해해요</h2>', '<h2 class="display">Winner dances. Loser sulks.</h2>');
R('<p class="lead">점수만 남지 않아요. 그 판의 표정이 그림으로 남아요.</p>',
  '<p class="lead">A round does not end in a number. It ends in a picture.</p>');
R('alt="기본·신남·놀람·으쓱·분함·눈물 여섯 표정"', 'alt="Six expressions — neutral, excited, surprised, smug, annoyed, in tears"');
R('<p>같은 캐릭터라도 판마다 표정이 달라져요</p>', '<p>The same character wears a different face every round</p>');
R('<h3 class="display">결과는 그림으로</h3>', '<h3 class="display">The ending is a picture</h3>');
R(`<p>표정 · 자세 · 말풍선이 판마다 달라져요. 진 사람은 이긴 사람 화면을 관전하고,
          그 장면을 그대로 공유해요.</p>`,
  `<p>Face, pose and speech bubble change every round. Whoever loses watches the winner's
          screen, and the whole scene is one tap away from being shared.</p>`);
R('<h3 class="display">내 캐릭터 꾸미기</h3>', '<h3 class="display">Make your own jelly</h3>');
R('<p>캐릭터 아홉 종에 머리 · 색깔 · 악세서리. 코인을 모아 나만의 악세서리도 만들어요.</p>',
  '<p>Nine characters, 12 hairstyles, 8 skin tones and 12 accessories — plus a workshop where you build your own. Coins come from playing, never from paying.</p>');
R('<h3 class="display">AI와 연습</h3>', '<h3 class="display">Practise against the AI</h3>');
R('<p>같이 할 사람이 없을 때도 실력 네 단계 AI와 바로 붙어요. 다시 할 때 실력과 역할을 바꿀 수 있어요.</p>',
  '<p>Nobody around? Four AI skill levels, and it works with no internet. Change the skill or swap roles on the rematch.</p>');
R('alt="승리·패배 결과 그림"', 'alt="Win and loss ending pictures"');
R('<h3 class="display">한 판이 끝나면 그림이 남아요</h3>', '<h3 class="display">What you keep from a round</h3>');
R(`<p>이긴 사람은 트로피를 들거나 깡총 뛰거나 메롱하고, 진 사람은 팔짱을 끼거나 발을 구르거나
            눈물을 흘려요. 말풍선은 메시지 보내듯 눌러서 바꿀 수 있어요 — 상대 화면에도 바로 떠요.</p>
          <p class="how">그림은 <strong>내가 꾸민 캐릭터 얼굴</strong>로 그려져요.
            그대로 저장하거나 단톡방에 공유하면 그게 오늘의 전적이에요.</p>`,
  `<p>The winner holds a trophy, bounces, or sticks their tongue out. The loser folds their arms,
            stamps a foot, or bursts into tears. Tap to change the speech bubble like sending a
            message — it appears on the other screen straight away.</p>
          <p class="how">The picture is drawn with <strong>the character you made</strong>.
            Save it or drop it in the group chat and that is today's scoreline.</p>`);

/* ───────── ⑧ 규칙 ───────── */
R('<span class="tag">규칙 세 줄</span>', '<span class="tag">Three lines of rules</span>');
R('<h2 class="display">처음이라면 이것만</h2>', '<h2 class="display">If it is your first time</h2>');
R('<div><b>기본</b><span>떨어지는 젤리를 누르면 터져요. 바닥에 닿으면 목숨이 하나 줄어요.</span></div>',
  '<div><b>Basics</b><span>Tap a falling jelly and it pops. Let one reach the floor and you lose a life.</span></div>');
R(`<div><b>콤보와 폭탄</b><span>쉬지 않고 이어 터트리면 점수 배수가 올라가요.
        화난 얼굴(😡)은 누르면 안 돼요 — 피하는 것도 실력이에요.</span></div>`,
  `<div><b>Combos and bombs</b><span>Keep popping without a break and the multiplier climbs.
        Never tap the angry face (😡) — knowing what to leave alone is half the skill.</span></div>`);
R(`<div><b>같이 하기</b><span>방을 만들면 네 자리 코드가 나와요. 친구가 넣으면 같은 방에서 시작해요.
        아이템은 아래 줄에서 눌러 써요.</span></div>`,
  `<div><b>Playing together</b><span>Make a room and you get four characters. They type them in and
        you start in the same room. Items are the row along the bottom.</span></div>`);

/* ───────── ⑨ 만든 이야기 ───────── */
R('<span class="tag">만든 이야기</span>', '<span class="tag">How it was built</span>');
R('<h2 class="display">HTML 파일 하나로 만든 게임이에요</h2>', '<h2 class="display">The whole game is one HTML file</h2>');
R('<p class="lead">게임 엔진 없이 캔버스에 직접 그렸고, 실시간 대전은 Supabase Realtime을 써요.</p>',
  '<p class="lead">Drawn straight onto a canvas with no game engine. Live matches run on Supabase Realtime.</p>');
R('<div><b>파일 하나가 곧 게임</b>', '<div><b>One file is the game</b>');
R(`<p>index.html 안에 화면·소리·통신·저장이 다 들어 있어요. 게임 엔진도 빌드 도구도 쓰지 않아
          반년 뒤에 열어도 그대로 돌아가요.</p>`,
  `<p>Rendering, sound, networking and saving all live inside index.html. No engine and no build
          step, so it will still open and run in six months.</p>`);
R('<div><b>실시간 대전</b>', '<div><b>Live matches</b>');
R(`<p>방·점수·방해·관전을 브로드캐스트로 주고받아요. 판 전체를 중계하지 않고 <em>필요한 소식만</em>
          보내서, 느린 인터넷에서도 버텨요.</p>`,
  `<p>Rooms, scores, attacks and spectating go over broadcast. The board itself is never streamed —
          only <em>what changed</em> — so it survives a bad connection.</p>`);
R('<div><b>난이도는 실측으로</b>', '<div><b>Difficulty was measured, not guessed</b>');
R(`<p>AI가 2분에 몇 점을 내는지 재서 네 단계를 잡았어요. 가장 쉬운 단계는
          <em>20,406점 → 6,576점</em>. 사람이 이길 수 있는 연습 상대가 목표였어요.</p>`,
  `<p>The four levels came from measuring what the AI actually scores in two minutes. The easiest
          setting went from <em>20,406 to 6,576 points</em> — the goal was a sparring partner a
          person can beat.</p>`);
R('<div><b>스스로 검사하는 도구</b>', '<div><b>It checks itself</b>');
R(`<p>화면 넘침·작은 버튼·2인·4인 통신·AI 난이도까지 자동으로 검사해요.
          이 페이지의 사진과 영상도 <em>스크립트가 진짜로 플레이해서</em> 만든 거예요.</p>`,
  `<p>Overflowing layouts, buttons that are too small, 2- and 4-player networking and AI difficulty
          are all tested automatically. Every screenshot and the trailer on this page were made by
          <em>a script actually playing the game</em>.</p>`);
R(`<p class="quote">아이랑 같이 할 게임을 만들다가, 친구랑 붙을 수 있는 방까지 붙었어요.
      점수보다 <strong>같이 웃는 장면</strong>을 남기고 싶어서 이기면 춤추고 지면 분해하는 그림을 넣었어요.</p>`,
  `<p class="quote">It started as something to play with my kid, and grew a room you can drag your
      friends into. I wanted a round to leave behind <strong>a moment you both laughed at</strong>
      rather than a number — so the winner dances and the loser sulks.</p>`);

/* ───────── ⑩ 자주 묻는 것 ───────── */
R('<span class="tag">자주 묻는 것</span>', '<span class="tag">FAQ</span>');
R('<h2 class="display">미리 답해 둘게요</h2>', '<h2 class="display">Answered in advance</h2>');
R('<summary>앱을 설치해야 하나요?</summary>', '<summary>Do I have to install anything?</summary>');
R(`<p>아니요, 주소만 열면 바로 돼요. 홈 화면에 추가하면 앱처럼 전체화면으로 열리고,
          인터넷이 없을 때도 혼자 하기는 그대로 돌아가요.</p>`,
  `<p>No — open the address and you are playing. Add it to your home screen and it opens
          full-screen like an app, and solo play keeps working with no internet.</p>`);
R('<summary>몇 살부터 할 수 있나요?</summary>', '<summary>What age is it for?</summary>');
R(`<p>글자를 조금 읽을 수 있으면 돼요. 폭력적인 표현이나 무서운 장면이 없고,
          난이도 순한맛은 젤리가 천천히 떨어져요. 아이와 어른이 같은 방에서 각자 난이도로 할 수 있어요.</p>`,
  `<p>If you can read a little, you can play. Nothing violent and nothing frightening, and on Mild
          the jellies come down slowly. A child and an adult can share one room on different settings.</p>`);
R('<summary>친구랑 어떻게 같이 하나요?</summary>', '<summary>How do I play with a friend?</summary>');
R(`<p>방을 만들면 네 자리 코드가 나와요. 친구가 그 코드를 넣으면 같은 방에서 시작해요.
          2~4명까지 가능하고, 상대가 폰이든 노트북이든 상관없어요.</p>`,
  `<p>Make a room and you get a 4-character code. They type it in and you start in the same room.
          Two to four players, and it does not matter who is on a phone and who is on a laptop.</p>`);
R('<summary>공짜인가요? 광고나 결제가 있나요?</summary>', '<summary>Is it free? Are there ads or purchases?</summary>');
R('<p>무료이고 광고가 없어요. 게임 안 코인은 플레이로만 모아요 — 현금 결제 항목이 아예 없어요.</p>',
  '<p>Free, and there are no ads. In-game coins only come from playing — there is nothing to buy at all.</p>');
R('<summary>데이터를 많이 쓰나요?</summary>', '<summary>Does it use a lot of data?</summary>');
R('<p>거의 안 써요. 대전에서 주고받는 건 점수·방해 같은 짧은 소식뿐이라 한 통이 1KB 미만이에요.</p>',
  '<p>Almost none. A match only exchanges short messages — scores and attacks — under 1KB each.</p>');
R('<summary>계정을 꼭 만들어야 하나요?</summary>', '<summary>Do I need an account?</summary>');
R(`<p>아니요. 혼자 하기와 AI 대결은 계정 없이 돼요. 계정을 만들면 폰과 노트북에서
          같은 캐릭터·코인으로 이어 할 수 있어요.</p>`,
  `<p>No. Solo play and AI matches need nothing. An account just carries the same character and
          coins between your phone and your laptop.</p>`);

/* ───────── 바닥 ───────── */
R('alt="꾸민 캐릭터들"', 'alt="Characters people have dressed up"');
R('<h2 class="display">지금 바로 한 판</h2>', '<h2 class="display">Go play a round</h2>');
R('<p class="lead">친구에게 방 코드만 알려주면 끝.</p>', '<p class="lead">Send a friend four letters. That is the whole invite.</p>');
R('>🍡 젤리모 열기<', '>🍡 Open Jellimo<');
R(`<p class="fine">🍡 젤리모 · Jellimo — 혼자 만든 웹 게임이에요.<br>
    화면과 영상은 시연용 상태(점수·코인 등)로 찍었어요 · 제목 글씨체 Jua (SIL OFL 1.1)</p>`,
  `<p class="fine">🍡 Jellimo — a web game made by one person.<br>
    Screens and video were captured in a demo state (scores, coins) · Title face: Jua (SIL OFL 1.1)</p>`);

/* ───────── 그림도 영어판으로 ─────────
   화면 사진 안의 글자(문구·닉네임·말풍선)가 한국어면 영어 페이지가 반쪽이 된다.
   press/shots/en/ 은  node tools/make-store-shots.mjs --en  으로 만든다. */
const EN_SHOTS = ['appstore-1-play.png', 'appstore-2-dungeon.png', 'appstore-3-throw.png',
                  'appstore-5-result.png', 'chars-row.png', 'faces-row.png', 'dress-row.png',
                  'cover-1200x630.png'];
for (const f of EN_SHOTS) {
  if (!s.includes('shots/' + f)) { missed.push('그림 ' + f); continue; }
  s = s.split('shots/' + f).join('shots/en/' + f);
}

/* ───────── 언어 바꾸는 단추 ───────── */
/* ───────── 언어 바꾸는 단추 ─────────
   한국어판에 이미 단추가 박혀 있다. 그 단추의 '지금 이 언어' 표시만 영어 쪽으로 옮긴다.
   (그냥 두면 영어판에서 「한국어」가 켜진 것처럼 보인다 — 실제로 그랬다) */
const KO_NAV = `  <a href="index.html" class="on" aria-current="page" hreflang="ko" lang="ko">한국어</a>
  <a href="en.html" hreflang="en" lang="en">EN</a>`;
const EN_NAV = `  <a href="index.html" hreflang="ko" lang="ko">한국어</a>
  <a href="en.html" class="on" aria-current="page" hreflang="en" lang="en">EN</a>`;
if (!s.includes(KO_NAV)) missed.push('언어 바꾸는 단추 (press/index.html 의 .langsw)');
else s = s.replace(KO_NAV, EN_NAV);

if (missed.length) {
  console.error('❌ 못 찾은 문장 ' + missed.length + '개 — 한국어판이 바뀐 것 같습니다:');
  for (const m of missed) console.error('   · ' + m);
  console.error('   tools/make-press-en.mjs 의 표를 새 문장에 맞춰 고치세요.');
  process.exit(1);
}
/* ───────── 한글이 새어 나갔나 검사 ─────────
   주석·CSS 안의 한글은 화면에 안 보이니 괜찮다. 눈에 보이는 글과 alt·content 같은
   속성만 골라서 본다. '한국어'(언어 단추)와 언어 목록은 일부러 남긴 것이다. */
const OK_KO = ['한국어', '日本語'];
const visible = s.replace(/<!--[\s\S]*?-->/g, '')
                 .replace(/<style[\s\S]*?<\/style>/g, '')
                 .replace(/<script[\s\S]*?<\/script>/g, '');
const leaks = [];
for (const m of visible.matchAll(/>([^<>]*[가-힣][^<>]*)</g)) {
  const t = m[1].trim(); if (t && !OK_KO.some(o => t.includes(o))) leaks.push('글: ' + t.slice(0, 70));
}
for (const m of visible.matchAll(/(alt|title|content|placeholder|aria-label)="([^"]*[가-힣][^"]*)"/g)) {
  if (!OK_KO.some(o => m[2].includes(o))) leaks.push(m[1] + ': ' + m[2].slice(0, 70));
}
if (leaks.length) {
  console.error('❌ 영어판에 한글이 ' + leaks.length + '군데 남았습니다:');
  for (const l of leaks) console.error('   · ' + l);
  process.exit(1);
}
writeFileSync(DST, s);
console.log('📄 ' + DST);
console.log('   ✅ 눈에 보이는 한글 없음 (언어 단추의 「한국어」만 일부러 남김)');

// 인스타그램에 올릴 그림 만들기 — 첫 9칸 게시물 + 스토리 3장 + 프로필 사진
//
// 왜 이렇게 만드나
//  · 스토어 그림(make-store-shots.mjs)과 같은 장면을 쓴다. 장면 설명이 두 벌로 갈라지면
//    게임을 고칠 때 한쪽만 낡는다. 그래서 SCENES 를 그 파일에서 가져다 쓴다.
//  · 크기: 게시물 1080x1350 (인스타 프로필 칸이 세로 4:5 로 잘린다 — 이 비율이 안 잘린다)
//          스토리·릴스 표지 1080x1920, 프로필 사진 320x320.
//  · 글씨는 Jua(제목) + 나눔고딕(본문). 컨테이너에 깔아 둔 글씨체다.
//
// 쓰기:  node jelly-shooting/tools/make-insta.mjs
// 결과:  jelly-shooting/press/insta/*.png
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const PW = '/opt/node22/lib/node_modules/playwright/index.js';
const pwMod = await import(existsSync(PW) ? 'file://' + PW : 'playwright');
const chromium = (pwMod.chromium || (pwMod.default && pwMod.default.chromium));
const { SCENES } = await import('./make-store-shots.mjs');

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SHOTS = join(ROOT, 'press', 'shots');
const OUT = join(ROOT, 'press', 'insta');
const GAME = 'file://' + join(ROOT, 'index.html');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
mkdirSync(OUT, { recursive: true });

const SITE = 'dashing-quokka-c37a8b.netlify.app';   // 소개 페이지 (프로필 링크에 넣는 주소)
const dataURI = (p) => 'data:image/png;base64,' + readFileSync(p).toString('base64');

// ── 카드 한 장을 그리는 틀 ─────────────────────────────────────────────
// 크기가 달라도 글씨·여백이 같이 커지도록 모든 값을 폭(W)의 비율로 적는다.
const card = ({ w, h, tint, body }) => `<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;
    font-family:'Jua','NanumGothic','Apple SD Gothic Neo',system-ui,sans-serif;}
  .bg{position:absolute;inset:0;background:
    radial-gradient(115% 85% at 18% 0%, #fff 0%, ${tint} 48%, ${tint} 100%);}
  .dots{position:absolute;inset:0;opacity:.55;
    background-image:radial-gradient(rgba(255,255,255,.95) 1.6px, transparent 1.7px);
    background-size:${Math.round(w * 0.042)}px ${Math.round(w * 0.042)}px;}
  .in{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
    justify-content:center;text-align:center;padding:${Math.round(w * 0.075)}px;box-sizing:border-box;}
  /* 제목 — Jua 는 굵기가 하나뿐이라 font-weight 를 올려도 두꺼워지지 않는다(400 고정) */
  h1{margin:0;font-weight:400;font-size:${Math.round(w * 0.105)}px;line-height:1.18;color:#e6336b;
    letter-spacing:-.5px;text-shadow:0 2px 0 #fff, 0 8px 20px rgba(230,60,120,.16);}
  h1 em{font-style:normal;color:#8a5cff;}
  p{margin:${Math.round(w * 0.028)}px 0 0;font-size:${Math.round(w * 0.045)}px;color:#7c5c8e;
    line-height:1.5;font-family:'NanumGothic',sans-serif;font-weight:700;}
  .eyebrow{font-size:${Math.round(w * 0.035)}px;color:rgba(120,80,110,.6);letter-spacing:1px;
    margin-bottom:${Math.round(w * 0.022)}px;}
  .foot{position:absolute;left:0;right:0;bottom:${Math.round(w * 0.05)}px;display:flex;
    align-items:center;justify-content:center;gap:${Math.round(w * 0.018)}px;
    font-size:${Math.round(w * 0.032)}px;color:rgba(120,80,110,.58);}
  .foot img{width:${Math.round(w * 0.055)}px;height:${Math.round(w * 0.055)}px;
    border-radius:${Math.round(w * 0.016)}px;}
  .strip{width:100%;margin-top:${Math.round(w * 0.045)}px;}
  .strip img{width:100%;display:block;}
  .phone{border-radius:${Math.round(w * 0.055)}px;overflow:hidden;background:#fff;
    box-shadow:0 ${Math.round(w * 0.018)}px ${Math.round(w * 0.05)}px rgba(150,70,110,.28),
               0 0 0 ${Math.round(w * 0.006)}px rgba(255,255,255,.95);}
  .phone img{display:block;width:100%;}
  .chips{display:flex;flex-wrap:wrap;gap:${Math.round(w * 0.022)}px;justify-content:center;
    margin-top:${Math.round(w * 0.05)}px;}
  .chip{background:#fff;border-radius:999px;padding:${Math.round(w * 0.024)}px ${Math.round(w * 0.042)}px;
    font-size:${Math.round(w * 0.042)}px;color:#7c5c8e;box-shadow:0 4px 14px rgba(150,70,110,.14);}
  .chip b{color:#e6336b;font-weight:400;}
  .big{font-size:${Math.round(w * 0.30)}px;line-height:1;color:#e6336b;
    text-shadow:0 3px 0 #fff, 0 12px 28px rgba(230,60,120,.2);}
  .code{display:inline-flex;gap:${Math.round(w * 0.016)}px;margin-top:${Math.round(w * 0.03)}px;}
  .code span{width:${Math.round(w * 0.135)}px;height:${Math.round(w * 0.16)}px;background:#fff;
    border-radius:${Math.round(w * 0.03)}px;display:flex;align-items:center;justify-content:center;
    font-size:${Math.round(w * 0.085)}px;color:#8a5cff;box-shadow:0 6px 16px rgba(150,70,110,.16);}
  .steps{margin-top:${Math.round(w * 0.05)}px;font-size:${Math.round(w * 0.042)}px;color:#7c5c8e;
    font-family:'NanumGothic',sans-serif;font-weight:700;line-height:2;}
  .icon{width:${Math.round(w * 0.30)}px;height:${Math.round(w * 0.30)}px;
    border-radius:${Math.round(w * 0.072)}px;box-shadow:0 12px 30px rgba(150,70,110,.24);}
  /* 게임 화면을 크게 보여 주는 카드 — 글은 위에, 폰은 아래로 흘려 잘리게 둔다.
     화면 전체를 넣으면(세로 2.17:1) 카드 안에서 손톱만 해진다. */
  .top{position:absolute;left:0;right:0;top:${Math.round(w * 0.075)}px;
    padding:0 ${Math.round(w * 0.075)}px;box-sizing:border-box;}
  .top h1{font-size:${Math.round(w * 0.095)}px;}
  .bleed{position:absolute;left:50%;transform:translateX(-50%);width:66%;
    top:${Math.round(h * (h / w > 1.5 ? 0.30 : 0.40))}px;   /* 세로가 긴 스토리는 더 위에서 시작 */
    border-radius:${Math.round(w * 0.055)}px ${Math.round(w * 0.055)}px 0 0;overflow:hidden;background:#fff;
    box-shadow:0 ${Math.round(w * 0.018)}px ${Math.round(w * 0.05)}px rgba(150,70,110,.28),
               0 0 0 ${Math.round(w * 0.006)}px rgba(255,255,255,.95);}
  .bleed img{display:block;width:100%;}
  .link{margin-top:${Math.round(w * 0.05)}px;background:#fff;border-radius:999px;
    padding:${Math.round(w * 0.028)}px ${Math.round(w * 0.055)}px;font-size:${Math.round(w * 0.04)}px;
    color:#8a5cff;box-shadow:0 6px 18px rgba(150,70,110,.16);font-family:'NanumGothic',sans-serif;}
</style>
<div class="bg"></div><div class="dots"></div>
<div class="in">${body}</div>`;

const foot = `<div class="foot"><img src="${dataURI(join(SHOTS, 'icon-1024.png'))}">젤리슈팅 · 설치도 가입도 없이 링크 하나</div>`;

// ── 게임 화면이 필요한 카드를 위해 장면을 다시 찍는다 ────────────────
const NEED = ['1-play', '2-dungeon', '3-throw'];
const browser = await chromium.launch({ executablePath: CHROME,
  args: ['--no-sandbox', '--allow-file-access-from-files'] });
const gctx = await browser.newContext({ viewport: { width: 430, height: 932 },
  deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const gpage = await gctx.newPage();
const shot = {};
for (const sc of SCENES.filter(s => NEED.includes(s.id))) {
  await gpage.goto(GAME);
  await gpage.waitForFunction("typeof openStart==='function'", null, { timeout: 20000 });
  await gpage.waitForTimeout(700);
  await gpage.evaluate('localStorage.clear()');
  await gpage.evaluate(sc.setup);
  await gpage.waitForTimeout(600);
  if (sc.paint) { await gpage.evaluate(sc.paint); await gpage.waitForTimeout(250); }
  shot[sc.id] = 'data:image/png;base64,' + (await gpage.screenshot({ type: 'png' })).toString('base64');
  console.log('· 장면 ' + sc.id + ' 찍음');
}
await gctx.close();

// ── 첫 9칸 (1080x1350) ───────────────────────────────────────────────
// 순서가 곧 프로필 첫인상이다. 1·4·7 이 세로 한 줄로 보이므로 그 셋을 '무엇인지 설명하는' 칸으로 둔다.
const P = { w: 1080, h: 1350 };
const POSTS = [
  { id: '1-대표', tint: '#ffe3f0', body: `
    <div class="eyebrow">🍡 젤리슈팅 · JELLY SHOOTING</div>
    <h1>온 가족이, 연인끼리,<br>친구랑 <em>3분이면 한 판</em></h1>
    <p>링크만 누르면 바로 시작<br>설치도 가입도 없어요</p>
    <div class="strip"><img src="${dataURI(join(SHOTS, 'chars-row.png'))}"></div>${foot}` },

  { id: '2-3분', tint: '#fff0e3', body: `
    <div class="eyebrow">한 판에 걸리는 시간</div>
    <div class="big">3분</div>
    <h1 style="margin-top:.2em">배우는 데는 <em>30초</em></h1>
    <p>떨어지는 젤리를 톡. 규칙은 그게 다예요.</p>${foot}` },

  { id: '3-던전', tint: '#e9e2ff', body: `
    <div class="top"><h1>같은 판에서 <em>실시간 대결</em></h1>
      <p>내가 터트린 방해 젤리가<br>상대 화면으로 넘어가요</p></div>
    <div class="bleed"><img src="${shot['2-dungeon']}"></div>` },

  { id: '4-없어요', tint: '#e3f7ff', body: `
    <div class="eyebrow">시작 전에 확인하는 것들</div>
    <h1>없어요, 하나도</h1>
    <div class="chips">
      <div class="chip">설치 <b>0</b></div><div class="chip">가입 <b>0</b></div>
      <div class="chip">광고 <b>0</b></div><div class="chip">결제 <b>0</b></div>
      <div class="chip"><b>전 연령</b></div>
    </div>
    <p style="margin-top:${Math.round(P.w * 0.05)}px">아이 옆에서 켜도 마음이 편한 게임</p>${foot}` },

  { id: '5-던지기', tint: '#ffeede', body: `
    <div class="top"><h1>한 명은 던지고,<br>한 명은 <em>터트려요</em></h1>
      <p>역할을 바꿔 가며 — 누가 더 오래 버티나</p></div>
    <div class="bleed"><img src="${shot['3-throw']}"></div>` },

  { id: '6-꾸미기', tint: '#ffe9f4', body: `
    <h1>내 캐릭터로 들어가요</h1>
    <p>머리 · 색깔 · 악세서리 — 모은 코인으로 만들어요</p>
    <div class="strip"><img src="${dataURI(join(SHOTS, 'dress-row.png'))}"></div>${foot}` },

  { id: '7-초대', tint: '#f3e6ff', body: `
    <div class="eyebrow">초대하는 방법</div>
    <h1>네 글자만 보내면 끝</h1>
    <div class="code"><span>A</span><span>7</span><span>K</span><span>2</span></div>
    <div class="steps">① 방 만들기<br>② 단톡방에 코드 보내기<br>③ 다 같이 시작</div>${foot}` },

  { id: '8-표정', tint: '#fff6e3', body: `
    <h1>이기면 춤추고,<br>지면 <em>분해해요</em> 😤</h1>
    <p>표정이 다 달라서, 결과 화면이 제일 재밌어요</p>
    <div class="strip"><img src="${dataURI(join(SHOTS, 'faces-row.png'))}"></div>${foot}` },

  { id: '9-플레이', tint: '#ffe3f0', body: `
    <img class="icon" src="${dataURI(join(SHOTS, 'icon-1024.png'))}">
    <h1 style="margin-top:${Math.round(P.w * 0.05)}px">지금 눌러서 바로</h1>
    <p>프로필 링크 → 누르면 게임이 열려요</p>
    <div class="link">🔗 ${SITE}</div>${foot}` },
];

// ── 스토리 · 릴스 표지 (1080x1920) ───────────────────────────────────
const S = { w: 1080, h: 1920 };
const STORIES = [
  { id: 'story-1-플레이', tint: '#ffe3f0', body: `
    <div class="top"><div class="eyebrow">🍡 젤리슈팅</div>
      <h1>딱 한 판만<br>하려고 했는데</h1>
      <p>👆 위로 밀어서 바로 시작</p></div>
    <div class="bleed" style="width:58%"><img src="${shot['1-play']}"></div>` },

  // G123 이 쓰는 안내와 같은 목적이다 — 인스타 안의 브라우저에서 열면 코인·기록이 날아갈 수 있다.
  { id: 'story-2-외부브라우저', tint: '#e3f7ff', body: `
    <img class="icon" src="${dataURI(join(SHOTS, 'icon-1024.png'))}">
    <div class="eyebrow" style="margin-top:${Math.round(S.w * 0.04)}px">처음 오셨다면</div>
    <h1>브라우저로<br>열어 주세요</h1>
    <p>인스타 안에서 열면 코인·기록이<br>저장되지 않을 수 있어요</p>
    <div class="steps">① 프로필 링크 누르기<br>② 오른쪽 위 <b>⋯</b> 누르기<br>③ <b>‘브라우저에서 열기’</b> 고르기</div>
    <p style="margin-top:${Math.round(S.w * 0.045)}px">한 번만 해 두면 다음부터는 그대로예요</p>` },

  { id: 'story-3-초대', tint: '#f3e6ff', body: `
    <h1>친구 부르는 데<br>10초</h1>
    <div class="code"><span>A</span><span>7</span><span>K</span><span>2</span></div>
    <div class="steps">방 만들고 · 코드 보내고 · 같이 시작</div>
    <div class="strip" style="width:78%;margin-top:${Math.round(S.w * 0.06)}px">
      <img src="${dataURI(join(SHOTS, 'chars-row.png'))}"></div>` },
];

// ── 찍기 ──────────────────────────────────────────────────────────────
const shoot = async (name, size, tint, body) => {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.setContent(card({ ...size, tint, body }));
  await p.evaluate(`(async()=>{ await Promise.all([...document.images].map(i=>i.complete?0:i.decode().catch(()=>0)));
    if(document.fonts&&document.fonts.ready) await document.fonts.ready; })()`);
  await p.waitForTimeout(300);
  writeFileSync(join(OUT, name + '.png'), await p.screenshot({ type: 'png' }));
  console.log('📷 ' + name + '.png  (' + size.w + 'x' + size.h + ')');
  await ctx.close();
};

for (const c of POSTS) await shoot(c.id, P, c.tint, c.body);
for (const c of STORIES) await shoot(c.id, S, c.tint, c.body);

// 프로필 사진 — 게임 아이콘을 320x320 으로 (인스타는 동그랗게 자른다)
const ictx = await browser.newContext({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 1 });
const ip = await ictx.newPage();
await ip.goto('data:text/html,<body></body>');
const pf = await ip.evaluate(async ([src]) => {
  const im = new Image();
  await new Promise((ok, no) => { im.onload = ok; im.onerror = no; im.src = src; });
  const c = document.createElement('canvas'); c.width = c.height = 320;
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
  g.drawImage(im, 0, 0, 320, 320);
  return c.toDataURL('image/png').split(',')[1];
}, [dataURI(join(SHOTS, 'icon-1024.png'))]);
writeFileSync(join(OUT, 'profile-320.png'), Buffer.from(pf, 'base64'));
console.log('📷 profile-320.png  (320x320 · 프로필 사진)');
await ictx.close();

await browser.close();
console.log('\n총 ' + (POSTS.length + STORIES.length + 1) + '장 → press/insta/');

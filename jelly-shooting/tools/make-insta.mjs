// 인스타그램에 올릴 그림 만들기 — 만화 포스터 판
//
// 무엇을 파는가 (디자인이 이 두 가지를 못 보여 주면 실패다)
//   ① 캐릭터가 귀엽다  → 캐릭터를 **크게**. 귀퉁이에 머리만 얹지 않는다.
//   ② 젤리가 팡팡 터진다 → 젤리와 **터지는 순간(파열 별 + 튀는 물방울)** 을 그림으로 뿌린다.
//
// 그래서 글씨만 있는 판이 아니라 진짜 게임에서 오려 온 젤리·캐릭터가 판을 채운다.
// 젤리는 게임의 drawJelly 를, 캐릭터는 drawAvatar 를 그대로 쓴다(withCtx 로 내 캔버스에 그린다).
// 게임 그림을 고치면 이 그림도 따라온다.
//
// 크기
//  · press/insta/*.png           1080x1350 (4:5) — 지금 인스타 프로필 격자가 이 비율로 보여 준다
//  · press/insta/square/*.png    1080x1080 (1:1) — 정사각으로 맞추고 싶을 때
//  · press/insta/story-*.png     1080x1920 — 스토리 · 릴스 표지
//  · press/insta/highlight-*.png 500x500  — 하이라이트 동그라미 표지
//  · press/insta/profile-320.png 320x320  — 프로필 사진
//
// 쓰기:  node jelly-shooting/tools/make-insta.mjs
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
// ── 언어 ─────────────────────────────────────────────────────────
// 한국어판과 영어판은 '같은 그림에 글만 다른 것'이다. 그림을 두 번 그리면
// 하나를 고칠 때 다른 하나가 반드시 뒤처진다. 글만 갈라 둔다.
//   node tools/make-insta.mjs        → press/insta/     (한국어)
//   node tools/make-insta.mjs --en   → press/insta-en/  (영어 · 글로벌 계정용)
const LANG = process.argv.includes('--en') ? 'en' : 'ko';
const TX = (ko, en) => (LANG === 'en' ? en : ko);   // 글만 갈라 쓴다 (S 는 이미 다른 뜻으로 쓰이고 있다)
const OUT = join(ROOT, 'press', LANG === 'en' ? 'insta-en' : 'insta');
const SQ = join(OUT, 'square');
const GAME = 'file://' + join(ROOT, 'index.html');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
mkdirSync(OUT, { recursive: true });
mkdirSync(SQ, { recursive: true });

const dataURI = (p) => 'data:image/png;base64,' + readFileSync(p).toString('base64');

const browser = await chromium.launch({ executablePath: CHROME,
  args: ['--no-sandbox', '--allow-file-access-from-files'] });

// ── ① 게임에서 그림 조각을 오려 온다 (배경 투명) ─────────────────────
const gctx = await browser.newContext({ viewport: { width: 430, height: 932 },
  deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const gpage = await gctx.newPage();
await gpage.goto(GAME);
await gpage.waitForFunction("typeof drawAvatar==='function' && typeof withCtx==='function'",
  null, { timeout: 20000 });

// 캐릭터 — make-press-characters 와 같은 비율(셀 2.62R · 높이 1.34셀 · 중심 0.66셀).
// 왕관·귀·턱이 잘리지 않는 값이다.
const cutout = async (cfg, mood, t = 3) => 'data:image/png;base64,' + await gpage.evaluate(`(([c,m,t])=>{
  const R=260, cell=R*2.62;
  const cv=document.createElement('canvas');
  cv.width=Math.round(cell); cv.height=Math.round(cell*1.34);
  const g=cv.getContext('2d');
  drawAvatar(g,cv.width/2,Math.round(cell*0.66),R,charSafe(c),m,t);
  return cv.toDataURL('image/png').split(',')[1];
})([${JSON.stringify(cfg)},${JSON.stringify(mood)},${t}])`);

// 젤리 한 알 — 게임의 drawJelly 를 내 캔버스에 그린다(withCtx 가 ctx 를 잠깐 바꿔 준다)
const jelly = async (color, shape = 'round', face = 'happy', gold = false) =>
  'data:image/png;base64,' + await gpage.evaluate(`(([color,shape,face,gold])=>{
  const R=120, S=340;
  const cv=document.createElement('canvas'); cv.width=cv.height=S;
  const g=cv.getContext('2d');
  withCtx(g,()=>{ g.save(); g.translate(S/2,S/2);
    drawJelly({x:0,y:0,r:R,color:color,face:face,shape:shape,wob:0.4,
      bomb:false,gold:gold,ghost:false,foe:false,pts:20,dead:false});
    g.restore(); });
  return cv.toDataURL('image/png').split(',')[1];
})([${JSON.stringify(color)},${JSON.stringify(shape)},${JSON.stringify(face)},${gold}])`);

// 터지는 순간 — 만화의 파열 별 + 튀는 물방울. 게임의 burst() 가 뿌리는 알갱이를 그림으로 굳힌 것.
const popFx = async (color) => 'data:image/png;base64,' + await gpage.evaluate(`((color)=>{
  const S=460, c=S/2;
  const cv=document.createElement('canvas'); cv.width=cv.height=S;
  const g=cv.getContext('2d');
  const spikes=12, R1=S*0.40, R2=S*0.24;
  g.beginPath();
  for(let i=0;i<spikes*2;i++){ const a=i/(spikes*2)*Math.PI*2-Math.PI/2;
    const r=(i%2? R2:R1)*(i%4===0?1:0.93);
    g[i?'lineTo':'moveTo'](c+Math.cos(a)*r, c+Math.sin(a)*r); }
  g.closePath();
  const vg=g.createRadialGradient(c,c*0.85,S*0.04,c,c,R1);
  vg.addColorStop(0,'#ffffff');
  vg.addColorStop(0.55,mixHex(color,'#ffffff',0.55));
  vg.addColorStop(1,color);
  g.fillStyle=vg; g.fill();
  g.lineWidth=S*0.022; g.strokeStyle='#1b1220'; g.lineJoin='round'; g.stroke();
  for(let i=0;i<14;i++){ const a=(i/14)*Math.PI*2+0.3, d=R1*(1.06+((i*37)%9)/22),
      r=S*(0.018+((i*53)%7)/260);
    g.beginPath(); g.arc(c+Math.cos(a)*d, c+Math.sin(a)*d, r, 0, 7);
    g.fillStyle=(i%3===0)?'#ffffff':mixHex(color,'#ffffff',0.25); g.fill();
    g.lineWidth=S*0.009; g.strokeStyle='#1b1220'; g.stroke(); }
  return cv.toDataURL('image/png').split(',')[1];
})(${JSON.stringify(color)})`);

const CH = {
  girl:  await cutout({ k: 'girl',  c: '#ff9db2', a: 'bow',     ac: '#ff5c8a', h: 'braid' }, 'happy'),
  boy:   await cutout({ k: 'human', c: '#ffe36e', a: 'glasses', ac: '#5a5566', h: 'crop' }, 'wow', 9),
  cat:   await cutout({ k: 'cat',   c: '#ffb3c9', a: 'bow',     ac: '#ff5c8a' }, 'happy'),
  dog:   await cutout({ k: 'dog',   c: '#a3d5ff', a: 'cap',     ac: '#4fa8ff' }, 'happy', 7),
  bear:  await cutout({ k: 'bear',  c: '#c9a27a', a: 'crown',   ac: '#ffce3d' }, 'proud'),
  bunny: await cutout({ k: 'bunny', c: '#fff0a8', a: 'flower',  ac: '#ff8ab5' }, 'wink', 5),
  panda: await cutout({ k: 'panda', c: '#f2e7dc', a: 'halo',    ac: '#ffe36e' }, 'happy', 4),
  fox:   await cutout({ k: 'fox',   c: '#ffb37a', a: 'star',    ac: '#ffce3d' }, 'wink', 6),
  ham:   await cutout({ k: 'hamster', c: '#ffd59e', a: 'party', ac: '#ff5c8a' }, 'happy', 8),
  wail:  await cutout({ k: 'girl',  c: '#ff9db2', a: 'bow',     ac: '#ff5c8a', h: 'braid' }, 'wail'),
  mad:   await cutout({ k: 'bear',  c: '#c9a27a', a: 'crown',   ac: '#ffce3d' }, 'mad'),
};
const J = {
  pink: await jelly('#ff5c8a'),                  blue: await jelly('#4fa8ff', 'bean'),
  gold: await jelly('#ffce3d', 'round', 'star', true), green: await jelly('#8fd94f'),
  grape: await jelly('#b96cff', 'bean', 'wink'), mint: await jelly('#40dfe6'),
  orange: await jelly('#ff8a5c', 'bean'),        bearJ: await jelly('#ffb3c9', 'bear'),
};
const POP = { pink: await popFx('#ff5c8a'), gold: await popFx('#ffce3d'),
  mint: await popFx('#40dfe6'), grape: await popFx('#b96cff') };
console.log('· 오려낸 조각 — 캐릭터 ' + Object.keys(CH).length + ' · 젤리 ' + Object.keys(J).length
  + ' · 터짐 ' + Object.keys(POP).length);

// ── ② 게임 화면이 필요한 칸 ───────────────────────────────────────────
const NEED = ['1-play', '2-dungeon', '3-throw'];
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

// ── ③ 흩뿌리기 ───────────────────────────────────────────────────────
// [가로%, 세로%, 폭%, 기울기°, 그림] — 판 위에 젤리·터짐을 놓는다.
// 글씨(z-index 3) 뒤에 깔리므로 글자를 가리지 않는다.
const fx = (list) => '<div class="fx">' + list.map(([x, y, w, rot, img]) =>
  `<img style="left:${x}%;top:${y}%;width:${w}%;transform:translate(-50%,-50%) rotate(${rot}deg)" src="${img}">`
).join('') + '</div>';

// ── ④ 포스터 한 장을 그리는 틀 ────────────────────────────────────────
// 값은 전부 폭(w) 비율이라 1:1 · 4:5 · 9:16 어디에 써도 글씨·여백이 같이 커진다.
const card = ({ w, h, bg, ink = '#1b1220', body }) => `<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;
    font-family:'Jua','Gowun Dodum','NanumGothic','Apple SD Gothic Neo',system-ui,sans-serif;}
  .bg{position:absolute;inset:0;background:${bg};}
  /* 집중선 — 시선을 가운데 글씨로 모은다.
     선을 촘촘히 넣으면(4도 간격) 축소됐을 때 눈이 어지러운 무늬(모아레)가 생긴다.
     12줄로 굵고 성글게 깔고, 흐리게 풀어서 '빛이 퍼지는' 느낌만 남긴다. */
  .rays{position:absolute;left:50%;top:40%;width:${w * 2.6}px;height:${w * 2.6}px;
    transform:translate(-50%,-50%);opacity:.10;filter:blur(${Math.round(w * 0.012)}px);
    background:repeating-conic-gradient(#fff 0deg 13deg, transparent 13deg 30deg);}
  /* 가운데만 밝게 — 글씨가 놓이는 자리를 떠오르게 한다 */
  .glow{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);
    width:${w * 1.5}px;height:${w * 1.5}px;border-radius:50%;
    background:radial-gradient(closest-side, rgba(255,255,255,.58), rgba(255,255,255,0));}
  /* 가장자리를 살짝 어둡게 — 이것 하나로 판이 평평하지 않고 '떠 있게' 보인다.
     격자에 여러 장이 붙었을 때 칸끼리 구분되는 효과도 있다. */
  .vign{position:absolute;inset:0;z-index:1;pointer-events:none;
    background:radial-gradient(120% 85% at 50% 40%,
      rgba(0,0,0,0) 55%, rgba(80,20,60,.10) 82%, rgba(70,15,55,.22) 100%);}
  /* 위쪽에서 빛이 드는 결 — 그라데이션만으로는 안 나오는 '광택'을 얹는다 */
  .sheen{position:absolute;left:0;right:0;top:0;height:${Math.round(h * 0.42)}px;z-index:1;
    background:linear-gradient(180deg, rgba(255,255,255,.34), rgba(255,255,255,0));}
  /* 잔 점도 같은 이유로 성글게 — 집중선과 겹치면 무늬가 두 겹으로 어지러워진다 */
  .polka{position:absolute;inset:0;opacity:.10;
    background-image:radial-gradient(#fff ${Math.round(w * 0.0035)}px, transparent ${Math.round(w * 0.004)}px);
    background-size:${Math.round(w * 0.085)}px ${Math.round(w * 0.085)}px;}
  /* 젤리·터짐이 깔리는 층 */
  .fx{position:absolute;inset:0;z-index:1;}
  /* 흰 테두리를 두르면 진한 바탕에서 '오려 붙인 스티커'가 된다.
     drop-shadow 를 네 방향으로 겹치는 게 캔버스 그림에 테두리를 두르는 유일한 방법이다. */
  .fx img{position:absolute;display:block;
    filter:drop-shadow(${Math.round(w * 0.004)}px 0 0 #fff) drop-shadow(-${Math.round(w * 0.004)}px 0 0 #fff)
           drop-shadow(0 ${Math.round(w * 0.004)}px 0 #fff) drop-shadow(0 -${Math.round(w * 0.004)}px 0 #fff)
           drop-shadow(0 ${Math.round(w * 0.012)}px ${Math.round(w * 0.018)}px rgba(70,20,60,.32));}
  .in{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;align-items:center;
    justify-content:center;text-align:center;box-sizing:border-box;
    padding:${Math.round(w * 0.06)}px ${Math.round(w * 0.06)}px ${Math.round(w * 0.33)}px;}
  /* 아래에 캐릭터를 세우지 않는 판 — 비워 둘 이유가 없으니 여백을 돌려준다 */
  .in.flat{padding-bottom:${Math.round(w * 0.13)}px;}
  /* 두꺼운 테두리 글씨 — paint-order 가 있어야 테두리가 글자를 갉아먹지 않는다 */
  /* 제목 — 흰 글씨 + 두꺼운 검정 테두리(작은 칸에서도 안 묻힌다).
     그림자를 두 겹 준다: 바로 아래 두꺼운 한 겹(입체) + 멀리 퍼지는 한 겹(바탕에서 뜨게).
     paint-order 가 있어야 테두리가 글자 속살을 갉아먹지 않는다. */
  h1{margin:0;font-weight:400;line-height:1.04;font-size:${Math.round(w * 0.168)}px;
    color:#fff;-webkit-text-stroke:${Math.round(w * 0.022)}px ${ink};paint-order:stroke fill;
    text-shadow:0 ${Math.round(w * 0.016)}px 0 rgba(58,10,48,.42),
                0 ${Math.round(w * 0.03)}px ${Math.round(w * 0.045)}px rgba(58,10,48,.28);
    letter-spacing:-1px;transform:rotate(-1.6deg);}
  h1 em{font-style:normal;color:#ffe14d;}
  .band{display:inline-block;color:#fff;border-radius:999px;font-family:'Gowun Dodum',sans-serif;
    background:linear-gradient(180deg,#3a2c46,${ink});
    padding:${Math.round(w * 0.024)}px ${Math.round(w * 0.05)}px;
    font-size:${Math.round(w * 0.042)}px;margin-top:${Math.round(w * 0.035)}px;
    box-shadow:0 ${Math.round(w * 0.008)}px 0 rgba(0,0,0,.3),
               0 ${Math.round(w * 0.02)}px ${Math.round(w * 0.032)}px rgba(58,10,48,.28),
               inset 0 1px 0 rgba(255,255,255,.18);}
  .band em{font-style:normal;color:#ffe14d;}
  .eyebrow{display:inline-block;color:${ink};border-radius:999px;letter-spacing:.3px;
    font-family:'Gowun Dodum',sans-serif;
    background:linear-gradient(180deg,#fff,#ffeef7);
    padding:${Math.round(w * 0.018)}px ${Math.round(w * 0.042)}px;font-size:${Math.round(w * 0.036)}px;
    margin-bottom:${Math.round(w * 0.03)}px;
    box-shadow:0 ${Math.round(w * 0.006)}px 0 rgba(0,0,0,.22),
               0 ${Math.round(w * 0.016)}px ${Math.round(w * 0.026)}px rgba(58,10,48,.22);}
  /* 인스타 광고의 '게임하기' 자리와 같은 알약 단추 */
  /* 눌러 달라는 알약 단추 — 아래 두꺼운 한 겹으로 '눌리는 물체'처럼 보이게 한다 */
  .cta{display:inline-flex;align-items:center;gap:${Math.round(w * 0.018)}px;
    background:linear-gradient(180deg,#3a2c46,${ink});
    color:#fff;border-radius:999px;padding:${Math.round(w * 0.031)}px ${Math.round(w * 0.078)}px;
    font-size:${Math.round(w * 0.057)}px;margin-top:${Math.round(w * 0.042)}px;
    box-shadow:0 ${Math.round(w * 0.012)}px 0 rgba(0,0,0,.34),
               0 ${Math.round(w * 0.026)}px ${Math.round(w * 0.04)}px rgba(58,10,48,.32),
               inset 0 1px 0 rgba(255,255,255,.2);}
  .cta.white{background:linear-gradient(180deg,#fff,#ffe8f2);color:${ink};
    box-shadow:0 ${Math.round(w * 0.012)}px 0 rgba(0,0,0,.2),
               0 ${Math.round(w * 0.026)}px ${Math.round(w * 0.04)}px rgba(58,10,48,.3);}
  /* 캐릭터 — 이 게임의 첫 번째 무기다. 작게 쓰지 않는다 */
  .cut{position:absolute;bottom:${Math.round(-w * 0.07)}px;z-index:2;pointer-events:none;
    filter:drop-shadow(${Math.round(w * 0.005)}px 0 0 #fff) drop-shadow(-${Math.round(w * 0.005)}px 0 0 #fff)
           drop-shadow(0 ${Math.round(w * 0.005)}px 0 #fff) drop-shadow(0 -${Math.round(w * 0.005)}px 0 #fff)
           drop-shadow(0 ${Math.round(w * 0.016)}px ${Math.round(w * 0.026)}px rgba(70,20,60,.34));}
  .cutL{left:${Math.round(-w * 0.07)}px;width:${Math.round(w * 0.46)}px;transform:rotate(-6deg);}
  .cutR{right:${Math.round(-w * 0.07)}px;width:${Math.round(w * 0.46)}px;transform:rotate(6deg);}
  .cutC{left:50%;width:${Math.round(w * 0.50)}px;transform:translateX(-50%);}
  .lock{position:absolute;z-index:4;left:${Math.round(w * 0.04)}px;bottom:${Math.round(w * 0.035)}px;
    display:flex;align-items:center;gap:${Math.round(w * 0.014)}px;background:rgba(255,255,255,.94);
    border-radius:999px;padding:${Math.round(w * 0.01)}px ${Math.round(w * 0.028)}px ${Math.round(w * 0.01)}px ${Math.round(w * 0.01)}px;
    font-size:${Math.round(w * 0.03)}px;color:${ink};}
  .lock img{width:${Math.round(w * 0.055)}px;height:${Math.round(w * 0.055)}px;border-radius:${Math.round(w * 0.016)}px;}
  /* G123 은 여기에 '확률형 아이템 포함' 을 적는다. 우리는 적을 게 정반대라 그걸 적는다 */
  .note{position:absolute;z-index:4;right:${Math.round(w * 0.035)}px;bottom:${Math.round(w * 0.04)}px;
    font-size:${Math.round(w * 0.026)}px;color:#fff;background:rgba(27,18,32,.45);
    border-radius:999px;padding:${Math.round(w * 0.012)}px ${Math.round(w * 0.028)}px;
    font-family:'NanumGothic',sans-serif;font-weight:700;}
  /* 게임 화면 액자 */
  .bleed{position:absolute;z-index:2;left:50%;transform:translateX(-50%) rotate(-1.5deg);width:58%;
    top:${Math.round(h * (h / w > 1.5 ? 0.34 : 0.43))}px;
    border-radius:${Math.round(w * 0.05)}px ${Math.round(w * 0.05)}px 0 0;overflow:hidden;background:#fff;
    border:${Math.round(w * 0.009)}px solid ${ink};border-bottom:0;
    box-shadow:0 ${Math.round(w * 0.02)}px ${Math.round(w * 0.04)}px rgba(0,0,0,.22);}
  .bleed img{display:block;width:100%;}
  .top{position:absolute;z-index:3;left:0;right:0;top:${Math.round(w * 0.075)}px;
    padding:0 ${Math.round(w * 0.055)}px;box-sizing:border-box;}
  .top h1{font-size:${Math.round(w * 0.122)}px;}
  .chips{display:flex;flex-wrap:wrap;gap:${Math.round(w * 0.02)}px;justify-content:center;
    margin-top:${Math.round(w * 0.038)}px;}
  .chip{background:#fff;border:${Math.round(w * 0.007)}px solid ${ink};border-radius:999px;
    padding:${Math.round(w * 0.02)}px ${Math.round(w * 0.038)}px;font-size:${Math.round(w * 0.042)}px;
    color:${ink};box-shadow:0 ${Math.round(w * 0.007)}px 0 rgba(0,0,0,.25);}
  .chip b{color:#e6336b;font-weight:400;}
  .code{display:inline-flex;gap:${Math.round(w * 0.018)}px;margin-top:${Math.round(w * 0.032)}px;}
  .code span{width:${Math.round(w * 0.14)}px;height:${Math.round(w * 0.165)}px;background:#fff;
    border:${Math.round(w * 0.008)}px solid ${ink};border-radius:${Math.round(w * 0.028)}px;
    display:flex;align-items:center;justify-content:center;font-size:${Math.round(w * 0.095)}px;
    color:${ink};box-shadow:0 ${Math.round(w * 0.009)}px 0 rgba(0,0,0,.25);}
  /* 순서 안내 — 캐릭터 위로 지나가는 일이 있어서 어두운 판을 깔아 준다 */
  .steps{display:inline-block;margin-top:${Math.round(w * 0.032)}px;font-size:${Math.round(w * 0.042)}px;
    color:#fff;font-family:'Gowun Dodum',sans-serif;line-height:1.9;
    background:rgba(27,18,32,.88);border-radius:${Math.round(w * 0.045)}px;
    padding:${Math.round(w * 0.026)}px ${Math.round(w * 0.05)}px;
    box-shadow:0 ${Math.round(w * 0.008)}px 0 rgba(0,0,0,.25);}
  .strip{width:100%;margin-top:${Math.round(w * 0.035)}px;}
  .strip img{width:100%;display:block;
    filter:drop-shadow(0 ${Math.round(w * 0.008)}px ${Math.round(w * 0.014)}px rgba(0,0,0,.22));}
  .icon{width:${Math.round(w * 0.30)}px;height:${Math.round(w * 0.30)}px;
    border-radius:${Math.round(w * 0.072)}px;border:${Math.round(w * 0.009)}px solid ${ink};
    box-shadow:0 ${Math.round(w * 0.014)}px 0 rgba(0,0,0,.25);}
</style>
<div class="bg"></div><div class="rays"></div><div class="polka"></div><div class="sheen"></div>
<div class="glow"></div>${body}<div class="vign"></div>`;

const lock = `<div class="lock"><img src="${dataURI(join(SHOTS, 'icon-1024.png'))}">${TX('젤리모','Jellimo')}</div>`;
const note = `<div class="note">${TX('광고 없음 · 결제 없음 · 전 연령','No ads · no payments · all ages')}</div>`;
const corner = lock + note;

// ── ⑤ 첫 9칸 ─────────────────────────────────────────────────────────
// 격자에서 세로 한 줄(1·4·7)이 나란히 보인다 → 그 셋에
// "무엇인지 / 안전한지 / 어떻게 같이 하는지" 를 놓는다.
const POSTS = [
  { id: '1-대표', bg: 'linear-gradient(158deg,#ffb3d8 0%,#ff6ba6 52%,#f0459b 100%)', body:
    fx([[10, 10, 16, -14, J.pink], [90, 12, 18, 12, J.gold], [15, 30, 12, 22, J.mint],
        [88, 33, 13, -18, J.green], [50, 11, 16, 6, POP.gold], [6, 52, 13, -8, J.blue],
        [95, 56, 12, 16, J.grape]]) + `
    <div class="in">
      <div class="eyebrow">${TX('🍡 젤리모 · JELLIMO','🍡 JELLIMO · TAP & SURVIVE')}</div>
      <h1>${TX('온 가족이<br>빠져드는<br><em>재미</em>','Everyone<br>gets<br><em>hooked</em>')}</h1>
      <div class="band">${TX('3분이면 한 판 · 설치도 가입도 없이','3-minute rounds · no install, no sign-up')}</div>
      <div class="cta">${TX('지금 바로 시작 ▶','Play now ▶')}</div>
    </div>
    <img class="cut cutL" src="${CH.girl}"><img class="cut cutR" src="${CH.bear}">
    ${corner}` },

  { id: '2-팡팡', bg: 'linear-gradient(158deg,#ffe887 0%,#ffb84d 55%,#ff8f3d 100%)', body:
    fx([[16, 14, 22, -10, POP.pink], [84, 18, 20, 14, POP.mint], [50, 7, 14, 6, J.grape],
        [9, 36, 13, 18, J.blue], [92, 40, 14, -16, J.pink], [26, 52, 11, -22, J.green],
        [76, 55, 12, 20, J.gold]]) + `
    <div class="in">
      <div class="eyebrow">${TX('이 게임의 손맛','How it feels')}</div>
      <h1>${TX('누르면<br><em>팡! 팡!</em>','Tap it.<br><em>Pop! Pop!</em>')}</h1>
      <div class="band">${TX('연달아 터트리면 콤보 — 점수가 튀어요','Chain them — the score jumps')}</div>
    </div>
    <img class="cut cutC" src="${CH.boy}">
    ${corner}` },

  { id: '3-던전', bg: 'linear-gradient(158deg,#b9a2ff 0%,#7d5cf6 52%,#5b39dc 100%)', body:
    fx([[9, 30, 14, -16, J.pink], [91, 34, 15, 14, J.mint], [12, 56, 12, 20, J.gold],
        [89, 60, 13, -20, POP.grape]]) + `
    <div class="top"><h1>${TX('같은 판에서<br><em>실시간 대결</em>','Same board.<br><em>Live battle.</em>')}</h1>
      <div class="band">${TX('터트린 방해 젤리가 상대 화면으로','Your pops land on their screen')}</div></div>
    <div class="bleed"><img src="${shot['2-dungeon']}"></div>
    ${corner}` },

  { id: '4-없어요', bg: 'linear-gradient(158deg,#8fe4ff 0%,#3fb6f5 52%,#1f8fe0 100%)', body:
    fx([[10, 11, 15, -14, J.gold], [90, 14, 16, 12, J.pink], [16, 30, 11, 20, J.green],
        [86, 34, 12, -18, J.grape], [50, 6, 13, 8, J.mint]]) + `
    <div class="in">
      <div class="eyebrow">${TX('시작 전에 확인하는 것들','Before you start')}</div>
      <h1>${TX('없어요,<br>하나도','None.<br>Not one.')}</h1>
      <div class="chips">
        <div class="chip">${TX('설치','Install')} <b>0</b></div><div class="chip">${TX('가입','Sign-up')} <b>0</b></div>
        <div class="chip">${TX('광고','Ads')} <b>0</b></div><div class="chip">${TX('결제','Payments')} <b>0</b></div>
        <div class="chip"><b>${TX('전 연령','All ages')}</b></div>
      </div>
      <div class="band">${TX('아이 옆에서 켜도 마음이 편한 게임','Safe to hand to a kid')}</div>
    </div>
    <img class="cut cutL" src="${CH.bunny}"><img class="cut cutR" src="${CH.cat}">
    ${corner}` },

  { id: '5-던지기', bg: 'linear-gradient(158deg,#ffc48f 0%,#ff8f57 52%,#f56a3c 100%)', body:
    fx([[8, 32, 15, -18, J.bearJ], [92, 36, 14, 16, J.blue], [11, 58, 13, 22, POP.pink],
        [90, 62, 12, -14, J.gold]]) + `
    <div class="top"><h1>${TX('한 명은 던지고<br>한 명은 <em>터트려요</em>','One throws.<br>One <em>pops.</em>')}</h1>
      <div class="band">${TX('역할 바꿔 가며 — 누가 더 오래 버티나','Swap roles — who lasts longer?')}</div></div>
    <div class="bleed"><img src="${shot['3-throw']}"></div>
    ${corner}` },

  { id: '6-꾸미기', bg: 'linear-gradient(158deg,#ffbde6 0%,#f871c7 52%,#e148ab 100%)', body:
    fx([[9, 12, 14, -12, J.gold], [91, 15, 15, 14, J.mint], [50, 6, 12, 6, J.green]]) + `
    <div class="in flat">
      <div class="eyebrow">${TX('모은 코인으로','With coins you earn')}</div>
      <h1>${TX('내 캐릭터로<br>들어가요','Bring your<br>own jelly')}</h1>
      <div class="band">${TX('아홉 종 · 머리 · 색깔 · 악세서리','9 species · hair · skin tone · accessories')}</div>
      <div class="strip" style="margin-top:${Math.round(1080 * 0.06)}px">
        <img src="${dataURI(join(SHOTS, 'dress-row.png'))}"></div>
    </div>
    <img class="cut cutR" src="${CH.panda}">
    ${corner}` },

  { id: '7-초대', bg: 'linear-gradient(158deg,#a8ecab 0%,#4fc879 52%,#26a862 100%)', body:
    fx([[10, 11, 15, -14, J.pink], [90, 14, 16, 12, J.gold], [15, 31, 11, 20, J.grape],
        [87, 35, 12, -18, J.mint]]) + `
    <div class="in">
      <div class="eyebrow">${TX('초대하는 방법','How to invite')}</div>
      <h1>${TX('네 글자만<br>보내면 끝','Send 4 letters.<br>That\'s it.')}</h1>
      <div class="code"><span>A</span><span>7</span><span>K</span><span>2</span></div>
      <div class="steps">${TX('방 만들기 → 코드 보내기 → 같이 시작','Make a room → send the code → play')}</div>
    </div>
    <img class="cut cutR" src="${CH.dog}">
    ${corner}` },

  { id: '8-표정', bg: 'linear-gradient(158deg,#ffdc7a 0%,#ffa63f 52%,#f5822c 100%)', body:
    fx([[50, 12, 16, 6, POP.gold], [10, 26, 13, -16, J.pink], [90, 30, 14, 14, J.mint]]) + `
    <div class="in">
      <div class="eyebrow">${TX('결과 화면이 제일 재밌어요','The ending is the best part')}</div>
      <h1>${TX('이기면 춤추고<br>지면 <em>분해해요</em>','Winners dance.<br>Losers <em>sulk.</em>')}</h1>
      <div class="band">${TX('표정도 자세도 판마다 달라요','New face and pose every round')}</div>
    </div>
    <img class="cut cutL" src="${CH.mad}"><img class="cut cutR" src="${CH.wail}">
    ${corner}` },

  { id: '9-플레이', bg: 'linear-gradient(158deg,#ff9dc2 0%,#ff5c92 52%,#ef3a78 100%)', body:
    fx([[11, 13, 15, -14, J.gold], [89, 16, 16, 12, J.mint], [17, 33, 11, 20, J.green],
        [85, 37, 12, -18, J.grape], [50, 11, 16, 8, POP.mint]]) + `
    <div class="in flat">
      <img class="icon" src="${dataURI(join(SHOTS, 'icon-1024.png'))}">
      <h1 style="margin-top:.3em">지금 바로<br>플레이</h1>
      <div class="band">${TX('프로필 링크를 누르면 바로 열려요','Tap the link in bio — opens instantly')}</div>
      <div class="cta white">${TX('🎮 게임하기','🎮 Play')}</div>
    </div>
    ${corner}` },
];

// ── ⑥ 스토리 · 릴스 표지 (1080x1920) ─────────────────────────────────
const S = { w: 1080, h: 1920 };
const STORIES = [
  { id: 'story-1-광고', bg: 'linear-gradient(158deg,#ffb3d8 0%,#ff6ba6 52%,#f0459b 100%)', body:
    fx([[12, 9, 15, -14, J.pink], [88, 12, 16, 12, J.gold], [50, 9, 15, 6, POP.gold],
        [8, 26, 12, 20, J.mint], [92, 30, 13, -16, J.green], [14, 44, 11, 14, J.blue],
        [87, 47, 11, -12, J.grape]]) + `
    <div class="in">
      <h1>${TX('딱 한 판만<br>하려고<br><em>했는데</em>','Just one<br>round, I<br><em>said</em>')}</h1>
      <div class="band">${TX('3분이면 한 판 · 설치도 가입도 없이','3-minute rounds · no install, no sign-up')}</div>
      <div class="cta white">${TX('🎮 게임하기','🎮 Play')}</div>
    </div>
    <img class="cut cutL" src="${CH.girl}"><img class="cut cutR" src="${CH.boy}">
    ${corner}` },

  { id: 'story-2-외부브라우저', bg: 'linear-gradient(158deg,#8fe4ff 0%,#43a8f2 52%,#2a7fd8 100%)', body:
    fx([[10, 10, 13, -14, J.gold], [90, 13, 14, 12, J.pink]]) + `
    <div class="in">
      <div class="eyebrow">${TX('처음 오셨다면 꼭 읽어 주세요','First time here? Read this')}</div>
      <h1>${TX('브라우저로<br>열어 주세요','Open it in<br>your browser')}</h1>
      <div class="band">${TX('인스타 안에서 열면 코인·기록이 안 남아요','Inside Instagram, coins and records don\'t save')}</div>
      <div class="steps">${TX('① 프로필 링크 누르기<br>② 오른쪽 위 ⋯ 누르기<br>③ ‘브라우저에서 열기’ 고르기','① Tap the link in bio<br>② Tap ⋯ at the top right<br>③ Choose “Open in browser”')}</div>
      <div class="band">${TX('한 번만 해 두면 다음부터는 그대로','Do it once — it sticks after that')}</div>
    </div>
    <img class="cut cutR" src="${CH.dog}">
    ${corner}` },

  { id: 'story-3-초대', bg: 'linear-gradient(158deg,#a8ecab 0%,#4fc879 52%,#26a862 100%)', body:
    fx([[11, 10, 14, -14, J.pink], [89, 13, 15, 12, J.gold], [50, 9, 14, 6, POP.mint],
        [9, 30, 12, 18, J.grape], [91, 33, 12, -16, J.mint]]) + `
    <div class="in">
      <h1>${TX('친구 부르는 데<br><em>10초</em>','Invite a friend<br>in <em>10 sec</em>')}</h1>
      <div class="code"><span>A</span><span>7</span><span>K</span><span>2</span></div>
      <div class="steps">${TX('방 만들기 → 단톡방에 코드 → 같이 시작','Make a room → drop the code → play')}</div>
      <div class="cta white">${TX('🎮 게임하기','🎮 Play')}</div>
    </div>
    <img class="cut cutL" src="${CH.cat}"><img class="cut cutR" src="${CH.bear}">
    ${corner}` },

  { id: 'story-4-플레이화면', bg: 'linear-gradient(158deg,#b7a0ff 0%,#7150ee 52%,#5232d4 100%)', body:
    fx([[9, 24, 13, -16, J.pink], [91, 27, 14, 14, J.gold], [8, 44, 12, 20, POP.pink]]) + `
    <div class="top"><h1>${TX('지금 이 화면이<br><em>전부예요</em>','This screen<br>is <em>the whole game</em>')}</h1>
      <div class="band">${TX('떨어지는 젤리를 톡 — 30초면 배워요','Tap the falling jellies — learn it in 30 sec')}</div></div>
    <div class="bleed" style="width:56%"><img src="${shot['1-play']}"></div>
    ${corner}` },
];

// ── ⑦ 하이라이트 동그라미 표지 (500x500) ─────────────────────────────
// 인스타가 가운데를 동그랗게 자른다 → 얼굴을 가운데 크게.
// 바탕색과 캐릭터 색이 겹치면 얼굴이 묻힌다 — 서로 반대색으로 짝지었다.
const HL = [
  { id: 'highlight-1-먼저읽기', bg: '#2aa8f2', ch: CH.bear, label: TX('먼저 읽기','READ ME') },
  { id: 'highlight-2-게임방법', bg: '#ff5c96', ch: CH.boy,  label: TX('게임 방법','HOW TO') },
  { id: 'highlight-3-같이하기', bg: '#37bf6a', ch: CH.girl, label: TX('같이 하기','PLAY W/ FRIENDS') },
  { id: 'highlight-4-업데이트', bg: '#ffab2e', ch: CH.dog,  label: TX('업데이트','UPDATES') },
];

// ── ⑧ 찍기 ───────────────────────────────────────────────────────────
const shoot = async (path, size, bg, body) => {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.setContent(card({ ...size, bg, body }));
  await p.evaluate(`(async()=>{ await Promise.all([...document.images].map(i=>i.complete?0:i.decode().catch(()=>0)));
    if(document.fonts&&document.fonts.ready) await document.fonts.ready; })()`);
  await p.waitForTimeout(300);
  writeFileSync(path, await p.screenshot({ type: 'png' }));
  await ctx.close();
};

for (const c of POSTS) {
  await shoot(join(OUT, c.id + '.png'), { w: 1080, h: 1350 }, c.bg, c.body);
  await shoot(join(SQ, c.id + '.png'), { w: 1080, h: 1080 }, c.bg, c.body);
  console.log('📷 ' + c.id + '.png  (1080x1350 + square/1080x1080)');
}
for (const c of STORIES) {
  await shoot(join(OUT, c.id + '.png'), S, c.bg, c.body);
  console.log('📷 ' + c.id + '.png  (1080x1920)');
}
for (const h of HL) {
  await shoot(join(OUT, h.id + '.png'), { w: 500, h: 500 }, h.bg,
    `<img src="${h.ch}" style="position:absolute;z-index:2;left:50%;transform:translateX(-50%);
      bottom:${Math.round(500 * 0.10)}px;width:${Math.round(500 * 0.62)}px;">`);
  console.log('📷 ' + h.id + '.png  (500x500 · ' + h.label + ')');
}

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
console.log('\n게시물 ' + POSTS.length + '장(4:5 + 1:1) · 스토리 ' + STORIES.length
  + '장 · 하이라이트 ' + HL.length + '장 · 프로필 1장 → press/' + (LANG==='en'?'insta-en':'insta') + '/');

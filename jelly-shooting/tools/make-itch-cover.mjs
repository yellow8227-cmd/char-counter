// itch.io 표지(cover) 를 만든다.  node tools/make-itch-cover.mjs
//   → press/upload/cover-A.png … cover-D.png   (630x500, @2x 로 그려 1260x1000)
//   → press/upload/cover-grid.png              (itch 목록에 끼워 본 미리보기)
//
// 왜 따로 만드나 — 지금 쓰던 cover-1200x630.png 는 링크 미리보기(OG) 비율(1.90:1)이다.
// itch 표지는 315x250(=1.26:1)이라 그대로 올리면 좌우가 잘려 나간다.
// 그리고 itch 목록은 흰 바탕에 열 개가 나란히 붙는다 — 거기서 이기는 조건은 딱 둘이다.
//   ① 이름이 그림 안에 크게 박혀 있을 것   ② 흰 바탕에 안 묻히는 진한 색일 것
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const PW='/opt/node22/lib/node_modules/playwright/index.js';
const pwMod=await import(existsSync(PW)?'file://'+PW:'playwright');
const chromium=(pwMod.chromium||(pwMod.default&&pwMod.default.chromium));
const HERE=dirname(fileURLToPath(import.meta.url)), ROOT=join(HERE,'..');
const OUT=join(ROOT,'press','upload'); mkdirSync(OUT,{recursive:true});
const GAME='file://'+join(ROOT,'index.html');
const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const W=630, H=500, SC=2;

const browser=await chromium.launch({executablePath:CHROME,args:['--no-sandbox','--allow-file-access-from-files']});
const gctx=await browser.newContext({viewport:{width:430,height:932},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const gp=await gctx.newPage(); await gp.goto(GAME);
await gp.waitForFunction("typeof drawAvatar==='function' && typeof withCtx==='function'",null,{timeout:20000});

const cutout=async(cfg,mood,t=3)=>'data:image/png;base64,'+await gp.evaluate(`(([c,m,t])=>{
  const R=260, cell=R*2.62; const cv=document.createElement('canvas');
  cv.width=Math.round(cell); cv.height=Math.round(cell*1.34);
  drawAvatar(cv.getContext('2d'),cv.width/2,Math.round(cell*0.66),R,charSafe(c),m,t);
  return cv.toDataURL('image/png').split(',')[1];
})([${'${'}0}])`.replace('${0}',`${JSON.stringify(cfg)},${JSON.stringify(mood)},${t}`));

const jelly=async(color,shape='round',gold=false,face='happy')=>'data:image/png;base64,'+await gp.evaluate(`(([c,s,g,f])=>{
  const R=120,S=340; const cv=document.createElement('canvas'); cv.width=cv.height=S;
  const gx=cv.getContext('2d');
  withCtx(gx,()=>{ gx.save(); gx.translate(S/2,S/2);
    drawJelly({x:0,y:0,r:R,color:c,face:f,shape:s,wob:0.4,bomb:false,gold:g,ghost:false,foe:false,pts:20,dead:false});
    gx.restore(); });
  return cv.toDataURL('image/png').split(',')[1];
})([${JSON.stringify(color)},${JSON.stringify(shape)},${gold},${JSON.stringify(face)}])`);

const CAT   = await cutout({kind:'cat',color:'#ffb3c9',acc:'bow',accColor:'#ff5c8a',hair:'basic'},'happy');
// 표지의 주인공은 토끼다 — 영상·썸네일과 같은 차림새로 맞춘다.
// 예전에는 사람 캐릭터를 세웠는데, 홍보물의 얼굴은 하나로 통일하는 게 낫다.
const BUNNY = await cutout({kind:'bunny',color:'#ffb3c9',acc:'bow',accColor:'#ff5c8a',face:'heart'},'wow');
const BUNNY2= await cutout({kind:'bunny',color:'#ffb3c9',acc:'bow',accColor:'#ff5c8a',face:'heart'},'happy');
const BEAR  = await cutout({kind:'bear',color:'#c9a27a',acc:'crown',accColor:'#ffce3d',hair:'basic'},'happy');
const J = {}; for(const [k,c,s,g] of [['pink','#ff8fb8','round',false],['gold','#ffce3d','round',true],
  ['mint','#7fe0c0','bear',false],['blue','#8fc9ff','bean',false],['grape','#c792ff','round',false],
  ['lime','#b6e3a0','bear',false]]) J[k]=await jelly(c,s,g);

const page=await (await browser.newContext({viewport:{width:W,height:H},deviceScaleFactor:SC})).newPage();

// 조각 흩뿌리기 — [left%, top%, 폭%, 회전]
const fx=(list,imgs)=>list.map(([x,y,w,r],i)=>
  `<img class="j" src="${imgs[i%imgs.length]}" style="left:${x}%;top:${y}%;width:${w}%;transform:rotate(${r}deg)">`).join('');

const CSS=`
<style>
@font-face{font-family:'Nolto';src:local('Jua'),local('Gowun Dodum');}
*{margin:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;overflow:hidden;position:relative;
  font-family:'Jua','Gowun Dodum',system-ui,sans-serif;}
.wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
  justify-content:center;text-align:center;}
.j{position:absolute;filter:drop-shadow(0 6px 10px rgba(0,0,0,.28));}
.cut{position:absolute;bottom:-6%;filter:drop-shadow(0 10px 16px rgba(0,0,0,.3));}
.rays{position:absolute;inset:-40%;background:repeating-conic-gradient(from 0deg,
  rgba(255,255,255,.14) 0deg 13deg, rgba(255,255,255,0) 13deg 30deg);
  filter:blur(1.5px);opacity:.55;}
.vign{position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 40%,
  rgba(0,0,0,0) 45%, rgba(0,0,0,.30) 100%);}
h1{font-size:104px;line-height:.92;letter-spacing:-2px;color:#fff;
  -webkit-text-stroke:13px #2b1224;paint-order:stroke fill;
  text-shadow:0 8px 0 rgba(43,18,36,.55);}
h1 em{font-style:normal;color:#ffe14d;}
.strap{margin-top:12px;font-size:25px;letter-spacing:.20em;color:#fff;
  -webkit-text-stroke:7px #2b1224;paint-order:stroke fill;}
.band{margin-top:14px;padding:9px 20px;border-radius:16px;background:rgba(27,10,22,.86);
  color:#fff;font-size:20px;line-height:1.35;}
.z{position:relative;z-index:3;}
/* ── 검색 목록에서 이기기 위한 판 ──
   목록에서 표지는 가로 285px 쯤으로 줄어든다. 그 크기에서 살아남는 것은
   '큰 이름' 과 '큰 얼굴 하나' 뿐이다. 기능 나열('3-min rounds · up to 4 players')은
   그 크기에서 글자가 뭉개져 회색 띠로만 보인다 — 그래서 아래 판에는 넣지 않는다. */
body.dark h1{-webkit-text-stroke-color:#08030c;
  text-shadow:0 0 46px rgba(255,60,95,.6), 0 8px 0 rgba(8,3,12,.7);}
body.dark .strap{-webkit-text-stroke-color:#08030c;}
body.dark .rays{opacity:.16}
.glow{position:absolute;border-radius:50%;filter:blur(46px);z-index:0;}
.big{position:absolute;filter:drop-shadow(0 10px 20px rgba(0,0,0,.55));}
</style>`;

const shot=async(name,bg,inner,cls='')=>{
  await page.setContent(`${CSS}<body class="${cls}" style="background:${bg}">
    <div class="rays"></div>${inner}<div class="vign"></div></body>`);
  await page.waitForTimeout(320);
  const b=await page.screenshot({type:'png'});
  writeFileSync(join(OUT,name),b);
  console.log('🎨 '+name+'  '+(W*SC)+'x'+(H*SC));
  return 'data:image/png;base64,'+b.toString('base64');
};

// 거대 보스 — 게임의 drawBoss() 를 그대로 부른다(목업이 아니다).
// ctx 가 let 이라 잠깐 갈아끼울 수 있고, dieT=1 이면 크기·회전은 그대로인데 체력 띠만
// 안 그려진다. hp 를 낮게 두면 몸이 붉어지고 금이 늘어서 어두운 배경에서 형체가 산다.
const BOSS = 'data:image/png;base64,'+await gp.evaluate(`(()=>{
  const S=900, R=270;
  const cv=document.createElement('canvas'); cv.width=cv.height=S;
  const oldCtx=ctx, oldBoss=boss, oldFrame=frame;
  ctx=cv.getContext('2d');
  boss={x:S/2,y:S*0.52,r:R,hp:20,hpMax:100,swing:0.5,dieT:1,flash:0,vy:0,shootT:0,slamT:0};
  frame=40; drawBoss();
  ctx=oldCtx; boss=oldBoss; frame=oldFrame;
  return cv.toDataURL('image/png').split(',')[1];
})()`);

// 힉스필드로 만든 배경판. 캐릭터·글자는 게임이 그린 진짜 그림을 얹는다 —
// 배경만 AI 로 하고 등장인물은 실물로 두면 표지가 게임과 어긋나지 않는다.
// (이 컨테이너에서 그 CDN 으로 못 나가서, 받아 둔 파일을 읽는다)
const bgFile=(n)=>{ const f=join(ROOT,'press','bg',n);
  return existsSync(f) ? 'data:image/png;base64,'+readFileSync(f).toString('base64') : null; };
const ARENA=bgFile('arena-1.png');

const jl=[J.pink,J.gold,J.mint,J.blue,J.grape,J.lime];

// A · 이름을 크게 · 진한 분홍 (기본안)
const A=await shot('cover-A.png','linear-gradient(150deg,#ff7ab4 0%,#f0459b 48%,#c62a86 100%)',
  fx([[3,6,17,-14],[84,4,18,12],[-4,52,15,20],[90,48,14,-16],[46,-6,13,6]],jl)+
  `<img class="cut" src="${CAT}" style="left:-13%;width:52%"><img class="cut" src="${BEAR}" style="right:-13%;width:50%">
   <div class="wrap z"><h1>Jelli<em>mo</em></h1><div class="strap">TAP &amp; SURVIVE</div>
     <div class="band">3-min rounds · up to 4 players · no download</div></div>`);

// B · 🔥 도발형 · 어두운 빨강 (흰 목록에서 제일 튄다)
//    처음엔 얼굴이 너무 커서 턱이 잘리고 아래 3분의 1이 비었다. 얼굴을 줄여 다 보이게 하고,
//    빈 자리에는 '떨어지는 젤리'를 세워 무슨 게임인지 그림만으로 알게 했다.
const B=await shot('cover-B.png','linear-gradient(150deg,#ff6b52 0%,#e2213f 46%,#8f0f2c 100%)',
  `<img class="j" src="${J.pink}"  style="left:52%;top:-6%;width:13%;transform:rotate(-12deg)">
   <img class="j" src="${J.gold}"  style="left:66%;top:14%;width:12%;transform:rotate(10deg)">
   <img class="j" src="${J.mint}"  style="left:56%;top:40%;width:11%;transform:rotate(18deg)">
   <img class="j" src="${J.grape}" style="left:44%;top:62%;width:10%;transform:rotate(-16deg)">
   <img class="j" src="${J.blue}"  style="left:88%;top:56%;width:11%;transform:rotate(14deg)">
   <img class="j" src="${J.lime}"  style="left:6%;bottom:4%;width:10%;transform:rotate(20deg)">
   <img class="cut" src="${BUNNY}" style="right:1%;width:33%;bottom:3%">
   <div class="wrap z" style="align-items:flex-start;justify-content:flex-start;padding:20px 0 0 24px;text-align:left">
     <h1 style="font-size:74px">Can you<br>last<br><em>10 sec?</em></h1>
     <div class="band" style="margin-top:14px;font-size:18px">🍡 Jellimo · tap &amp; survive</div>
     <div class="band" style="margin-top:8px;font-size:16px;background:rgba(255,214,64,.95);color:#5a1010">
       🔥 Nuclear · 2 lives · 3.2× speed</div></div>`);

// C · 캐릭터를 크게 · 이름은 위에 (귀여움이 먼저 보인다)
const C=await shot('cover-C.png','linear-gradient(150deg,#a98bff 0%,#7a4ff0 50%,#4f27c4 100%)',
  fx([[4,10,15,-14],[85,8,16,12],[-3,58,13,20],[90,54,12,-16]],jl)+
  `<img class="cut" src="${BUNNY}" style="left:2%;width:47%;bottom:-10%">
   <img class="cut" src="${CAT}" style="right:0%;width:45%;bottom:-12%">
   <div class="wrap z" style="justify-content:flex-start;padding-top:22px">
     <h1 style="font-size:86px">Jelli<em>mo</em></h1>
     <div class="strap" style="font-size:22px">TAP &amp; SURVIVE</div></div>`);

// D · 젤리를 주인공으로 (무엇을 누르는 게임인지 한눈에)
const D=await shot('cover-D.png','linear-gradient(150deg,#ffd36e 0%,#ff9f2e 48%,#ef6b12 100%)',
  `<img class="j" src="${J.pink}"  style="left:6%;top:8%;width:30%;transform:rotate(-10deg)">
   <img class="j" src="${J.gold}"  style="right:4%;top:4%;width:27%;transform:rotate(12deg)">
   <img class="j" src="${J.mint}"  style="left:-4%;bottom:6%;width:26%;transform:rotate(16deg)">
   <img class="j" src="${J.grape}" style="right:-3%;bottom:2%;width:24%;transform:rotate(-14deg)">
   <img class="cut" src="${CAT}" style="left:50%;transform:translateX(-50%);width:44%;bottom:-14%">
   <div class="wrap z" style="justify-content:flex-start;padding-top:26px">
     <h1 style="font-size:92px">Jelli<em>mo</em></h1>
     <div class="band" style="margin-top:10px">tap · pop · survive</div></div>`);

// ── 검색 목록용 센 판 (E·F) ──
// 왜: 'jellimo' 검색 결과에서 이웃이 Bullet Mind·Godly Gambit·Don't Die 처럼 다 어둡고
// 세다. 그 사이에서 분홍 표지는 눈에는 띄지만 '내 게임 아님' 으로 읽힌다. 이 게임의
// 진짜 무기는 '귀여운데 안 만만하다' 인데, 그건 보스를 같이 보여줘야 전달된다.

// E · 귀여움 vs 보스 — 이 게임을 한 장으로 설명하는 그림
const E=await shot('cover-E.png','linear-gradient(150deg,#3a0f22 0%,#1c0716 55%,#08030c 100%)',
  `<div class="glow" style="left:34%;top:6%;width:60%;height:74%;background:rgba(255,45,85,.40)"></div>
   <img class="big" src="${BOSS}" style="right:-6%;top:-14%;width:62%">
   <img class="big" src="${BUNNY}" style="left:1%;bottom:-8%;width:38%">
   <div class="wrap z" style="align-items:flex-start;padding-left:22px;justify-content:flex-start;padding-top:26px">
     <h1 style="font-size:92px;text-align:left">Jelli<em>mo</em></h1>
     <div class="strap" style="margin-top:8px">CUTE? SURE.</div>
   </div>`, 'dark');

// F · 도발 한 문장 — 이름보다 문장이 먼저 읽히는 판
const F=await shot('cover-F.png','linear-gradient(150deg,#ff6b52 0%,#e2213f 44%,#7a0c24 100%)',
  fx([[2,8,15,-14],[88,6,16,12],[-3,60,13,20]],jl)+
  `<img class="big" src="${BOSS}" style="right:-14%;bottom:-30%;width:58%;opacity:.92">
   <img class="big" src="${BUNNY}" style="left:-6%;bottom:-10%;width:40%">
   <div class="wrap z" style="justify-content:flex-start;padding-top:20px">
     <h1 style="font-size:118px;line-height:.86">10 <em>SEC</em><br>MAX</h1>
     <div class="strap" style="margin-top:6px">JELLIMO</div>
   </div>`, 'dark');

// G · 힉스필드 배경 + 우리 캐릭터
// 배경 구도가 맞아떨어진다 — 왼쪽이 비어 있고(토끼 자리), 오른쪽 위에서 붉은 광선이
// 쏟아지고(보스 자리), 아래에 갈라진 바닥이 있다. 다만 어둡다. 목록에서 묻히는지는
// 끼워 보고 판단한다.
const G=ARENA ? await shot('cover-G.png','#120509',
  `<img style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" src="${ARENA}">
   <img class="big" src="${BOSS}" style="right:-3%;top:2%;width:44%">
   <img class="big" src="${BUNNY}" style="left:-6%;bottom:-9%;width:42%">
   <div class="wrap z" style="justify-content:flex-start;padding-top:18px;align-items:flex-start;padding-left:26px">
     <h1 style="font-size:112px;line-height:.84;text-align:left">10 <em>SEC</em><br>MAX</h1>
     <div class="strap" style="margin-top:10px;font-size:29px">JELLIMO</div>
   </div>`, 'dark') : null;

// H · 같은 배경을 붉게 끌어올린 판 — 목록에서 안 묻히게 밝기를 올려 본다
const HOT=ARENA ? await shot('cover-H.png','#7a0c24',
  `<img style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
        filter:brightness(1.5) saturate(1.5) contrast(0.92);opacity:.92" src="${ARENA}">
   <div style="position:absolute;inset:0;background:radial-gradient(120% 90% at 72% 22%,
        rgba(255,90,60,.55) 0%, rgba(226,33,63,.30) 45%, rgba(0,0,0,0) 100%)"></div>
   <img class="big" src="${BOSS}" style="right:-3%;top:4%;width:42%">
   <img class="big" src="${BUNNY}" style="left:-6%;bottom:-9%;width:42%">
   <div class="wrap z" style="justify-content:flex-start;padding-top:18px;align-items:flex-start;padding-left:26px">
     <h1 style="font-size:112px;line-height:.84;text-align:left">10 <em>SEC</em><br>MAX</h1>
   </div>
   <!-- 이름은 아래 바닥에 따로 놓는다. 글자 층에 같이 두면 토끼 귀에 얹혔다.
        itch 는 표지 아래에 제목을 또 써 주니 크지 않아도 된다. -->
   <div class="z" style="position:absolute;right:5%;bottom:6%;padding:8px 20px;border-radius:14px;
        background:rgba(12,4,10,.72);color:#fff;font-size:30px;letter-spacing:.18em;
        border:2px solid rgba(255,255,255,.18)">JELLIMO</div>`, 'dark') : null;

// 고른 안을 '이름이 안 바뀌는 파일'로 한 벌 더 둔다 — 문서·안내가 이 이름을 가리킨다.
// 다른 안으로 바꾸려면 아래 PICK 만 고치면 된다.
// 검색 목록에 이웃과 섞어 놓고 골랐다. 어두운 판(E·G)은 이웃이 죄다 어두워서
// 묻히고, 평면 그라데이션(B·F)은 질감이 없다. H 는 밝아서 튀면서 배경 깊이가 있다.
const PICK='cover-H.png';
writeFileSync(join(OUT,'cover-itch.png'), readFileSync(join(OUT,PICK)));
console.log('⭐ cover-itch.png ← '+PICK+' (실제로 올릴 표지)');

// ── itch 목록에 끼워 보기 (흰 바탕에 나란히 붙는 그 상황이 진짜 시험이다)
const gpg=await (await browser.newContext({viewport:{width:1240,height:1000},deviceScaleFactor:2})).newPage();
const old='data:image/png;base64,'+readFileSync(join(ROOT,'press','shots','cover-1200x630.png')).toString('base64');
const card=(src,t,tag)=>`<div class="c"><img src="${src}"><div class="t">${t}</div><div class="g">${tag}</div></div>`;
// 'jellimo' 검색 결과에 실제로 뜨는 이웃들을 색·글씨만 흉내내어 세워 둔다.
// 남의 표지 그림을 쓸 수는 없으니 인상(어둡다·글씨가 크다)만 재현한다.
// 표지는 혼자 볼 때가 아니라 '이 줄에 섞였을 때' 눈에 걸려야 한다.
const nb=(bg,txt,col='#fff')=>'data:image/svg+xml;base64,'+Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="630" height="500">`
  +`<rect width="630" height="500" fill="${bg}"/>`
  +`<text x="315" y="270" font-family="Impact,system-ui" font-size="76" font-weight="900"`
  +` fill="${col}" text-anchor="middle">${txt}</text></svg>`).toString('base64');
const NEIGH=[ nb('#4a6b46','Bullet Mind'), nb('#e8b23a','DELIVER-OOPS','#3a2410'),
              nb('#f2f2f2',"Don't Die",'#111'), nb('#1a1a22','GODLY GAMBIT','#e8c34a') ];

await gpg.setContent(`<style>
 body{margin:0;background:#fff;font:14px/1.4 system-ui;padding:22px}
 h2{font:700 17px system-ui;color:#333;margin:0 0 14px}
 .row{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-bottom:26px}
 .c img{width:100%;aspect-ratio:630/500;object-fit:cover;border-radius:4px;display:block;background:#eee}
 .t{font:700 15px system-ui;color:#222;margin-top:7px}
 .g{font:12px system-ui;color:#da3b8a}
</style><body>
 <h2>itch.io 목록에 끼워 본 모습 — 흰 바탕, 이웃과 나란히</h2>
 <div class="row">
   ${card(A,'Jellimo: Tap &amp; Survive','#casual, #cute  ← A')}
   ${card(B,'Jellimo: Tap &amp; Survive','#arcade, #hard  ← B')}
   ${card(C,'Jellimo: Tap &amp; Survive','#cute, #multiplayer  ← C')}
   ${card(D,'Jellimo: Tap &amp; Survive','#casual, #arcade  ← D')}
 </div>
 <h2>센 판 (E·F) — 보스를 같이 보여 주는 쪽</h2>
 <div class="row">
   ${card(E,'Jellimo: Tap &amp; Survive','#arcade, #cute  ← E')}
   ${card(F,'Jellimo: Tap &amp; Survive','#arcade, #hard  ← F')}
   ${card(old,'Jellimo: Tap &amp; Survive','← 예전 OG 표지. 이름이 없고 잘린다')}
   ${card(NEIGH[3],'Godly Gambit','#fighting')}
 </div>
 <h2>실제 검색 결과처럼 이웃과 섞어 보기 — 여기서 눈에 걸리는 게 이기는 표지다</h2>
 <div class="row">
   ${card(NEIGH[0],'Bullet Mind','#action')}
   ${card(A,'Jellimo: Tap &amp; Survive','← A (지금 올라간 것)')}
   ${card(NEIGH[1],'Deliver-OOPS!','#simulation')}
   ${card(NEIGH[2],"Don't Die",'#fighting')}
 </div>
 <div class="row">
   ${card(NEIGH[3],'Godly Gambit','#fighting')}
   ${card(E,'Jellimo: Tap &amp; Survive','← E')}
   ${card(NEIGH[0],'Bullet Mind','#action')}
   ${card(F,'Jellimo: Tap &amp; Survive','← F')}
 </div>
 ${G?`<h2>힉스필드 배경 + 우리 캐릭터 (G 어두운 그대로 · H 붉게 올림) — 이웃과 섞어 보기</h2>
 <div class="row">
   ${card(NEIGH[2],"Don't Die",'#fighting')}
   ${card(G,'Jellimo: Tap &amp; Survive','← G')}
   ${card(NEIGH[3],'Godly Gambit','#fighting')}
   ${card(HOT,'Jellimo: Tap &amp; Survive','← H')}
 </div>`:''}</body>`);
await gpg.waitForTimeout(500);
writeFileSync(join(OUT,'cover-grid.png'),await gpg.screenshot({type:'png',fullPage:true}));
console.log('🧪 cover-grid.png — 목록에 끼워 본 미리보기');
await browser.close();

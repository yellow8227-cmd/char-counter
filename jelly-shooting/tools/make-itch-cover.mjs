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
const GIRL  = await cutout({kind:'girl',color:'#5a4034',acc:'star',accColor:'#ffd166',hair:'afro',skin:'#cf8f5f',face:'freckle'},'wow');
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
</style>`;

const shot=async(name,bg,inner)=>{
  await page.setContent(`${CSS}<body style="background:${bg}">
    <div class="rays"></div>${inner}<div class="vign"></div></body>`);
  await page.waitForTimeout(320);
  const b=await page.screenshot({type:'png'});
  writeFileSync(join(OUT,name),b);
  console.log('🎨 '+name+'  '+(W*SC)+'x'+(H*SC));
  return 'data:image/png;base64,'+b.toString('base64');
};

const jl=[J.pink,J.gold,J.mint,J.blue,J.grape,J.lime];

// A · 이름을 크게 · 진한 분홍 (기본안)
const A=await shot('cover-A.png','linear-gradient(150deg,#ff7ab4 0%,#f0459b 48%,#c62a86 100%)',
  fx([[3,6,17,-14],[84,4,18,12],[-4,52,15,20],[90,48,14,-16],[46,-6,13,6]],jl)+
  `<img class="cut" src="${CAT}" style="left:-13%;width:52%"><img class="cut" src="${BEAR}" style="right:-13%;width:50%">
   <div class="wrap z"><h1>Jelli<em>mo</em></h1><div class="strap">TAP &amp; SURVIVE</div>
     <div class="band">3-min rounds · up to 4 players · no download</div></div>`);

// B · 🔥 도발형 · 어두운 빨강 (흰 목록에서 제일 튄다)
const B=await shot('cover-B.png','linear-gradient(150deg,#ff6b52 0%,#e2213f 46%,#8f0f2c 100%)',
  fx([[2,8,16,-12],[86,6,17,14],[-3,56,14,18],[89,52,13,-14]],jl)+
  `<img class="cut" src="${GIRL}" style="right:-12%;width:50%">
   <div class="wrap z" style="align-items:flex-start;padding-left:26px;text-align:left">
     <h1 style="font-size:84px">Can you<br>last<br><em>10 sec?</em></h1>
     <div class="band" style="margin-top:16px">🍡 Jellimo · tap &amp; survive</div></div>`);

// C · 캐릭터를 크게 · 이름은 위에 (귀여움이 먼저 보인다)
const C=await shot('cover-C.png','linear-gradient(150deg,#a98bff 0%,#7a4ff0 50%,#4f27c4 100%)',
  fx([[4,10,15,-14],[85,8,16,12],[-3,58,13,20],[90,54,12,-16]],jl)+
  `<img class="cut" src="${GIRL}" style="left:2%;width:47%;bottom:-10%">
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

// ── itch 목록에 끼워 보기 (흰 바탕에 나란히 붙는 그 상황이 진짜 시험이다)
const gpg=await (await browser.newContext({viewport:{width:1240,height:1000},deviceScaleFactor:2})).newPage();
const old='data:image/png;base64,'+readFileSync(join(ROOT,'press','shots','cover-1200x630.png')).toString('base64');
const card=(src,t,tag)=>`<div class="c"><img src="${src}"><div class="t">${t}</div><div class="g">${tag}</div></div>`;
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
 <h2>지금 쓰던 표지(OG 비율 1200x630)를 같은 자리에 넣으면</h2>
 <div class="row">
   ${card(old,'Jellimo: Tap &amp; Survive','← 이름이 없고 비율이 안 맞아 잘린다')}
   ${card(A,'Little troubles in Spooky town','#ghost, #cozy')}
   ${card(B,'BREAKOUT BABY','#atmospheric, #horror')}
   ${card(C,'LAZY KICKERS','#sports, #desktop-pet')}
 </div></body>`);
await gpg.waitForTimeout(500);
writeFileSync(join(OUT,'cover-grid.png'),await gpg.screenshot({type:'png',fullPage:true}));
console.log('🧪 cover-grid.png — 목록에 끼워 본 미리보기');
await browser.close();

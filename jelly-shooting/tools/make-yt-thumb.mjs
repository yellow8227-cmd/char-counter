// 유튜브 세로 썸네일(쇼츠) 을 만든다.   node tools/make-yt-thumb.mjs
//   → press/upload/yt-thumb-A.png · B.png    (1080x1920)
//   → press/upload/yt-thumb.png             (고른 안. 문서가 이 이름을 가리킨다)
//   → press/upload/yt-thumb-feed.png        (쇼츠 목록에 끼워 본 미리보기)
//
// 세로 썸네일에서 지켜야 하는 것
//   ① 쇼츠 화면은 UI 가 그림을 덮는다 — 아래 22% 는 제목·채널·설명, 오른쪽 16% 는
//      좋아요·댓글·공유 단추가 올라앉는다. 중요한 것은 '위쪽 가운데'에 둔다.
//   ② 목록에서는 손톱만 하게 줄어든다 → 글자는 적고 크게, 배경은 진하게.
//   ③ 얼굴 하나가 크게 있어야 작아져도 알아본다.
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
const W=1080, H=1920;

const browser=await chromium.launch({executablePath:CHROME,args:['--no-sandbox','--allow-file-access-from-files']});
const gctx=await browser.newContext({viewport:{width:430,height:932},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const gp=await gctx.newPage(); await gp.goto(GAME);
await gp.waitForFunction("typeof drawAvatar==='function' && typeof withCtx==='function'",null,{timeout:20000});

// 캐릭터를 투명 배경으로 오려 온다 (게임 코드가 직접 그린다 — 손으로 그린 목업이 아니다)
const cutout=async(cfg,mood,t=3)=>'data:image/png;base64,'+await gp.evaluate(`(([c,m,t])=>{
  const R=320, cell=R*2.62; const cv=document.createElement('canvas');
  cv.width=Math.round(cell); cv.height=Math.round(cell*1.34);
  drawAvatar(cv.getContext('2d'),cv.width/2,Math.round(cell*0.66),R,charSafe(c),m,t);
  return cv.toDataURL('image/png').split(',')[1];
})([${JSON.stringify(null)},${JSON.stringify(null)},0])`.replace(
  JSON.stringify(null)+','+JSON.stringify(null)+',0',
  `${JSON.stringify(cfg)},${JSON.stringify(mood)},${t}`));

const jelly=async(color,shape='round',gold=false,face='happy')=>'data:image/png;base64,'+await gp.evaluate(`(([c,s,g,f])=>{
  const R=150,S=420; const cv=document.createElement('canvas'); cv.width=cv.height=S;
  const gx=cv.getContext('2d');
  withCtx(gx,()=>{ gx.save(); gx.translate(S/2,S/2);
    drawJelly({x:0,y:0,r:R,color:c,face:f,shape:s,wob:0.4,bomb:false,gold:g,ghost:false,foe:false,pts:20,dead:false});
    gx.restore(); });
  return cv.toDataURL('image/png').split(',')[1];
})([${JSON.stringify(color)},${JSON.stringify(shape)},${gold},${JSON.stringify(face)}])`);

// 우리 얼굴 — 분홍 토끼 · 볼 하트 · 리본 (영상과 같은 차림새로 맞춘다)
const BUNNY = await cutout({kind:'bunny',color:'#ffb3c9',acc:'bow',accColor:'#ff5c8a',face:'heart'},'wow');
const BUNNY2= await cutout({kind:'bunny',color:'#ffb3c9',acc:'bow',accColor:'#ff5c8a',face:'heart'},'happy');
const CAT   = await cutout({kind:'cat',color:'#a3d5ff',acc:'flower',accColor:'#ff8ab5'},'happy');
const J={}; for(const [k,c,s,g] of [['pink','#ff8fb8','round',false],['gold','#ffce3d','round',true],
  ['mint','#7fe0c0','bear',false],['blue','#8fc9ff','bean',false],['grape','#c792ff','round',false],
  ['lime','#b6e3a0','bear',false]]) J[k]=await jelly(c,s,g);
const BOMB = await jelly('#4a4450','round',false,'angry');

const page=await (await browser.newContext({viewport:{width:W,height:H},deviceScaleFactor:1})).newPage();

const CSS=`
<style>
*{margin:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;overflow:hidden;position:relative;
  font-family:'Jua','Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif;}
.j{position:absolute;filter:drop-shadow(0 10px 18px rgba(0,0,0,.30));}
.cut{position:absolute;filter:drop-shadow(0 18px 28px rgba(0,0,0,.34));}
.rays{position:absolute;inset:-40%;background:repeating-conic-gradient(from 0deg,
  rgba(255,255,255,.15) 0deg 11deg, rgba(255,255,255,0) 11deg 26deg);filter:blur(2px);opacity:.55;}
.vign{position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 34%,
  rgba(0,0,0,0) 42%, rgba(0,0,0,.38) 100%);}
.z{position:relative;z-index:3}
/* 쇼츠 UI 가 덮는 자리를 피해 위쪽 가운데에 몰아 둔다 */
.wrap{position:absolute;left:0;right:0;top:0;height:74%;display:flex;flex-direction:column;
  align-items:center;justify-content:flex-start;text-align:center;padding:96px 60px 0;}
h1{font-size:190px;line-height:.88;letter-spacing:-6px;color:#fff;
  -webkit-text-stroke:26px #2b1224;paint-order:stroke fill;
  text-shadow:0 14px 0 rgba(43,18,36,.5);}
h1 em{font-style:normal;color:#ffe14d}
.sub{margin-top:26px;font-size:64px;color:#fff;-webkit-text-stroke:16px #2b1224;paint-order:stroke fill;}
.band{margin-top:30px;padding:20px 40px;border-radius:34px;background:rgba(27,10,22,.88);
  color:#fff;font-size:46px;line-height:1.3;}
</style>`;

const shot=async(name,bg,inner)=>{
  await page.setContent(`${CSS}<body style="background:${bg}">
    <div class="rays"></div>${inner}<div class="vign"></div></body>`);
  await page.waitForTimeout(340);
  const b=await page.screenshot({type:'png'});
  writeFileSync(join(OUT,name),b);
  console.log('🎬 '+name+'  '+W+'x'+H);
  return 'data:image/png;base64,'+b.toString('base64');
};

// A · 도발형 — 이 게임의 가장 센 문장. 빨강이라 목록에서 제일 튄다
const A=await shot('yt-thumb-A.png','linear-gradient(160deg,#ff6b52 0%,#e2213f 45%,#8f0f2c 100%)',
  `<img class="j" src="${J.pink}"  style="left:4%;top:30%;width:15%;transform:rotate(-12deg)">
   <img class="j" src="${J.gold}"  style="right:5%;top:26%;width:14%;transform:rotate(10deg)">
   <img class="j" src="${J.mint}"  style="left:12%;top:47%;width:12%;transform:rotate(16deg)">
   <img class="j" src="${BOMB}"    style="right:12%;top:45%;width:13%;transform:rotate(-8deg)">
   <img class="cut" src="${BUNNY}" style="left:50%;transform:translateX(-50%);bottom:2%;width:62%">
   <div class="wrap z">
     <div class="sub">귀엽다고 얕보지 마세요</div>
     <h1 style="margin-top:34px">10초도<br><em>못 버팀</em></h1>
     <div class="band" style="background:rgba(255,214,64,.95);color:#5a1010">🔥 핵불닭 · 목숨 2개 · 속도 3.2배</div>
   </div>`);

// B · 귀여움 먼저 — 얼굴을 크게. 작아져도 뭔지 알아본다
const B=await shot('yt-thumb-B.png','linear-gradient(160deg,#ff9ec7 0%,#ff5c9a 46%,#d62a7a 100%)',
  `<img class="j" src="${J.gold}"  style="left:6%;top:12%;width:14%;transform:rotate(-14deg)">
   <img class="j" src="${J.mint}"  style="right:6%;top:16%;width:13%;transform:rotate(12deg)">
   <img class="j" src="${J.blue}"  style="left:10%;top:52%;width:12%;transform:rotate(18deg)">
   <img class="j" src="${J.grape}" style="right:8%;top:50%;width:12%;transform:rotate(-16deg)">
   <img class="cut" src="${BUNNY2}" style="left:50%;transform:translateX(-50%);bottom:4%;width:70%">
   <div class="wrap z">
     <h1 style="font-size:170px">젤리모</h1>
     <div class="sub" style="margin-top:20px">톡 터트리면 콤보!</div>
     <div class="band">설치 없이 · 3분이면 한 판</div>
   </div>`);

// C안(진짜 게임 화면을 배경으로)은 버렸다 — 낱장에 이미 자막이 박혀 있어 글자가 겹치고,
// 어두워서 목록에서 묻혔다. 자막 없는 낱장을 따로 뽑아야 하는데 그럴 값어치가 없다.

// ── 쇼츠 목록에 끼워 본 미리보기 ──
// 표지는 혼자 볼 때가 아니라 '남의 영상들 사이에서 스크롤될 때' 눈에 걸려야 한다.
const feed=await (await browser.newContext({viewport:{width:1180,height:900},deviceScaleFactor:1})).newPage();
const card=(img,title)=>`<div class="c"><div class="th" style="background-image:url('${img}')">
  <div class="ui"></div></div><div class="t">${title}</div><div class="v">조회수 1.2만회</div></div>`;
await feed.setContent(`<style>
 *{margin:0;box-sizing:border-box}
 body{background:#fff;font-family:'Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif;padding:26px}
 .row{display:flex;gap:18px}
 .c{width:210px}
 .th{width:210px;height:373px;border-radius:14px;background-size:cover;background-position:center;
   position:relative;overflow:hidden}
 .ui{position:absolute;right:8px;bottom:56px;width:34px;height:150px;
   background:linear-gradient(rgba(255,255,255,.75),rgba(255,255,255,.45));border-radius:17px;opacity:.5}
 .t{margin-top:9px;font-size:14px;font-weight:800;color:#0f0f0f;line-height:1.3;
   display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
 .v{font-size:12.5px;color:#606060;margin-top:3px}
 h2{font-size:17px;margin-bottom:14px;color:#0f0f0f}
</style>
<h2>▶ 쇼츠 — 다른 영상들 사이에서 이렇게 보입니다</h2>
<div class="row">
  ${card('https://dummyimage.com/210x373/6b7cff/fff&text=+','다른 게임 영상')}
  ${card(A,'귀엽다고 얕보지 마세요 10초도 못 버팀')}
  ${card('https://dummyimage.com/210x373/2ecf8f/fff&text=+','다른 게임 영상')}
  ${card(B,'젤리모 — 설치 없이 3분이면 한 판')}
  ${card('https://dummyimage.com/210x373/ff9f43/fff&text=+','다른 게임 영상')}
</div>`);
await feed.waitForTimeout(500);
writeFileSync(join(OUT,'yt-thumb-feed.png'), await feed.screenshot({type:'png'}));
console.log('🖼  yt-thumb-feed.png  (쇼츠 목록에 끼워 본 모습)');

// 고른 안 — 문서·안내가 이 이름을 가리킨다. 바꾸려면 PICK 만 고치면 된다.
const PICK='yt-thumb-A.png';
writeFileSync(join(OUT,'yt-thumb.png'), readFileSync(join(OUT,PICK)));
console.log('⭐ yt-thumb.png ← '+PICK+' (실제로 쓸 썸네일)');
await browser.close();

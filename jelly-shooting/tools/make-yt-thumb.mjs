// 유튜브 세로 썸네일(쇼츠) 을 만든다.   node tools/make-yt-thumb.mjs [--en]
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
// 언어 — 파일 이름도 갈라 둔다(한 폴더에 같이 두고 골라 쓴다)
const LANG = process.argv.includes('--en') ? 'en' : 'ko';
const TX = (ko, en) => (LANG === 'en' ? en : ko);
const SUF = LANG === 'en' ? '-en' : '';

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

// 거대 보스 — 게임의 drawBoss() 를 그대로 부른다 (목업이 아니다).
// ctx 가 let 이라 잠깐 갈아끼울 수 있고, dieT=1 로 두면 크기·회전은 그대로인데
// 체력 띠만 안 그려진다 (띠는 판 좌표계로 그려서 오려낸 그림에 엉뚱하게 박힌다).
const BOSS = 'data:image/png;base64,'+await gp.evaluate(`(()=>{
  const S=1000, R=300;
  const cv=document.createElement('canvas'); cv.width=cv.height=S;
  const oldCtx=ctx, oldBoss=boss, oldFrame=frame;
  ctx=cv.getContext('2d');
  // hp 를 낮게 두면 몸이 붉어지고 금이 는다 — 어두운 배경에서 형체가 살아난다
  boss={x:S/2,y:S*0.52,r:R,hp:20,hpMax:100,swing:0.5,dieT:1,flash:0,vy:0,shootT:0,slamT:0};
  frame=40;
  drawBoss();
  ctx=oldCtx; boss=oldBoss; frame=oldFrame;
  return cv.toDataURL('image/png').split(',')[1];
})()`);

// 대전 칸에 세울 넷 — 일부러 분홍을 안 쓴다. 같은 게임인데 인상이 이렇게 달라진다.
const FOUR = [];
for (const c of [{kind:'dog',  color:'#a3d5ff',acc:'cap',   accColor:'#4f7bd9'},
                 {kind:'bear', color:'#c9a27a',acc:'shades',accColor:'#2a2230'},
                 {kind:'fox',  color:'#ffb03a',acc:'horns', accColor:'#8f2020'},
                 {kind:'hamster',color:'#ffe36e',acc:'star',accColor:'#ffce3d'}])
  FOUR.push(await cutout(c,'mad'));

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
/* 어두운 판 — 대전·보스를 앞세운 쪽. 분홍 자산과 골라 쓴다.
   어두운 배경에서는 흰 빛살이 너무 세고, 글자 테두리도 배경에 묻는다. */
body.dark .rays{opacity:.20}
body.dark h1{-webkit-text-stroke-color:#08030c;
  text-shadow:0 0 70px rgba(255,60,95,.55), 0 14px 0 rgba(8,3,12,.65);}
body.dark .sub{-webkit-text-stroke-color:#08030c;}
body.dark .band{background:rgba(8,3,12,.92);border:5px solid rgba(255,255,255,.18)}
/* 아래에 붙이면 안 된다 — 쇼츠는 아래 22% 를 제목·채널이 덮어서 얼굴이 통째로
   가려진다. 처음에 bottom:1% 로 뒀다가 목록 미리보기에서 사라진 걸 보고 올렸다.
   그리고 넷을 나란히 세우니 목록 크기에서 얼굴이 뭉개졌다 — 이 파일 맨 위에 적어둔
   '얼굴 하나가 크게 있어야 알아본다' 를 스스로 어긴 셈이라, 둘을 크게 맞세우고
   나머지 둘은 뒤에 작게 세운다. */
.duo img{position:absolute;filter:drop-shadow(0 18px 30px rgba(0,0,0,.6));}
.duo .big{width:50%;top:40%}      /* 40% + 높이(폭의 1.34배) = 아래 22% UI 선에 딱 맞는다 */
.duo .bigL{left:-2%}
.duo .bigR{right:-2%;transform:scaleX(-1)}
.duo .small{width:26%;top:34%;opacity:.5;filter:drop-shadow(0 10px 20px rgba(0,0,0,.5)) blur(1.4px);}
.duo .smallL{left:18%}
.duo .smallR{right:18%;transform:scaleX(-1)}
.vs{position:absolute;left:50%;top:53%;transform:translate(-50%,-50%) rotate(-8deg);z-index:5;
  font-size:210px;color:#ffe14d;-webkit-text-stroke:28px #08030c;paint-order:stroke fill;
  text-shadow:0 0 70px rgba(255,225,77,.75);}
/* 보스는 몸이 새까매서 어두운 배경에 그대로 묻힌다. 뒤에 붉은 빛을 깔아 떼어 놓는다. */
.glow{position:absolute;border-radius:50%;filter:blur(60px);z-index:0;}
</style>`;

const shot=async(name,bg,inner,cls='')=>{
  await page.setContent(`${CSS}<body class="${cls}" style="background:${bg}">
    <div class="rays"></div>${inner}<div class="vign"></div></body>`);
  await page.waitForTimeout(340);
  const b=await page.screenshot({type:'png'});
  writeFileSync(join(OUT,name),b);
  console.log('🎬 '+name+'  '+W+'x'+H);
  return 'data:image/png;base64,'+b.toString('base64');
};

// A · 도발형 — 이 게임의 가장 센 문장. 빨강이라 목록에서 제일 튄다
const A=await shot(`yt-thumb-A${SUF}.png`,'linear-gradient(160deg,#ff6b52 0%,#e2213f 45%,#8f0f2c 100%)',
  `<img class="j" src="${J.pink}"  style="left:4%;top:30%;width:15%;transform:rotate(-12deg)">
   <img class="j" src="${J.gold}"  style="right:5%;top:26%;width:14%;transform:rotate(10deg)">
   <img class="j" src="${J.mint}"  style="left:12%;top:47%;width:12%;transform:rotate(16deg)">
   <img class="j" src="${BOMB}"    style="right:12%;top:45%;width:13%;transform:rotate(-8deg)">
   <img class="cut" src="${BUNNY}" style="left:50%;transform:translateX(-50%);bottom:2%;width:62%">
   <div class="wrap z">
     <div class="sub">${TX('귀엽다고 얕보지 마세요','It looks cute.')}</div>
     <h1 style="margin-top:34px">${TX('10초도<br><em>못 버팀</em>','You will<br>not last<br><em>10 sec</em>')}</h1>
     <div class="band" style="background:rgba(255,214,64,.95);color:#5a1010">${
       TX('🔥 핵불닭 · 목숨 2개 · 속도 3.2배','🔥 Nuclear · 2 lives · 3.2× speed')}</div>
   </div>`);

// B · 귀여움 먼저 — 얼굴을 크게. 작아져도 뭔지 알아본다
const B=await shot(`yt-thumb-B${SUF}.png`,'linear-gradient(160deg,#ff9ec7 0%,#ff5c9a 46%,#d62a7a 100%)',
  `<img class="j" src="${J.gold}"  style="left:6%;top:12%;width:14%;transform:rotate(-14deg)">
   <img class="j" src="${J.mint}"  style="right:6%;top:16%;width:13%;transform:rotate(12deg)">
   <img class="j" src="${J.blue}"  style="left:10%;top:52%;width:12%;transform:rotate(18deg)">
   <img class="j" src="${J.grape}" style="right:8%;top:50%;width:12%;transform:rotate(-16deg)">
   <img class="cut" src="${BUNNY2}" style="left:50%;transform:translateX(-50%);bottom:4%;width:70%">
   <div class="wrap z">
     <h1 style="font-size:170px">${TX('젤리모','Jellimo')}</h1>
     <div class="sub" style="margin-top:20px">${TX('톡 터트리면 콤보!','Tap. It pops. Chain it.')}</div>
     <div class="band">${TX('설치 없이 · 3분이면 한 판','No install · 3-minute rounds')}</div>
   </div>`);

// 게임 화면을 그대로 배경에 깔던 안은 버렸다 — 낱장에 이미 자막이 박혀 있어 글자가
// 겹치고, 어두워서 목록에서 묻혔다. 자막 없는 낱장을 따로 뽑을 값어치가 없었다.

// ── 어두운 한 벌 (C·D) ──
// 왜 만드는가: A·B 는 둘 다 분홍/빨강에 귀여운 얼굴 하나여서, 목록에서 스치면
// '꾸미기 게임'으로 읽힌다. 정작 게임 속은 4인 실시간 대전과 거대 보스다.
// 그래서 같은 게임을 '경쟁'으로 소개하는 한 벌을 따로 둔다. 분홍 자산을 버리는 게
// 아니라 골라 쓰는 것이다 (PICK 은 그대로 A).

// C · 4인 대전 — 얼굴 하나가 아니라 넷이 맞선다. 일부러 분홍을 한 톨도 안 쓴다.
const C=await shot(`yt-thumb-C${SUF}.png`,'linear-gradient(165deg,#1b2b52 0%,#2a1440 48%,#0a0714 100%)',
  `<img class="j" src="${J.blue}"  style="left:5%;top:14%;width:13%;transform:rotate(-14deg)">
   <img class="j" src="${J.lime}"  style="right:6%;top:18%;width:12%;transform:rotate(12deg)">
   <img class="j" src="${BOMB}"    style="left:9%;top:52%;width:12%;transform:rotate(16deg)">
   <div class="duo">
     <img class="small smallL" src="${FOUR[1]}"><img class="small smallR" src="${FOUR[3]}">
     <img class="big bigL" src="${FOUR[0]}"><img class="big bigR" src="${FOUR[2]}">
   </div>
   <div class="vs">VS</div>
   <div class="wrap z">
     <div class="sub">${TX('방 코드 네 자리만 보내면','Send a 4-letter code')}</div>
     <h1 style="margin-top:30px;font-size:165px">${TX('넷이<br><em>같은 판</em>','4 players<br><em>one board</em>')}</h1>
     <div class="band">${TX('⚔️ 내가 터트린 게 친구 화면으로','⚔️ What you pop lands on their screen')}</div>
   </div>`,'dark');

// D · 거대 보스 — 게임에서 제일 '만만하지 않은' 그림. 보스를 위에서 내려다보게 크게 둔다.
const D=await shot(`yt-thumb-D${SUF}.png`,'linear-gradient(170deg,#3a0f22 0%,#1c0716 55%,#08030c 100%)',
  `<div class="glow" style="left:6%;top:30%;width:88%;height:46%;background:rgba(255,45,85,.42)"></div>
   <img class="cut" src="${BOSS}" style="left:50%;transform:translateX(-50%);top:28%;width:96%">
   <img class="j" src="${J.gold}" style="left:7%;top:24%;width:12%;transform:rotate(-16deg)">
   <img class="j" src="${J.mint}" style="right:7%;top:27%;width:11%;transform:rotate(14deg)">
   <img class="cut" src="${BUNNY2}" style="left:3%;top:63%;width:40%">
   <div class="wrap z">
     <h1 style="font-size:170px">${TX('거대 보스<br><em>등장</em>','<em>Giant boss</em><br>incoming')}</h1>
     <div class="sub" style="margin-top:22px">${TX('레벨 오를 때마다 더 커집니다','It grows every few levels')}</div>
     <div class="band" style="background:rgba(226,33,63,.94);border-color:rgba(255,225,77,.55)">${
       TX('🩸 금 갈 때까지 두드려요','🩸 Crack it before it lands')}</div>
   </div>`,'dark');

// ── 쇼츠 목록에 끼워 본 미리보기 ──
// 표지는 혼자 볼 때가 아니라 '남의 영상들 사이에서 스크롤될 때' 눈에 걸려야 한다.
const feed=await (await browser.newContext({viewport:{width:1180,height:1050},deviceScaleFactor:1})).newPage();
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
 h3{font-size:14px;margin:20px 0 10px;color:#606060}
</style>
<h2>${TX('▶ 쇼츠 — 다른 영상들 사이에서 이렇게 보입니다','▶ Shorts — how it looks next to other videos')}</h2>
<h3>${TX('분홍 한 벌 (A · B)','Pink set (A · B)')}</h3>
<div class="row">
  ${card('https://dummyimage.com/210x373/6b7cff/fff&text=+',TX('다른 게임 영상','Another game'))}
  ${card(A,TX('귀엽다고 얕보지 마세요 10초도 못 버팀','It looks cute. You will not last 10 seconds'))}
  ${card('https://dummyimage.com/210x373/2ecf8f/fff&text=+',TX('다른 게임 영상','Another game'))}
  ${card(B,TX('젤리모 — 설치 없이 3분이면 한 판','Jellimo — no install, 3-minute rounds'))}
  ${card('https://dummyimage.com/210x373/ff9f43/fff&text=+',TX('다른 게임 영상','Another game'))}
</div>
<h3>${TX('어두운 한 벌 (C · D) — 대전·보스를 앞세운 쪽','Dark set (C · D) — versus and boss first')}</h3>
<div class="row">
  ${card('https://dummyimage.com/210x373/6b7cff/fff&text=+',TX('다른 게임 영상','Another game'))}
  ${card(C,TX('넷이 같은 판 — 방 코드 네 자리만 보내면','4 players, one board — send a 4-letter code'))}
  ${card('https://dummyimage.com/210x373/2ecf8f/fff&text=+',TX('다른 게임 영상','Another game'))}
  ${card(D,TX('거대 보스 등장 — 금 갈 때까지 두드려요','Giant boss incoming — crack it before it lands'))}
  ${card('https://dummyimage.com/210x373/ff9f43/fff&text=+',TX('다른 게임 영상','Another game'))}
</div>`);
await feed.waitForTimeout(500);
writeFileSync(join(OUT,`yt-thumb-feed${SUF}.png`), await feed.screenshot({type:'png'}));
console.log(`🖼  yt-thumb-feed${SUF}.png  (쇼츠 목록에 끼워 본 모습)`);

// 고른 안 — 문서·안내가 이 이름을 가리킨다. 바꾸려면 PICK 만 고치면 된다.
const PICK=`yt-thumb-A${SUF}.png`;
writeFileSync(join(OUT,`yt-thumb${SUF}.png`), readFileSync(join(OUT,PICK)));
console.log(`⭐ yt-thumb${SUF}.png ← `+PICK+' (실제로 쓸 썸네일)');
await browser.close();

// 스토어 등록용 그림 만들기 — 앱스토어 스크린샷 6장 + 구글플레이 6장 + 대표 이미지·아이콘
//
// 왜 이렇게 만드나
//  · 게임을 실제로 띄워서 진짜 화면을 찍는다. 손으로 그린 목업은 실물과 달라지고,
//    캐릭터·아이템을 고칠 때마다 다시 그려야 한다. 여기서는 게임 코드가 바뀌면
//    이 스크립트만 다시 돌리면 그림이 따라온다.
//  · 찍은 화면을 '설명 문구 + 둥근 액자'로 한 번 더 감싼다(합성도 브라우저에서 한다).
//  · 크기: 앱스토어 6.7인치 1290x2796, 구글플레이 1080x1920, 대표 이미지 1024x500,
//    아이콘 1024x1024. (스토어가 요구하는 크기다 — 바뀌면 SIZES 를 고치면 된다)
//
// 쓰기:  node jelly-shooting/tools/make-store-shots.mjs
// 결과:  jelly-shooting/press/shots/*.png
// playwright 는 이 컨테이너에 전역으로만 깔려 있다. ESM 은 NODE_PATH 를 안 보므로
// 전역 경로를 직접 가리킨다(없으면 그냥 'playwright' 로 시도한다).
import { existsSync } from 'node:fs';
const PW = '/opt/node22/lib/node_modules/playwright/index.js';
const pwMod = await import(existsSync(PW) ? 'file://' + PW : 'playwright');
const chromium = (pwMod.chromium || (pwMod.default && pwMod.default.chromium));
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
// 언어 — node tools/make-store-shots.mjs [--en]
const LANG = process.argv.includes('--en') ? 'en' : 'ko';
const TX = (ko, en) => (LANG === 'en' ? en : ko);
const OUT  = LANG === 'en' ? join(ROOT, 'press', 'shots', 'en') : join(ROOT, 'press', 'shots');
const GAME = 'file://' + join(ROOT, 'index.html');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
mkdirSync(OUT, { recursive: true });

// 찍는 동안만 도는 '다시 그리기' 고리.
// #stage 를 보는 ResizeObserver 가 resize()를 부르면 캔버스 width 가 다시 설정되어
// 그림이 지워진다. 판이 멈춘 상태(running=false)에서는 아무도 다시 안 그리니까
// 젤리가 빠진 빈 판이 찍힌다. 매 프레임 다시 그려서 그 일을 막는다.
const POSE_LOOP = (draw) => `(()=>{ if(window.__poseRAF) cancelAnimationFrame(window.__poseRAF);
  const tick=()=>{ try{ ${draw} }catch(e){} window.__poseRAF=requestAnimationFrame(tick); };
  tick(); return 1; })()`;

// ── 장면 — 게임을 이 상태로 만들고 찍는다 ──
// setup 은 게임 페이지 안에서 도는 코드다(게임의 함수를 그대로 부른다).
// 인스타 카드(make-insta.mjs)도 같은 장면을 쓴다 — 두 벌로 갈라지지 않게 여기서 내보낸다
export const SCENES = [
  { id: '1-play', cap: [TX('톡 터트리면 콤보!','Tap. It pops. Chain it.'), TX('딱 3분, 한 판이면 충분해요','Three minutes is a whole round')], tint: '#ffe3f0',
    setup: `(()=>{
      saveNick(${JSON.stringify(TX('까미','Kami'))}); coins=1240; soundOn=false; bgmOn=false;
      ['heart','slow','clear','x2','magnet'].forEach((id,i)=>{ if(!crafted.includes(id))crafted.push(id);
        bought[id]=[3,2,1,4,2][i]; inventory[id]=[2,1,3,1,2][i]; });
      character.kind='girl'; character.color='#ff9db2'; character.hair='braid';
      character.acc='bow'; character.accColor='#ff5c8a'; saveChar();
      mode='normal'; userMode='normal'; startGame();
      score=8740; combo=7; level=6; lives=3; runCoins=42; updateHud();
      jellies.length=0;
      [[110,150,30,'#ff5c8a'],[240,320,27,'#4fa8ff'],[330,120,32,'#ffce3d'],
       [180,470,29,'#8fd94f'],[300,560,26,'#b96cff'],[80,620,28,'#40dfe6']].forEach(([x,y,r,c],i)=>{
        jellies.push({x,y,r,vx:0,vy:2,color:c,face:['happy','wink','star'][i%3],
          shape:['round','bean','round','bear'][i%4],bomb:false,gold:i===2,pts:20,
          wob:i*1.3,dead:false}); });
      jellies.push({x:400,y:250,r:27,vx:0,vy:2,color:'#4a4450',face:'happy',shape:'round',
        bomb:true,gold:false,pts:20,wob:2,dead:false});
      player.x=200; player.mood='happy'; player.moodTimer=999;
      floater(240,330,'+140','#e63e72'); popCombo();
      running=false; paused=false; render();
      return 1; })()`,
    paint: POSE_LOOP('updateHud(); render();') },
  { id: '2-dungeon', cap: [TX('친구랑 실시간 대전','Live match with friends'), TX('마지막까지 살아남으면 우승','Last one alive wins')], tint: '#e9e2ff',
    setup: `(()=>{
      soundOn=false; bgmOn=false; character.kind='cat'; character.color='#ffb3c9'; saveChar();
      netGame='dungeon'; netModeName='spicy'; mode='spicy'; net.timeLimit=120;
      netMode=true; net.mp=true; net.ch={}; net.peers={}; net.order=[];
      peerUpsert('p1',{name:${JSON.stringify(TX('젤리왕','JellyKing'))},char:{k:'bear',c:'#c9a27a',a:'crown',ac:'#ffce3d'},score:9100,lives:2});
      peerUpsert('p2',{name:${JSON.stringify(TX('하늘','Sky'))},char:{k:'dog',c:'#a3d5ff'},score:6400,lives:3});
      peerUpsert('p3',{name:${JSON.stringify(TX('초코','Choco'))},char:{k:'bunny',c:'#fff0a8'},score:3200,lives:0,over:true});
      net.order.push('p3');
      startGame(); netMode=true; net.mp=true;
      score=11250; combo=9; level=8; lives=3; throwGauge=HEX_MAX; bolt=BOLT_NEED;
      updateHud(); buildHexBar(); updateGauge(); updateFoeHud();
      $('netBar').classList.remove('hide'); $('throwWrap').classList.remove('hide');
      $('itemBar').classList.add('hide');
      jellies.length=0;
      [[120,180,29,'#ff8a5c'],[260,90,31,'#4fa8ff'],[350,300,28,'#ff5c8a'],
       [90,420,27,'#8fd94f'],[300,500,30,'#ffce3d']].forEach(([x,y,r,c],i)=>
        jellies.push({x,y,r,vx:0,vy:3,color:c,face:'happy',shape:i%2?'bean':'round',
          bomb:false,gold:false,pts:20,wob:i,dead:false,foe:i<2}));
      hexT.zig=200; player.x=210; player.mood='wow'; player.moodTimer=999;
      showCallout(${JSON.stringify(TX('🌀 지그재그!','🌀 Zigzag!'))},'#8a5cff');
      running=false; render();
      return 1; })()`,
    paint: POSE_LOOP('render();') },
  { id: '3-throw', cap: [TX('한 명은 던지고','One throws'), TX('한 명은 터트려요','the other pops')], tint: '#ffeede',
    setup: `(()=>{
      soundOn=false; bgmOn=false; character.kind='human'; character.color='#ffe36e';
      character.hair='crop'; character.acc='cap'; character.accColor='#4fa8ff'; saveChar();
      netGame='throw'; hostRole='thrower'; netModeName='normal'; mode='normal';
      net.host=true; computeRole(); net.timeLimit=90;
      net.foe={id:'p1',name:${JSON.stringify(TX('젤리왕','JellyKing'))},char:{k:'bear',c:'#c9a27a',a:'crown',ac:'#ffce3d'}};
      net.peers={}; peerUpsert('p1',{name:${JSON.stringify(TX('젤리왕','JellyKing'))},char:net.foe.char,score:4200,lives:3});
      netMode=true; startThrower();
      throwScore=7400; tCombo=3; tEnergy=88; tKind='bomb'; tSpd=2; elapsed=60*30;
      popStat={score:4200,lives:3,combo:2};
      mirror.length=0;
      [[110,140,28,'#ff5c8a',false],[300,105,27,'#4fa8ff',false],[372,330,27,'#4a4450',true],
       [150,420,29,'#ffce3d',false],[330,470,25,'#8fd94f',false]].forEach(([x,y,r,c,b],i)=>
        mirror.push({netId:i+1,x,y,vx:0,vy:3,r,color:c,face:'happy',shape:'round',
          bomb:b,ghost:false,gold:false,pts:20,wob:i,dead:false,foe:true,pay:1}));
      tMsg={text:${JSON.stringify(TX('🎯 뚫었다! +720  x3','🎯 Broke through! +720  x3'))},color:'#8a5cff',life:1};
      refreshThrowBar(); buildSpdBar();
      mirrorStep(); drawMirror(); drawMyPad(); updateTInfo();
      throwerAlive=false; if(mirrorRAF) cancelAnimationFrame(mirrorRAF);
      return 1; })()`,
    paint: POSE_LOOP('drawMirror(); drawMyPad();') },
  { id: '4-dress', cap: [TX('내 캐릭터 꾸미기','Make your own jelly'), TX('머리·악세서리·색깔 마음대로','Hair, skin tone, colour, accessories')], tint: '#ffe9f4',
    setup: `(()=>{
      soundOn=false; coins=12400; saveNick(${JSON.stringify(TX('까미','Kami'))});
      ownedKinds=['cat','dog','bunny','bear','human','girl'];
      ownedHairs=HAIRS.map(h=>h.id);
      if(!customAccs.length){ const a={id:'ca_demo',label:${JSON.stringify(TX('별하늘','Starry'))},emoji:'⭐',color:'#8a5cff'};
        customAccs.push(a); ACCS.push({id:a.id,label:a.emoji+' '+a.label,custom:true}); }
      character.kind='girl'; character.color='#ff9db2'; character.hair='braid';
      character.acc='crown'; character.accColor='#ffce3d'; saveChar(); saveEconomy();
      openProfile('startScreen'); buildProfile();
      $('profileScreen').scrollTop=0;
      return 1; })()` },
  { id: '5-result', cap: [TX('이기면 춤추고','Winner dances'), TX('지면 분해해요 😤','loser sulks 😤')], tint: '#f3e6ff',
    setup: `(()=>{
      soundOn=false; saveNick(${JSON.stringify(TX('까미','Kami'))}); net.host=true;
      character.kind='girl'; character.color='#ff9db2'; character.hair='braid';
      character.acc='bow'; character.accColor='#ff5c8a'; saveChar();
      lastPlay={kind:'online',game:'dungeon',role:'thrower'};
      lastRun={seed:1,mode:'normal',score:15200,net:true};
      net.myScore=15200; net.ch={}; net.mp=true; net.myOver=true;
      net.peers={}; net.order=[];
      peerUpsert('p1',{name:${JSON.stringify(TX('젤리왕','JellyKing'))},char:{k:'bear',c:'#c9a27a',a:'crown',ac:'#ffce3d'},score:12800,over:true});
      net.order.push('p1'); net.order.push(myId);
      showScreen('overScreen'); $('finalScore').textContent='15200';
      $('overCoins').textContent='🪙 +86';
      $('overMsg').textContent=${JSON.stringify(TX('⚔️ 실시간 던전 · 🏆 마지막 생존!','⚔️ Live Dungeon · 🏆 Last one alive!'))};
      mpResolve();
      lastBattle.wp='cup'; lastBattle.wf='wow'; lastBattle.lp='cross'; lastBattle.lf='mad';
      lastBattle.win.say=${JSON.stringify(TX('내가 이겼다~!! 🏆','I win!! 🏆'))}; lastBattle.lose.say=${JSON.stringify(TX('분하다… 😤','No fair… 😤'))};
      celebT=96; celebShow(); celebStop();
      const cv=$('celebCanvas'), g=cv.getContext('2d');
      g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,cv.width,cv.height);
      drawCeleb(g,cv.width,cv.height,96,lastBattle,false);
      clearOverLock(); $('overActions').classList.remove('locked');
      $('overGuard').classList.add('hide'); $('overScreen').scrollTop=0;
      return 1; })()`,
    paint: POSE_LOOP(`const cv=$('celebCanvas'), g=cv.getContext('2d');
      g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,cv.width,cv.height);
      drawCeleb(g,cv.width,cv.height,96,lastBattle,false); $('overScreen').scrollTop=0;`) },
  // 보스 컷은 '보스가 있다' 가 아니라 '지금 위험하다' 를 찍어야 한다.
  // 그냥 떠 있는 보스는 구경거리고, 목숨 하나 남았는데 보스가 바닥까지 내려온
  // 순간은 사건이다. 그래서: 목숨 1개 · 체력 거의 그대로 · 보스는 플레이어 코앞 ·
  // 보스가 뿌린 탄이 떨어지는 중 · 화면 흔들림과 붉은 섬광.
  { id: '7-boss', cap: [TX('거대 보스가 내려옵니다','Giant boss incoming'), TX('바닥에 닿기 전에 터트려요','Crack it before it lands')], tint: '#ffd9e2',
    setup: `(()=>{
      saveNick(${JSON.stringify(TX('까미','Kami'))}); coins=1240; soundOn=false; bgmOn=false;
      character.kind='girl'; character.color='#ff9db2'; character.hair='braid';
      character.acc='bow'; character.accColor='#ff5c8a'; saveChar();
      mode='normal'; userMode='normal'; nextEndless=true; startGame();
      endless=true;                       // render() 는 endless 일 때만 보스를 그린다
      score=24160; combo=12; level=15; lives=1; runCoins=118; updateHud();
      jellies.length=0;
      // 보스 — 레벨 15 라 크고, 체력은 거의 안 깎였고, 이미 판 아래쪽까지 내려왔다
      const r=Math.min(W*0.30,104), hp=bossHpFor(level);
      // boss.flash 도 0 이다 — drawBoss 가 flash 만큼 보스 위에 흰 원을 덮는데,
      // 0.35 면 몸이 비쳐 보여서 '유령 같은 보스' 가 됐다. 까맣게 꽉 차야 무섭다.
      boss={x:W*0.5,y:H*0.58,r:r,hp:Math.round(hp*0.82),hpMax:hp,vy:0.6,
            swing:1.2,flash:0,shootT:20,slamT:0,dieT:0};
      // 보스가 뿌린 탄 — 플레이어를 향해 떨어지는 중
      bshots.length=0;
      [[W*0.30,H*0.74,3],[W*0.62,H*0.80,1],[W*0.46,H*0.88,1]].forEach(([x,y,d])=>{
        bshots.push({x:x,y:y,color:d>=3?'#ff2d55':'#ff7d9c',dmg:d,r:d>=3?13:9,t:0}); });
      // 남은 젤리 몇 개 — 이걸 터트려 보스를 때린다(이 게임의 핵심 규칙)
      [[70,150,26,'#ffce3d',true],[330,210,24,'#4fa8ff',false]].forEach(([x,y,rr,c,g],i)=>{
        jellies.push({x,y,r:rr,vx:0,vy:2,color:c,face:'happy',shape:'round',
          bomb:false,gold:g,pts:20,wob:i*1.7,dead:false}); });
      player.x=W*0.46; player.mood='wail'; player.moodTimer=999;
      // 흰 섬광(flash)은 넣지 않는다 — 화면 전체를 하얗게 덮어서 정작 주인공인
      // 보스가 씻겨 나갔다. 위기감은 목숨 1개·체력 띠·떨어지는 탄이 이미 만든다.
      // 배너도 안 띄운다 — 영어 문장이 한국어보다 길어서 판 밖으로 넘쳤고,
      // 어차피 같은 말을 위 제목이 하고 있다.
      shake=10; flash=0; banner=null;
      running=false; paused=false; render();
      return 1; })()`,
    paint: POSE_LOOP('updateHud(); render();') },
  { id: '6-home', cap: [TX('설치 없이 웹에서 바로','No install. Just a link.'), TX('계정 하나로 폰·노트북 함께','One account across phone and laptop')], tint: '#e6f3ff',
    setup: `(()=>{
      soundOn=false; coins=12400; saveNick(${JSON.stringify(TX('까미','Kami'))});
      character.kind='cat'; character.color='#ffb3c9'; character.acc='bow';
      character.accColor='#ff5c8a'; saveChar(); saveEconomy();
      openStart(); $('startScreen').scrollTop=0;
      $('dailyBtn').style.display='';
      $('dailyBtn').textContent=${JSON.stringify(TX('🎁 오늘의 보너스 받기 (+100🪙)','🎁 Claim today\'s bonus (+100🪙)'))};
      return 1; })()` },
];

// 스토어가 요구하는 크기 — 게임은 반응형이라 '작은 화면 × 배율' 로 찍으면 딱 맞는다
const SIZES = [
  { id: 'appstore', w: 430, h: 932, scale: 3 },   // 1290x2796 (앱스토어 6.7")
  { id: 'play',     w: 360, h: 640, scale: 3 },   // 1080x1920 (구글플레이)
];

// 합성용 액자 페이지 — 배경 + 문구 + 둥근 액자에 넣은 게임 화면
//
// isMobile 문맥에서는 viewport 메타가 없으면 레이아웃 폭이 980px 로 잡혀서
// 액자가 화면의 44% 만 차지한다(그림 위쪽에만 폰이 작게 박힌 채 아래가 텅 빈다).
// 그래서 메타를 반드시 넣는다.
function framePage({ shot, cap, tint, w, h }) {
  const phW = Math.round(w * 0.80);          // 폰 액자 폭
  const phT = Math.round(h * 0.163);         // 폰 액자 위쪽 — 아래로 0.80h 만큼 내려간다
  return `<!doctype html><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
  html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;
    font-family:'Jua',${TX("'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',", '')}system-ui,sans-serif;}
  .bg{position:absolute;inset:0;background:
    radial-gradient(120% 90% at 15% 0%, #fff 0%, ${tint} 45%, ${tint} 100%);}
  .dots{position:absolute;inset:0;opacity:.5;
    background-image:radial-gradient(rgba(255,255,255,.9) 1.5px, transparent 1.6px);
    background-size:${Math.round(w*0.045)}px ${Math.round(w*0.045)}px;}
  .cap{position:absolute;left:0;right:0;top:${Math.round(h*0.028)}px;height:${Math.round(h*0.125)}px;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:${Math.round(h*0.006)}px;text-align:center;padding:0 ${Math.round(w*0.06)}px;}
  .cap i{font-style:normal;font-size:${Math.round(w*0.038)}px;font-weight:400;
    color:rgba(120,80,110,.62);letter-spacing:.5px;}
  .cap b{font-size:${Math.round(w*0.086)}px;font-weight:400;color:#e6336b;letter-spacing:-.5px;
    line-height:1.15;text-shadow:0 2px 0 #fff, 0 6px 16px rgba(230,60,120,.18);}
  .cap span{font-size:${Math.round(w*0.050)}px;font-weight:400;color:#7c5c8e;}
  .phone{position:absolute;left:50%;transform:translateX(-50%);
    top:${phT}px;width:${phW}px;
    border-radius:${Math.round(w*0.072)}px;overflow:hidden;background:#fff;
    box-shadow:0 ${Math.round(h*0.016)}px ${Math.round(h*0.042)}px rgba(150,70,110,.30),
               0 0 0 ${Math.max(2,Math.round(w*0.006))}px rgba(255,255,255,.95);}
  .phone img{display:block;width:100%;}
  </style>
  <div class="bg"></div><div class="dots"></div>
  <div class="cap"><i>${TX('🍡 젤리모 · Jellimo', '🍡 Jellimo')}</i><b>${cap[0]}</b><span>${cap[1]}</span></div>
  <div class="phone"><img src="${shot}"></div>`;
}

const koLeaks = [];      // 영어판에 남은 한글
const emptyBtns = [];    // 글자 없이 찍힌 단추

const run = async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const made = [];
  for (const size of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h },
      deviceScaleFactor: size.scale, isMobile: true, hasTouch: true,
      locale: LANG === 'en' ? 'en-US' : 'ko-KR' });
    // 게임은 첫 줄에서 저장된 언어를 읽는다 → 페이지가 뜨기 전에 정해 준다
    await ctx.addInitScript(`try{ localStorage.setItem('jelly_lang', ${JSON.stringify(LANG)});
      localStorage.setItem('jelly_tut','1'); }catch(e){}`);
    const page = await ctx.newPage();
    for (const sc of SCENES) {
      await page.goto(GAME);
      await page.waitForFunction("typeof openStart==='function'", null, { timeout: 20000 });
      await page.waitForTimeout(700);
      await page.evaluate(`(()=>{ localStorage.clear();
        try{ localStorage.setItem('jelly_lang', ${JSON.stringify(LANG)});
             localStorage.setItem('jelly_tut','1'); }catch(e){} })()`);
      await page.evaluate(sc.setup);
      await page.waitForTimeout(600);
      const shown = await page.evaluate('lang');
      if (shown !== LANG) { console.error('❌ 화면 언어가 ' + shown + ' 입니다 (원한 건 ' + LANG + ')'); process.exit(1); }
      // 영어판을 찍을 때 화면에 한글이 남아 있으면 알려 준다.
      // (게임 안에 글자를 이어 붙여 만드는 자리가 많아서, 번역을 빠뜨린 곳이 여기서 걸린다)
      if (LANG !== 'ko') {
        const ko = await page.evaluate(`(()=>{
          const out=new Set();
          const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null);
          for(let n=w.nextNode(); n; n=w.nextNode()){
            const t=(n.nodeValue||'').trim();
            if(!/[가-힣]/.test(t)) continue;
            const e=n.parentElement; if(!e||!e.offsetParent) continue;
            out.add(t.slice(0,50));
          }
          return [...out]; })()`);
        if (ko.length) { koLeaks.push(size.id + '/' + sc.id + ': ' + ko.join(' | ')); }
      }
      // 글자가 없는 빈 단추가 찍히면 스토어 그림이 고장난 것처럼 보인다 (실제로 하나 있었다)
      const empty = await page.evaluate(`(()=>[...document.querySelectorAll('button,[class*=btn]')]
        .filter(e=>e.offsetParent && !(e.textContent||'').trim() && !e.querySelector('img,svg,canvas')
                   && e.getBoundingClientRect().height>12 && e.getBoundingClientRect().width>60)
        .map(e=>(e.id||e.className)+' '+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height)))()`);
      if (empty.length) emptyBtns.push(size.id + '/' + sc.id + ': ' + empty.join(', '));
      // 캔버스는 크기가 바뀌면 지워진다. 찍기 바로 전에 다시 그려야 판이 비지 않는다.
      if (sc.paint) { await page.evaluate(sc.paint); await page.waitForTimeout(250); }
      const raw = (await page.screenshot({ type: 'png' })).toString('base64');
      // 액자에 넣어 다시 찍는다
      const fr = await ctx.newPage();
      await fr.setViewportSize({ width: size.w, height: size.h });
      await fr.setContent(framePage({ shot: 'data:image/png;base64,' + raw,
        cap: sc.cap, tint: sc.tint, w: size.w, h: size.h }));
      await fr.evaluate(`(async()=>{ const im=document.querySelector('.phone img');
        if(im&&!im.complete) await im.decode().catch(()=>0);
        if(document.fonts&&document.fonts.ready) await document.fonts.ready; })()`);
      await fr.waitForTimeout(350);
      const name = `${size.id}-${sc.id}.png`;
      writeFileSync(join(OUT, name), await fr.screenshot({ type: 'png' }));
      await fr.close();
      made.push(name + ` (${size.w * size.scale}x${size.h * size.scale})`);
      console.log('📷 ' + name);
    }
    await ctx.close();
  }

  // ── 구글플레이 대표 이미지 1024x500 · 아이콘 1024x1024 ──
  // 새로 그리지 않는다. 게임이 이미 가진 두 그림이 훨씬 예쁘다.
  //   · 대표 이미지 ← og.png (tools/make-og.mjs 가 만든 링크 미리보기 카드, 1200x630)
  //   · 아이콘      ← icon-1024.png (tools/make-icons.mjs 가 만든 게임 아이콘)
  // og.png 은 1200x630, 대표 이미지는 1024x500 이라 비율이 조금 다르다 →
  // 가운데를 기준으로 꽉 채우게(cover) 잘라 넣는다.
  const ctx2 = await browser.newContext({ viewport: { width: 600, height: 400 }, deviceScaleFactor: 1 });
  const fg = await ctx2.newPage();
  await fg.goto('data:text/html,<body></body>');
  const ogB64 = readFileSync(join(ROOT, 'og.png')).toString('base64');
  const feature = await fg.evaluate(async ([src]) => {
    const im = new Image();
    await new Promise((ok, no) => { im.onload = ok; im.onerror = no; im.src = src; });
    const W = 1024, H = 500;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    const s = Math.max(W / im.width, H / im.height);
    const w = im.width * s, h = im.height * s;
    g.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
    return c.toDataURL('image/png').split(',')[1];
  }, ['data:image/png;base64,' + ogB64]);
  writeFileSync(join(OUT, 'play-feature-1024x500.png'), Buffer.from(feature, 'base64'));
  console.log('📷 play-feature-1024x500.png  (og.png 에서)');

  // 소개 페이지 표지로도 쓴다 — press 폴더만 들고 가도 그림이 다 있게
  writeFileSync(join(OUT, 'cover-1200x630.png'), readFileSync(join(ROOT, 'og.png')));
  console.log('📷 cover-1200x630.png  (og.png 그대로 · 소개 페이지 표지)');

  const iconSrc = join(ROOT, 'icon-1024.png');
  if (existsSync(iconSrc)) {
    writeFileSync(join(OUT, 'icon-1024.png'), readFileSync(iconSrc));
    console.log('📷 icon-1024.png  (게임 아이콘 그대로)');
  } else {
    console.log('⚠ icon-1024.png 이 없습니다 — 먼저 node tools/make-icons.mjs 를 돌려주세요');
  }
  await ctx2.close();
  await browser.close();
  if (koLeaks.length) {
    console.log('\n❌ 영어 화면에 한글이 남아 있습니다 (' + koLeaks.length + '군데):');
    for (const l of koLeaks) console.log('   · ' + l);
  } else if (LANG !== 'ko') console.log('\n✅ 영어 화면에 남은 한글 없음');
  if (emptyBtns.length) {
    console.log('\n⚠ 글자 없는 단추가 찍혔습니다 (' + emptyBtns.length + '군데):');
    for (const l of emptyBtns) console.log('   · ' + l);
  }
  console.log('\n총 ' + (made.length + 2) + '장 → press/shots/');
};
// 다른 파일이 SCENES 만 가져다 쓸 때는 찍지 않는다 (직접 실행할 때만 돈다)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  run().catch(e => { console.error('실패:', e.message); process.exit(1); });

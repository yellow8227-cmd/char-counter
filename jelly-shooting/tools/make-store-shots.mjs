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
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT  = join(ROOT, 'press', 'shots');
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
const SCENES = [
  { id: '1-play', cap: ['톡 터트리면 콤보!', '딱 3분, 한 판이면 충분해요'], tint: '#ffe3f0',
    setup: `(()=>{
      saveNick('까미'); coins=1240; soundOn=false; bgmOn=false;
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
  { id: '2-dungeon', cap: ['친구랑 실시간 대전', '마지막까지 살아남으면 우승'], tint: '#e9e2ff',
    setup: `(()=>{
      soundOn=false; bgmOn=false; character.kind='cat'; character.color='#ffb3c9'; saveChar();
      netGame='dungeon'; netModeName='spicy'; mode='spicy'; net.timeLimit=120;
      netMode=true; net.mp=true; net.ch={}; net.peers={}; net.order=[];
      peerUpsert('p1',{name:'젤리왕',char:{k:'bear',c:'#c9a27a',a:'crown',ac:'#ffce3d'},score:9100,lives:2});
      peerUpsert('p2',{name:'하늘',char:{k:'dog',c:'#a3d5ff'},score:6400,lives:3});
      peerUpsert('p3',{name:'초코',char:{k:'bunny',c:'#fff0a8'},score:3200,lives:0,over:true});
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
      showCallout('🌀 지그재그!','#8a5cff');
      running=false; render();
      return 1; })()`,
    paint: POSE_LOOP('render();') },
  { id: '3-throw', cap: ['한 명은 던지고', '한 명은 터트려요'], tint: '#ffeede',
    setup: `(()=>{
      soundOn=false; bgmOn=false; character.kind='human'; character.color='#ffe36e';
      character.hair='crop'; character.acc='cap'; character.accColor='#4fa8ff'; saveChar();
      netGame='throw'; hostRole='thrower'; netModeName='normal'; mode='normal';
      net.host=true; computeRole(); net.timeLimit=90;
      net.foe={id:'p1',name:'젤리왕',char:{k:'bear',c:'#c9a27a',a:'crown',ac:'#ffce3d'}};
      net.peers={}; peerUpsert('p1',{name:'젤리왕',char:net.foe.char,score:4200,lives:3});
      netMode=true; startThrower();
      throwScore=7400; tCombo=3; tEnergy=88; tKind='bomb'; tSpd=2; elapsed=60*30;
      popStat={score:4200,lives:3,combo:2};
      mirror.length=0;
      [[110,140,28,'#ff5c8a',false],[300,105,27,'#4fa8ff',false],[372,330,27,'#4a4450',true],
       [150,420,29,'#ffce3d',false],[330,470,25,'#8fd94f',false]].forEach(([x,y,r,c,b],i)=>
        mirror.push({netId:i+1,x,y,vx:0,vy:3,r,color:c,face:'happy',shape:'round',
          bomb:b,ghost:false,gold:false,pts:20,wob:i,dead:false,foe:true,pay:1}));
      tMsg={text:'🎯 뚫었다! +720  x3',color:'#8a5cff',life:1};
      refreshThrowBar(); buildSpdBar();
      mirrorStep(); drawMirror(); drawMyPad(); updateTInfo();
      throwerAlive=false; if(mirrorRAF) cancelAnimationFrame(mirrorRAF);
      return 1; })()`,
    paint: POSE_LOOP('drawMirror(); drawMyPad();') },
  { id: '4-dress', cap: ['내 캐릭터 꾸미기', '머리·악세서리·색깔 마음대로'], tint: '#ffe9f4',
    setup: `(()=>{
      soundOn=false; coins=12400; saveNick('까미');
      ownedKinds=['cat','dog','bunny','bear','human','girl'];
      ownedHairs=HAIRS.map(h=>h.id);
      if(!customAccs.length){ const a={id:'ca_demo',label:'별하늘',emoji:'⭐',color:'#8a5cff'};
        customAccs.push(a); ACCS.push({id:a.id,label:a.emoji+' '+a.label,custom:true}); }
      character.kind='girl'; character.color='#ff9db2'; character.hair='braid';
      character.acc='crown'; character.accColor='#ffce3d'; saveChar(); saveEconomy();
      openProfile('startScreen'); buildProfile();
      $('profileScreen').scrollTop=0;
      return 1; })()` },
  { id: '5-result', cap: ['이기면 춤추고', '지면 분해해요 😤'], tint: '#f3e6ff',
    setup: `(()=>{
      soundOn=false; saveNick('까미'); net.host=true;
      character.kind='girl'; character.color='#ff9db2'; character.hair='braid';
      character.acc='bow'; character.accColor='#ff5c8a'; saveChar();
      lastPlay={kind:'online',game:'dungeon',role:'thrower'};
      lastRun={seed:1,mode:'normal',score:15200,net:true};
      net.myScore=15200; net.ch={}; net.mp=true; net.myOver=true;
      net.peers={}; net.order=[];
      peerUpsert('p1',{name:'젤리왕',char:{k:'bear',c:'#c9a27a',a:'crown',ac:'#ffce3d'},score:12800,over:true});
      net.order.push('p1'); net.order.push(myId);
      showScreen('overScreen'); $('finalScore').textContent='15200';
      $('overCoins').textContent='🪙 +86';
      $('overMsg').textContent='⚔️ 실시간 던전 · 🏆 마지막 생존!';
      mpResolve();
      lastBattle.wp='cup'; lastBattle.wf='wow'; lastBattle.lp='cross'; lastBattle.lf='mad';
      lastBattle.win.say='내가 이겼다~!! 🏆'; lastBattle.lose.say='분하다… 😤';
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
  { id: '6-home', cap: ['설치 없이 웹에서 바로', '계정 하나로 폰·노트북 함께'], tint: '#e6f3ff',
    setup: `(()=>{
      soundOn=false; coins=12400; saveNick('까미');
      character.kind='cat'; character.color='#ffb3c9'; character.acc='bow';
      character.accColor='#ff5c8a'; saveChar(); saveEconomy();
      openStart(); $('startScreen').scrollTop=0;
      $('dailyBtn').style.display='';
      $('dailyBtn').textContent='🎁 오늘의 보너스 받기 (+100🪙)';
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
    font-family:'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',system-ui,sans-serif;}
  .bg{position:absolute;inset:0;background:
    radial-gradient(120% 90% at 15% 0%, #fff 0%, ${tint} 45%, ${tint} 100%);}
  .dots{position:absolute;inset:0;opacity:.5;
    background-image:radial-gradient(rgba(255,255,255,.9) 1.5px, transparent 1.6px);
    background-size:${Math.round(w*0.045)}px ${Math.round(w*0.045)}px;}
  .cap{position:absolute;left:0;right:0;top:${Math.round(h*0.028)}px;height:${Math.round(h*0.125)}px;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:${Math.round(h*0.006)}px;text-align:center;padding:0 ${Math.round(w*0.06)}px;}
  .cap i{font-style:normal;font-size:${Math.round(w*0.038)}px;font-weight:900;
    color:rgba(120,80,110,.62);letter-spacing:.5px;}
  .cap b{font-size:${Math.round(w*0.079)}px;font-weight:900;color:#e6336b;letter-spacing:-.5px;
    line-height:1.15;text-shadow:0 2px 0 #fff, 0 6px 16px rgba(230,60,120,.18);}
  .cap span{font-size:${Math.round(w*0.048)}px;font-weight:800;color:#7c5c8e;}
  .phone{position:absolute;left:50%;transform:translateX(-50%);
    top:${phT}px;width:${phW}px;
    border-radius:${Math.round(w*0.072)}px;overflow:hidden;background:#fff;
    box-shadow:0 ${Math.round(h*0.016)}px ${Math.round(h*0.042)}px rgba(150,70,110,.30),
               0 0 0 ${Math.max(2,Math.round(w*0.006))}px rgba(255,255,255,.95);}
  .phone img{display:block;width:100%;}
  </style>
  <div class="bg"></div><div class="dots"></div>
  <div class="cap"><i>🍡 젤리슈팅 · Jelly Shooting</i><b>${cap[0]}</b><span>${cap[1]}</span></div>
  <div class="phone"><img src="${shot}"></div>`;
}

const run = async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const made = [];
  for (const size of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h },
      deviceScaleFactor: size.scale, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    for (const sc of SCENES) {
      await page.goto(GAME);
      await page.waitForFunction("typeof openStart==='function'", null, { timeout: 20000 });
      await page.waitForTimeout(700);
      await page.evaluate(`localStorage.clear()`);
      await page.evaluate(sc.setup);
      await page.waitForTimeout(600);
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
  const ctx2 = await browser.newContext({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
  const fg = await ctx2.newPage();
  await fg.goto(GAME);
  await fg.waitForFunction("typeof openStart==='function'", null, { timeout: 20000 });
  // 캐릭터 여섯 종을 한 줄로 세운 배너 — 게임의 drawAvatar 를 그대로 쓴다
  const banner = await fg.evaluate(`(()=>{
    const W=1024,H=500,c=document.createElement('canvas'); c.width=W;c.height=H;
    const g=c.getContext('2d');
    const bg=g.createLinearGradient(0,0,W,H);
    bg.addColorStop(0,'#ffd9ea'); bg.addColorStop(0.5,'#ffe9f4'); bg.addColorStop(1,'#e2d9ff');
    g.fillStyle=bg; g.fillRect(0,0,W,H);
    for(let i=0;i<26;i++){ const x=(i*137)%W, y=(i*211)%H, r=8+(i%4)*7;
      g.fillStyle='rgba(255,255,255,'+(0.18+(i%3)*0.08)+')';
      g.beginPath(); g.arc(x,y,r,0,7); g.fill(); }
    // 떨어지는 젤리 — drawJelly 는 전역 ctx 에 그린다. withCtx 로 이 캔버스로 돌려야 한다
    // (안 그러면 젤리가 게임 판에 그려지고 배너는 텅 빈다)
    const pal=['#ff5c8a','#4fa8ff','#ffce3d','#8fd94f','#b96cff','#40dfe6'];
    withCtx(g,()=>{
      [[62,96,30],[196,44,24],[958,86,28],[886,296,25],[520,44,21],[74,404,23],[978,432,26]]
        .forEach(([x,y,r],i)=> drawJelly({x:x,y:y,r:r,color:pal[i%pal.length],face:(i%2?'happy':'wink'),
          shape:i%2?'bean':'round',bomb:false,gold:i===2,wob:i*1.7,dead:false})); });
    // 캐릭터 여섯 종을 한 줄로 — 게임의 drawAvatar 를 그대로 쓴다
    const KS=[['bunny','#fff0a8','none'],['dog','#a3d5ff','cap'],['bear','#c9a27a','crown'],
              ['human','#ffe36e','glasses'],['girl','#ff9db2','bow'],['cat','#ffb3c9','flower']];
    KS.forEach(([k,col,acc],i)=>{
      const x=172+i*136, R=54;
      drawAvatar(g,x,356,R,charSafe({k:k,c:col,a:acc,ac:'#ff5c8a',h:(k==='girl'?'braid':'basic')}),
        (i%2?'happy':'wow'),i*7);
    });
    g.textAlign='center'; g.textBaseline='middle';
    g.font='900 92px "Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif';
    g.lineWidth=14; g.strokeStyle='#fff';
    g.strokeText('젤리슈팅',512,124);
    g.fillStyle='#e6336b'; g.fillText('젤리슈팅',512,124);
    g.font='900 38px "Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif';
    g.strokeStyle='rgba(255,255,255,0.95)'; g.lineWidth=9;
    g.strokeText('톡 터트리는 3분 · 친구랑 실시간 대전',512,204);
    g.fillStyle='#7c5c8e'; g.fillText('톡 터트리는 3분 · 친구랑 실시간 대전',512,204);
    return c.toDataURL('image/png').split(',')[1]; })()`);
  writeFileSync(join(OUT, 'play-feature-1024x500.png'), Buffer.from(banner, 'base64'));
  console.log('📷 play-feature-1024x500.png');

  const icon = await fg.evaluate(`(()=>{
    const S=1024,c=document.createElement('canvas'); c.width=c.height=S;
    const g=c.getContext('2d');
    const bg=g.createLinearGradient(0,0,S,S);
    bg.addColorStop(0,'#ffd0e4'); bg.addColorStop(1,'#ffb3d1');
    g.fillStyle=bg; g.fillRect(0,0,S,S);
    for(let i=0;i<18;i++){ g.fillStyle='rgba(255,255,255,0.22)';
      g.beginPath(); g.arc((i*173)%S,(i*281)%S,26+(i%3)*14,0,7); g.fill(); }
    // 아이콘은 사방에 여백이 있어야 한다 — 스토어가 모서리를 깎고 작게 줄여 보여준다.
    // 악세서리는 한쪽으로 삐져나와 가운데가 어긋나 보이니 넣지 않는다.
    withCtx(g,()=>drawJelly({x:S*0.5,y:S*0.815,r:S*0.115,color:'#ff5c8a',face:'happy',
      shape:'round',bomb:false,gold:false,wob:1.2,dead:false}));
    drawAvatar(g,S/2,S*0.44,S*0.27,charSafe({k:'cat',c:'#ffb3c9',a:'none'}),'happy',12);
    return c.toDataURL('image/png').split(',')[1]; })()`);
  writeFileSync(join(OUT, 'icon-1024.png'), Buffer.from(icon, 'base64'));
  console.log('📷 icon-1024.png');
  await ctx2.close();
  await browser.close();
  console.log('\n총 ' + (made.length + 2) + '장 → press/shots/');
};
run().catch(e => { console.error('실패:', e.message); process.exit(1); });

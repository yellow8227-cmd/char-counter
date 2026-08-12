// 아이폰 안전영역 검사.
// 헤드리스 크로미움은 env(safe-area-inset-*)를 늘 0으로 준다. 그래서 --sat/--sab 토큰을
// 실제 아이폰 값(위 47px · 아래 34px)으로 덮어쓰고, '누를 수 있는 것'이 그 띠 안에
// 들어가는지 본다. 띠 안에 있으면 iOS가 터치를 먼저 먹어 눌러도 반응이 없다.
import { spawn } from 'node:child_process'; import { readdirSync, existsSync } from 'node:fs'; import { join, resolve, dirname } from 'node:path'; import { fileURLToPath } from 'node:url';
const TARGET=resolve(process.argv[2]||join(dirname(fileURLToPath(import.meta.url)),'..','index.html'));
const root='/opt/pw-browsers'; let chrome=null;
for(const d of readdirSync(root)) if(d.startsWith('chromium')){ const p=join(root,d,'chrome-linux/chrome'); if(existsSync(p)){chrome=p;break;} }
const PORT=9677; const proc=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--remote-debugging-port='+PORT,'--remote-allow-origins=*','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let url=null; for(let i=0;i<60;i++){ try{ const l=await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); const p=l.find(t=>t.type==='page'); if(p?.webSocketDebuggerUrl){url=p.webSocketDebuggerUrl;break;} }catch{} await sleep(200); }
const ws=new WebSocket(url); await new Promise(r=>ws.addEventListener('open',r));
let id=0; const w=new Map();
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&w.has(m.id)){w.get(m.id)(m.result);w.delete(m.id);}});
const send=(m,p={})=>new Promise(r=>{const n=++id;w.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}));});
const evl=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true}); if(r.exceptionDetails)console.log('!!',r.exceptionDetails.text,(r.exceptionDetails.exception||{}).description); return r.result&&r.result.value;};
await send('Page.enable');
console.log('검사 대상: '+TARGET+'\n');

// 기종마다 화면 크기와 안전영역이 다르다. 그리고 '홈 화면에 추가'한 상태(standalone)와
// 사파리 안에서 여는 상태가 또 다르다 —
//   standalone : env(safe-area-inset-*) 가 진짜 값(위 47~59 · 아래 34)
//   사파리 안   : env() 는 0 이고, 대신 주소창·툴바가 그 자리를 쓴다. 화면 맨 위·맨 아래를
//                누르면 iOS 가 그 터치를 먼저 먹으므로 버튼을 거기 두면 안 눌린다.
//                (아이폰 14프로 사파리에서 '나가기가 안 눌린다'가 이것이었다)
// 사파리 안은 보이는 높이도 줄어든다(주소창 ~50 + 툴바 ~48).
const EDGE=14;                       // 브라우저에서 위·아래로 최소 이만큼은 비워 둬야 한다
const DEVICES=[
  {n:'아이폰 SE (홈화면)',      w:375, h:667, sat:20, sab:0,  browser:false},
  {n:'아이폰 14프로 (홈화면)',  w:393, h:852, sat:59, sab:34, browser:false},
  {n:'아이폰 14프로 (사파리)',  w:393, h:754, sat:0,  sab:0,  browser:true},
  {n:'아이폰 17프로 (사파리)',  w:402, h:776, sat:0,  sab:0,  browser:true},
  {n:'아이폰 14프로맥스(홈화면)',w:430, h:932, sat:59, sab:34, browser:false},
  // '확대 표시(Display Zoom)' 를 켜면 화면 폭이 이렇게 좁아진다. 무기 줄이 화면 밖으로
  // 밀려나 있던 것이 이 폭이었다.
  {n:'확대 표시 켠 폰 (사파리)', w:306, h:660, sat:0,  sab:0,  browser:true},
];
let SAT=47, SAB=34, BROWSER=false;
// --satmin/--sabmin 은 일부러 건드리지 않는다. 헤드리스 크로미움 자체가
// display-mode:browser 이므로 index.html 의 @media 규칙이 그대로 걸린다 —
// 그래야 '실제로 배포되는 CSS'를 검사하는 것이 된다(검사기가 값을 넣어 주면 거짓 통과다).
const SET=()=>`document.documentElement.style.setProperty('--sat','${SAT}px');
  document.documentElement.style.setProperty('--sab','${SAB}px');`
  +(BROWSER?'':`document.documentElement.style.setProperty('--satmin','0px');
    document.documentElement.style.setProperty('--sabmin','0px');`);
// 안전영역 침범 검사 — 화면에 보이는 '누르는 것' 전부
// 안전영역 침범 검사. band='top'|'bot'
// 스크롤되는 메뉴는 위/아래를 각각 '가장 불리한 스크롤 위치'에서 봐야 한다.
// 맨 위로 올린 상태에서 위 띠에 걸리면 영원히 못 누르고, 맨 아래로 내린 상태에서
// 아래 띠에 걸리면 그것도 못 누른다. 그 반대는 스크롤로 꺼낼 수 있으니 문제가 아니다.
const CHECK=band=>`(()=>{const bad=[], H=innerHeight;
  // 브라우저 안이면 env() 가 0 이라 '안전영역'이 없다 — 대신 위·아래 끝 EDGE px 을 금지대로 본다
  const TOPB=${BROWSER}?${EDGE}:${SAT}, BOTB=${BROWSER}?12:${SAB};
  document.querySelectorAll('button,canvas,input,.roomrow,#foeHud .fp').forEach(el=>{
    if(!el.offsetParent&&el.tagName!=='CANVAS') return;
    const r=el.getBoundingClientRect();
    if(r.width<4||r.height<4) return;
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden'||cs.pointerEvents==='none') return;
    if(r.bottom<0||r.top>H) return;
    const name=(el.id?'#'+el.id:el.className&&typeof el.className==='string'?'.'+el.className.split(' ')[0]:el.tagName)
      +(el.textContent&&el.textContent.trim()?' "'+el.textContent.trim().slice(0,10)+'"':'');
    const topIn=Math.min(r.bottom,TOPB)-Math.max(r.top,0);
    const botIn=Math.min(r.bottom,H)-Math.max(r.top,H-BOTB);
    if('${band}'==='top'&&topIn>3) bad.push(name+' 위 '+Math.round(topIn)+'px 걸림');
    if('${band}'==='bot'&&botIn>3) bad.push(name+' 아래 '+Math.round(botIn)+'px 걸림');
  });
  return bad;})()`;
// 위 버튼(🏳️·🔊🎵)과 같은 줄에 놓인 칩이 겹치지 않는가 — 진짜 기기 폭에서 본다.
// 칩을 버튼 사이에 넣어 판을 넓혔으므로, 좁은 폰에서 겹치지 않는지가 중요해졌다.
const OVERLAP=`(()=>{const bad=[];
  const btns=[...document.querySelectorAll('#topRow button')].filter(b=>b.offsetParent);
  document.querySelectorAll('#hud .statrow.topline .stat, #lifeLine .stat').forEach(c=>{
    if(!c.offsetParent) return; const cr=c.getBoundingClientRect();
    btns.forEach(b=>{ const br=b.getBoundingClientRect();
      const ox=Math.min(cr.right,br.right)-Math.max(cr.left,br.left);
      const oy=Math.min(cr.bottom,br.bottom)-Math.max(cr.top,br.top);
      if(ox>2&&oy>2) bad.push((b.id||'단추')+' ↔ "'+c.textContent.trim().slice(0,7)+'" '+Math.round(ox)+'px 겹침'); }); });
  return bad;})()`;

// 가로로 화면을 넘어가는 줄이 있는가 — 무기 줄이 좁은 폰에서 첫 칩을 화면 밖(-48px)으로
// 밀어내고 있었다. 눈에 보이는 것만 본다.
const SPILL=`(()=>{const bad=[];
  document.querySelectorAll('#hexGrid,#itemBar,#hud .statrow,#lifeLine,#topRow').forEach(row=>{
    if(!row.offsetParent) return;
    [...row.children].forEach(c=>{ if(!c.offsetParent) return;
      const r=c.getBoundingClientRect();
      if(r.width<4) return;
      if(r.left<-1||r.right>innerWidth+1)
        bad.push('#'+(row.id||row.className)+' 의 "'+(c.textContent.trim().slice(0,6)||c.tagName)
          +'" 가 화면 밖 ('+Math.round(r.left)+'~'+Math.round(r.right)+' / 화면 0~'+innerWidth+')'); }); });
  return bad;})()`;

const SCROLL=to=>`(()=>{const sc=[...document.querySelectorAll('.screen')].find(e=>!e.classList.contains('hide'));
  if(sc) sc.scrollTop=(${to==='top'}?0:sc.scrollHeight);})()`;

const STATES=[
  {n:'시작 화면', s:`saveNick('까미'); openStart();`},
  {n:'준비하기',  s:`openSetup();`},
  {n:'혼자 게임', s:`inventory={slow:3,bomb:2,x2:1}; openStart(); mode='normal'; userMode='normal';
      showScreen(null); startGame(); updateHud(); buildItemBar();`},
  {n:'4명 대전',  s:`netMode=true; netGame='dungeon'; netModeName='normal'; aiOn=false;
      peerUpsert('P1',{name:'하늘'}); peerUpsert('P2',{name:'초코'}); peerUpsert('P3',{name:'몽이'});
      showScreen(null); startGame(); net.peers.P1.lives=2; net.peers.P2.lives=1; net.peers.P3.lives=3;
      updateHud(); updateFoeHud(); updateGauge(); buildHexBar();`},
  {n:'던지는 사람(폰)', s:`netMode=true; netGame='throw'; myRole='thrower'; netModeName='normal';
      peerUpsert('P1',{name:'친구'}); showScreen(null); startThrower();`},
  {n:'일시정지',  s:`showScreen('pauseScreen');`},
  {n:'결과 화면', s:`showScreen('overScreen');`},
];
let fails=0;
for(const dv of DEVICES){
  SAT=dv.sat; SAB=dv.sab; BROWSER=dv.browser;
  console.log('── '+dv.n+' '+dv.w+'x'+dv.h+(dv.browser?' (env()=0, 위아래 끝 '+EDGE+'px 금지)':' (안전영역 위 '+SAT+' 아래 '+SAB+')'));
  let devFail=0;
  for(const st of STATES){
    await send('Emulation.setDeviceMetricsOverride',{width:dv.w,height:dv.h,deviceScaleFactor:2,mobile:true});
    await send('Page.navigate',{url:'file://'+TARGET});
    // 고정 시간으로 기다리면 첫 기기에서 'saveNick is not defined' 가 나며 헛 실패했다.
    // 게임이 준비됐는지(함수가 생겼는지) 직접 확인하고 넘어간다.
    for(let i=0;i<60;i++){
      if(await evl(`typeof openStart==='function'&&typeof saveNick==='function'&&!!document.getElementById('stage')`)) break;
      await sleep(120); }
    await sleep(250);
    await evl(SET()+`supaReady=()=>true;`);
    await evl(st.s); await sleep(380);
    await evl(SCROLL('top')); await sleep(220);
    const badTop=await evl(CHECK('top'));
    await evl(SCROLL('bot')); await sleep(220);
    const badBot=await evl(CHECK('bot'));
    const inGame=(st.n==='혼자 게임'||st.n==='4명 대전');
    const badOv=inGame?(await evl(OVERLAP)||[]):[];
    const badSp=inGame?(await evl(SPILL)||[]):[];
    const bad=(badTop||[]).concat(badBot||[]).concat(badOv).concat(badSp);
    if(bad.length){ fails+=bad.length; devFail+=bad.length; console.log('   ❌ '+st.n+'\n      '+bad.join('\n      ')); }
  }
  if(!devFail) console.log('   ✅ '+STATES.length+'개 화면 모두 통과');
}
console.log(fails? ('총 '+fails+'건'):'전부 통과');
ws.close(); proc.kill();
process.exitCode=fails?1:0;

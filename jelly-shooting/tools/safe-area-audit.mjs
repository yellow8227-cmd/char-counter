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

const SAT=47, SAB=34;
const SET=`document.documentElement.style.setProperty('--sat','${SAT}px');
  document.documentElement.style.setProperty('--sab','${SAB}px');`;
// 안전영역 침범 검사 — 화면에 보이는 '누르는 것' 전부
// 안전영역 침범 검사. band='top'|'bot'
// 스크롤되는 메뉴는 위/아래를 각각 '가장 불리한 스크롤 위치'에서 봐야 한다.
// 맨 위로 올린 상태에서 위 띠에 걸리면 영원히 못 누르고, 맨 아래로 내린 상태에서
// 아래 띠에 걸리면 그것도 못 누른다. 그 반대는 스크롤로 꺼낼 수 있으니 문제가 아니다.
const CHECK=band=>`(()=>{const bad=[], H=innerHeight;
  document.querySelectorAll('button,canvas,input,.roomrow,#foeHud .fp').forEach(el=>{
    if(!el.offsetParent&&el.tagName!=='CANVAS') return;
    const r=el.getBoundingClientRect();
    if(r.width<4||r.height<4) return;
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden'||cs.pointerEvents==='none') return;
    if(r.bottom<0||r.top>H) return;
    const name=(el.id?'#'+el.id:el.className&&typeof el.className==='string'?'.'+el.className.split(' ')[0]:el.tagName)
      +(el.textContent&&el.textContent.trim()?' "'+el.textContent.trim().slice(0,10)+'"':'');
    const topIn=Math.min(r.bottom,${SAT})-Math.max(r.top,0);
    const botIn=Math.min(r.bottom,H)-Math.max(r.top,H-${SAB});
    if('${band}'==='top'&&topIn>3) bad.push(name+' 위 안전영역 '+Math.round(topIn)+'px');
    if('${band}'==='bot'&&botIn>3) bad.push(name+' 아래 안전영역 '+Math.round(botIn)+'px');
  });
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
      updateHud(); updateFoeHud(); updateGauge();`},
  {n:'던지는 사람(폰)', s:`netMode=true; netGame='throw'; myRole='thrower'; netModeName='normal';
      peerUpsert('P1',{name:'친구'}); showScreen(null); startThrower();`},
  {n:'일시정지',  s:`showScreen('pauseScreen');`},
  {n:'결과 화면', s:`showScreen('overScreen');`},
];
let fails=0;
for(const st of STATES){
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
  await send('Page.navigate',{url:'file://'+TARGET});
  await sleep(1400);
  await evl(SET+`supaReady=()=>true;`);
  await evl(st.s); await sleep(400);
  await evl(SCROLL('top')); await sleep(250);
  const badTop=await evl(CHECK('top'));
  await evl(SCROLL('bot')); await sleep(250);
  const badBot=await evl(CHECK('bot'));
  const bad=(badTop||[]).concat(badBot||[]);
  if(bad.length){ fails+=bad.length; console.log('❌ '+st.n+'\n   '+bad.join('\n   ')); }
  else console.log('✅ '+st.n+' — 안전영역 침범 없음');
}
console.log(fails? ('총 '+fails+'건'):'전부 통과');
ws.close(); proc.kill();
process.exitCode=fails?1:0;

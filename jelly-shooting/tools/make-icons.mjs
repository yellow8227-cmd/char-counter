// 아이콘 · 공유 카드 이미지 만들기
//
// 왜 도구로 만드는가: 아이콘을 손으로 그려 두면 캐릭터 디자인을 고칠 때마다 어긋난다.
// 게임이 실제로 쓰는 drawAvatar()를 그대로 불러 그리므로 게임 그림과 항상 같다.
//
//   node jelly-shooting/tools/make-icons.mjs
//
// 만들어지는 것 (모두 jelly-shooting/ 안):
//   apple-touch-icon.png   180  아이폰 홈 화면 (없으면 회색 빈 칸이 된다)
//   icon-192.png           192  안드로이드 · manifest
//   icon-512.png           512  안드로이드 · 스플래시
//   icon-maskable-512.png  512  안드로이드 적응형(바깥 20%가 잘리므로 여백을 크게)
//   favicon-32.png          32  브라우저 탭
//   og.png                1200x630  카톡·트위터 링크 미리보기 카드
import { spawn } from 'node:child_process';
import { writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE=dirname(fileURLToPath(import.meta.url));
const ROOT=resolve(HERE,'..');
const TARGET=join(ROOT,'index.html');
const root='/opt/pw-browsers'; let chrome=process.env.CHROME_PATH||null;
if(!chrome) for(const d of readdirSync(root)) if(d.startsWith('chromium')){ const p=join(root,d,'chrome-linux/chrome'); if(existsSync(p)){chrome=p;break;} }
const PORT=9701; const proc=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--remote-debugging-port='+PORT,'--remote-allow-origins=*','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let url=null; for(let i=0;i<60;i++){ try{ const l=await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); const p=l.find(t=>t.type==='page'); if(p?.webSocketDebuggerUrl){url=p.webSocketDebuggerUrl;break;} }catch{} await sleep(200); }
const ws=new WebSocket(url); await new Promise(r=>ws.addEventListener('open',r));
let id=0; const wait=new Map();
ws.addEventListener('message',e=>{const m=JSON.parse(e.data); if(m.id&&wait.has(m.id)){wait.get(m.id)(m.result);wait.delete(m.id);}});
const send=(m,p={})=>new Promise(r=>{const n=++id;wait.set(n,r);ws.send(JSON.stringify({id:n,method:m,params:p}));});
const evl=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails) throw new Error(r.exceptionDetails.text+' '+((r.exceptionDetails.exception||{}).description||''));
  return r.result&&r.result.value;};
await send('Page.enable');
await send('Page.navigate',{url:'file://'+TARGET});
await sleep(1800);

// 게임 안에서 그린다 — drawAvatar / shade / jellyGrad 전부 그 창의 것을 그대로 쓴다.
const DRAW=`(()=>{
  // 대표 캐릭터는 늘 같아야 한다. 상점에서 뭘 골라 놨든 아이콘은 분홍 고양이+리본.
  const ICON={kind:'cat',color:'#ffb3c9',acc:'bow',accColor:'#ff5c8a'};
  function bg(g,w,h){
    const lg=g.createLinearGradient(0,0,w*0.35,h);
    lg.addColorStop(0,'#ffe3f1'); lg.addColorStop(0.55,'#f0e8ff'); lg.addColorStop(1,'#dff6ef');
    g.fillStyle=lg; g.fillRect(0,0,w,h);
    // 게임 배경의 흐린 방울 — 밋밋하지 않게
    [[0.16,0.20,0.20],[0.86,0.30,0.14],[0.24,0.84,0.17],[0.78,0.80,0.11]].forEach(([x,y,r])=>{
      const R=Math.min(w,h)*r, rg=g.createRadialGradient(w*x,h*y,0,w*x,h*y,R);
      rg.addColorStop(0,'rgba(255,255,255,0.75)'); rg.addColorStop(1,'rgba(255,255,255,0)');
      g.fillStyle=rg; g.beginPath(); g.arc(w*x,h*y,R,0,7); g.fill();
    });
  }
  function make(w,h,fn){
    const c=document.createElement('canvas'); c.width=w; c.height=h;
    const g=c.getContext('2d'); bg(g,w,h); fn(g,w,h);
    return c.toDataURL('image/png').split(',')[1];
  }
  const out={};
  // 정사각 아이콘. pad = 캐릭터가 쓰지 않는 여백 비율
  const square=(size,pad)=>make(size,size,(g,w,h)=>{
    drawAvatar(g,w/2,h*0.54,(w/2)*(1-pad),ICON,'idle',0);
  });
  out['apple-touch-icon.png']=square(180,0.20);
  out['icon-192.png']=square(192,0.20);
  out['icon-512.png']=square(512,0.20);
  // 적응형(maskable)은 바깥 20%가 잘려 나간다 → 안쪽 80% 안에 담는다
  out['icon-maskable-512.png']=square(512,0.34);
  out['favicon-32.png']=square(32,0.10);
  // 링크 미리보기 카드
  out['og.png']=make(1200,630,(g,w,h)=>{
    drawAvatar(g,w*0.755,h*0.53,168,ICON,'idle',0);
    g.textAlign='left'; g.textBaseline='alphabetic';
    g.font='900 108px sans-serif';
    g.lineWidth=12; g.lineJoin='round'; g.strokeStyle='rgba(255,255,255,0.95)';
    g.strokeText('젤리슈팅',96,h*0.47); g.fillStyle='#ff4d84'; g.fillText('젤리슈팅',96,h*0.47);
    g.font='800 40px sans-serif';
    g.lineWidth=8; g.strokeText('터질 때마다 도파민 팡팡 🍡',96,h*0.60);
    g.fillStyle='#7a5470'; g.fillText('터질 때마다 도파민 팡팡 🍡',96,h*0.60);
    g.font='800 31px sans-serif';
    g.lineWidth=7; g.strokeText('혼자 하기 · 던지기 대전 · 최대 4명 실시간 던전',96,h*0.72);
    g.fillStyle='#8a5cff'; g.fillText('혼자 하기 · 던지기 대전 · 최대 4명 실시간 던전',96,h*0.72);
  });
  return out;
})()`;
const files=await evl(DRAW);
for(const [name,b64] of Object.entries(files)){
  const buf=Buffer.from(b64,'base64');
  writeFileSync(join(ROOT,name),buf);
  console.log('✅ '+name+'  '+Math.round(buf.length/1024)+'KB');
}
ws.close(); proc.kill();

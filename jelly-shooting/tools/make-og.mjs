// 링크 미리보기 카드(og.png) 만들기
//
//   node jelly-shooting/tools/make-og.mjs
//   node jelly-shooting/tools/make-og.mjs --out /tmp/시험.png     ← 시험 출력(원본을 안 건드린다)
//
// ════════════════════════════════════════════════════════════════════
// 이 그림이 왜 이런 모양인가 (다음에 고칠 사람을 위해)
// ════════════════════════════════════════════════════════════════════
// 결정된 것
//   · 그림에는 글자를 넣지 않는다. 제목·설명은 index.html 의 og:title / og:description 이
//     그림 아래에 붙는다. 그림에 또 쓰면 두 번 겹쳐 촌스러워진다(카카오·트위터 다 그렇다).
//   · 대표 캐릭터는 분홍 고양이 하나만. 여럿 세우면 시선이 갈 곳이 없어진다.
//   · 나머지는 전부 젤리 · 폭탄 · 아이템. 게임에 실제로 있는 것만 쓴다.
//   · 그것들은 '위에서 나에게 쏟아지는 중'이다. 게임이 원래 그런 게임이다.
//
// 입체감(3D)은 다섯 겹으로 만든다 — ball() 참고
//   ① 바닥에 닿는 그림자 (닿는 지점은 진하고 멀어질수록 옅다)
//   ② 빛을 왼쪽 위에 두고 중심을 옮긴 방사 그라데이션  ← 납작해 보이는 이유는 거의 항상 이것
//   ③ 아래쪽 속에서 번지는 빛 (젤리는 빛을 통과시킨다)
//   ④ 아래-오른쪽 림 라이트 + 아래 테두리 그늘 (둘이 짝이어야 '두께'가 보인다)
//   ⑤ 큰 광택 + 점 광택
// 게임의 drawJelly 는 20개가 동시에 굴러가야 해서 이걸 다 못 한다(선형 그라데이션 하나).
// 카드는 한 장뿐이니 여기서만 제대로 그린다.
//
// '날아온다'는 세 가지로 만든다
//   ① 소실점을 화면 위 바깥에 두고, 모든 물체를 그 점에서 뻗는 선 위에 놓는다
//   ② 소실점에 가까울수록 작고, 앞으로 올수록 크다. 거리를 t*t 로 벌려야 '가속'이 보인다
//   ③ 물체마다 소실점을 향하는 잔상을 깐다 ← 없으면 크기만 다른 공을 흩어놓은 그림이 된다
//   그리고 가장 가까운 것은 초점을 흐린다(t>0.88). 눈앞을 지나가는 중이라는 신호.
//
// 시도했다가 버린 것 (다시 하지 말자)
//   · 그림 안에 '젤리토 / 터질 때마다 도파민 팡팡'을 쓰기 → 미리보기 글과 겹쳐 촌스럽다
//   · 캐릭터 6~8명 단체샷 → 얼굴이 서로 가려 누가 주인공인지 안 보인다
//   · 젤리만 3D로 올리고 캐릭터는 게임 그림 그대로 → 캐릭터가 종이처럼 납작해 보여 안 어울린다
//     (그래서 heroCat 에도 같은 그늘·빛·림을 얹는다)
//   · 소실점을 화면 가운데 두기 → 위로 날아간 폭탄이 화면 위에서 잘려 검은 덩어리가 된다
//   · 색종이를 맨 마지막에 화면 전체로 뿌리기 → 눈 위에 붙어 잡티처럼 보인다
//   · 배경 아래를 민트로 끝내기 → 흰 빛살이 얹혀 회색으로 죽는다. 끝까지 따뜻하게.
//
// 고친 뒤 할 일
//   · 배포 주소에 og.png 를 다시 올린다
//   · 이미 보낸 링크의 미리보기는 받는 쪽 캐시다. 주소 끝에 ?v=2 를 붙여 한 번 보내면 갱신된다
// ════════════════════════════════════════════════════════════════════
import { spawn } from 'node:child_process';
import { writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE=dirname(fileURLToPath(import.meta.url));
const ROOT=resolve(HERE,'..');
const TARGET=join(ROOT,'index.html');
const outArg=process.argv.indexOf('--out');
const OUT=outArg>0&&process.argv[outArg+1] ? resolve(process.argv[outArg+1]) : join(ROOT,'og.png');

const root='/opt/pw-browsers'; let chrome=process.env.CHROME_PATH||null;
if(!chrome) for(const d of readdirSync(root)) if(d.startsWith('chromium')){ const p=join(root,d,'chrome-linux/chrome'); if(existsSync(p)){chrome=p;break;} }
const PORT=9731; const proc=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--remote-debugging-port='+PORT,'--remote-allow-origins=*','about:blank'],{stdio:'ignore'});
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
// 게임 안에서 그린다 — drawAvatar · kfx · mixHex · shade · hexA 를 그대로 쓰므로
// 캐릭터를 고치면 카드도 저절로 따라온다.
await send('Page.navigate',{url:'file://'+TARGET});
await sleep(1800);

const CODE=String.raw`(()=>{
const W=1200,H=630;
// ── 여기만 만지면 배치가 바뀐다 ──────────────────────────────
const VX=W*0.50, VY=-H*0.06;        // 소실점 (화면 위 바깥)
const R0=126;                        // 앞쪽 물체 크기. 주인공보다 작아야 주인공이 주인공이다
const HERO={x:W*0.50,y:H*0.74,r:206};// 대표 고양이
// a=각도(rad, 아래쪽 반원 0~π 에서 고른다 → 전부 아래로 쏟아진다)
// t=거리(0 소실점 ~ 1 눈앞)  k='j' 젤리 / 'b' 폭탄 / 'i' 아이템  c=색 번호  e=아이템 그림
const FLY=[
  {a:1.16,t:0.22,k:'j',c:3},{a:1.96,t:0.26,k:'j',c:2},
  {a:0.82,t:0.36,k:'b'},    {a:2.34,t:0.34,k:'i',e:'🪙',c:1},
  {a:1.52,t:0.30,k:'j',c:0},{a:0.56,t:0.50,k:'i',e:'🌟',c:1},
  {a:2.60,t:0.52,k:'j',c:4},{a:0.96,t:0.62,k:'b'},
  {a:2.05,t:0.66,k:'i',e:'💗',c:0},{a:0.34,t:0.70,k:'j',c:5},
  {a:2.86,t:0.74,k:'j',c:2},{a:0.90,t:0.84,k:'j',c:4},
  {a:2.30,t:0.88,k:'b'},    {a:0.14,t:0.94,k:'j',c:3},
  {a:3.02,t:0.96,k:'i',e:'🧲',c:3},
];
const PAL=['#ff9ec4','#ffd15c','#7fe0b8','#8fb8ff','#d79aff','#ffa87a'];
// ────────────────────────────────────────────────────────────
const lerp=(a,b,t)=>a+(b-a)*t;

function ball(g,x,y,r,col,o){
  o=o||{};
  const sq=o.squash==null?1:o.squash, ry=r*sq, rx=r/Math.sqrt(sq);
  if(o.shadow!==false){                                    // ① 바닥 그림자
    g.save(); g.filter='blur('+Math.max(2,r*0.18)+'px)';
    const sg=g.createRadialGradient(x,y+ry*1.04,1,x,y+ry*1.04,rx*1.06);
    sg.addColorStop(0,'rgba(88,38,74,0.40)'); sg.addColorStop(1,'rgba(88,38,74,0)');
    g.fillStyle=sg; g.beginPath(); g.ellipse(x,y+ry*1.06,rx*1.02,ry*0.26,0,0,7); g.fill(); g.restore();
  }
  g.save(); g.translate(x,y);
  const bg=g.createRadialGradient(-rx*0.34,-ry*0.40,r*0.04,-rx*0.34,-ry*0.40,r*1.62);  // ② 구 셰이딩
  bg.addColorStop(0,mixHex(col,'#ffffff',0.80)); bg.addColorStop(0.26,mixHex(col,'#ffffff',0.42));
  bg.addColorStop(0.58,mixHex(col,'#ffffff',0.06)); bg.addColorStop(0.86,shade(col,-26));
  bg.addColorStop(1,shade(col,-52));
  g.fillStyle=bg; g.beginPath(); g.ellipse(0,0,rx,ry,0,0,7); g.fill();
  g.save(); g.beginPath(); g.ellipse(0,0,rx,ry,0,0,7); g.clip();
  let ig=g.createRadialGradient(rx*0.14,ry*0.52,1,rx*0.14,ry*0.52,rx*0.86);            // ③ 속에서 번지는 빛
  ig.addColorStop(0,hexA(mixHex(col,'#ffffff',0.62),0.60));
  ig.addColorStop(0.55,hexA(mixHex(col,'#ffffff',0.20),0.20));
  ig.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=ig; g.fillRect(-rx,-ry,rx*2,ry*2);
  ig=g.createRadialGradient(0,ry*0.92,rx*0.10,0,ry*0.92,rx*1.05);                       // ④ 아래 테두리 그늘
  ig.addColorStop(0,hexA(shade(col,-56),0.40)); ig.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=ig; g.fillRect(-rx,-ry,rx*2,ry*2);
  g.fillStyle='rgba(255,255,255,0.92)';                                                 // ⑤ 광택
  g.beginPath(); g.ellipse(-rx*0.36,-ry*0.44,rx*0.26,ry*0.15,-0.52,0,7); g.fill();
  g.fillStyle='rgba(255,255,255,0.98)';
  g.beginPath(); g.ellipse(-rx*0.50,-ry*0.60,rx*0.085,ry*0.055,-0.5,0,7); g.fill();
  g.restore();
  g.lineWidth=Math.max(1,r*0.075); g.lineCap='round';                                   // ④ 림 라이트
  const rimg=g.createLinearGradient(-rx,ry*0.2,rx,ry*0.2);
  rimg.addColorStop(0,'rgba(255,255,255,0)');
  rimg.addColorStop(0.45,hexA(mixHex(col,'#ffffff',0.9),0.85));
  rimg.addColorStop(1,'rgba(255,255,255,0.15)');
  g.strokeStyle=rimg;
  g.beginPath(); g.ellipse(0,0,rx*0.965,ry*0.965,0,Math.PI*0.08,Math.PI*0.78); g.stroke();
  g.lineWidth=Math.max(1,r*0.05); g.strokeStyle='rgba(255,255,255,0.78)';
  g.beginPath(); g.ellipse(0,0,rx*0.975,ry*0.975,0,Math.PI*1.14,Math.PI*1.86); g.stroke();
  g.restore();
}
function jellyFace(g,x,y,r,mood){
  g.save(); g.translate(x,y);
  const eg=r*0.30, ey=-r*0.04, ew=r*0.135, eh=r*0.175;
  [-eg,eg].forEach(sx=>{
    const q=g.createLinearGradient(sx,ey-eh,sx,ey+eh); q.addColorStop(0,'#4a3d63'); q.addColorStop(1,'#20182e');
    g.fillStyle=q; g.beginPath(); g.ellipse(sx,ey,ew,eh,0,0,7); g.fill();
    g.fillStyle='#fff'; g.beginPath(); g.arc(sx-ew*0.34,ey-eh*0.44,ew*0.48,0,7); g.fill();
    g.beginPath(); g.arc(sx+ew*0.44,ey+eh*0.40,ew*0.22,0,7); g.fill(); });
  g.strokeStyle='#2a1f2e'; g.lineWidth=Math.max(1.2,r*0.058); g.lineCap='round';
  if(mood==='o'){ g.fillStyle='#2a1f2e'; g.beginPath(); g.ellipse(0,r*0.24,r*0.10,r*0.13,0,0,7); g.fill(); }
  else { g.beginPath(); g.arc(0,r*0.17,r*0.20,0.14*Math.PI,0.86*Math.PI); g.stroke(); }
  [-1,1].forEach(s=>{ const bx=s*r*0.56;
    const bgl=g.createRadialGradient(bx,r*0.20,1,bx,r*0.20,r*0.19);
    bgl.addColorStop(0,'rgba(255,120,162,0.50)'); bgl.addColorStop(1,'rgba(255,120,162,0)');
    g.fillStyle=bgl; g.beginPath(); g.ellipse(bx,r*0.20,r*0.19,r*0.13,0,0,7); g.fill(); });
  g.restore();
}
// 폭탄 — 게임의 검은 젤리와 같은 뾰족한 테두리 + 심지·불꽃 + 붉은 기운
function bomb3d(g,x,y,r){
  g.save(); g.filter='blur('+Math.max(2,r*0.2)+'px)';
  let sg=g.createRadialGradient(x,y+r*1.06,1,x,y+r*1.06,r*1.05);
  sg.addColorStop(0,'rgba(70,20,50,0.45)'); sg.addColorStop(1,'rgba(70,20,50,0)');
  g.fillStyle=sg; g.beginPath(); g.ellipse(x,y+r*1.06,r*1.02,r*0.26,0,0,7); g.fill(); g.restore();
  g.save(); g.translate(x,y);
  let dg=g.createRadialGradient(0,0,r*0.9,0,0,r*1.75);
  dg.addColorStop(0,'rgba(255,70,90,0.34)'); dg.addColorStop(1,'rgba(255,70,90,0)');
  g.fillStyle=dg; g.beginPath(); g.arc(0,0,r*1.75,0,7); g.fill();
  g.fillStyle='#3a3340'; const sp=11;
  g.beginPath(); for(let i=0;i<sp*2;i++){ const a=i/(sp*2)*Math.PI*2, rr=i%2?r*1.28:r*0.99;
    i?g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):g.moveTo(Math.cos(a)*rr,Math.sin(a)*rr); }
  g.closePath(); g.fill();
  const bg=g.createRadialGradient(-r*0.34,-r*0.40,r*0.04,-r*0.34,-r*0.40,r*1.6);
  bg.addColorStop(0,'#8d8398'); bg.addColorStop(0.28,'#5d5568');
  bg.addColorStop(0.62,'#3c3546'); bg.addColorStop(1,'#1c1723');
  g.fillStyle=bg; g.beginPath(); g.arc(0,0,r,0,7); g.fill();
  g.save(); g.beginPath(); g.arc(0,0,r,0,7); g.clip();
  g.fillStyle='rgba(255,255,255,0.30)'; g.beginPath(); g.ellipse(0,-r*1.00,r*0.92,r*0.30,0,0,7); g.fill();
  g.fillStyle='rgba(255,255,255,0.90)'; g.beginPath(); g.ellipse(-r*0.36,-r*0.44,r*0.22,r*0.12,-0.5,0,7); g.fill();
  g.fillStyle='rgba(255,90,90,0.22)';   g.beginPath(); g.ellipse(0,r*0.74,r*0.70,r*0.24,0,0,7); g.fill();
  g.restore();
  g.lineWidth=Math.max(1,r*0.07);
  const rg2=g.createLinearGradient(-r,r*0.2,r,r*0.2);
  rg2.addColorStop(0,'rgba(255,255,255,0)'); rg2.addColorStop(0.5,'rgba(255,180,200,0.55)');
  rg2.addColorStop(1,'rgba(255,255,255,0.1)');
  g.strokeStyle=rg2; g.beginPath(); g.arc(0,0,r*0.96,Math.PI*0.08,Math.PI*0.78); g.stroke();
  g.strokeStyle='#ff6b6b'; g.lineWidth=Math.max(1.6,r*0.11); g.lineCap='round';
  [-1,1].forEach(s=>{ const ex=s*r*0.34;
    g.beginPath(); g.moveTo(ex-r*0.15,-r*0.24); g.lineTo(ex+r*0.15,-r*0.02);
    g.moveTo(ex+r*0.15,-r*0.24); g.lineTo(ex-r*0.15,-r*0.02); g.stroke(); });
  g.lineWidth=Math.max(1.4,r*0.085);
  g.beginPath(); g.arc(0,r*0.44,r*0.20,Math.PI+0.45,-0.45); g.stroke();
  g.strokeStyle='#7a6a58'; g.lineWidth=Math.max(1.6,r*0.10);
  g.beginPath(); g.moveTo(r*0.16,-r*1.16); g.quadraticCurveTo(r*0.56,-r*1.40,r*0.40,-r*1.62); g.stroke();
  let fg=g.createRadialGradient(r*0.40,-r*1.70,1,r*0.40,-r*1.70,r*0.42);
  fg.addColorStop(0,'rgba(255,255,220,1)'); fg.addColorStop(0.35,'rgba(255,190,70,0.95)');
  fg.addColorStop(1,'rgba(255,110,40,0)');
  g.fillStyle=fg; g.beginPath(); g.arc(r*0.40,-r*1.70,r*0.42,0,7); g.fill();
  g.restore();
}
function item3d(g,x,y,r,emoji,tint){
  ball(g,x,y,r,tint,{});
  g.save(); g.translate(x,y);
  g.shadowColor='rgba(90,40,80,0.35)'; g.shadowBlur=r*0.24; g.shadowOffsetY=r*0.08;
  g.font='900 '+Math.round(r*1.12)+'px sans-serif'; g.textAlign='center'; g.textBaseline='middle';
  g.fillText(emoji,0,r*0.04);
  g.restore();
}
// 잔상 — 소실점에서 물체까지 이어지는 꼬리. '날아오는 중'을 만드는 결정적 요소.
function trail(g,x,y,r,col,alpha){
  const dx=x-VX, dy=y-VY, d=Math.hypot(dx,dy)||1, ux=dx/d, uy=dy/d;
  const back=Math.min(d*0.86, r*7.5), bx=x-ux*back, by=y-uy*back, nx=-uy, ny=ux;
  const lg=g.createLinearGradient(bx,by,x,y);
  lg.addColorStop(0,'rgba(255,255,255,0)');
  lg.addColorStop(1,hexA(mixHex(col,'#ffffff',0.55),alpha));
  g.save(); g.filter='blur('+Math.max(2,r*0.22)+'px)'; g.fillStyle=lg;
  g.beginPath();
  g.moveTo(bx+nx*r*0.10,by+ny*r*0.10); g.lineTo(x+nx*r*0.82,y+ny*r*0.82);
  g.lineTo(x-nx*r*0.82,y-ny*r*0.82);   g.lineTo(bx-nx*r*0.10,by-ny*r*0.10);
  g.closePath(); g.fill(); g.restore();
}
function rays(g,cx,cy,n,col,alpha,rot){
  g.save(); g.translate(cx,cy); g.rotate(rot||0); g.globalAlpha=alpha;
  const R=Math.hypot(W,H);
  for(let i=0;i<n;i++){ const a0=i/n*Math.PI*2, a1=a0+Math.PI/n*0.9;
    g.fillStyle=col; g.beginPath(); g.moveTo(0,0);
    g.lineTo(Math.cos(a0)*R,Math.sin(a0)*R); g.lineTo(Math.cos(a1)*R,Math.sin(a1)*R);
    g.closePath(); g.fill(); }
  g.restore();
}
function speed(g,cx,cy,n,r0,r1,col,alpha,seed){
  g.save(); g.translate(cx,cy); g.globalAlpha=alpha;
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2+(seed||0);
    const k1=r0*(0.72+((i*37)%13)/22), k2=r1*(0.80+((i*61)%11)/17);
    const w1=Math.max(1.1,1.4+((i*23)%5)*0.5), w2=w1+3.4+((i*17)%6);
    const ca=Math.cos(a), sa=Math.sin(a), nx=-sa, ny=ca;
    g.fillStyle=col; g.beginPath();
    g.moveTo(ca*k1+nx*w1,sa*k1+ny*w1); g.lineTo(ca*k2+nx*w2,sa*k2+ny*w2);
    g.lineTo(ca*k2-nx*w2,sa*k2-ny*w2); g.lineTo(ca*k1-nx*w1,sa*k1-ny*w1);
    g.closePath(); g.fill();
  }
  g.restore();
}
// 대표 고양이 — 게임 그림(drawAvatar) 그대로 그린 뒤 젤리와 같은 입체 처리를 얹는다.
// 이걸 안 얹으면 캐릭터만 종이처럼 납작해 보여 젤리와 안 어울린다.
function heroCat(g,x,y,r){
  g.save(); g.filter='blur('+r*0.18+'px)'; g.globalAlpha=0.34; g.fillStyle='#5a2748';
  g.beginPath(); g.ellipse(x,y+r*1.04,r*0.86,r*0.22,0,0,7); g.fill(); g.restore();
  g.save();
  g.shadowColor='rgba(90,40,80,0.40)'; g.shadowBlur=r*0.36; g.shadowOffsetY=r*0.14;
  const old=ctx;
  try{ drawAvatar(g,x,y,r,{kind:'cat',color:'#ffb3c9',acc:'bow',accColor:'#ff5c8a'},'happy',0); }
  finally{ ctx=old; }
  g.shadowColor='transparent';
  const nf=kfx('cat'), rx=r*nf.sx, ry=r*nf.sy;
  g.save(); g.beginPath(); g.ellipse(x,y,rx,ry,0,0,7); g.clip();
  let q=g.createRadialGradient(x+rx*0.46,y+ry*0.52,r*0.06,x+rx*0.46,y+ry*0.52,r*1.35);
  q.addColorStop(0,'rgba(96,44,80,0.30)'); q.addColorStop(0.62,'rgba(96,44,80,0.10)');
  q.addColorStop(1,'rgba(96,44,80,0)'); g.fillStyle=q; g.fillRect(x-rx,y-ry,rx*2,ry*2);
  q=g.createRadialGradient(x-rx*0.40,y-ry*0.46,r*0.04,x-rx*0.40,y-ry*0.46,r*1.05);
  q.addColorStop(0,'rgba(255,255,255,0.44)'); q.addColorStop(0.55,'rgba(255,255,255,0.12)');
  q.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=q; g.fillRect(x-rx,y-ry,rx*2,ry*2);
  g.restore();
  g.lineWidth=Math.max(1,r*0.062); g.lineCap='round';
  const rimg=g.createLinearGradient(x-rx,y+ry*0.2,x+rx,y+ry*0.2);
  rimg.addColorStop(0,'rgba(255,255,255,0)'); rimg.addColorStop(0.5,'rgba(255,255,255,0.75)');
  rimg.addColorStop(1,'rgba(255,255,255,0.10)');
  g.strokeStyle=rimg;
  g.beginPath(); g.ellipse(x,y,rx*0.965,ry*0.965,0,Math.PI*0.10,Math.PI*0.76); g.stroke();
  g.restore();
}
// 소실점에서 뻗는 선 위의 자리. t*t 로 벌려야 '가속해서 다가오는' 느낌이 난다.
function place(ang,t){
  const d=lerp(150,900,t*t);
  return {x:VX+Math.cos(ang)*d, y:VY+Math.sin(ang)*d, s:lerp(0.30,1.0,t*t),
          blur: t>0.88 ? (t-0.88)*46 : 0};
}
function soft(g,blur,fn){ if(!blur){ fn(); return; }
  g.save(); g.filter='blur('+blur.toFixed(1)+'px)'; fn(); g.restore(); }

const c=document.createElement('canvas'); c.width=W; c.height=H;
const g=c.getContext('2d');
// 배경 — 하늘색에서 분홍·크림으로. 아래를 민트로 끝내면 흰 빛살이 얹혀 회색으로 죽는다.
const lg=g.createLinearGradient(0,0,W*0.15,H);
lg.addColorStop(0,'#8fd3ff'); lg.addColorStop(0.44,'#ffbcda'); lg.addColorStop(1,'#ffe3b8');
g.fillStyle=lg; g.fillRect(0,0,W,H);
rays(g,VX,VY,30,'#fffdf6',0.30,0.05);
const rg=g.createRadialGradient(VX,VY,0,VX,VY,H*1.35);
rg.addColorStop(0,'rgba(255,255,255,0.78)'); rg.addColorStop(1,'rgba(255,110,170,0.30)');
g.fillStyle=rg; g.fillRect(0,0,W,H);
speed(g,VX,VY,36,90,980,'rgba(255,255,255,0.92)',0.48,0.10);
// 잔상을 먼저 다 깔고 → 물체를 그린다. 섞어 그리면 남의 몸 위에 꼬리가 얹힌다.
FLY.forEach(f=>{ const p=place(f.a,f.t), r=R0*p.s;
  trail(g,p.x,p.y,r,f.k==='b'?'#ff8a8a':PAL[(f.c||0)%PAL.length],0.62); });
FLY.forEach(f=>{ const p=place(f.a,f.t), r=R0*p.s, col=PAL[(f.c||0)%PAL.length];
  soft(g,p.blur,()=>{
    if(f.k==='b') bomb3d(g,p.x,p.y,r*0.82);
    else if(f.k==='i') item3d(g,p.x,p.y,r*0.80,f.e,col);
    else { ball(g,p.x,p.y,r,col,{}); jellyFace(g,p.x,p.y,r,f.t>0.8?'o':''); } }); });
heroCat(g,HERO.x,HERO.y,HERO.r);
return { png:c.toDataURL('image/png').split(',')[1],
         jpg:c.toDataURL('image/jpeg',0.92).split(',')[1] };
})()`;
const r=await evl(CODE);
const png=Buffer.from(r.png,'base64'), jpg=Buffer.from(r.jpg,'base64');
writeFileSync(OUT,png);
console.log('✅ '+OUT+'  1200x630  '+Math.round(png.length/1024)+'KB');
// 미리보기에 실제로 쓰는 것은 이 JPEG 다. PNG(1MB 넘음)는 크롤러가 받다가
// 시간 초과되면 예전 그림을 계속 쓰는 일이 있어서, 가벼운 쪽을 og:image 로 둔다.
const JPG=OUT.replace(/\.png$/,'.jpg');
writeFileSync(JPG,jpg);
console.log('✅ '+JPG+'  1200x630  '+Math.round(jpg.length/1024)+'KB  ← og:image 는 이걸 쓴다');
ws.close(); proc.kill();

// 게임 소개 영상 만들기 — 실제로 플레이해서 녹화하고, 게임 소리까지 붙인다
//
// ══════════════════════════════════════════════════════════════════════
// 어떻게 소리를 넣나 (여기가 이 파일의 핵심)
// ══════════════════════════════════════════════════════════════════════
// 녹화(플레이라이트)는 그림만 담는다. 이 컨테이너의 ffmpeg 에는 소리 인코더가 아예 없다.
// 그래서 소리는 이렇게 만든다.
//   ① 녹화할 때 게임의 소리 함수(playSquish·playBomb·playFanfare…)를 '기록만 하는 함수'로
//      바꿔 둔다 → 언제 어떤 소리가 났는지 시각과 함께 쌓인다. 배경음악은 게임 상태
//      (running·throwerAlive)를 0.2초마다 적어 둔다.
//   ② 녹화가 끝나면 새 창에서 OfflineAudioContext 를 만들고, 게임의 AC 를 그 문맥으로
//      바꿔치기한 다음(현재 시각을 내가 정하는 Proxy) 기록해 둔 순서대로 진짜 소리 함수를
//      부른다 → 게임에서 나던 소리가 그대로, 영상과 같은 시각에 만들어진다.
//      배경음악도 게임의 bgmTick() 을 그 문맥에서 돌려 만든다.
//   ③ 만든 소리를 브라우저의 MediaRecorder 로 opus(webm)로 굽고,
//      ffmpeg 로 영상과 '복사'만 해서 합친다(인코더가 필요 없다).
//
// 만들어지는 것
//   press/video/jelly-shooting-promo.webm            소개 영상 (소리 있음)
//   press/video/jelly-shooting-promo-886x1920.webm   앱 미리보기용 30초 판
//   press/video/frames/*.png                          낱장 (영상에서 뽑음)
//
// 영상용으로 손 본 것 (트레일러라서 — 문서에도 적어 둠)
//   · 목숨을 넉넉히 준다 (몇 초 만에 판이 끝나면 보여줄 게 없다)
//   · 아이템이 자주 떨어지게 한다 (와르르 쏟아지는 장면을 보여주려고)
//   · 결과 점수는 실제 한 판 규모(15,200점)로 맞춘다
//
// 쓰기:  node jelly-shooting/tools/make-promo-video.mjs
import { existsSync, mkdirSync, renameSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const PW = '/opt/node22/lib/node_modules/playwright/index.js';
const pwMod = await import(existsSync(PW) ? 'file://' + PW : 'playwright');
const chromium = (pwMod.chromium || (pwMod.default && pwMod.default.chromium));

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT  = join(ROOT, 'press', 'video');
const FRM  = join(OUT, 'frames');
const GAME = 'file://' + join(ROOT, 'index.html');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const FFMPEG = '/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux';
rmSync(FRM, { recursive: true, force: true });
mkdirSync(FRM, { recursive: true });

const VW = 430, VH = 932;              // 게임을 보는 창 (아이폰 6.7" 와 같은 비율)
// 녹화 크기 = 창 크기 × 2.
// ⚠ 플레이라이트 녹화는 프레임을 'CSS 창 크기'로 받아 오고, 그보다 큰 녹화 크기를 주면
//   남는 자리를 회색으로 채운다(키워 주지 않는다). 브라우저 자체를 2배로 띄우면
//   (--force-device-scale-factor=2) CSS 창이 860x1864 로 잡혀 꽉 찬 고화질 영상이 나온다.
const RW = 860, RH = 1864;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── 페이지에 얹는 자막·표지 ──
const OVERLAY = `(()=>{
  const st=document.createElement('style');
  st.textContent=\`
  #__cap{position:fixed;left:0;right:0;top:12%;z-index:99998;display:flex;justify-content:center;
    pointer-events:none;opacity:0;transition:opacity .3s ease, transform .3s ease;transform:translateY(-10px);}
  #__cap.on{opacity:1;transform:none;}
  #__cap.low{top:auto;bottom:5%;}
  #__cap .in{background:rgba(255,255,255,.94);border-radius:22px;padding:12px 22px;text-align:center;
    box-shadow:0 10px 26px rgba(180,90,140,.28);max-width:88%;}
  #__cap b{display:block;font-size:28px;font-weight:400;color:#c9184a;letter-spacing:-.5px;
    font-family:'Jua','Apple SD Gothic Neo',sans-serif;}
  #__cap span{display:block;margin-top:5px;font-size:17px;font-weight:400;color:#6b5069;
    font-family:'Jua','Apple SD Gothic Neo',sans-serif;}
  #__card{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:14px;opacity:0;transition:opacity .45s ease;pointer-events:none;
    background:radial-gradient(120% 90% at 20% 0%, #fff 0%, #ffe3f0 45%, #efe2ff 100%);}
  #__card.on{opacity:1;}
  #__card .t{font-size:60px;font-weight:400;color:#c9184a;letter-spacing:-1px;line-height:1.08;
    text-align:center;font-family:'Jua','Apple SD Gothic Neo',sans-serif;}
  #__card .s{font-size:20px;font-weight:400;color:#6b5069;text-align:center;padding:0 24px;
    font-family:'Jua','Apple SD Gothic Neo',sans-serif;}
  #__card .u{margin-top:10px;font-size:18px;font-weight:400;color:#fff;background:#ff5c8a;
    font-family:'Jua','Apple SD Gothic Neo',sans-serif;
    padding:12px 22px;border-radius:999px;box-shadow:0 10px 24px rgba(255,92,138,.4);}
  #__card canvas{display:block;}
  \`;
  document.head.appendChild(st);
  const cap=document.createElement('div'); cap.id='__cap';
  cap.innerHTML='<div class="in"><b></b><span></span></div>';
  document.body.appendChild(cap);
  const card=document.createElement('div'); card.id='__card';
  card.innerHTML='<canvas id="__cardCv" width="380" height="200"></canvas>'
    +'<div class="t"></div><div class="s"></div><div class="u"></div>';
  document.body.appendChild(card);
  window.__cap=(t,s,low)=>{ cap.querySelector('b').textContent=t||'';
    cap.querySelector('span').textContent=s||'';
    cap.classList.toggle('low',!!low);          // 승패 그림을 가리지 않게 아래로 내린다
    cap.classList.add('on'); };
  window.__capOff=()=>cap.classList.remove('on');
  window.__card=(t,s,u)=>{ card.querySelector('.t').innerHTML=t; card.querySelector('.s').textContent=s;
    card.querySelector('.u').textContent=u||''; card.classList.add('on');
    const cv=document.getElementById('__cardCv'), g=cv.getContext('2d');
    const KS=[['bunny','#fff0a8','none'],['bear','#c9a27a','crown'],['girl','#ff9db2','bow'],
              ['dog','#a3d5ff','cap'],['cat','#ffb3c9','flower']];
    let k=0; const tick=()=>{ if(!card.classList.contains('on'))return;
      g.clearRect(0,0,cv.width,cv.height); k+=1;
      KS.forEach(([kd,c,a],i)=>drawAvatar(g,44+i*73,120,34,
        charSafe({k:kd,c:c,a:a,ac:'#ff5c8a',h:(kd==='girl'?'braid':'basic')}),
        (i%2?'happy':'wow'),k+i*9));
      requestAnimationFrame(tick); };
    tick(); };
  window.__cardOff=()=>card.classList.remove('on');
  return 1; })()`;

// ── 소리 기록 장치 — 녹화하는 동안 '무슨 소리가 언제 났는지'만 적는다 ──
const SFX_SHIM = `(()=>{
  window.__t0 = Date.now();
  window.__sfx = [];                     // [함수이름, 인수, 시각(ms)]
  ['playSquish','playBomb','playMiss','playLevelUp','playFanfare','playBoo'].forEach(n=>{
    const real = window[n];
    window['__real_'+n] = real;
    window[n] = function(){ __sfx.push([n, [].slice.call(arguments).map(v=>typeof v==='number'?v:0),
      Date.now()-window.__t0]); };
  });
  window.__st = [];                      // 배경음악용 상태 [시각, 판이 도는가, 던지는 쪽인가]
  window.__stT = setInterval(()=>{
    try{ __st.push([Date.now()-window.__t0, running?1:0, throwerAlive?1:0]); }catch(e){}
  }, 200);
  return window.__t0; })()`;

// 지금 화면에서 누를 만한 젤리 하나를 골라 '화면 좌표'로 돌려준다.
// 폭탄은 피하고, 바닥에 가까운 것부터 — 사람이 하는 판단과 같게.
// 화면이 텅 빈 영상은 심심하니 급하지 않으면 조금 기다린다.
const PICK = `(()=>{
  if(!running||!jellies.length) return null;
  const r=canvas.getBoundingClientRect();
  const cand=jellies.filter(j=>!j.dead&&!j.bomb&&j.y>60&&j.y<H-40);
  if(!cand.length) return null;
  cand.sort((a,b)=>b.y-a.y);
  const j=cand[0];
  if(j.y < H*0.5 && cand.length < 5) return null;
  return {x:r.left+j.x/W*r.width, y:r.top+j.y/H*r.height};
})()`;

const run = async () => {
  const browser = await chromium.launch({ executablePath: CHROME,
    args: ['--no-sandbox', '--allow-file-access-from-files', '--mute-audio',
           '--force-device-scale-factor=2'] });
  const ctxAt = Date.now();                     // 녹화가 시작되는 시각 (소리 맞추기용)
  const ctx = await browser.newContext({
    viewport: { width: VW, height: VH }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    recordVideo: { dir: OUT, size: { width: RW, height: RH } } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('⚠ 페이지 오류:', e.message));

  const T0 = Date.now();
  const mark = n => console.log('   ⏱ ' + ((Date.now() - T0) / 1000).toFixed(1) + 's  ' + n);
  // ⚠ 녹화 중에는 page.screenshot() 을 부르지 말 것. 그 순간 프레임이 CSS 크기로 들어와
  //   영상에 '작게 박힌 화면'이 생긴다. 낱장은 다 만든 영상에서 뽑는다.
  const ev = e => page.evaluate(e).catch(() => null);
  const cap = (t, s, low) => ev(`__cap(${JSON.stringify(t)},${JSON.stringify(s || '')},${!!low})`);
  const capOff = () => ev(`__capOff()`);
  // 진짜로 젤리를 눌러 플레이한다. ms 동안, 대략 gap 마다 한 번.
  const play = async (ms, gap = 240) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const t1 = Date.now();
      const p = await page.evaluate(PICK).catch(() => null);
      if (p) await page.mouse.click(p.x, p.y).catch(() => {});
      await sleep(Math.max(40, gap - (Date.now() - t1)));
    }
  };
  // 화면에 있는 버튼을 실제로 누른다 (없으면 조용히 넘어간다)
  const tap = async (sel, nth = 0) => {
    // 화면 밖(스크롤 아래)에 있는 버튼은 좌표로 눌러도 헛나간다 → 먼저 그 자리로 굴린다.
    const box = await page.evaluate(`(()=>{ const e=document.querySelectorAll(${JSON.stringify(sel)})[${nth}];
      if(!e||!e.offsetParent) return null;
      let r=e.getBoundingClientRect();
      if(r.top<8||r.bottom>innerHeight-8){ e.scrollIntoView({block:'center'}); r=e.getBoundingClientRect(); }
      return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`).catch(() => null);
    if (!box) { console.log('   ⚠ 못 누름: ' + sel + '[' + nth + ']'); return false; }
    await sleep(180);                      // 굴러가는 동안 기다린다
    await page.mouse.click(box.x, box.y).catch(() => {});
    return true;
  };
  // 판이 진짜로 시작될 때까지 기다린다 (카운트다운 길이가 상황마다 달라서 고정 대기는 위험하다)
  const waitFor = async (cond, ms = 9000, what = '') => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const ok = await page.evaluate(`(()=>{ try{ return !!(${cond}); }catch(e){ return false; } })()`)
        .catch(() => false);
      if (ok) return true;
      await sleep(200);
    }
    console.log('   ⚠ 기다렸는데 안 됨: ' + (what || cond));
    return false;
  };
  // 던지는 쪽 화면(상대 판)의 x 자리를 눌러 젤리를 던진다
  const throwAtX = async (frac) => {
    const box = await page.evaluate(`(()=>{ const c=document.getElementById('mirrorCanvas');
      if(!c||!c.offsetParent) return null; const r=c.getBoundingClientRect();
      return {l:r.left,t:r.top,w:r.width,h:r.height}; })()`).catch(() => null);
    if (box) await page.mouse.click(box.l + box.w * frac, box.t + box.h * 0.45).catch(() => {});
  };

  await page.goto(GAME);
  await page.waitForFunction("typeof openStart==='function'", null, { timeout: 20000 });
  await page.evaluate(`(()=>{ localStorage.clear(); soundOn=true; bgmOn=false; saveNick('까미');
    coins=12400;
    character.kind='cat'; character.color='#ffb3c9'; character.acc='none'; saveChar(); saveEconomy();
    ['heart','slow','clear','x2','magnet'].forEach((id,i)=>{ if(!crafted.includes(id))crafted.push(id);
      bought[id]=[3,3,3,4,3][i]; inventory[id]=[3,2,2,2,2][i]; });
    ownedKinds=['cat','dog','bunny','bear','human','girl']; ownedHairs=HAIRS.map(h=>h.id);
    openStart(); $('dailyBtn').style.display='none'; return 1; })()`);
  await page.evaluate(OVERLAY);
  const pageT0 = await page.evaluate(SFX_SHIM);
  const audioOffset = pageT0 - ctxAt;      // 녹화 시작 → 소리 기록 시작 사이의 간격(ms)
  mark('준비 끝 (소리 맞춤 간격 ' + audioOffset + 'ms)');

  // ── ① 표지 ──
  await ev(`__card('젤리슈팅','톡 터트리는 3분 · 온 가족이 함께','설치 없이 웹에서 바로')`);
  await sleep(2600);
  await ev(`__cardOff()`);
  await sleep(600);

  // ── ② 내 캐릭터 꾸미기 ──
  await cap('내 캐릭터 꾸미기', '여섯 종 · 머리 · 색깔 · 악세서리');
  await tap('#profileBtn');
  await sleep(1100);
  await tap('#kindOpts button', 5);          // 여자아이
  await sleep(1000);
  await tap('#colorOpts button', 3);         // 색깔
  await sleep(900);
  await tap('#hairOpts button', 4);          // 머리 모양
  await sleep(1000);
  await tap('#accOpts button', 3);           // 악세서리
  await sleep(1300);
  await capOff();
  await tap('#profBackBtn');
  await sleep(800);
  mark('꾸미기');

  // ── ③ 혼자 하기 — 난이도 고르고 진짜로 플레이 ──
  await tap('#playBtn');
  await sleep(700);
  await cap('난이도 네 단계', '아이도 어른도 자기 속도로');
  const spicy = await page.evaluate(`(()=>{ const b=[...document.querySelectorAll('#modeOpts .modebox, #modeOpts button, #modeOpts > *')]
      .find(e=>/매운맛/.test(e.textContent||'')); if(!b) return 0;
    const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
  if (spicy && spicy.x) { await page.mouse.click(spicy.x, spicy.y); await sleep(1100); }
  await capOff();
  await tap('#startGameBtn');
  await waitFor('running', 9000, '혼자 하기 시작');
  await sleep(500);
  // 트레일러용: 목숨을 넉넉히, 아이템이 자주 떨어지게
  await ev(`(()=>{ lives=6; updateHud();
    window.__rush=setInterval(()=>{ try{ if(running){ if(lives<4){lives=4;updateHud();}
      if(dropTimer>90) dropTimer=45; } }catch(e){} },600); return 1; })()`);
  await cap('톡 터트리면 콤보!', '30초면 배우고, 3분이면 한 판');
  await play(5200, 230);
  await capOff();
  await sleep(300);

  // 아이템 네 개를 차례로 써 본다
  await cap('아이템으로 위기 탈출', '하트팩 · 슬로우 · 2배 점수 · 자석');
  for (const i of [1, 3, 4, 2]) {           // 슬로우 → 2배 → 자석 → 폭탄청소
    await tap('#itemBar .itembtn', i);
    await play(1500, 240);
  }
  await capOff();
  await play(1200, 240);
  await ev(`(()=>{ clearInterval(window.__rush); return 1; })()`);
  mark('혼자 하기');

  // ── ④ 실시간 던전 (AI와) — 방해를 주고받는다 ──
  // 결과 화면을 거치지 않고 홈으로 (몇 초 플레이한 점수가 영상에 나오면 초라하다)
  await ev(`(()=>{ running=false; paused=false; boardUnlock();
    ['hud','audioBar','itemBar','pauseBtn','netBar','throwWrap'].forEach(id=>$(id).classList.add('hide'));
    openStart(); return 1; })()`);
  await sleep(700);
  await ev(`(()=>{ aiGame='dungeon'; aiTier='smart'; netModeName='spicy'; userMode='spicy';
    aiGo(); return 1; })()`);
  await cap('같은 판에서 실시간 대전', '방 코드만 알려주면 2~4명이 함께');
  await waitFor('running', 12000, '던전 시작');   // 카운트다운 3-2-1 이 끝날 때까지
  await sleep(400);
  await ev(`(()=>{ lives=6; updateHud();
    window.__rush=setInterval(()=>{ try{ if(running){ if(lives<4){lives=4;updateHud();}
      throwGauge=HEX_MAX; bolt=BOLT_NEED; updateGauge(); } }catch(e){} },500); return 1; })()`);
  await play(3000, 230);
  await capOff();
  await sleep(200);
  await cap('방해를 던져요', '지그재그 · 안개 · 폭탄 세트 · 스피드업');
  for (const h of ['jelly', 'zig', 'bomb', 'fog', 'rush']) {
    await tap('#hex_' + h);
    await play(1600, 230);
  }
  await capOff();
  await play(1500, 230);
  await ev(`(()=>{ clearInterval(window.__rush); return 1; })()`);
  mark('실시간 던전');

  // ── ⑤ 던지기 게임 — 내가 던지는 쪽 ──
  await ev(`(()=>{ running=false; paused=false; boardUnlock(); try{aiStop();}catch(e){} try{netLeave();}catch(e){}
    ['hud','audioBar','itemBar','pauseBtn','netBar','throwWrap'].forEach(id=>$(id).classList.add('hide'));
    openStart(); return 1; })()`);
  await sleep(900);
  await ev(`(()=>{ aiGame='throw'; aiRole='thrower'; aiTier='smart'; netModeName='normal';
    aiGo(); return 1; })()`);
  await cap('던지기 게임', '한 명은 던지고, 한 명은 터트려요');
  await waitFor('throwerAlive', 12000, '던지기 시작');
  await sleep(600);
  await ev(`(()=>{ window.__nrg=setInterval(()=>{ try{ tEnergy=ENERGY_MAX; refreshThrowBar(); }catch(e){} },400);
    return 1; })()`);
  await capOff();
  // 무기 네 가지를 차례로 — 일반 · 폭탄 · 유령 · 젤리비
  const ARMS = [[0, '🍡 일반 젤리', '누르는 대로 바로 나가요'],
                [2, '💣 폭탄', '터뜨리면 상대 목숨이 깎여요'],
                [1, '👻 유령 젤리', '반투명해서 잘 안 보여요'],
                [3, '🌧️ 젤리비', '한 번에 다섯 개!']];
  for (const [i, t, s] of ARMS) {
    await tap('#throwBar .twbtn', i);
    await cap(t, s);
    for (const f of [0.3, 0.62, 0.45]) { await throwAtX(f); await sleep(430); }
    await sleep(500);
    await capOff();
    await sleep(150);
  }
  // 낙하 속도도 던지는 사람이 돌린다
  await cap('속도도 내가 정해요', '느리게 · 보통 · 빠르게 · 초고속');
  await tap('#spdBar .spdbtn', 3);
  for (const f of [0.35, 0.7, 0.5]) { await throwAtX(f); await sleep(430); }
  await sleep(700);
  await capOff();
  await ev(`(()=>{ clearInterval(window.__nrg); return 1; })()`);
  mark('던지기 게임');

  // ── ⑥ 이겼을 때 ──
  await ev(`(()=>{
    // 영상은 1분 남짓이라 실제 2분 판의 점수까지 못 쌓인다. 스토어 스크린샷과 같은
    // '시연용 점수'를 넣어 결과 화면이 실제 한 판처럼 보이게 한다.
    throwScore=15200; score=15200; net.myScore=15200;
    if(aiOn){ aiS.score=9800; }
    if(throwerAlive) throwerFinish(); else gameOver();
    return 1; })()`);
  await waitFor(`!$('overScreen').classList.contains('hide')`, 8000, '결과 화면');
  await sleep(1600);
  await cap('이기면 춤추고 · 지면 분해요', '표정 · 자세 · 말풍선이 판마다 달라요', true);
  await sleep(1600);
  await tap('#sayRow .minichip', 1);              // 말풍선 바꾸기 (메시지 보내듯)
  await sleep(1500);
  await tap('#sayRow .minichip', 2);
  await sleep(1600);
  await capOff();
  await sleep(300);
  // 결과를 그림으로 공유 — 미리보기까지 보여준다
  await cap('결과는 그림으로 공유', '이긴 표정과 진 표정이 그대로 담겨요');
  await ev(`(()=>{ try{ shareOpen(); }catch(e){} return 1; })()`);
  await sleep(2600);
  await ev(`(()=>{ try{ shareClose(); }catch(e){} return 1; })()`);
  await capOff();
  await sleep(500);
  mark('결과·공유');

  // ── ⑦ 마무리 표지 ──
  await ev(`__card('지금 바로 한 판','친구에게 방 코드만 알려주면 끝','zingy-cupcake-98444a.netlify.app')`);
  await sleep(2400);
  mark('마지막 장면');

  // 소리 기록을 가져온다
  const sfx = await page.evaluate(`(()=>{ clearInterval(window.__stT);
    return {log:window.__sfx, st:window.__st, end:Date.now()-window.__t0}; })()`);
  writeFileSync(join(OUT, '__sfx-log.json'), JSON.stringify(sfx));
  const tally = {}; sfx.log.forEach(([f]) => tally[f] = (tally[f]||0)+1);
  console.log('   🔎 마지막 소리들: ' + sfx.log.slice(-6)
    .map(([f,,t]) => f.replace('play','') + '@' + (t/1000).toFixed(1) + 's').join(', '));
  console.log('   🔔 소리 ' + sfx.log.length + '개 ('
    + Object.entries(tally).map(([k,v])=>k.replace('play','')+' '+v).join(', ')
    + ') · 상태 ' + sfx.st.length + '칸');

  const video = page.video();
  await ctx.close();                      // 닫아야 영상 파일이 완성된다
  const raw = await video.path();
  const silent = join(OUT, '__silent.webm');
  renameSync(raw, silent);

  // ── 소리 만들기 ──
  // 게임의 AC 를 OfflineAudioContext 로 바꿔치기하고, 기록해 둔 순서대로 진짜 소리 함수를 부른다.
  const apage = await browser.newPage();
  await apage.goto(GAME);
  await apage.waitForFunction("typeof playSquish==='function'", null, { timeout: 20000 });
  const audioDur = (sfx.end + audioOffset) / 1000 + 1.5;
  const abuf = await apage.evaluate(`(async ([log, states, dur, off]) => {
    const SR=48000;
    const oc=new OfflineAudioContext(2, Math.ceil(SR*dur), SR);
    // 소리가 겹쳐 찌그러지지 않게 리미터를 하나 물린다 (게임은 destination 에 바로 붙는다)
    const lim=oc.createDynamicsCompressor();
    lim.threshold.value=-8; lim.knee.value=8; lim.ratio.value=6;
    lim.attack.value=0.003; lim.release.value=0.25;
    const master=oc.createGain(); master.gain.value=0.92;
    lim.connect(master); master.connect(oc.destination);
    let NOW=0;
    // currentTime 을 내가 정하는 문맥 — 이게 있어야 '그 시각에 났던 소리'로 예약된다.
    // ⚠ window.AC 가 아니라 그냥 AC 에 넣어야 한다. 게임의 AC 는 최상위 let 이라
    //    window 에 없다(let 은 window 프로퍼티가 아니다). window.AC 에 넣으면 게임 함수는
    //    여전히 null 을 보고 소리를 하나도 안 만든다 — 그래서 첫 판이 무음이었다.
    AC=new Proxy(oc,{ get(t,k){
      if(k==='currentTime') return NOW;
      if(k==='destination') return lim;
      const v=t[k]; return (typeof v==='function') ? v.bind(t) : v; } });
    soundOn=true; bgmOn=true; bgmGain=null; bgmCur=null; bgmNext=0; bgmStep=0;
    // 영상에서는 음악을 처음부터 끝까지 깐다(게임에서는 판이 돌 때만 나온다).
    // 표지·꾸미기·결과 화면이 무음이면 '가편'처럼 들린다.
    bgmVol=()=>(bgmCur==='throw'?0.17:0.20);
    // 배경음악 — 게임의 bgmTick 을 상태 표에 맞춰 돌린다.
    // 던지는 쪽일 때만 곡이 바뀌고, 그 밖에는 늘 '판이 도는 중'으로 둔다.
    const st2 = states.length ? states : [[0,1,0]];
    const lastT = st2[st2.length-1][0];
    for(let t=0; t<=lastT+1500; t+=200){
      const near = st2.reduce((a,b)=>Math.abs(b[0]-t)<Math.abs(a[0]-t)?b:a, st2[0]);
      NOW=(t+off)/1000; if(NOW<0) continue;
      throwerAlive=!!near[2]; running=!throwerAlive;
      try{ bgmTick(); }catch(e){}
    }
    // 효과음
    for(const [f,a,t] of log){
      NOW=(t+off)/1000; if(NOW<0) continue;
      try{ (window['__real_'+f]||window[f]).apply(null,a); }catch(e){}
    }
    const buf=await oc.startRendering();
    // 실시간으로 흘려보내며 opus(webm)로 굽는다 — 이 브라우저에는 인코더가 있다
    const ac=new AudioContext({sampleRate:SR});
    const dest=ac.createMediaStreamDestination();
    const src=ac.createBufferSource(); src.buffer=buf; src.connect(dest);
    const chunks=[];
    const rec=new MediaRecorder(dest.stream,{mimeType:'audio/webm;codecs=opus',audioBitsPerSecond:160000});
    rec.ondataavailable=e=>{ if(e.data.size) chunks.push(e.data); };
    const done=new Promise(r=>rec.onstop=r);
    rec.start(250); src.start();
    await new Promise(r=>setTimeout(r, buf.duration*1000+500));
    rec.stop(); await done;
    const ab=await new Blob(chunks,{type:'audio/webm'}).arrayBuffer();
    const u=new Uint8Array(ab); let s='';
    for(let i=0;i<u.length;i+=0x8000) s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));
    return {b64:btoa(s), dur:buf.duration};
  })([${JSON.stringify(sfx.log)}, ${JSON.stringify(sfx.st)}, ${audioDur}, ${audioOffset}])`);
  const audio = join(OUT, '__audio.webm');
  writeFileSync(audio, Buffer.from(abuf.b64, 'base64'));
  console.log('   🎵 소리 ' + abuf.dur.toFixed(1) + '초 ('
    + Math.round(Buffer.from(abuf.b64, 'base64').length / 1024) + 'KB)');
  await browser.close();

  // ── 합치기 ──
  const ff = (args, label) => new Promise(res => {
    const p = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y'].concat(args));
    p.on('close', c => { if (c !== 0) console.log('⚠ ' + label + ' 실패'); res(c === 0); });
    p.on('error', () => { console.log('⚠ ffmpeg 를 못 찾았습니다'); res(false); });
  });
  const dst = join(OUT, 'jelly-shooting-promo.webm');
  // 영상은 그대로 복사하고 소리만 붙인다(다시 굽지 않는다 — 인코더도 없다)
  const ok = await ff(['-i', silent, '-i', audio, '-map', '0:v:0', '-map', '1:a:0',
                       '-c', 'copy', '-shortest', dst], '소리 붙이기');
  if (!ok) { renameSync(silent, dst); console.log('⚠ 소리 없이 내보냅니다'); }
  else { rmSync(silent, { force: true }); rmSync(audio, { force: true }); }
  console.log('🎬 ' + dst);

  // 낱장은 다 만든 영상에서 뽑는다 (녹화 중에 찍으면 영상이 깨진다)
  const dur = await new Promise(res => {
    let out = ''; const p = spawn(FFMPEG, ['-hide_banner', '-i', dst]);
    p.stderr.on('data', d => out += d);
    p.on('close', () => { const m = out.match(/Duration: (\d+):(\d+):([\d.]+)/);
      res(m ? (+m[1] * 3600 + +m[2] * 60 + parseFloat(m[3])) : 60); });
  });
  const at = f => (dur * f).toFixed(1);
  const STILLS = [['01-cover.png', at(0.035)], ['02-dress.png', at(0.13)], ['03-play.png', at(0.30)],
                  ['04-item.png', at(0.42)], ['05-dungeon.png', at(0.60)], ['06-throw.png', at(0.77)],
                  ['07-win.png', at(0.90)], ['08-end.png', at(0.985)]];
  for (const [name, t] of STILLS) await ff(['-ss', t, '-i', dst, '-frames:v', '1', join(FRM, name)], name);

  // 소개 페이지·아티팩트에 담을 작은 판 — 페이지 안의 영상 액자가 340px 이라 540x1170 이면 넉넉하다.
  // (한 파일로 담는 아티팩트는 16MB 제한이 있어서 큰 영상을 그대로 넣을 수 없다)
  const web = join(OUT, 'jelly-shooting-promo-web.webm');
  if (await ff(['-i', dst, '-vf', 'scale=540:1170', '-c:v', 'libvpx', '-b:v', '480k',
                '-c:a', 'copy', web], '소개 페이지용 작은 판'))
    console.log('🎬 ' + web + '  (540x1170 · 소개 페이지·공유용)');

  // 애플 '앱 미리보기'는 15~30초만 받고, 세로 크기는 886x1920 을 쓴다
  const cut = join(OUT, 'jelly-shooting-promo-886x1920.webm');
  if (await ff(['-i', dst, '-t', '29.5', '-vf', 'scale=886:1920', '-c:v', 'libvpx', '-b:v', '2400k',
                '-c:a', 'copy', cut], '앱 미리보기용 판'))
    console.log('🎬 ' + cut + '  (886x1920 · 앞 29.5초 · 앱 미리보기용)');
  console.log('⏱  전체 ' + dur.toFixed(1) + '초');
  console.log('🖼  낱장(영상에서 뽑음): ' + readdirSync(FRM).sort().join(', '));
};
run().catch(e => { console.error('실패:', e.message); process.exit(1); });

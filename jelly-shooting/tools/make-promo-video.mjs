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
//   press/video/jelly-shooting-promo.webm            소개 영상 (소리 있음, 소개 페이지용)
//   press/video/jellimo-promo.mp4                    유튜브·인스타에 올리는 판
//   press/video/jellimo-play.gif                     itch 설명란에 넣는 움직이는 그림
//   press/video/frames/*.png                          낱장 (영상에서 뽑음)
//
// 영상용으로 손 본 것 (트레일러라서 — 문서에도 적어 둠)
//   · 목숨을 넉넉히 준다 (몇 초 만에 판이 끝나면 보여줄 게 없다)
//   · 아이템이 자주 떨어지게 한다 (와르르 쏟아지는 장면을 보여주려고)
//   · 결과 점수는 실제 한 판 규모(15,200점)로 맞춘다
//
// 쓰기:  node jelly-shooting/tools/make-promo-video.mjs
import { existsSync, mkdirSync, renameSync, readdirSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { spawn, execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const PW = '/opt/node22/lib/node_modules/playwright/index.js';
const pwMod = await import(existsSync(PW) ? 'file://' + PW : 'playwright');
const chromium = (pwMod.chromium || (pwMod.default && pwMod.default.chromium));

// 언어 — node tools/make-promo-video.mjs [--en]
const LANG = process.argv.includes('--en') ? 'en' : 'ko';
// 게임을 이 비율로 느리게 돌리고, 마지막에 그만큼 영상을 당긴다.
// 0.5 면 초당 25장 녹화가 게임 시간 기준 초당 50장이 된다.
const SLOW = 0.5;
const TX = (ko, en) => (LANG === 'en' ? en : ko);

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT  = join(ROOT, 'press', 'video');
const FRM  = join(OUT, 'frames', LANG);
const GAME = 'file://' + join(ROOT, 'index.html');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
// ffmpeg 고르기 — 플레이라이트가 딸려 주는 ffmpeg 에는 인코더가 없어서(합치기만 됨)
// mp4·gif 를 만들려면 온전한 ffmpeg 이 필요하다.  npm i -g ffmpeg-static 하면 생긴다.
const FFMPEG = (() => {
  const cands = ['/opt/node22/lib/node_modules/ffmpeg-static/ffmpeg',
                 '/usr/lib/node_modules/ffmpeg-static/ffmpeg',
                 '/usr/bin/ffmpeg',
                 '/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux'];
  for (const c of cands) if (existsSync(c)) return c;
  return 'ffmpeg';
})();
// 이 ffmpeg 이 h264 를 구울 수 있나 (mp4 를 만들 수 있나)
const CAN_ENCODE = (() => {
  try { return execSync(JSON.stringify(FFMPEG) + ' -hide_banner -encoders 2>/dev/null')
          .toString().includes('libx264'); } catch { return false; }
})();
rmSync(FRM, { recursive: true, force: true });
mkdirSync(FRM, { recursive: true });

const VW = 430, VH = 932;              // 게임을 보는 창 (아이폰 6.7" 와 같은 비율)
// 녹화 크기 = 창 크기 × 2.
// ⚠ 플레이라이트 녹화는 프레임을 'CSS 창 크기'로 받아 오고, 그보다 큰 녹화 크기를 주면
//   남는 자리를 회색으로 채운다(키워 주지 않는다). 브라우저 자체를 2배로 띄우면
//   (--force-device-scale-factor=2) CSS 창이 860x1864 로 잡혀 꽉 찬 고화질 영상이 나온다.
// 녹화 크기 = 창 크기 그대로(1배). 실측으로 정한 값이다 —
//   dpr2 + 720x1560 녹화 → 게임이 초당 23장 (버벅였다)
//   dpr1.5 + 645x1398   → 34장
//   dpr1 + 430x932      → 60장 (완전히 매끄럽다)
// 화면을 2배로 그리면 게임과 인코더가 같이 느려져서, 크기보다 매끄러움을 골랐다.
// 페이지에서는 340px 폭으로 보여 주므로 430 이면 충분하고, 앱 미리보기용만 886 으로 키운다.
const RW = 430, RH = 932;
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
  /* 장면 전환용 흰 천 — 이 뒤에서 화면을 갈아 끼운다 */
  #__wipe{position:fixed;inset:0;z-index:99997;background:#fff6fb;opacity:0;pointer-events:none;
    transition:opacity .32s ease;}
  #__wipe.on{opacity:1;}
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
  const wipe=document.createElement('div'); wipe.id='__wipe'; document.body.appendChild(wipe);
  window.__wipeOn =()=>wipe.classList.add('on');
  window.__wipeOff=()=>wipe.classList.remove('on');
  return 1; })()`;

// ── 세상을 절반 속도로 돌리는 장치 ──
// 화면을 그리는 시계(rAF·performance.now)와 타이머를 모두 절반으로 늦춘다.
// Date.now 는 건드리지 않는다 — 소리 기록은 '실제 시각'으로 남기고, 나중에 절반을
// 곱해 영상 시간으로 옮긴다. (여기서 Date.now 까지 늦추면 두 번 늦춰진다)
const SLOW_SHIM = `(()=>{
  const S=${SLOW};
  if(window.__slowed) return 1; window.__slowed=1;
  const rAF=window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame=cb=>rAF(t=>cb(t*S));
  const pn=performance.now.bind(performance);
  window.__realNow=pn;
  performance.now=()=>pn()*S;
  const sI=window.setInterval.bind(window), sT=window.setTimeout.bind(window);
  window.__realSetInterval=sI;
  window.setInterval=(fn,ms,...a)=>sI(fn,(ms||0)/S,...a);
  window.setTimeout =(fn,ms,...a)=>sT(fn,(ms||0)/S,...a);
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
  // 초당 몇 프레임이 그려지는지 재 둔다 — 버벅임을 숫자로 확인하려고
  window.__fps=[]; let __fc=0, __fl=Date.now();
  // 초당 몇 장이 '실제로' 그려지는가 (rAF 시각은 늦춰져 있으니 Date.now 로 잰다)
  (function fps(){ __fc++; const n=Date.now();
    if(n-__fl>=1000){ window.__fps.push(Math.round(__fc*1000/(n-__fl))); __fc=0; __fl=n; }
    requestAnimationFrame(fps); })();
  window.__st = [];                      // 배경음악용 상태 [시각(실제 ms), 어떤 곡인가]
  window.__stT = (window.__realSetInterval||setInterval)(()=>{
    try{ __st.push([Date.now()-window.__t0, (typeof bgmWant==='function')?bgmWant():(running?'main':null)]); }catch(e){}
  }, 200);
  return window.__t0; })()`;

// 젤리 하나를 고르고 그 자리를 '그 화면 안에서' 눌러 준다.
// 예전에는 (좌표 물어보기 → 마우스 클릭) 두 번 왕복했는데, 그 왕복이 렌더링을 끊어
// 영상이 버벅였다. 게임이 듣는 건 캔버스의 mousedown 이라 여기서 그대로 만들어 보낸다.
const POP = `(()=>{
  if(!running||!jellies.length) return 0;
  const cand=jellies.filter(j=>!j.dead&&!j.bomb&&j.y>60&&j.y<H-40);
  if(!cand.length) return 0;
  cand.sort((a,b)=>b.y-a.y);
  const j=cand[0];
  // 화면이 텅 빈 영상은 심심하니 급하지 않으면 조금 기다린다
  if(j.y < H*0.5 && cand.length < 5) return 0;
  const r=canvas.getBoundingClientRect();
  canvas.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,
    clientX:r.left+j.x/W*r.width, clientY:r.top+j.y/H*r.height}));
  return 1;
})()`;

const run = async () => {
  const browser = await chromium.launch({ executablePath: CHROME,
    args: ['--no-sandbox', '--allow-file-access-from-files', '--mute-audio',
           '--force-device-scale-factor=1',
           // 창이 뒤로 밀렸다고 판단해 rAF·타이머를 늦추면 그게 곧 버벅임이 된다
           '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
           '--disable-backgrounding-occluded-windows',
           '--disable-features=CalculateNativeWinOcclusion'] });
  const ctxAt = Date.now();                     // 녹화가 시작되는 시각 (소리 맞추기용)
  const ctx = await browser.newContext({
    viewport: { width: VW, height: VH }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    locale: LANG === 'en' ? 'en-US' : 'ko-KR',
    recordVideo: { dir: OUT, size: { width: RW, height: RH } } });
  // 게임은 첫 줄에서 저장된 언어를 읽는다 → 페이지가 뜨기 전에 정해 준다.
  // (뜬 뒤에 setLang 으로 바꾸면 한국어로 되돌릴 때 새로고침이 걸려 녹화가 끊긴다)
  await ctx.addInitScript(`try{ localStorage.setItem('jelly_lang', ${JSON.stringify(LANG)});
    localStorage.setItem('jelly_tut','1'); }catch(e){}`);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('⚠ 페이지 오류:', e.message));

  const missed = [];              // 못 누른 곳 — 끝에 몰아서 보여 준다
  const T0 = Date.now();
  const mark = n => console.log('   ⏱ ' + ((Date.now() - T0) / 1000).toFixed(1) + 's  ' + n);
  // ⚠ 녹화 중에는 page.screenshot() 을 부르지 말 것. 그 순간 프레임이 CSS 크기로 들어와
  //   영상에 '작게 박힌 화면'이 생긴다. 낱장은 다 만든 영상에서 뽑는다.
  const ev = e => page.evaluate(e).catch(() => null);
  // 글자를 읽을 시간은 최종 영상 기준 — 게임이 절반 속도라 실제로는 그 두 배를 기다린다
  const hold = ms => sleep(ms / SLOW);

  // 장면 바꾸기 — 흰 천을 덮고, 그 뒤에서 판을 정리하고, 다음 판이 뜬 뒤에 천을 걷는다.
  // 천 없이 바로 갈아 끼우면 홈 화면이 한 번 번쩍이고 지나가 어수선하다.
  const goHome = async () => {
    await ev(`__wipeOn()`);
    await hold(340);                       // 천이 덮이는 동안 (0.32초 페이드)
    await ev(`(()=>{ running=false; paused=false; boardUnlock(); try{aiStop();}catch(e){} try{netLeave();}catch(e){}
      ['hud','audioBar','itemBar','pauseBtn','netBar','throwWrap'].forEach(id=>$(id).classList.add('hide'));
      openStart(); return 1; })()`);
    await sleep(500);
  };
  // 다음 판이 뜬 뒤 천을 걷는다
  const showAgain = async () => { await ev(`__wipeOff()`); await hold(340); };
  const cap = (t, s, low) => ev(`__cap(${JSON.stringify(t)},${JSON.stringify(s || '')},${!!low})`);
  const capOff = () => ev(`__capOff()`);
  // 진짜로 젤리를 눌러 플레이한다. ms 동안, 대략 gap 마다 한 번.
  const play = async (ms, gap = 240) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const t1 = Date.now();
      await page.evaluate(POP).catch(() => 0);
      // 고르고 누르는 데 걸린 시간을 빼야 영상 길이가 계획대로 나온다
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
    if (!box) { console.log('   ⚠ 못 누름: ' + sel + '[' + nth + ']'); missed.push(sel + '[' + nth + ']'); return false; }
    await sleep(180);                      // 굴러가는 동안 기다린다
    await page.mouse.click(box.x, box.y).catch(() => {});
    return true;
  };
  // 판이 진짜로 시작될 때까지 기다린다 (카운트다운 길이가 상황마다 달라서 고정 대기는 위험하다)
  // 게임이 절반 속도로 돌므로 실제로 기다려야 하는 시간도 그만큼 길다
  const waitFor = async (cond, ms = 9000, what = '') => {
    ms = ms / SLOW;
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
  await page.evaluate(`(()=>{ localStorage.clear(); soundOn=true; bgmOn=false;
    // 첫 판 가이드를 '이미 봤다'고 표시한다 — 안 하면 혼자 하기·핵불닭이 가이드로 가로채인다
    // 언어도 다시 넣는다 (clear 가 방금 지웠다)
    try{ localStorage.setItem('jelly_tut','1');
         localStorage.setItem('jelly_lang', ${JSON.stringify(LANG)}); }catch(e){}
    saveNick(${JSON.stringify(TX('까미', 'Kami'))});
    coins=12400;
    character.kind='bunny'; character.color='#ffb3c9'; character.acc='none'; saveChar(); saveEconomy();
    ['heart','slow','clear','x2','magnet'].forEach((id,i)=>{ if(!crafted.includes(id))crafted.push(id);
      bought[id]=[3,3,3,4,3][i]; inventory[id]=[3,2,2,2,2][i]; });
    ownedKinds=['cat','dog','bunny','bear','human','girl']; ownedHairs=HAIRS.map(h=>h.id);
    openStart(); $('dailyBtn').style.display='none'; return 1; })()`);
  // 실제로 그 말로 떠 있는지 확인한다 (조용히 영어로 뜬 영상을 한국어라고 내보내면 큰일이다)
  const shownLang = await page.evaluate('lang');
  if (shownLang !== LANG) { console.error('❌ 화면 언어가 ' + shownLang + ' 입니다 (원한 건 ' + LANG + ')'); process.exit(1); }
  console.log('   🗣  화면 언어 ' + shownLang);
  await page.evaluate(SLOW_SHIM);          // 여기서부터 게임이 절반 속도로 돈다
  await page.evaluate(OVERLAY);
  const pageT0 = await page.evaluate(SFX_SHIM);
  const audioOffset = pageT0 - ctxAt;      // 녹화 시작 → 소리 기록 시작 사이의 간격(ms)
  mark('준비 끝 (소리 맞춤 간격 ' + audioOffset + 'ms)');

  // ── ① 표지 ──
  await ev(`__card(${JSON.stringify(TX('젤리모', 'Jellimo'))},`
    + `${JSON.stringify(TX('가족도, 연인도, 친구도 · 3분이면 한 판', 'Family, friends, and that one competitive cousin'))},`
    + `${JSON.stringify(TX('앱도 가입도 없이 바로', 'No app. No sign-up. Just a link.'))})`);
  await hold(3000);                 // 여는 카드 — 세 줄을 읽을 만큼
  await ev(`__cardOff()`);
  await hold(700);                  // 카드가 사라지는 걸 보고 넘어간다 (0.45초 페이드)

  // ── ② 내 캐릭터 — 얼굴이 바뀌는 걸 보여 준다 ──
  // 예전 판에서는 선택지를 누르려고 화면을 아래로 굴렸고, 그 바람에 캐릭터 얼굴이
  // 위로 밀려 사라졌다. 누른 뒤 곧바로 맨 위로 되돌려 얼굴을 크게 보여 준다.
  // 고르는 것도 둘만 — 피부색과 머리. 얼굴이 눈에 띄게 달라지는 두 가지다.
  const toFace = () => ev(`(()=>{ const s=$('profileScreen'); if(s) s.scrollTop=0; return 1; })()`);
  // 칩을 누르면 게임이 프로필을 다시 그린다. 그 전에 스크롤을 되돌리면 다시 그릴 때 도로
  // 내려간다 — 그래서 얼굴이 화면 밖으로 나가 있었다. 다시 그린 뒤에 되돌리고, 한 번 더 확인한다.
  const pick = async (sel, nth) => {
    await tap(sel, nth);
    await sleep(320);          // 다시 그리기가 끝날 때까지
    await toFace();
    await sleep(120);
    await toFace();            // 그래도 움직였으면 한 번 더
  };
  await ev(`__wipeOn()`); await hold(340);
  await ev(`(()=>{ openProfile('startScreen'); buildProfile&&buildProfile(); return 1; })()`);
  await sleep(500);
  await toFace();
  await showAgain();
  await cap(TX('내 캐릭터를 만들어요','Make your own jelly'),
            TX('아홉 종 · 색깔 · 얼굴 무늬 · 악세서리','9 characters · colours · face marks · accessories'));
  await hold(900);
  await pick('#kindOpts button', 2);         // 토끼 — 이 게임의 기본이자 제일 귀여운 얼굴
  await hold(1100);
  await pick('#colorOpts button', 0);        // 분홍
  await hold(1000);
  await pick('#faceOpts button', 4);         // 볼 하트 💗
  await hold(1000);
  await pick('#accOpts button', 1);          // 리본 🎀
  await hold(1300);
  await capOff();
  await hold(400);
  mark('내 캐릭터');

  // ── ③ 혼자 하기 — 바로 판으로 들어간다 ──
  // 꾸미기·난이도 고르기 장면은 뺐다. 메뉴를 여러 번 눌러 가는 화면이라
  // '플레이'가 아니라 'UI 조작'으로 보이고, 그게 영상이 어색한 가장 큰 원인이었다.
  // 꾸민 캐릭터는 판 안에서 계속 보이므로 준비 단계에서 미리 입혀 둔다.
  await ev(`__wipeOn()`); await hold(340);
  await ev(`(()=>{ try{ openStart(); }catch(e){} mode=userMode='spicy'; startGame(); return 1; })()`);
  await waitFor('running', 9000, '혼자 하기 시작');
  await showAgain();
  await sleep(500);
  // 트레일러용: 목숨을 넉넉히, 아이템이 자주 떨어지게
  await ev(`(()=>{ lives=6; updateHud();
    window.__rush=setInterval(()=>{ try{ if(running){ if(lives<4){lives=4;updateHud();}
      if(dropTimer>90) dropTimer=45; } }catch(e){} },600); return 1; })()`);
  await cap(TX('톡 터트리면 콤보!','Tap. It pops. Chain it.'), TX('규칙은 3초면 배워요','Three seconds to learn the whole rule'));
  await play(6000, 230);
  await capOff();
  // 아이템은 하나만 — 네 개를 차례로 누르면 그것도 '메뉴 조작'이 된다
  await tap('#itemBar .itembtn', 3);        // 2배 점수
  await play(3000, 230);
  await ev(`(()=>{ clearInterval(window.__rush); return 1; })()`);
  mark('혼자 하기');

  // ── ③-b ♾ 끝없는 모드의 거대 보스 ──
  // 최근에 들어온 내용인데 예전 영상에는 없었다. 판에 '목표'가 생기는 장면이라 빼면 아깝다.
  await goHome();
  await ev(`(()=>{ nextEndless=true; restoreMode(); startGame(); return 1; })()`);
  await waitFor('running', 9000, '끝없는 모드 시작');
  await showAgain();
  await sleep(400);
  await cap(TX('♾️ 끝없는 모드', '♾️ Endless mode'),
            TX('5레벨마다 거대 보스가 내려와요', 'A giant boss drops in every 5 levels'));
  // 보스가 제 발로 나올 때까지 기다리면 영상이 1분 길어진다 → 그 장면만 불러온다
  await ev(`(()=>{ lives=6; level=BOSS_EVERY; bossLv=0; updateHud();
    window.__rush=setInterval(()=>{ try{ if(running&&lives<4){lives=4;updateHud();} }catch(e){} },600);
    return 1; })()`);
  await sleep(900);
  await ev(`(()=>{ if(!boss) bossSpawn();
    if(boss){ boss.y = boss.r*1.28;            // 몸통이 다 보이는 자리로 바로
              boss.hp = boss.hpMax = 30; }      // 5초 만에 안 죽게 (체력바가 줄어드는 걸 보여 준다)
    return 1; })()`);
  await sleep(1900);
  await capOff();
  // 보스를 실제로 때린다 (보스는 몸통을 누르면 맞는다)
  const hitBoss = async () => {
    await page.evaluate(`(()=>{ if(!boss) return 0;
      const r=canvas.getBoundingClientRect();
      canvas.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,
        clientX:r.left+boss.x/W*r.width, clientY:r.top+boss.y/H*r.height}));
      return 1; })()`).catch(() => 0);
  };
  for (let i = 0; i < 46; i++) { await hitBoss(); await page.evaluate(POP).catch(() => 0); await sleep(190); }
  await sleep(1600);
  await ev(`(()=>{ clearInterval(window.__rush); return 1; })()`);
  mark('거대 보스');

  // ── ③-c 🔥 핵불닭 버티기 ──
  // 이 게임에서 제일 센 장면. 여기서는 목숨을 채워 주지 않는다 — 진짜로 어려워야 설득된다.
  await goHome();
  await tap('#fireBtn');
  await waitFor('running', 9000, '핵불닭 시작');
  await showAgain();
  await sleep(400);
  await cap(TX('귀엽다고 얕보지 마세요', 'Cute? Sure. Merciful? No.'),
            TX('🔥 핵불닭 — 목숨 2개, 속도 3.2배', '🔥 Nuclear — 2 lives, 3.2× speed'));
  await play(5600, 165);
  await capOff();
  await cap(TX('10초도 못 버틸걸요? 😏', 'You will not last 10 seconds 😏'),
            TX('버틴 시간으로 순위가 매겨져요', 'Ranked by how long you survived'), true);
  await play(4800, 165);
  await capOff();
  await sleep(400);
  mark('핵불닭');

  // ── ④ 실시간 던전 (AI와) — 방해를 주고받는다 ──
  // 결과 화면을 거치지 않고 홈으로 (몇 초 플레이한 점수가 영상에 나오면 초라하다)
  await goHome();
  await ev(`(()=>{ aiGame='dungeon'; aiTier='smart'; netModeName='spicy'; userMode='spicy';
    aiGo(); return 1; })()`);
  await waitFor('running', 12000, '던전 시작');   // 카운트다운 3-2-1 이 끝날 때까지
  await showAgain();
  await cap(TX('같은 판에서 실시간 대전','Up to 4 players, one board'), TX('방 코드만 알려주면 2~4명이 함께','Share a 4-letter code and you are in'));
  await sleep(400);
  await ev(`(()=>{ lives=6; updateHud();
    window.__rush=setInterval(()=>{ try{ if(running){ if(lives<4){lives=4;updateHud();}
      throwGauge=HEX_MAX; bolt=BOLT_NEED; updateGauge(); } }catch(e){} },500); return 1; })()`);
  await play(4200, 230);
  await capOff();
  await sleep(200);
  await cap(TX('방해를 던져요','Throw junk at the others'), TX('내가 터트린 게 친구 화면으로','What you pop lands on their screen'));
  for (const h of ['zig', 'fog']) {          // 눈에 제일 잘 띄는 둘만 — 다섯 개를 다 누르면 또 메뉴 조작이 된다
    await tap('#hex_' + h);
    await play(2200, 230);
  }
  await capOff();
  await play(1500, 230);
  await ev(`(()=>{ clearInterval(window.__rush); return 1; })()`);
  mark('실시간 던전');


  // ── ⑥ 이겼을 때 ──
  await ev(`(()=>{
    // 영상은 1분 남짓이라 실제 2분 판의 점수까지 못 쌓인다. 스토어 스크린샷과 같은
    // '시연용 점수'를 넣어 결과 화면이 실제 한 판처럼 보이게 한다.
    score=15200; net.myScore=15200;
    if(aiOn){ aiS.score=9800; }
    gameOver();
    // 끝내는 함수가 화면 숫자를 자기 값으로 다시 쓴다. 몇 초 플레이한 점수(1,620점)가
    // 마지막 장면에 남으면 초라해서, 끝난 뒤에 시연용 값으로 한 번 더 고정한다.
    try{ $('finalScore').textContent='15200'; }catch(e){}
    return 1; })()`);
  await waitFor(`!$('overScreen').classList.contains('hide')`, 8000, '결과 화면');
  await hold(1800);
  await cap(TX('이기면 춤추고 · 지면 분해요','Winner dances. Loser sulks.'), TX('그 판의 표정이 그림으로 남아요','The round ends as a picture you can share'), true);
  await hold(3200);                 // 그림을 볼 시간 — 여기가 이 게임에서 제일 잘 퍼지는 장면이다
  await capOff();
  await hold(500);
  mark('결과');

  // ── ⑦ 마무리 표지 ──
  await ev(`__wipeOn()`); await hold(340);      // 결과 화면에서 카드로 부드럽게
  await ev(`__card(${JSON.stringify(TX('지금 한 판 해요', 'Play a round right now'))},`
    + `${JSON.stringify(TX('방 코드 네 자리만 보내면 끝', 'Send four letters. That is the whole invite.'))},`
    + `${JSON.stringify('zingy-cupcake-98444a.netlify.app')})`);
  await ev(`__wipeOff()`);
  await hold(3600);                 // 닫는 카드 — 주소를 읽고 손으로 옮겨 적을 시간
  mark('마지막 장면');

  // 소리 기록을 가져온다
  const sfx = await page.evaluate(`(()=>{ clearInterval(window.__stT);
    return {log:window.__sfx, st:window.__st, fps:window.__fps, end:Date.now()-window.__t0}; })()`);
  writeFileSync(join(OUT, '__sfx-log.json'), JSON.stringify(sfx));
  if (sfx.fps && sfx.fps.length) {
    const f = sfx.fps.slice(1);                 // 첫 칸은 창이 뜨는 중이라 뺀다
    const avg = Math.round(f.reduce((a, b) => a + b, 0) / f.length);
    const low = f.filter(v => v < 45).length;
    console.log('   🎞 그림 초당 ' + avg + '장 (가장 낮은 값 ' + Math.min(...f)
      + ' · 45장 미달 ' + low + '초)');
  }
  const tally = {}; sfx.log.forEach(([f]) => tally[f] = (tally[f]||0)+1);
  console.log('   🔎 마지막 소리들: ' + sfx.log.slice(-6)
    .map(([f,,t]) => f.replace('play','') + '@' + (t/1000).toFixed(1) + 's').join(', '));
  console.log('   🔔 소리 ' + sfx.log.length + '개 ('
    + Object.entries(tally).map(([k,v])=>k.replace('play','')+' '+v).join(', ')
    + ') · 상태 ' + sfx.st.length + '칸');

  const video = page.video();
  await ctx.close();                      // 닫아야 영상 파일이 완성된다
  const raw = await video.path();
  const silent = join(OUT, `__silent-${LANG}.webm`);
  renameSync(raw, silent);

  // ── 소리 만들기 ──
  // 게임의 AC 를 OfflineAudioContext 로 바꿔치기하고, 기록해 둔 순서대로 진짜 소리 함수를 부른다.
  const apage = await browser.newPage();
  await apage.goto(GAME);
  await apage.waitForFunction("typeof playSquish==='function'", null, { timeout: 20000 });
  // 녹화된 영상의 길이를 먼저 잰다 (당기기 전, 초당 25장 기준)
  const probe = f => new Promise(res => {
    let out = ''; const q = spawn(FFMPEG, ['-hide_banner', '-i', f]);
    q.stderr.on('data', d => out += d);
    q.on('close', () => { const m = out.match(/Duration: (\d+):(\d+):([\d.]+)/);
      res(m ? (+m[1] * 3600 + +m[2] * 60 + parseFloat(m[3])) : 0); });
  });
  const rawDur = await probe(silent);                 // 녹화 영상 길이(초)
  const realMs = sfx.end + audioOffset;               // 실제로 흐른 시간(ms)
  // 둘이 어긋난 만큼 소리 시각을 늘리거나 줄인다. 1 에서 멀수록 녹화가 헐거웠다는 뜻.
  const rate = (rawDur > 1 && realMs > 1) ? (rawDur * 1000 / realMs) : 1;
  const audioDur = rawDur * SLOW + 1.0;               // 영상을 당긴 뒤의 길이
  console.log('   ⏲ 녹화 ' + rawDur.toFixed(1) + '초 · 실제 ' + (realMs / 1000).toFixed(1)
    + '초 · 시간 눈금 ' + rate.toFixed(3) + (Math.abs(rate - 1) > 0.03 ? ' (어긋난 만큼 소리를 맞춥니다)' : ''));
  const abuf = await apage.evaluate(`(async ([log, states, dur, off, slow]) => {
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
    const REAL_VOL=bgmVol;
    bgmVol=(n)=>Math.min(0.22,(REAL_VOL(n)||0.15)*1.35);
    // 배경음악 — 게임의 bgmTick 을 '그때 어떤 곡이었나' 표에 맞춰 돌린다.
    // bgmForce 에 곡 이름을 넣으면 bgmWant 가 그걸 그대로 쓴다.
    const st2 = states.length ? states : [[0,'main']];
    const lastT = st2[st2.length-1][0];
    const seen = {};
    // t 는 실제로 흐른 시간이다. 영상을 slow 배로 당길 거라 소리 시각도 그만큼 곱한다.
    for(let t=0; t<=lastT+1500; t+=200){
      const near = st2.reduce((a,b)=>Math.abs(b[0]-t)<Math.abs(a[0]-t)?b:a, st2[0]);
      NOW=(t+off)*slow/1000; if(NOW<0) continue;
      // 화면이 게임 밖(꾸미기·결과)일 때는 앞 곡을 이어 둔다 — 무음보다 낫다
      bgmForce = near[1] || bgmCur || 'main';
      seen[bgmForce]=(seen[bgmForce]||0)+slow;
      try{ bgmTick(); }catch(e){}
    }
    bgmForce=null;
    window.__bgmSeen=seen;
    // 효과음
    for(const [f,a,t] of log){
      NOW=(t+off)*slow/1000; if(NOW<0) continue;
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
    return {b64:btoa(s), dur:buf.duration, bgm:window.__bgmSeen||{}};
  })([${JSON.stringify(sfx.log)}, ${JSON.stringify(sfx.st)}, ${audioDur}, ${audioOffset}, ${SLOW * rate}])`);
  const audio = join(OUT, `__audio-${LANG}.webm`);
  writeFileSync(audio, Buffer.from(abuf.b64, 'base64'));
  console.log('   🎵 소리 ' + abuf.dur.toFixed(1) + '초 ('
    + Math.round(Buffer.from(abuf.b64, 'base64').length / 1024) + 'KB)');
  // 어떤 곡이 몇 번 나왔나 — 보스·핵불닭 곡이 0 이면 그 장면 음악이 안 들어간 것이다
  const bgm = abuf.bgm || {};
  const bgmLine = Object.keys(bgm).map(k => k + ' ' + (bgm[k] * 0.2).toFixed(1) + '초').join(' · ');   // 영상 시간 기준
  console.log('   🎶 곡: ' + (bgmLine || '(없음)'));
  for (const need of ['main', 'boss', 'fire']) if (!bgm[need]) console.log('   ⚠ ' + need + ' 곡이 한 번도 안 나왔습니다');
  await browser.close();

  // ── 합치기 ──
  const ff = (args, label) => new Promise(res => {
    const p = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y'].concat(args));
    p.on('close', c => { if (c !== 0) console.log('⚠ ' + label + ' 실패'); res(c === 0); });
    p.on('error', () => { console.log('⚠ ffmpeg 를 못 찾았습니다'); res(false); });
  });
  const dst = join(OUT, `jellimo-promo-${LANG}.webm`);
  // ⏩ 여기가 매끄러움의 핵심이다.
  // 녹화는 초당 25장이 한계인데, 게임을 절반 속도로 돌려 놨으니 그 25장은
  // '게임 시간 1초당 50장'이다. 영상을 2배로 당기면 원래 속도 · 초당 50장이 된다.
  // (프레임을 지어내는 보간이 아니라, 실제로 그려진 그림들이다)
  const FPS = Math.round(25 / SLOW);
  const ok = await ff(['-i', silent, '-i', audio,
                       '-filter_complex', `[0:v]setpts=${SLOW}*PTS,fps=${FPS}[v]`,
                       '-map', '[v]', '-map', '1:a:0',
                       '-c:v', 'libvpx', '-b:v', '2600k', '-cpu-used', '2',
                       // 이제 소리를 영상보다 1초 길게 만드니, -shortest 가 자르는 쪽은 소리다.
                       // (예전에는 소리가 짧아서 영상 끝 — 마지막 카드 — 이 통째로 잘렸다)
                       '-c:a', 'copy', '-shortest', dst], '2배로 당겨 합치기');
  if (!ok) { renameSync(silent, dst); console.log('⚠ 소리 없이 내보냅니다'); }
  else { rmSync(silent, { force: true }); rmSync(audio, { force: true }); }
  console.log('🎬 ' + dst + '  [' + LANG + ' · 초당 ' + FPS + '장]');

  // 낱장은 다 만든 영상에서 뽑는다 (녹화 중에 찍으면 영상이 깨진다)
  const dur = await new Promise(res => {
    let out = ''; const p = spawn(FFMPEG, ['-hide_banner', '-i', dst]);
    p.stderr.on('data', d => out += d);
    p.on('close', () => { const m = out.match(/Duration: (\d+):(\d+):([\d.]+)/);
      res(m ? (+m[1] * 3600 + +m[2] * 60 + parseFloat(m[3])) : 60); });
  });
  const at = f => (dur * f).toFixed(1);
  const STILLS = [['01-cover.png', at(0.030)], ['02-dress.png', at(0.115)], ['03-play.png', at(0.255)],
                  ['04-item.png', at(0.345)], ['05-boss.png', at(0.385)], ['06-fire.png', at(0.520)],
                  ['07-dungeon.png', at(0.640)], ['08-throw.png', at(0.790)],
                  ['09-win.png', at(0.910)], ['10-end.png', at(0.987)]];
  for (const [name, t] of STILLS) await ff(['-ss', t, '-i', dst, '-frames:v', '1', join(FRM, name)], name);

  // 소개 페이지·아티팩트에 담을 작은 판 — 페이지 안의 영상 액자가 340px 이라 540x1170 이면 넉넉하다.
  // (한 파일로 담는 아티팩트는 16MB 제한이 있어서 큰 영상을 그대로 넣을 수 없다)
  const web = join(OUT, `jellimo-promo-${LANG}-web.webm`);
  if (await ff(['-i', dst, '-c:v', 'libvpx', '-b:v', '420k', '-c:a', 'copy', web],
               '소개 페이지용 작은 판'))
    console.log('🎬 ' + web + '  (430x932 · 용량만 줄인 판 · 소개 페이지·공유용)');

  // ── 유튜브·인스타·itch 에 올릴 판 ──
  // webm 은 인스타가 안 받고, itch 설명란도 유튜브 링크를 받는다 → mp4(h264+aac)가 공용 화폐다
  if (CAN_ENCODE) {
    const mp4 = join(OUT, `jellimo-promo-${LANG}.mp4`);
    if (await ff(['-i', dst, '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
                  '-r', String(FPS), '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
                  '-c:a', 'aac', '-b:a', '160k', mp4], '유튜브용 mp4'))
      console.log('🎬 ' + mp4 + '  (860x1864 · 유튜브·인스타 릴스에 그대로 올리는 판)');


    // itch 설명란 맨 위에 넣을 움직이는 그림 (소리 없이도 무슨 게임인지 보이게)
    const gif = join(OUT, `jellimo-play-${LANG}.gif`);
    const pal = join(OUT, `__pal-${LANG}.png`);
    const GS = Math.max(4, dur * 0.27), GD = 7;   // 실제로 젤리를 터트리는 구간에서 7초
    if (await ff(['-ss', GS.toFixed(1), '-t', String(GD), '-i', dst,
                  '-vf', 'fps=14,scale=300:-1:flags=lanczos,palettegen=max_colors=128', pal], 'gif 색표')
     && await ff(['-ss', GS.toFixed(1), '-t', String(GD), '-i', dst, '-i', pal,
                  '-lavfi', 'fps=14,scale=300:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3',
                  '-loop', '0', gif], 'gif')) {
      rmSync(pal, { force: true });
      const mb = (statSync(gif).size / 1024 / 1024).toFixed(2);
      console.log('🎬 ' + gif + '  (300px · ' + GD + '초 반복 · ' + mb + 'MB · itch 설명란·트위터용)');
    }
  } else {
    console.log('⚠ 이 ffmpeg 에는 인코더가 없어 mp4·gif 는 못 만듭니다 — npm i -g ffmpeg-static');
  }

  console.log('⏱  전체 ' + dur.toFixed(1) + '초');
  console.log('🖼  낱장(영상에서 뽑음): ' + readdirSync(FRM).sort().join(', '));
  if (missed.length) { console.log('❌ 못 누른 곳 ' + missed.length + '군데: ' + missed.join(', '));
                       console.log('   (그 장면은 영상에 안 들어갔습니다 — 고치고 다시 돌리세요)'); }
  else console.log('✅ 모든 장면 정상');
};
run().catch(e => { console.error('실패:', e.message); process.exit(1); });

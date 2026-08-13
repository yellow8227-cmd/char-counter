// 게임 소개 영상 만들기 — 실제로 게임을 플레이해서 녹화한다
//
// 왜 이렇게 만드나
//  · 화면을 손으로 편집한 영상은 게임을 고칠 때마다 다시 찍어야 한다. 여기서는
//    스크립트가 진짜 게임을 열어서 진짜로 젤리를 눌러 플레이하고, 그 화면을 녹화한다.
//    (마우스 클릭을 실제로 보내므로 게임이 받는 입력도 사람과 같다)
//  · 자막은 게임 페이지 위에 얹는 DOM 이다 — 따로 편집 프로그램이 필요 없다.
//
// 만들어지는 것
//   press/video/jelly-shooting-promo.webm   (720x1560, 약 39초, 소리 없음)
//   press/video/frames/*.png               (겉표지·마무리 장면 등 뽑아 쓸 낱장)
// (폴더·파일 이름은 영문으로 둔다 — 한글 경로는 웹에 올렸을 때 주소가 깨지기 쉽다)
//
// ⚠ 이 컨테이너에는 h264/mp4 인코더가 없다(플레이라이트가 딸고 온 ffmpeg는 VP8/WebM 전용).
//   앱스토어 미리보기 영상은 .mov/.mp4 를 요구하니, 올릴 때는 webm 을 한 번 변환해야 한다.
//   예)  ffmpeg -i jelly-shooting-promo.webm -c:v libx264 -pix_fmt yuv420p promo.mp4
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
// 지난 번 낱장이 남아 있으면 어느 것이 이번 것인지 헷갈린다 — 비우고 시작한다
rmSync(FRM, { recursive: true, force: true });
mkdirSync(FRM, { recursive: true });

const VW = 430, VH = 932;              // 게임을 보는 창 (아이폰 6.7" 와 같은 비율)
// 녹화 크기 = 창 크기 × 2.
// ⚠ 여기가 함정이었다: 플레이라이트 녹화는 프레임을 'CSS 창 크기'로 받아 오고, 그보다 큰
//   녹화 크기를 주면 남는 자리를 회색으로 채운다(키워 주지 않는다). 그래서 게임이 도는
//   동안 화면이 액자 왼쪽 위에 작게 박혔다. 브라우저 자체를 2배로 띄우면(--force-device-scale-factor=2)
//   CSS 창 크기 자체가 2배로 잡혀서 꽉 찬 고화질 영상이 나온다.
const RW = 860, RH = 1864;             // 430x932 의 정확히 2배 (앱 미리보기 886x1920 과 같은 비율)

// ── 페이지에 얹는 자막·표지 ──
const OVERLAY = `(()=>{
  const st=document.createElement('style');
  st.textContent=\`
  #__cap{position:fixed;left:0;right:0;top:13%;z-index:99998;display:flex;justify-content:center;
    pointer-events:none;opacity:0;transition:opacity .35s ease, transform .35s ease;transform:translateY(-8px);}
  #__cap.on{opacity:1;transform:none;}
  #__cap.low{top:auto;bottom:5%;}
  #__cap .in{background:rgba(255,255,255,.93);border-radius:22px;padding:12px 22px;text-align:center;
    box-shadow:0 10px 26px rgba(180,90,140,.28);max-width:86%;}
  #__cap b{display:block;font-size:28px;font-weight:400;color:#e6336b;letter-spacing:-.5px;
    font-family:'Jua','Apple SD Gothic Neo',sans-serif;}
  #__cap span{display:block;margin-top:5px;font-size:17px;font-weight:400;color:#7c5c8e;
    font-family:'Jua','Apple SD Gothic Neo',sans-serif;}
  #__card{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:14px;opacity:0;transition:opacity .5s ease;pointer-events:none;
    background:radial-gradient(120% 90% at 20% 0%, #fff 0%, #ffe3f0 45%, #efe2ff 100%);}
  #__card.on{opacity:1;}
  #__card .t{font-size:62px;font-weight:400;color:#e6336b;letter-spacing:-1px;line-height:1.08;
    text-align:center;font-family:'Jua','Apple SD Gothic Neo',sans-serif;}
  #__card .s{font-size:21px;font-weight:400;color:#7c5c8e;text-align:center;
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
    // 표지에도 게임의 캐릭터를 그대로 쓴다
    const cv=document.getElementById('__cardCv'), g=cv.getContext('2d');
    g.clearRect(0,0,cv.width,cv.height);
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

// 지금 화면에서 누를 만한 젤리 하나를 골라 '화면 좌표'로 돌려준다.
// 폭탄은 피하고, 바닥에 가까운 것부터 — 사람이 하는 판단과 같게.
const PICK = `(()=>{
  if(!running||!jellies.length) return null;
  const r=canvas.getBoundingClientRect();
  const cand=jellies.filter(j=>!j.dead&&!j.bomb&&j.y>60&&j.y<H-40);
  if(!cand.length) return null;
  cand.sort((a,b)=>b.y-a.y);
  const j=cand[0];
  // 화면이 텅 빈 영상은 게임이 심심해 보인다. 급한 것(아래로 내려온 것)만 터뜨리고
  // 젤리가 적을 때는 조금 기다린다 — 사람이 하는 판단과도 비슷하다.
  const urgent = j.y > H*0.55;
  if(!urgent && cand.length < 4) return null;
  return {x:r.left+j.x/W*r.width, y:r.top+j.y/H*r.height};
})()`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const run = async () => {
  const browser = await chromium.launch({ executablePath: CHROME,
    args: ['--no-sandbox', '--allow-file-access-from-files', '--mute-audio',
           '--force-device-scale-factor=2'] });
  const ctx = await browser.newContext({
    viewport: { width: VW, height: VH }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    recordVideo: { dir: OUT, size: { width: RW, height: RH } } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('⚠ 페이지 오류:', e.message));

  const T0 = Date.now();
  // ⚠ 여기서 page.screenshot() 을 부르지 말 것. 녹화 중에 찍으면 그 순간 프레임이
  //   CSS 크기로 들어와 영상에 '작게 박힌 화면'이 생긴다. 낱장은 녹화가 끝난 뒤
  //   영상에서 뽑는다(아래 STILLS).
  const mark = n => console.log('   ⏱ ' + ((Date.now() - T0) / 1000).toFixed(1) + 's  ' + n);
  // 실제로 젤리를 눌러 플레이한다. ms 동안, 대략 gap 마다 한 번.
  const play = async (ms, gap = 230) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const t1 = Date.now();
      const p = await page.evaluate(PICK).catch(() => null);
      if (p) await page.mouse.click(p.x, p.y).catch(() => {});
      // 젤리를 고르고 누르는 데 걸린 시간을 빼야 영상 길이가 계획대로 나온다
      await sleep(Math.max(40, gap - (Date.now() - t1)));
    }
  };

  await page.goto(GAME);
  await page.waitForFunction("typeof openStart==='function'", null, { timeout: 20000 });
  await page.evaluate(`localStorage.clear()`);
  await page.evaluate(`(()=>{ soundOn=false; bgmOn=false; saveNick('까미'); coins=12400;
    character.kind='girl'; character.color='#ff9db2'; character.hair='braid';
    character.acc='bow'; character.accColor='#ff5c8a'; saveChar(); saveEconomy();
    ['heart','slow','clear','x2','magnet'].forEach((id,i)=>{ if(!crafted.includes(id))crafted.push(id);
      bought[id]=[3,2,2,4,2][i]; inventory[id]=[2,1,2,1,2][i]; });
    openStart(); $('dailyBtn').style.display='none'; return 1; })()`);
  await page.evaluate(OVERLAY);
  mark('게임 준비 끝(여기까지도 녹화된다)');
  await sleep(400);

  // ── ① 표지 (0~2초) ──
  await page.evaluate(`__card('젤리슈팅','톡 터트리는 3분 · 친구랑 실시간 대전','설치 없이 웹에서 바로')`);
  await sleep(1400);
  await page.evaluate(`__cardOff()`);

  // ── ② 홈 (2~4초) ──
  await page.evaluate(`__cap('주소만 열면 바로 시작','계정 하나로 폰·노트북 함께')`);
  await sleep(1300);
  await page.evaluate(`__capOff()`);
  await sleep(300);

  // ── ③ 난이도 고르고 혼자 하기 — 진짜로 플레이 ──
  // #playBtn 은 '준비하기'(난이도 고르기) 화면을 연다. 거기서 한 번 더 눌러야 판이 시작된다.
  await page.click('#playBtn');
  await sleep(500);
  await page.evaluate(`__cap('난이도 4단계','순한맛부터 핵불닭까지')`);
  const spicy = await page.evaluate(`(()=>{ const b=[...document.querySelectorAll('#modeOpts .modebox, #modeOpts button, #modeOpts > *')]
      .find(e=>/매운맛/.test(e.textContent||'')); if(!b) return 0;
    const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
  if (spicy && spicy.x) { await page.mouse.click(spicy.x, spicy.y); await sleep(700); }
  await page.evaluate(`__capOff()`);
  await page.click('#startGameBtn');
  await sleep(700);
  await page.evaluate(`__cap('톡 터트리면 콤보!','딱 3분, 한 판이면 충분해요')`);
  await play(2600, 240);
  await page.evaluate(`__capOff()`);
  await play(400, 300);
  // 아이템 한 번 써 본다
  await page.evaluate(`__cap('아이템으로 위기 탈출','하트팩 · 슬로우 · 폭탄청소 · 2배 · 자석')`);
  const itemOk = await page.evaluate(`(()=>{ const b=document.querySelector('#itemBar .item'); if(!b) return 0;
    const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
  if (itemOk && itemOk.x) { await page.mouse.click(itemOk.x, itemOk.y); }
  await play(1500, 280);
  await page.evaluate(`__capOff()`);
  await play(300, 300);

  // ── ④ AI와 대결 ──
  // 결과 화면을 거치지 않고 홈으로 — 몇 초 플레이한 점수(164점)가 영상에 나오면 초라하다
  await page.evaluate(`(()=>{ running=false; paused=false; boardUnlock();
    ['hud','audioBar','itemBar','pauseBtn','netBar','throwWrap'].forEach(id=>$(id).classList.add('hide'));
    openStart(); return 1; })()`);
  await sleep(700);
  await page.evaluate(`(()=>{ openStart(); aiGame='dungeon'; aiTier='normal'; netModeName='normal';
    userMode='normal'; aiGo(); return 1; })()`);
  await sleep(600);
  await page.evaluate(`__cap('AI랑 연습, 친구랑 실전','실력 4단계 · 인터넷 없이도 대결')`);
  await sleep(2300);                      // 카운트다운 3-2-1
  await play(1400, 280);
  await page.evaluate(`__capOff()`);
  await play(1200, 280);

  // ── ⑤ 이겼을 때 ──
  await page.evaluate(`(()=>{
    // 판을 끝내고 이긴 결과를 띄운다 (승패 그림·말풍선을 보여주는 장면).
    // 영상은 30여 초라 실제 2분 판의 점수까지 못 쌓인다. 스토어 스크린샷과 같은
    // '시연용 점수'를 넣어 결과 화면이 실제 한 판처럼 보이게 한다.
    score=15200; net.myScore=15200;
    if(aiOn){ aiS.score=12800; }
    gameOver(); return 1; })()`);
  await sleep(1500);
  // 자막을 아래로 — 위에 두면 승패 그림을 가린다
  await page.evaluate(`__cap('이기면 춤추고 · 지면 분해요','표정·자세·말풍선이 판마다 달라요',true)`);
  await sleep(1200);
  // 말풍선을 바꿔 본다 — 메시지 보내듯 바로 바뀐다
  const say = await page.evaluate(`(()=>{ const r=$('sayRow'); if(!r||!r.children.length) return 0;
    const b=r.children[Math.min(1,r.children.length-1)].getBoundingClientRect();
    return {x:b.left+b.width/2,y:b.top+b.height/2}; })()`);
  if (say && say.x) { await page.mouse.click(say.x, say.y); await sleep(1000); }
  await page.evaluate(`__capOff()`);
  await sleep(300);

  // ── ⑥ 마무리 표지 ──
  await page.evaluate(`__card('지금 바로 한 판','친구에게 방 코드만 알려주면 끝','zingy-cupcake-98444a.netlify.app')`);
  await sleep(1800);

  mark('마지막 장면 끝');
  const video = page.video();
  await ctx.close();                      // 닫아야 영상 파일이 완성된다
  const raw = await video.path();
  const dst = join(OUT, 'jelly-shooting-promo.webm');
  await browser.close();

  // 녹화 첫 0.8초는 게임이 뜨기 전의 흰 화면이다 — 잘라 낸다.
  // (-c copy 로는 키프레임 위치 때문에 원하는 지점에서 못 자른다. 다시 구우면 정확하다)
  const ff = (args, label) => new Promise(res => {
    const p = spawn('/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux',
      ['-hide_banner','-loglevel','error','-y'].concat(args));
    p.on('close', c => { if (c !== 0) console.log('⚠ ' + label + ' 실패'); res(c === 0); });
    p.on('error', () => { console.log('⚠ ffmpeg 를 못 찾았습니다'); res(false); });
  });
  // 소개 페이지용은 1400k — 페이지에 담아 링크로 보내려면 파일이 작아야 한다.
  // (스토어용 판은 아래에서 2400k 로 따로 굽는다)
  await ff(['-ss','0.8','-i',raw,'-c:v','libvpx','-b:v','1400k','-an',dst], '앞부분 자르기');
  rmSync(raw, { force: true });
  console.log('🎬 ' + dst);

  // 낱장(포스터·홍보용 정지 그림)은 영상에서 뽑는다.
  // 녹화 중에 찍으면 영상이 깨지고, 뽑아 쓰면 크기·화질이 영상과 똑같다.
  const STILLS = [['01-cover.png','1.4'],['02-play.png','8.0'],['03-ai.png','15.0'],
                  ['04-win.png','18.6'],['05-end.png','21.6']];
  for (const [name, at] of STILLS) {
    await ff(['-ss',at,'-i',dst,'-frames:v','1',join(FRM,name)], name);
  }

  // 애플 '앱 미리보기'는 15~30초만 받고, 세로 크기는 886x1920 을 쓴다.
  // 꼬리(마지막 화면이 늘어난 부분)를 자르고 그 크기로 맞춘 판을 하나 더 만든다.
  const cut = join(OUT, 'jelly-shooting-promo-886x1920.webm');
  if (await ff(['-i',dst,'-t','29.5','-vf','scale=886:1920','-c:v','libvpx','-b:v','2400k','-an',cut],
               '앱 미리보기용 판'))
    console.log('🎬 ' + cut + '  (886x1920 · 30초 안쪽 · 앱 미리보기용)');
  console.log('🖼  낱장(영상에서 뽑음): ' + readdirSync(FRM).sort().join(', '));
};
run().catch(e => { console.error('실패:', e.message); process.exit(1); });

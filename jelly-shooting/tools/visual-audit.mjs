#!/usr/bin/env node
// 화면 시각 검사 도구 — 실제 모바일 뷰포트에서 넘침·잘림·작은 버튼·CSS 충돌을 찾는다.
//
//   node tools/visual-audit.mjs [파일.html] [폭,폭,...] [--shot 폴더]
//   node tools/visual-audit.mjs index.html 360,390,430 --shot /tmp/shots
//
// 왜 CDP를 쓰나:
//   헤드리스 크로미움은 --window-size로 창을 500px 미만으로 줄이지 못한다.
//   그래서 좁은 폰을 흉내 내려고 CSS로 폭을 덮으면 vw 단위가 여전히 실제
//   뷰포트(500px)를 따라가서 검사 결과가 통째로 거짓이 된다.
//   Emulation.setDeviceMetricsOverride 로 진짜 뷰포트를 바꿔야 한다.
//
// 의존성 없음. node 22의 내장 WebSocket과 로컬 크로미움만 쓴다.

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const args = process.argv.slice(2);
const file = resolve(args[0] || 'index.html');
const widths = (args[1] || '360,390,430').split(',').map(Number).filter(Boolean);
const shotIdx = args.indexOf('--shot');
const shotDir = shotIdx > -1 ? args[shotIdx + 1] : null;

if (!existsSync(file)) { console.error('파일이 없습니다: ' + file); process.exit(1); }

// ── 크로미움 찾기 ──
function findChrome() {
  const envPath = process.env.CHROME_PATH;
  if (envPath && existsSync(envPath)) return envPath;
  const roots = ['/opt/pw-browsers', process.env.PLAYWRIGHT_BROWSERS_PATH].filter(Boolean);
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const d of readdirSync(root)) {
      if (!d.startsWith('chromium')) continue;
      for (const rel of ['chrome-linux/chrome', 'chrome-linux/headless_shell']) {
        const p = join(root, d, rel);
        if (existsSync(p)) return p;
      }
    }
  }
  for (const p of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
                   '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']) {
    if (existsSync(p)) return p;
  }
  return null;
}
const chrome = findChrome();
if (!chrome) { console.error('크로미움을 찾지 못했습니다. CHROME_PATH 로 지정해주세요.'); process.exit(1); }

const PORT = 9222 + (process.pid % 500);
const proc = spawn(chrome, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--remote-debugging-port=' + PORT, '--remote-allow-origins=*',
  '--window-size=900,900', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function targetUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const page = list.find(t => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(150);
  }
  throw new Error('CDP 접속 실패');
}

// ── 브라우저에서 실행되는 검사 본문 ──
// 화면 전환은 페이지가 스스로 하도록 훅 이름을 넘겨 받는다(없으면 보이는 것만 검사).
const AUDIT = String.raw`(() => {
  const T = 34;                     // 손가락으로 누를 수 있는 최소 크기(px)
  const VW = window.innerWidth;
  const out = { vw: VW, screens: [], collisions: [] };

  // ① 클래스 이름 충돌 — 한 요소에 함께 쓴 두 클래스가 같은 속성을 다투면
  //    뒤에 선언된 쪽이 이긴다. 의도가 아니면 색·정렬이 통째로 덮인다.
  const single = {}; let order = 0;
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const r of rules || []) {
      order++;
      if (!r.selectorText) continue;
      for (const sel of r.selectorText.split(',')) {
        const t = sel.trim();
        if (!/^\.[A-Za-z0-9_-]+$/.test(t)) continue;
        const c = t.slice(1); single[c] = single[c] || {};
        for (const p of r.style) single[c][p] = { order, value: r.style.getPropertyValue(p),
          important: r.style.getPropertyPriority(p) === 'important' };
      }
    }
  }
  const seen = new Set();
  document.querySelectorAll('[class]').forEach(el => {
    const cs = [...el.classList].filter(c => single[c]);
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
      const A = single[cs[i]], B = single[cs[j]];
      // !important 는 일부러 이기려고 붙인 것이다(.hide 처럼). 충돌로 세지 않는다.
      const props = Object.keys(A).filter(p => B[p] && A[p].value !== B[p].value
        && !A[p].important && !B[p].important);
      if (!props.length) continue;
      const key = cs[i] + '|' + cs[j];
      if (seen.has(key)) return;
      seen.add(key);
      const later = A[props[0]].order > B[props[0]].order ? cs[i] : cs[j];
      out.collisions.push({ a: cs[i], b: cs[j], props, winner: later });
    }
  });

  function label(el) {
    if (el.id) return '#' + el.id;
    const c = String(el.className || '').trim().split(/\s+/)[0];
    return c ? '.' + c : el.tagName.toLowerCase();
  }
  function scan(root, name) {
    const bad = [], seenMsg = new Set();
    const push = m => { if (!seenMsg.has(m)) { seenMsg.add(m); bad.push(m); } };
    for (const el of root.querySelectorAll('*')) {
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') continue;
      const b = el.getBoundingClientRect();
      if (b.width === 0 && b.height === 0) continue;
      const id = label(el);
      // 글자도 조작 요소도 없는 장식(블롭 같은 흐린 원)은 일부러 화면 밖으로 흘려 놓는다.
      // 그걸 넘침으로 세면 매번 같은 오탐이 뜬다. 내용이 있는 것만 본다.
      const hasContent = el.matches('button,input,a,select,textarea,img,canvas') || !!el.textContent.trim();
      if (hasContent && b.right > VW + 1) push('넘침(우) ' + id + ' → ' + Math.round(b.right) + ' > ' + VW);
      if (hasContent && b.left < -1) push('넘침(좌) ' + id + ' → ' + Math.round(b.left));
      if (!el.children.length && el.textContent.trim() && el.scrollWidth > el.clientWidth + 2
          && st.overflowX !== 'auto' && st.overflowX !== 'scroll' && st.textOverflow !== 'ellipsis'
          && st.whiteSpace !== 'normal')
        push('글자잘림 ' + id + ' "' + el.textContent.trim().slice(0, 18) + '"');
      // 버튼 안의 <span>도 cursor:pointer를 물려받는다. 그것까지 세면 오탐이 쏟아진다.
      // 실제 조작 요소만, 그리고 중첩된 것은 가장 바깥쪽만 센다.
      const CTL = 'button,input,a,select,textarea';
      if (el.matches(CTL) && !el.parentElement?.closest(CTL) && (b.height < T || b.width < T))
        push('작은버튼 ' + id + ' ' + Math.round(b.width) + 'x' + Math.round(b.height));
    }
    if (root.scrollHeight > root.clientHeight + 2 && getComputedStyle(root).overflowY === 'hidden')
      push('세로잘림 ' + name + ' 내용 ' + root.scrollHeight + ' > 화면 ' + root.clientHeight);
    for (const m of overlaps()) push(m);
    return bad;
  }

  // ② 겹침 — 떠 있는(absolute/fixed) 요소끼리 겹치면 뒤에 있는 쪽 글자가 안 보인다.
  //    넘침 검사로는 절대 안 잡힌다. 각 요소는 제 자리에 얌전히 있고, 서로를 덮을 뿐이다.
  const seenOv = new Set();      // 같은 쌍을 화면마다 다시 알리지 않는다
  function overlaps() {
    const VH = window.innerHeight, out = [];
    // 떠 있는 요소 자신뿐 아니라 '떠 있는 것 안에 담긴 내용'도 본다.
    //   예: #hud를 absolute 컨테이너 안에 넣어 static으로 바꾸면, 자기 좌표는 그대로인데
    //   검사 대상에서 빠져 오른쪽 위 버튼이 그 위를 덮어도 조용히 통과했다(실제로 그랬다).
    const isFull = b => b.width >= VW * 0.9 && b.height >= VH * 0.9;
    const floating = el => {
      for (let p = el; p && p !== document.body; p = p.parentElement) {
        const ps = getComputedStyle(p);
        if (ps.position !== 'absolute' && ps.position !== 'fixed') continue;
        // 첫 번째로 만난 '떠 있는 조상'이 화면을 통째로 덮는 층(화면 전환 레이어)이면
        // 그건 오버레이가 아니라 페이지다. 그 안의 본문끼리는 정상 배치이므로 세지 않는다.
        return !isFull(p.getBoundingClientRect());
      }
      return false;
    };
    const floats = [...document.querySelectorAll('body *')].filter(el => {
      const st = getComputedStyle(el);
      if (!floating(el)) return false;
      if (st.display === 'none' || st.visibility === 'hidden' || +st.opacity === 0) return false;
      const b = el.getBoundingClientRect();
      if (b.width < 10 || b.height < 10) return false;
      // 화면을 통째로 덮는 것(화면 전환, 카운트다운)은 일부러 그런 것이다
      if (b.width >= VW * 0.9 && b.height >= VH * 0.9) return false;
      // 장식용 빈 요소는 겹쳐도 상관없다. 글자나 조작 요소가 있는 것만 본다.
      return el.matches('button,input,a,select,textarea') || !!el.textContent.trim();
    });
    for (let i = 0; i < floats.length; i++) for (let j = i + 1; j < floats.length; j++) {
      const A = floats[i], B = floats[j];
      if (A.contains(B) || B.contains(A)) continue;            // 부모-자식은 당연히 겹친다
      const a = A.getBoundingClientRect(), b = B.getBoundingClientRect();
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w <= 6 || h <= 6) continue;
      const key = label(A) + '|' + label(B);
      if (seenOv.has(key)) continue;
      seenOv.add(key);
      out.push('겹침 ' + label(A) + ' ↔ ' + label(B) + ' → ' + Math.round(w) + 'x' + Math.round(h) + 'px');
    }
    return out;
  }

  // 화면은 한 번에 하나만 보인다. 숨은 요소는 크기가 0이라 검사할 수 없으므로
  // 페이지가 하나씩 펼쳐 주면서 검사 함수를 불러주는 방식을 쓴다.
  if (typeof window.__auditEach === 'function') {
    window.__auditEach((name, el) => out.screens.push({ name, bad: scan(el, name) }));
  } else {
    out.screens.push({ name: 'document', bad: scan(document.body, 'body') });
  }
  if (document.documentElement.scrollWidth > VW + 1)
    out.pageScroll = document.documentElement.scrollWidth + ' > ' + VW;
  return out;
})()`;

// ── CDP 미니 클라이언트 ──
let id = 0;
function makeClient(ws) {
  const waiting = new Map();
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
  });
  return (method, params = {}) => new Promise((res, rej) => {
    const n = ++id;
    waiting.set(n, m => m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result));
    ws.send(JSON.stringify({ id: n, method, params }));
  });
}

try {
  const ws = new WebSocket(await targetUrl());
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  const send = makeClient(ws);
  await send('Page.enable');
  await send('Runtime.enable');

  let problems = 0;
  console.log('검사 대상: ' + file);

  for (const w of widths) {
    // 진짜 뷰포트를 바꾼다 — 이게 이 도구의 핵심이다
    await send('Emulation.setDeviceMetricsOverride',
      { width: w, height: 820, deviceScaleFactor: 2, mobile: true });
    await send('Page.navigate', { url: 'file://' + file });
    // 고정 대기(1200ms)는 경주였다. 페이지 훅이 준비되기 전에 검사해서 폴백으로 떨어지고,
    // 그 폴백이 장식까지 훑어 매번 다른 폭에서 오탐이 떴다. 훅을 기다린다.
    let hooked = false;
    for (let i = 0; i < 40; i++) {
      await sleep(150);
      const q = await send('Runtime.evaluate', {
        expression: "typeof window.__auditEach==='function' && document.readyState==='complete'",
        returnByValue: true });
      if (q.result.value) { hooked = true; break; }
    }
    await sleep(300);    // 폰트·첫 렌더
    if (!hooked) console.log('  ⚠️ 페이지에 __auditEach 훅이 없습니다 — 보이는 화면만 검사합니다');

    const r = await send('Runtime.evaluate', { expression: AUDIT, returnByValue: true, awaitPromise: false });
    if (r.exceptionDetails) { console.log('  스크립트 오류: ' + r.exceptionDetails.text); continue; }
    const a = r.result.value;

    console.log('\n══ 폭 ' + a.vw + 'px ══');
    if (a.collisions?.length) {
      problems += a.collisions.length;
      console.log(' ❌ CSS 클래스 충돌');
      for (const c of a.collisions)
        console.log('    .' + c.a + ' + .' + c.b + ' → [' + c.props.join(', ') + '] · .' + c.winner + ' 승');
    }
    let any = false;
    for (const s of a.screens) {
      if (!s.bad.length) continue;
      any = true; problems += s.bad.length;
      console.log(' ❌ ' + s.name);
      for (const m of s.bad) console.log('    ' + m);
    }
    if (a.pageScroll) { problems++; console.log(' ❌ 페이지 가로 스크롤 ' + a.pageScroll); }
    if (!any && !a.collisions?.length && !a.pageScroll) console.log(' ✅ 이상 없음');

    if (shotDir) {
      mkdirSync(shotDir, { recursive: true });
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      writeFileSync(join(shotDir, 'w' + w + '.png'), Buffer.from(shot.data, 'base64'));
    }
  }
  console.log('\n' + (problems ? '총 ' + problems + '건' : '전부 통과'));
  ws.close();
  process.exitCode = problems ? 1 : 0;
} catch (e) {
  console.error('실패: ' + e.message);
  process.exitCode = 2;
} finally {
  proc.kill();
}

// 홈에 걸리는 도구 화면을 다시 찍는다.
//
//   node tools/capture-shots.mjs
//
// 씬덱 · 촬영 배치도 · 젤리슈팅을 열어 «손대지 않은 첫 화면»을 그대로 찍는다.
// 그래야 홈에서 본 것과 실제로 열었을 때가 같다.
// 결과는 brand/shots/ 에 들어가고, index.html 의 목업이 그것을 그대로 쓴다.

import { chromium } from 'playwright';
const R = '/home/user/char-counter';
const OUT = R + '/brand/shots';

// 각 도구의 «열자마자 보이는 화면»을 그대로 찍는다.
// 손대지 않은 첫 화면이라야 홈페이지에서 본 것과 실제가 같다.
const jobs = [
  { file: R + '/scenedeck/index.html',      out: 'scenedeck-wide.jpg',    w: 1360, h: 860 },
  { file: R + '/scenedeck/index.html',      out: 'scenedeck-phone.jpg',   w: 390,  h: 844 },
  { file: R + '/shot-planner/index.html',   out: 'shotplanner-wide.jpg',  w: 1360, h: 860 },
  { file: R + '/shot-planner/index.html',   out: 'shotplanner-phone.jpg', w: 390,  h: 844 },
  { file: R + '/jelly-shooting/index.html', out: 'jelly-phone.jpg',       w: 390,  h: 844 },
  { file: R + '/jelly-shooting/index.html', out: 'jelly-wide.jpg',        w: 1360, h: 860 },
];

const b = await chromium.launch();
for (const j of jobs) {
  const p = await b.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 2 });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 90)));
  await p.goto('file://' + j.file);
  await p.evaluate(() => document.fonts.ready).catch(() => {});
  await p.waitForTimeout(2200);          // 첫 화면이 자리를 잡을 때까지
  await p.screenshot({ path: OUT + '/' + j.out, type: 'jpeg', quality: 78 });
  console.log(j.out, j.w + 'x' + j.h, errs.length ? '| 오류 ' + errs.slice(0, 2).join(' ; ') : '');
  await p.close();
}
await b.close();

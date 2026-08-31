// 홈에 걸리는 도구 화면을 다시 찍는다.
//
//   node tools/capture-shots.mjs
//
// 창(가로)에는 «무엇인지 알려 주는 첫 화면»을, 폰(세로)에는 «실제로 쓰는 화면»을 담는다.
// 둘이 같은 그림이면 목업을 두 개 놓을 이유가 없다 — 그래서 폰 쪽은 한 번 눌러서 들어간다.
// 결과는 brand/shots/ 에 들어가고, index.html 의 목업이 그것을 그대로 쓴다.
import { chromium } from 'playwright';

const R = '/home/user/char-counter';
const OUT = R + '/brand/shots';

// enter: 폰 화면에서 누를 곳. 눌러 들어간 뒤 wait 만큼 기다렸다 찍는다.
const jobs = [
  { file: 'scenedeck',      out: 'scenedeck-wide.jpg',    w: 1360, h: 860 },
  { file: 'scenedeck',      out: 'scenedeck-phone.jpg',   w: 390,  h: 844, enter: '한 줄만 적고 프롬프트만', wait: 1800 },
  { file: 'shot-planner',   out: 'shotplanner-wide.jpg',  w: 1360, h: 860 },
  { file: 'shot-planner',   out: 'shotplanner-phone.jpg', w: 390,  h: 844, enter: '배치도 열기', wait: 1600 },
  { file: 'jelly-shooting', out: 'jelly-wide.jpg',        w: 1360, h: 860 },
  { file: 'jelly-shooting', out: 'jelly-phone.jpg',       w: 390,  h: 844, enter: '혼자 하기', wait: 2600 },
];

const browser = await chromium.launch();
for (const j of jobs) {
  const page = await browser.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 2 });
  await page.goto('file://' + R + '/' + j.file + '/index.html');
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.waitForTimeout(2000);

  let note = '';
  if (j.enter) {
    // 누를 것을 찾는다. 본문에도 같은 낱말이 있을 수 있으므로 «누를 수 있는 것»부터 본다.
    // 도구를 고쳐 버튼 이름이 바뀌면 조용히 실패하지 말고 알린다.
    let hit = page.getByRole('button', { name: j.enter, exact: false }).first();
    if (!(await hit.count())) hit = page.getByText(j.enter, { exact: false }).first();
    if (await hit.count()) {
      await hit.click({ timeout: 4000 }).catch(e => { note = ' (누르기 실패: ' + String(e).slice(0, 40) + ')'; });
      await page.waitForTimeout(j.wait);
    } else {
      note = ' («' + j.enter + '» 를 못 찾음 — 도구가 바뀐 듯합니다)';
    }
  }
  await page.screenshot({ path: OUT + '/' + j.out, type: 'jpeg', quality: 78 });
  console.log(j.out.padEnd(24), j.w + 'x' + j.h, j.enter ? '→ ' + j.enter : '', note);
  await page.close();
}
await browser.close();

// 링크 미리보기 카드(og.png) 만들기 — 카톡·슬랙에 주소를 붙이면 뜨는 그림.
//
//   node tools/make-og.mjs
//   node tools/make-og.mjs --out /tmp/시험.png    ← 시험 출력(원본을 안 건드린다)
//
// 그림에는 한글을 넣지 않는다. 제목·설명은 index.html 의 og:title / og:description 이
// 그림 아래에 붙으므로, 그림에 또 쓰면 두 번 겹쳐 촌스러워진다.
// 남는 것은 로고와 영문 이름뿐 — 그래서 어느 기계에서 뽑아도 글꼴이 흔들리지 않는다.
//
// 모양을 고치려면 tools/og-card.html 을 고치고 이 파일을 다시 돌리면 된다.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const i = process.argv.indexOf('--out');
const out = i > -1 ? process.argv[i + 1] : resolve(here, '..', 'og.png');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto('file://' + resolve(here, 'og-card.html'));
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out });
await browser.close();
console.log('만들었습니다 →', out);

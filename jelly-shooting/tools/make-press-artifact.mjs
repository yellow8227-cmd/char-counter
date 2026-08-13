// 소개 페이지를 '파일 하나로 완결된' 판으로 만든다 (press/artifact.html)
//
// 왜 필요한가
//   소개 페이지를 그대로 공유하려면 그림·영상 파일이 같이 있어야 한다. 링크 하나로
//   보여주려면 그림과 영상을 페이지 안에 담아야 한다(data: 주소).
//   그림은 브라우저에서 줄여 JPEG 로 다시 굽고(용량 1/10), 영상은 그대로 담는다.
//
// 쓰기:  node jelly-shooting/tools/make-press-artifact.mjs
// 결과:  press/artifact.html   (한 파일. 어디에 올려도, 파일로 열어도 그대로 보인다)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const PW = '/opt/node22/lib/node_modules/playwright/index.js';
const pwMod = await import(existsSync(PW) ? 'file://' + PW : 'playwright');
const chromium = (pwMod.chromium || (pwMod.default && pwMod.default.chromium));

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PRESS = join(ROOT, 'press');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

// 그림마다 '가로 몇 픽셀로 줄일지' — 화면에 보이는 크기의 두 배면 충분하다
const WIDTHS = {
  'shots/icon-1024.png': 256,
  'shots/appstore-1-play.png': 660,
  'shots/appstore-2-dungeon.png': 520,
  'shots/appstore-3-throw.png': 520,
  'shots/appstore-4-dress.png': 520,
  'shots/appstore-5-result.png': 520,
  'shots/appstore-6-home.png': 520,
  'shots/play-feature-1024x500.png': 1024,
  'video/frames/01-cover.png': 520,
};

const browser = await chromium.launch({ executablePath: CHROME,
  args: ['--no-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.goto('data:text/html,<body>줄이는 중…</body>');

// 브라우저 캔버스로 줄여서 JPEG 로 다시 굽는다
const shrink = async (rel, w) => {
  const b64 = readFileSync(join(PRESS, rel)).toString('base64');
  return await page.evaluate(async ([src, w]) => {
    const im = new Image();
    await new Promise((ok, no) => { im.onload = ok; im.onerror = no; im.src = src; });
    const s = Math.min(1, w / im.width);
    const c = document.createElement('canvas');
    c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);   // JPEG 는 투명을 못 담는다
    g.drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.9);
  }, ['data:image/png;base64,' + b64, w]);
};

let html = readFileSync(join(PRESS, 'index.html'), 'utf8');
let saved = 0, made = 0;
for (const [rel, w] of Object.entries(WIDTHS)) {
  const data = await shrink(rel, w);
  const before = readFileSync(join(PRESS, rel)).length;
  saved += before - (data.length * 3 / 4); made++;
  // src="..." 와 og:image content="..." 둘 다 바꾼다
  html = html.split('"' + rel + '"').join('"' + data + '"');
}
await browser.close();

// 영상은 그대로 담는다 (다시 굽지 않는다 — 화질이 떨어진다)
const vid = 'video/jelly-shooting-promo.webm';
const vb64 = readFileSync(join(PRESS, vid)).toString('base64');
html = html.split('"' + vid + '"').join('"data:video/webm;base64,' + vb64 + '"');

// 남은 상대 경로가 있으면 링크가 깨진 채로 올라간다 — 미리 잡는다
const left = [...html.matchAll(/(?:src|href|content)="((?:shots|video)\/[^"]+)"/g)].map(m => m[1]);
if (left.length) { console.log('⚠ 아직 파일을 가리키는 곳이 있습니다: ' + [...new Set(left)].join(', ')); }

// 아티팩트로 올릴 때는 껍데기(doctype·html·head·body)를 빼야 한다 —
// 올리는 쪽이 그 껍데기를 다시 씌운다. <title> 과 <style> 은 그대로 남긴다.
// 아티팩트 이름은 설명 없이 이름만 — 갤러리에서 이름으로 찾는다
const title = '<title>젤리슈팅</title>';
const style = (html.match(/<style>[\s\S]*?<\/style>/) || [''])[0];
const body  = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
const out = join(PRESS, 'artifact.html');
writeFileSync(out, title + '\n' + style + '\n' + body.trim() + '\n');
const sz = readFileSync(out).length;
console.log('📄 ' + out + '  (' + (sz / 1024 / 1024).toFixed(2) + 'MB, 그림 ' + made + '장 + 영상 1개 담음)');
if (!title) console.log('⚠ <title> 을 못 찾았습니다 — 아티팩트 이름이 파일 이름으로 잡힙니다');

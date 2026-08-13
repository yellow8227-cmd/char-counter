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

// 그림마다 '가로 몇 픽셀로 줄일지' — 화면에 보이는 크기의 두 배면 충분하다.
// (여기 없는 그림은 원본 크기 그대로 담긴다 → 파일이 커진다. 새 그림을 넣으면 여기도 적어 주자)
const WIDTHS = {
  'shots/icon-1024.png': 280,
  'shots/cover-1200x630.png': 1200,
  'shots/appstore-1-play.png': 560,
  'shots/appstore-2-dungeon.png': 560,
  'shots/appstore-3-throw.png': 560,
  'shots/appstore-4-dress.png': 560,
  'shots/appstore-5-result.png': 560,
  'shots/appstore-6-home.png': 560,
  'shots/play-feature-1024x500.png': 1024,
  'video/frames/01-cover.png': 560,
  'shots/chars-row.png': 760,      // 캐릭터 띠 — 페이지에서 740px 폭으로 보여 준다
  'shots/faces-row.png': 760,
  'shots/dress-row.png': 700,
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
// 페이지가 실제로 가리키는 파일만 담는다 (안 쓰는 그림까지 담으면 파일만 커진다)
// poster= 를 빼먹으면 영상 표지가 깨진 채로 올라간다(검은 네모가 된다)
const refs = [...new Set([...html.matchAll(/(?:src|content|poster)="((?:shots|video)\/[^"]+\.png)"/g)].map(m => m[1]))];
let made = 0;
for (const rel of refs) {
  const w = WIDTHS[rel];
  if (!w) { console.log('· ' + rel + ' 은 줄이는 크기가 정해져 있지 않아 원본 그대로 담습니다'); }
  const data = w ? await shrink(rel, w)
                 : 'data:image/png;base64,' + readFileSync(join(PRESS, rel)).toString('base64');
  html = html.split('"' + rel + '"').join('"' + data + '"');
  made++;
}
await browser.close();

// 제목용 글씨체도 담는다 — 페이지 안에 없으면 보는 사람 기기의 폰트로 바뀐다
const FONT = 'fonts/Jua-subset.woff2';
if (existsSync(join(PRESS, FONT))) {
  const fb = readFileSync(join(PRESS, FONT)).toString('base64');
  html = html.split("url('" + FONT + "')").join("url('data:font/woff2;base64," + fb + "')");
} else {
  console.log('⚠ ' + FONT + ' 이 없습니다 → python3 tools/make-press-font.py 를 먼저 돌려주세요');
}

// 영상은 그대로 담는다 (다시 굽지 않는다 — 화질이 떨어진다)
const vid = 'video/jelly-shooting-promo-web.webm';
const vb64 = readFileSync(join(PRESS, vid)).toString('base64');
html = html.split('"' + vid + '"').join('"data:video/webm;base64,' + vb64 + '"');

// 남은 상대 경로가 있으면 링크가 깨진 채로 올라간다 — 미리 잡는다
const left = [...html.matchAll(/(?:src|href|content|poster)="((?:shots|video|fonts)\/[^"]+)"/g)].map(m => m[1]);
if (left.length) { console.log('⚠ 아직 파일을 가리키는 곳이 있습니다: ' + [...new Set(left)].join(', ')); }

// 탭 아이콘 — 올리는 쪽은 이모지만 받는다. 그래서 페이지 안에 <link rel="icon"> 을 넣어
// 게임 아이콘(파비콘 32px)으로 덮는다. 나중에 선언된 아이콘이 이기므로 이게 보인다.
let iconTag = '';
const ico = join(ROOT, 'favicon-32.png');
if (existsSync(ico)) {
  iconTag = '<link rel="icon" type="image/png" href="data:image/png;base64,'
    + readFileSync(ico).toString('base64') + '">\n';
  const at = join(ROOT, 'apple-touch-icon.png');
  if (existsSync(at)) iconTag += '<link rel="apple-touch-icon" href="data:image/png;base64,'
    + readFileSync(at).toString('base64') + '">\n';
}

// 아티팩트로 올릴 때는 껍데기(doctype·html·head·body)를 빼야 한다 —
// 올리는 쪽이 그 껍데기를 다시 씌운다. <title> 과 <style> 은 그대로 남긴다.
// 아티팩트 이름은 설명 없이 이름만 — 갤러리에서 이름으로 찾는다
const title = '<title>젤리슈팅</title>';
const style = (html.match(/<style>[\s\S]*?<\/style>/) || [''])[0];
const body  = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
const out = join(PRESS, 'artifact.html');
writeFileSync(out, title + '\n' + iconTag + style + '\n' + body.trim() + '\n');
const sz = readFileSync(out).length;
console.log('📄 ' + out + '  (' + (sz / 1024 / 1024).toFixed(2) + 'MB · 그림 ' + made
  + '장 + 영상 + 글씨체 담음)');
if (!title) console.log('⚠ <title> 을 못 찾았습니다 — 아티팩트 이름이 파일 이름으로 잡힙니다');

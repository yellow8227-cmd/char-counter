// 배포 주소 바꾸기
//
//   node jelly-shooting/tools/set-site-url.mjs https://내주소.netlify.app
//   node jelly-shooting/tools/set-site-url.mjs            ← 지금 값 보기
//
// 왜 필요한가: 링크 미리보기 그림(og:image)은 크롤러가 자바스크립트를 돌리지 않으므로
// HTML에 '절대 주소'가 박혀 있어야 한다. Netlify Drop처럼 올릴 때마다 주소가 바뀌는
// 방식이면 그 주소가 매번 어긋난다. 이 도구로 세 곳(og:url · og:image · twitter:image)을
// 한 번에 맞춘다.
//
// 주소가 계속 바뀌는 게 번거로우면 Netlify에서 사이트를 '내 것으로 등록(claim)'하고
// 이름을 고정하면 된다 — 그러면 이 명령을 한 번만 돌리면 끝이다.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HTML = join(dirname(fileURLToPath(import.meta.url)), '..', 'index.html');
const TAGS = [
  { re: /(<meta property="og:url" content=")([^"]*)(")/,        path: '' },
  { re: /(<meta property="og:image" content=")([^"]*)(")/,      path: 'og.png' },
  { re: /(<meta name="twitter:image" content=")([^"]*)(")/,     path: 'og.png' },
];

let html = readFileSync(HTML, 'utf8');
const raw = process.argv[2];

if (!raw) {
  console.log('지금 박혀 있는 주소:');
  TAGS.forEach(t => { const m = html.match(t.re); console.log('  ' + (m ? m[2] : '(없음)')); });
  console.log('\n바꾸려면: node ' + resolve(process.argv[1]) + ' https://내주소.netlify.app');
  process.exit(0);
}

// 끝의 / 를 정리하고 폴더 주소로 맞춘다. https 가 아니면 미리보기가 안 뜨는 곳이 많다.
let base = raw.trim().replace(/\/+$/, '');
if (!/^https:\/\//.test(base)) {
  console.error('❌ https:// 로 시작하는 주소여야 합니다 (카톡·트위터는 http 미리보기를 무시합니다): ' + raw);
  process.exit(1);
}
// index.html 을 직접 가리켰다면 폴더로 되돌린다 (og:url 은 폴더가 자연스럽다)
base = base.replace(/\/index\.html$/, '');

let changed = 0;
for (const t of TAGS) {
  const want = base + '/' + t.path;
  if (!t.re.test(html)) { console.error('❌ 태그를 못 찾았습니다: ' + t.re); process.exit(1); }
  html = html.replace(t.re, (_, a, old, c) => { if (old !== want) changed++; return a + want + c; });
}
writeFileSync(HTML, html);
console.log((changed ? '✅ ' + changed + '곳 바꿨습니다' : '이미 그 주소였습니다') + ' → ' + base);
TAGS.forEach(t => console.log('  ' + html.match(t.re)[2]));
console.log('\n올린 뒤 카톡에서 미리보기가 예전 그림으로 남아 있으면 캐시입니다.');
console.log('주소 끝에 ?v=2 처럼 아무 값이나 붙여 한 번 보내면 새로 읽어옵니다.');

// 넷리파이에 올릴 소개 페이지 묶음을 만든다.   node tools/make-site-zip.mjs
//   → press/소개페이지-넷리파이.zip
//
// 왜 도구로 만드나
//   전에 손으로 묶었더니 나중에 만든 영어 페이지(en.html)가 통째로 빠진 채 배포됐고,
//   그 사실을 몇 주 뒤 itch 설명란의 .../en 이 404 나고서야 알았다. 페이지가 부르는
//   파일을 코드에서 읽어 담고, 하나라도 없으면 소리내어 실패하게 한다.
//
// 배포 구조 — press/ 안의 것이 사이트의 뿌리가 된다
//   press/index.html → /index.html   (한국어 소개)
//   press/en.html    → /en.html      (영어 소개, 주소는 /en 으로도 열린다)
//   press/shots|video|... → /shots|/video|...   (경로가 이미 뿌리 기준이라 그대로)
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC  = join(ROOT, 'press');
const OUT  = join(SRC, '소개페이지-넷리파이.zip');
const PAGES = ['index.html', 'en.html'];

// 페이지가 실제로 부르는 파일을 코드에서 읽어 온다 (목록을 손으로 적지 않는다)
const want = new Set();
for (const page of PAGES) {
  const p = join(SRC, page);
  if (!existsSync(p)) { console.error('❌ ' + page + ' 이 없습니다'); process.exit(1); }
  want.add(page);
  const html = readFileSync(p, 'utf8');
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const u = m[1];
    if (/^(https?:|#|mailto:|data:)/.test(u)) continue;
    want.add(u.replace(/^\.?\//, ''));
  }
}
// 페이지가 안 부르지만 있어야 하는 것들
for (const extra of ['og.jpg', 'icon-192.png', 'apple-touch-icon.png', 'favicon-32.png',
                     'fonts/Jua-subset.woff2', 'fonts/OFL.txt'])
  if (existsSync(join(SRC, extra))) want.add(extra);

const files = [...want].sort();
const missing = files.filter(f => !existsSync(join(SRC, f)));
if (missing.length) { console.error('❌ 없는 파일: ' + missing.join(', ')); process.exit(1); }

// /en 으로도 열리게. 넷리파이가 .html 을 떼고 열어 주긴 하지만 명시해 두는 편이 안전하다.
writeFileSync(join(SRC, '_redirects'),
  '/en      /en.html   200\n' +
  '/press/* /:splat    200\n');
want.add('_redirects');

execSync(`cd ${JSON.stringify(SRC)} && rm -f ${JSON.stringify(OUT)} && ` +
         `zip -q -X ${JSON.stringify(OUT)} ` + [...want].sort().map(f => JSON.stringify(f)).join(' '));

const mb = statSync(OUT).size / 1048576;
console.log('📦 ' + OUT);
console.log('   담은 파일 ' + want.size + '개 · ' + mb.toFixed(2) + 'MB');
for (const page of PAGES) console.log('   ✅ ' + page);
console.log('   ✅ _redirects — /en 이 /en.html 로 열린다');

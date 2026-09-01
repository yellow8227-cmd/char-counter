// itch.io 에 올릴 zip 을 만든다.
//   node tools/make-itch-zip.mjs   →  press/upload/jellimo-itch.zip
//
// itch.io 규칙 두 가지만 지키면 된다.
//   ① index.html 이 zip 의 '뿌리'에 있어야 한다 (폴더 안에 있으면 안 열린다)
//   ② 올린 뒤 "This file will be played in the browser" 를 체크한다
// 서비스워커(sw.js)도 같이 넣는다 — itch 는 iframe 이라 오프라인 캐시는 기대할 수 없지만,
// 등록이 실패해도 게임은 그대로 돈다(등록 실패를 조용히 넘기게 되어 있다).
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT  = join(ROOT, 'press', 'upload');
mkdirSync(OUT, { recursive: true });

// 게임이 실제로 여는 파일만 담는다. 보도자료·검사용 그림은 넣지 않는다.
const FILES = ['index.html','sw.js','manifest.json',
  'icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png','favicon-32.png',
  'og.png','og.jpg'];

const missing = FILES.filter(f => !existsSync(join(ROOT, f)));
if (missing.length) { console.error('없는 파일:', missing.join(', ')); process.exit(1); }

const zip = join(OUT, 'jellimo-itch.zip');
try { execSync('rm -f ' + JSON.stringify(zip)); } catch {}
// -j 를 쓰면 안 된다(경로가 없어짐). ROOT 에서 상대경로로 담아야 index.html 이 뿌리에 온다.
execSync('cd ' + JSON.stringify(ROOT) + ' && zip -q -X ' + JSON.stringify(zip) + ' ' + FILES.map(f=>JSON.stringify(f)).join(' '));

// 확인: 뿌리에 index.html 이 있는가
const list = execSync('unzip -Z1 ' + JSON.stringify(zip)).toString().trim().split('\n');
if (!list.includes('index.html')) { console.error('❌ index.html 이 zip 뿌리에 없습니다:', list); process.exit(1); }
const mb = (statSync(zip).size / 1048576).toFixed(2);

console.log('✅ ' + zip.replace(ROOT + '/', '') + '  ' + mb + 'MB  · 파일 ' + list.length + '개');
console.log('   뿌리에 index.html ✓  (itch.io 한도: 파일 하나 200MB · 개수 1000 · 펼쳐서 500MB)');
list.forEach(f => console.log('   · ' + f));

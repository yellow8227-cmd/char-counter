// 영어·일본어 화면에 한글이 새어 나가는 곳을 전부 찾아낸다 (게임을 돌리지 않고, 코드를 읽어서)
//
// 왜 이 방식인가
//   화면을 찍어서 보는 검사는 '그 순간 화면에 있는 것'만 잡는다. 보스를 잡아야 나오는 글,
//   상대가 젤리를 던져야 나오는 글은 안 잡힌다. 그래서 코드에 박힌 한글 글자를 전부 모아
//   '이게 화면에 나가는 자리인가' + 't() 를 거치나' + '사전에 있나' 를 따진다.
//
// 쓰기:  node tools/audit-i18n.mjs          문제만 보여 준다
//        node tools/audit-i18n.mjs --all    지나간 것까지 다 보여 준다
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');

// ── 스크립트만 떼어 낸다 (줄 번호는 파일 기준으로 맞춘다) ──
const lines = html.split('\n');
let inScript = false;
const jsLines = lines.map((l, i) => {
  const open = /<script(?![^>]*\bsrc=)[^>]*>/.test(l);
  const close = /<\/script>/.test(l);
  const was = inScript;
  if (open) inScript = true;
  if (close) inScript = false;
  return (was || (open && !close)) ? l : '';
});

// ── 사전 ──
const di = html.indexOf('const I18N_ROWS=[');
const dj = html.indexOf('\n];', di);
const dictBody = html.slice(di, dj);
const DICT = new Set();
for (const m of dictBody.matchAll(/\n {2}\["((?:[^"\\]|\\.)*)"/g)) DICT.add(JSON.parse('"' + m[1] + '"'));

// ── 화면에 글자를 내보내는 자리들 ──
// (이 목록에 없는 자리는 화면에 안 나가는 것으로 본다 — console.log, 주석, 열쇠 이름 등)
// 스스로 번역하는 자리 — 여기 들어가는 글은 t() 로 감쌀 필요가 없다.
// 사전에 있는지만 본다. (devHint 는 개발자용 console 이라 아예 검사하지 않는다)
const SELF = new Set(['toast', 'floater', 'showCallout', 'banner', 'DOM']);
const SINKS = [
  ['floater',      /\bfloater\s*\(/],
  ['showCallout',  /\bshowCallout\s*\(/],
  ['toast',        /\btoast\s*\(/],
  ['banner',       /\bbanner\s*=/],
  ['DOM',          /\.(textContent|innerHTML|innerText|placeholder|title)\s*=/],
  ['tMsg',         /\btMsg\s*=/],
  ['fillText',     /\bfillText\s*\(/],
  ['alert/confirm',/\b(alert|confirm)\s*\(/],
  ['askYes',       /\baskYes\s*\(/],
  ['showBattleResult', /\bshowBattleResult\s*\(/],
  ['say',          /\.say\s*=/],
];

const HAS_KO = /[가-힣]/;
const problems = [], okList = [];

jsLines.forEach((line, idx) => {
  if (!HAS_KO.test(line)) return;
  const lineNo = idx + 1;
  // 주석 줄은 건너뛴다
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
  const sink = SINKS.find(([, re]) => re.test(line));
  if (!sink) return;

  // 이 줄의 문자열 낱개를 뽑는다
  for (const m of line.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\$]|\\.)*)`/g)) {
    const raw = m[1] ?? m[2] ?? m[3];
    if (raw == null || !HAS_KO.test(raw)) continue;
    const at = m.index;
    // 바로 앞이 t( 이거나 window.t( 이면 번역을 거친다
    const before = line.slice(Math.max(0, at - 12), at);
    const wrapped = /(^|[^\w.])(window\.)?t\(\s*$/.test(before);
    // 사전에 있나 (숫자는 %d 로 바꿔 한 번 더 본다)
    const key = raw.trim();
    const pat = key.replace(/\d+(?:[.,]\d+)*/g, '%d');
    const inDict = DICT.has(key) || DICT.has(pat);
    const self = SELF.has(sink[0]);
    const rec = { lineNo, sink: sink[0], text: key.slice(0, 60), wrapped: wrapped || self, inDict, self };
    if (rec.wrapped && inDict) okList.push(rec);
    else problems.push(rec);
  }
});

const label = p => (!p.wrapped && !p.inDict) ? 't() 없음 · 사전 없음'
              : (!p.wrapped ? 't() 없음 (사전엔 있음)' : '사전 없음');

if (process.argv.includes('--all')) {
  console.log('── 잘 되어 있는 곳 ' + okList.length + '개 ──');
  for (const p of okList) console.log(`  ${p.lineNo}\t${p.sink}\t${p.text}`);
  console.log('');
}
if (!problems.length) { console.log('✅ 화면에 나가는 한글 중 번역을 안 거치는 곳 없음 (검사한 자리 ' + okList.length + '개)'); process.exit(0); }
console.log('❌ 영어·일본어 화면에 한글이 새어 나갈 곳 ' + problems.length + '군데\n');
for (const p of problems) console.log(`  index.html:${p.lineNo}  [${p.sink}]  ${label(p)}\n      ${p.text}`);
console.log('\n  · "t() 없음"       → 그 문장을 t(...) 로 감싸세요');
console.log('  · "사전 없음"      → I18N_ROWS 에 [한국어, English, 日本語] 한 줄을 넣으세요');
console.log('  · 숫자가 섞인 문장은 사전 열쇠를 %d 로 (보유 3개 → 보유 %d개)');
process.exit(1);

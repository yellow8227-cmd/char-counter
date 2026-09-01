// 보관용 자료 집파일 2개 만들기
//   press/upload/jellimo-insta-한국어.zip   — 인스타 올릴 사진(한국어) + 문구
//   press/upload/jellimo-insta-English.zip  — 인스타 올릴 사진(영어) + 문구
//   press/upload/jellimo-itch-assets.zip    — itch.io 올릴 사진 + 게임파일 + 문서
// 실행:  node tools/make-asset-zips.mjs
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const P = (...a) => path.join(ROOT, ...a);
const TMP = P('press', '.zipwork');
const OUT = P('press', 'upload');

const cp = (from, to) => {
  const src = P(from);
  if (!fs.existsSync(src)) { throw new Error('없는 파일: ' + from); }
  const dst = path.join(TMP, to);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
};
const write = (to, text) => {
  const dst = path.join(TMP, to);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, text);
};
const dirFiles = (rel) => fs.readdirSync(P(rel)).filter(f => f.endsWith('.png')).sort();

const zipUp = (stageDir, outName) => {
  const out = path.join(OUT, outName);
  fs.rmSync(out, { force: true });
  execSync(`cd ${JSON.stringify(path.join(TMP, stageDir))} && zip -q -r -X ${JSON.stringify(out)} .`);
  const list = execSync(`unzip -Z1 ${JSON.stringify(out)}`).toString().trim().split('\n');
  const size = (fs.statSync(out).size / 1024 / 1024).toFixed(2);
  console.log(`\n📦 ${outName}  (${size} MB, ${list.filter(f => !f.endsWith('/')).length}개 파일)`);
  for (const f of list) console.log('   ' + f);
  return { out, list };
};

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

/* ───────────────────────── 1. 인스타용 (언어별로 나눔 — 한 개로 묶으면 30MB 넘어서 못 보냄) ───────────────────────── */
const IG_SET = [
  { stage: 'insta-ko', src: 'insta',    out: 'jellimo-insta-한국어.zip', label: '한국어' },
  { stage: 'insta-en', src: 'insta-en', out: 'jellimo-insta-English.zip', label: 'English' },
];
for (const g of IG_SET) {
  for (const f of dirFiles(`press/${g.src}`))        cp(`press/${g.src}/${f}`,        `${g.stage}/게시물/${f}`);
  for (const f of dirFiles(`press/${g.src}/square`)) cp(`press/${g.src}/square/${f}`, `${g.stage}/게시물/정사각(1대1)/${f}`);
  cp('press/인스타-글로벌.md', `${g.stage}/문구/인스타-글로벌.md`);
  cp('press/인스타-계정.md',   `${g.stage}/문구/인스타-계정.md`);
  cp('press/shots/og.jpg',     `${g.stage}/기타/링크미리보기-og.jpg`);
  write(`${g.stage}/읽어보기.txt`, `젤리모 · 인스타그램 자료 (${g.label})
────────────────────────────────
게시물/            게시물 9장 (4:5 세로, 1080x1350)
  정사각(1대1)/    같은 그림 1:1 판 (프로필 격자용, 1080x1080)
게시물/story-*.png      스토리 4장 (1080x1920)
게시물/highlight-*.png  하이라이트 표지 4장 (원형으로 잘림)
게시물/profile-320.png  프로필 사진
문구/              게시물·스토리 문구, 계정 세팅, 알고리즘 정리
기타/              링크 미리보기 그림 (카톡·트위터에 링크 붙일 때 뜨는 그림)

올리는 순서
1) profile-320.png 로 프로필 사진 설정
2) 1-대표 → 2-팡팡 → 3-던전 … 순서로 하루 1장씩
3) 게시물 올린 날은 story 도 같이 (스토리 → 게시물 공유)
4) 하이라이트 4개는 한 번만 만들어두면 끝
문구는 전부 문구/인스타-글로벌.md 안에 복사해 쓰게 정리돼 있습니다.
`);
}

/* ───────────────────────── 2. itch.io용 ───────────────────────── */
const IT = 'itch-pack';
cp('press/upload/jellimo-itch.zip', `${IT}/게임파일/jellimo-itch.zip`);
cp('press/upload/cover-itch.png',   `${IT}/커버/cover-itch(이걸-쓰세요).png`);
for (const v of ['A', 'B', 'C', 'D']) cp(`press/upload/cover-${v}.png`, `${IT}/커버/후보/cover-${v}.png`);
cp('press/upload/cover-grid.png',   `${IT}/커버/후보/목록에서-이렇게-보여요.png`);
for (const f of dirFiles('press/shots').filter(f => f.startsWith('appstore-')))
  cp(`press/shots/${f}`, `${IT}/스크린샷/${f}`);
cp('press/shots/icon-1024.png',           `${IT}/기타/아이콘-1024.png`);
cp('press/shots/play-feature-1024x500.png', `${IT}/기타/가로배너-1024x500.png`);
cp('press/shots/og.jpg',                  `${IT}/기타/링크미리보기-og.jpg`);
cp('press/itch-등록방법.md', `${IT}/문서/itch-등록방법.md`);
cp('press/store-english.md', `${IT}/문서/영어-소개문구.md`);
cp('press/스토어-등록문구.md', `${IT}/문서/한국어-소개문구.md`);
cp('press/upload/supabase-setup.sql',  `${IT}/문서/supabase-setup.sql`);
cp('press/upload/supabase-verify.sql', `${IT}/문서/supabase-verify.sql`);

write(`${IT}/읽어보기.txt`, `젤리모 · itch.io 자료 모음
────────────────────────────────
게임파일/jellimo-itch.zip   itch 에 그대로 올리는 게임 (index.html 이 압축 맨 위에 있음)
                            업로드 후 "This file will be played in the browser" 체크
                            화면 크기 430 x 932, 전체화면 켜기
커버/                       cover-itch(이걸-쓰세요).png = 630x500 대표 이미지
  후보/                     A~D 다른 안 + 목록에 섞였을 때 어떻게 보이는지
스크린샷/                   설명란에 넣을 게임 화면 6장
기타/                       아이콘, 가로 배너, 링크 미리보기 그림
문서/itch-등록방법.md       처음부터 끝까지 순서대로
문서/영어-소개문구.md        itch 설명란에 붙여넣을 영어 글
문서/한국어-소개문구.md      한국어 판
문서/supabase-*.sql         랭킹 서버 보호 SQL (이미 실행 완료)

무료로 올리면 세금 서류(W-8BEN) 없이 바로 공개됩니다.
나중에 후원(Donate) 이나 유료로 바꿀 때만 세금 정보가 필요합니다.
`);

const made = IG_SET.map(g => zipUp(g.stage, g.out));
const b = zipUp(IT, 'jellimo-itch-assets.zip');

/* 검사 */
let bad = 0;
const LIMIT = 30 * 1024 * 1024;   // 채팅으로 보낼 수 있는 최대 크기
for (const z of [...made, b]) {
  if (!z.list.some(f => f === '읽어보기.txt')) { console.error('❌ 읽어보기.txt 빠짐: ' + z.out); bad++; }
  if (fs.statSync(z.out).size > LIMIT) { console.error('❌ 30MB 넘음(전송 불가): ' + path.basename(z.out)); bad++; }
}
for (const z of made) {
  if (z.list.filter(f => f.startsWith('게시물/') && f.endsWith('.png')).length !== 27) { console.error('❌ 인스타 그림 27장이 아님: ' + z.out); bad++; }
  if (z.list.some(f => f.startsWith('커버/') || f.startsWith('게임파일/'))) { console.error('❌ itch 자료가 섞임: ' + z.out); bad++; }
}
if (!b.list.includes('게임파일/jellimo-itch.zip')) { console.error('❌ itch 집: 게임파일 빠짐'); bad++; }
if (b.list.some(f => f.startsWith('게시물/'))) { console.error('❌ 인스타 자료가 itch 집에 섞임'); bad++; }
fs.rmSync(TMP, { recursive: true, force: true });
console.log(bad ? `\n❌ 문제 ${bad}건` : `\n✅ 집파일 ${made.length + 1}개 모두 정상`);
process.exit(bad ? 1 : 0);

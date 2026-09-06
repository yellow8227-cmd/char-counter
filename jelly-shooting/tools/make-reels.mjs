// 인스타 릴스·유튜브 쇼츠에 올릴 판을 만든다.   node tools/make-reels.mjs [--en]
//   → press/upload/jellimo-reels-{ko}.mp4        1080x1920 · 전체 (56초)
//   → press/upload/jellimo-reels-short-{ko}.mp4  1080x1920 · 훅 편집본 (18초)
//
// 왜 따로 만드나 — 두 가지가 어긋나 있었다.
//
// ① 크기. make-promo-video.mjs 가 만드는 mp4 는 로그에 '860x1864' 라고 찍으면서
//    실제로는 -vf scale 이 없어서 원본 430x932 그대로 나온다. 릴스에 430px 짜리를
//    올리면 인스타가 거기서 또 압축해서 눈에 띄게 흐려진다.
//
// ② 비율. 우리 화면은 430:932 = 1:2.167 이고 릴스의 9:16 은 1:1.778 이다.
//    즉 우리 영상이 21.9% 더 길다. 그대로 올리면 인스타가 위아래를 잘라내는데,
//    잘리는 자리가 정확히 위쪽 HUD(점수·목숨)와 아래쪽 아이템 줄이다.
//    그래서 좌우에 97px 씩 여백을 넣어 1080x1920 을 정확히 맞춘다 — 잘리는 것보다
//    여백이 낫다. 여백 색은 게임 배경과 이어지는 어두운 자주색으로 둔다.
//
// ③ 길이. 56초는 릴스에서 길다. 릴스는 3초 안에 손가락을 멈추게 못 하면 넘어가는데
//    원본은 표지 카드로 시작해 세 줄을 읽힌다(유튜브에서는 좋은 구성이다).
//    그래서 '젤리가 쏟아지는 장면' 부터 시작하는 짧은 판을 따로 만든다.
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, '..');
const OUT = join(ROOT, 'press', 'upload'); mkdirSync(OUT, { recursive: true });
const LANG = process.argv.includes('--en') ? 'en' : 'ko';
const SRC = join(ROOT, 'press', 'video', `jellimo-promo-${LANG}.mp4`);

const FFMPEG = ['/opt/node22/lib/node_modules/ffmpeg-static/ffmpeg', 'ffmpeg']
  .find(p => p === 'ffmpeg' || existsSync(p));
if (!existsSync(SRC)) { console.error('❌ 원본이 없습니다: ' + SRC); process.exit(1); }

const W = 1080, H = 1920;
const PAD = '#1c0716';        // 여백 색 — 게임의 어두운 자주색
// 폭을 886 으로 키우고(원본의 2배) 좌우를 채워 정확히 9:16 을 만든다
const FIT = `scale=886:1920:flags=lanczos,pad=${W}:${H}:(ow-iw)/2:0:${PAD.replace('#','0x')}`;

const ff = (args, label) => new Promise(res => {
  const p = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y'].concat(args));
  let err = '';
  p.stderr.on('data', d => err += d);
  p.on('close', c => { if (c !== 0) console.log('⚠ ' + label + ' 실패\n' + err.slice(0, 400)); res(c === 0); });
  p.on('error', () => { console.log('⚠ ffmpeg 를 못 찾았습니다'); res(false); });
});

const probe = f => new Promise(res => {
  let out = ''; const p = spawn(FFMPEG, ['-hide_banner', '-i', f]);
  p.stderr.on('data', d => out += d);
  p.on('close', () => {
    const d = out.match(/Duration: (\d+):(\d+):([\d.]+)/);
    const s = out.match(/, (\d+)x(\d+)/);
    res({ dur: d ? (+d[1] * 3600 + +d[2] * 60 + parseFloat(d[3])) : 0,
          w: s ? +s[1] : 0, h: s ? +s[2] : 0 });
  });
});

const src = await probe(SRC);
console.log(`   원본 ${src.w}x${src.h} · ${src.dur.toFixed(1)}초`);

// ── ① 전체 판 ──
const full = join(OUT, `jellimo-reels-${LANG}.mp4`);
if (await ff(['-i', SRC, '-vf', FIT, '-c:v', 'libx264', '-preset', 'slow', '-crf', '19',
              '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
              '-c:a', 'aac', '-b:a', '160k', full], '전체 판')) {
  const p = await probe(full);
  console.log(`🎬 ${full}\n   ${p.w}x${p.h} · ${p.dur.toFixed(1)}초 · ${(statSync(full).size/1048576).toFixed(1)}MB`);
}

// ── ② 훅 편집본 ──
// 자를 자리를 눈대중으로 잡았다가 두 번 틀렸다. 장면 비율로 계산해 놓고 보니
// 핵불닭 컷의 첫 프레임이 흰 전환막이었고(첫 프레임이 백지인 릴스), 던전 컷은
// 35.5~38.0초의 5초짜리 백지 구간으로 들어가 있었다.
// 그래서 초당 색폭을 재서 안전한 구간을 먼저 확인하고 숫자를 박았다.
//   백지(전환막): 19.0 · 28.0 · 35.5~38.0 · 52.0초  → 색폭 7~9
//   제일 진한 곳: 보스 20.5~24.0 (245~255) · 던전 43.5~47.5 (243)
//                 핵불닭 32.5~35.0 (202~207)
// 훅을 보스로 둔다 — 영상 전체에서 가장 강렬하고(색폭 255), 릴스는 첫 3초가 전부다.
//
// 컷 시각은 언어마다 다르다. 한국어판 숫자를 영어판에 그대로 쓰면 안 된다 —
// 영어판은 1.1초 짧고 전환막 자리도 다르다(영어판에는 34.5~37.0초에 2.5초짜리
// 백지가 있다). 그래서 언어별로 재서 따로 적어 둔다.
const TABLE = {
  // 한국어 56.4초 — 백지 19.0·28.0·35.5~38.0·52.0
  ko: [
    // 20.6 에서 시작하면 '보스를 터트려요' 안내와 '거대 젤리 등장!' 배너가 겹쳐 보인다.
    { name: '거대 보스',   from: 21.2, len: 3.2 },   // 훅
    { name: '핵불닭',      from: 30.5, len: 4.5 },
    { name: '실시간 던전', from: 43.5, len: 4.0 },
    { name: '마무리 카드', from: -3.8, len: 3.8 },   // 음수면 끝에서부터
  ],
  // 영어 58.9초 (앞니·캐릭터·한글 새는 것 고친 뒤 다시 구운 판. 전에는 55.3초였다 —
  // 다시 구우면 길이가 바뀌므로 숫자를 그대로 물려 쓰면 안 된다)
  //   백지: 6.0 · 22.0 · 31.0 · 38.5~41.0
  //   색폭 195 이상: 17.0~21.0 · 23.5~30.5 · 34.0~38.0 · 44.5~54.0
  // 어느 구간이 어느 장면인지는 프레임을 뽑아 눈으로 확인했다 — 색폭만 보고
  // 골랐다가 결과 화면을 던전으로 착각한 적이 있다.
  //   24.5 보스 · 35.0 핵불닭 · 42.0 '4 players' · 44.5 'Throw junk' · 55.5 마무리
  en: [
    { name: 'giant boss',  from: 23.6, len: 3.5 },   // 훅
    { name: 'nuclear',     from: 34.0, len: 4.0 },
    { name: 'live dungeon',from: 43.0, len: 4.2 },
    { name: 'end card',    from: -3.8, len: 3.8 },
  ],
};
const CUTS = (TABLE[LANG] || TABLE.ko).map(c =>
  ({ ...c, from: c.from < 0 ? src.dur + c.from : c.from }));

// 컷 안에 백지가 섞였는지 먼저 재 본다 — 안 재면 조용히 넘어간다(그래서 두 번 틀렸다).
const spreadAt = t => new Promise(res => {
  const p = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-ss', String(t), '-i', SRC,
                           '-frames:v', '1', '-vf', 'scale=48:48', '-f', 'rawvideo',
                           '-pix_fmt', 'rgb24', '-']);
  const bufs = []; p.stdout.on('data', d => bufs.push(d));
  p.on('error', () => res(999));
  p.on('close', () => { const b = Buffer.concat(bufs); if (b.length < 3) return res(999);
    let mn = 255, mx = 0;
    for (let i = 0; i < b.length; i++) { if (b[i] < mn) mn = b[i]; if (b[i] > mx) mx = b[i]; }
    res(mx - mn); });
});
let blankHit = 0;
for (const c of CUTS) {
  const lows = [];
  for (let t = c.from; t < c.from + c.len; t += 0.5) {
    const v = await spreadAt(t);
    if (v < 60) lows.push(t.toFixed(1) + '초(' + v + ')');
  }
  if (lows.length) { blankHit++; console.log('   ⚠ ' + c.name + ' 컷에 백지가 섞였습니다: ' + lows.join(', ')); }
}
if (blankHit) console.log('   ⚠ 위 컷의 시각을 옮겨야 합니다 — 흰 전환막이 화면을 덮는 구간입니다');
else console.log('   ✅ 네 컷 모두 백지 없음');

// 자른 자리에서 소리가 뚝 끊기면 귀에 걸린다 — 조각마다 앞뒤 0.12초를 여닫는다.
const parts = [];
let ok = true;
for (let i = 0; i < CUTS.length; i++) {
  const c = CUTS[i];
  const f = join(OUT, `__cut${i}.mp4`);
  const good = await ff(['-ss', c.from.toFixed(2), '-i', SRC, '-t', String(c.len),
    '-vf', FIT, '-af', `afade=t=in:st=0:d=0.12,afade=t=out:st=${(c.len - 0.12).toFixed(2)}:d=0.12`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', f], c.name);
  if (!good) { ok = false; break; }
  parts.push(f);
  console.log(`   · ${c.name}  ${c.from.toFixed(1)}초부터 ${c.len}초`);
}

if (ok) {
  const list = join(OUT, '__cuts.txt');
  const { writeFileSync, rmSync } = await import('node:fs');
  writeFileSync(list, parts.map(p => `file '${p}'`).join('\n'));
  const short = join(OUT, `jellimo-reels-short-${LANG}.mp4`);
  if (await ff(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy',
                '-movflags', '+faststart', short], '이어 붙이기')) {
    const p = await probe(short);
    console.log(`🎬 ${short}\n   ${p.w}x${p.h} · ${p.dur.toFixed(1)}초 · ${(statSync(short).size/1048576).toFixed(1)}MB`);
    if (p.w !== W || p.h !== H) console.log(`   ⚠ 크기가 ${W}x${H} 가 아닙니다`);
    if (p.dur > 22) console.log('   ⚠ 릴스 훅 편집본이 22초를 넘었습니다');
  }
  parts.forEach(f => rmSync(f, { force: true }));
  rmSync(list, { force: true });
}

// ── ③ 인스타 게시물(피드) 크기 ──
// 릴스가 아니라 피드에 영상으로 올릴 때 쓴다.
//
// 우리 화면은 1:2.167 이고 피드 4:5 는 1:1.25 다. 잘라서 맞추면 높이의 42% 가
// 날아가는데 그게 위쪽 HUD 나 아래쪽 아이템 줄이다 — 그래서 자르지 않고 채운다.
// 다만 좌우 여백이 42% 나 되어서 검은 띠로 두면 흉하다. 영상 자신을 크게 늘려
// 흐리게 깐 뒤 그 위에 원본을 얹는다(피드에서 흔히 쓰는 방식이고, 여백이 배경처럼
// 읽혀서 의도한 것으로 보인다).
const feed = async (srcFile, name, fw, fh) => {
  const out = join(OUT, name);
  const vf = `[0:v]scale=${fh}*2:-2,crop=${fw}:${fh},gblur=sigma=42,eq=brightness=-0.06[bg];`
           + `[0:v]scale=-2:${fh}:flags=lanczos[fg];[bg][fg]overlay=(W-w)/2:0`;
  if (await ff(['-i', srcFile, '-filter_complex', vf,
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p',
                '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '160k', out], name)) {
    const p = await probe(out);
    console.log(`🖼 ${out}\n   ${p.w}x${p.h} · ${p.dur.toFixed(1)}초 · ${(statSync(out).size/1048576).toFixed(1)}MB`);
    if (p.w !== fw || p.h !== fh) console.log(`   ⚠ 크기가 ${fw}x${fh} 가 아닙니다`);
  }
};
const shortFile = join(OUT, `jellimo-reels-short-${LANG}.mp4`);
if (existsSync(shortFile)) {
  await feed(shortFile, `jellimo-post-4x5-${LANG}.mp4`, 1080, 1350);  // 피드 기본 — 화면을 제일 많이 먹는다
  await feed(shortFile, `jellimo-post-1x1-${LANG}.mp4`, 1080, 1080);  // 정사각이 필요할 때
}

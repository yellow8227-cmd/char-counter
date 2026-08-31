// 소개 페이지에 넣을 캐릭터 그림 띠 만들기
//
// 왜: 페이지가 글만 이어지면 눈이 아프다. 글 사이사이에 캐릭터를 한 줄씩 깔아
//     쉬어 가는 자리를 만든다. 게임의 drawAvatar 를 그대로 쓰므로 게임 그림과 늘 같다.
//
// 만들어지는 것 (배경이 투명한 PNG — 페이지 어느 색 위에도 얹힌다)
//   press/shots/chars-row.png   캐릭터 아홉 종 (이름 있음)
//   press/shots/faces-row.png   표정 여섯 가지 (이름 있음)
//   press/shots/dress-row.png   꾸미기 조합 여덟 개 (이름 없음)
//
// 쓰기:  node jelly-shooting/tools/make-press-characters.mjs
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const PW = '/opt/node22/lib/node_modules/playwright/index.js';
const pwMod = await import(existsSync(PW) ? 'file://' + PW : 'playwright');
const chromium = (pwMod.chromium || (pwMod.default && pwMod.default.chromium));

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT  = join(ROOT, 'press', 'shots');
const GAME = 'file://' + join(ROOT, 'index.html');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME,
  args: ['--no-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.goto(GAME);
await page.waitForFunction("typeof drawAvatar==='function'", null, { timeout: 20000 });

// 한 줄 그리기 — [캐릭터설정, 표정, 이름] 목록을 받아 투명 배경에 늘어놓는다
const strip = async (items, opts) => await page.evaluate(`(([items,o])=>{
  const S=2;                                    // 2배로 그려 선명하게
  const cw=o.cell*S, R=o.r*S, lab=o.labels?26*S:0;
  const c=document.createElement('canvas');
  c.width=cw*items.length; c.height=(o.cell*1.34)*S+lab;   // 왕관·모자·턱이 잘리지 않게 위아래 여백
  const g=c.getContext('2d');
  g.textAlign='center'; g.textBaseline='middle';
  items.forEach((it,i)=>{
    const cx=cw*i+cw/2, cy=(o.cell*0.66)*S;
    drawAvatar(g,cx,cy,R,charSafe(it[0]),it[1],(i*11)+3);
    if(o.labels&&it[2]){
      g.font='700 '+(13*S)+'px "NanumGothic","Apple SD Gothic Neo",sans-serif';
      g.fillStyle='#7a5f78';
      g.fillText(it[2],cx,c.height-13*S);
    }
  });
  return c.toDataURL('image/png').split(',')[1];
})([${JSON.stringify(items)}, ${JSON.stringify(opts)}])`);

const save = (name, b64) => {
  const buf = Buffer.from(b64, 'base64');
  writeFileSync(join(OUT, name), buf);
  console.log('🎨 ' + name + '  ' + Math.round(buf.length / 1024) + 'KB');
};

// ① 캐릭터 아홉 종 — 아홉이면 한 줄이 길어져 페이지에서 작아진다. 칸을 조금 줄인다.
save('chars-row.png', await strip([
  [{k:'cat',   c:'#ffb3c9', a:'bow',     ac:'#ff5c8a'}, 'happy', '고양이'],
  [{k:'dog',   c:'#a3d5ff', a:'cap',     ac:'#4fa8ff'}, 'happy', '강아지'],   // 코·혀가 가장 예쁘게 나오는 표정
  [{k:'bunny', c:'#fff0a8', a:'flower',  ac:'#ff8ab5'}, 'calm',  '토끼'],
  [{k:'bear',  c:'#c9a27a', a:'crown',   ac:'#ffce3d'}, 'happy', '곰'],
  [{k:'panda', c:'#f2e7dc', a:'none'},                  'happy', '판다'],
  [{k:'fox',   c:'#ffb37a', a:'star',    ac:'#ffce3d'}, 'wink',  '여우'],
  [{k:'hamster',c:'#ffd59e',a:'none'},                  'happy', '햄스터'],
  [{k:'human', c:'#ffe36e', a:'glasses', ac:'#5a5566', h:'crop'},  'wink', '남자아이'],
  [{k:'girl',  c:'#ff9db2', a:'bow',     ac:'#ff5c8a', h:'braid'}, 'proud','여자아이'],
], { cell: 96, r: 37, labels: true }));

// ② 표정 여섯 가지 (같은 캐릭터로 — 표정만 다른 게 보이게)
const F = {k:'girl', c:'#ff9db2', a:'bow', ac:'#ff5c8a', h:'braid'};
save('faces-row.png', await strip([
  [F,'calm','기본'], [F,'happy','신남'], [F,'wow','놀람'],
  [F,'proud','으쓱'], [F,'mad','분함'], [F,'wail','눈물'],
], { cell: 110, r: 42, labels: true }));

// ③ 꾸미기 조합 여덟 개 (머리·색·악세서리)
save('dress-row.png', await strip([
  [{k:'girl', c:'#ffb3c9', a:'crown',     ac:'#ffce3d', h:'braid'}, 'happy'],
  [{k:'girl', c:'#b9e6ff', a:'heartband', ac:'#ff5c8a', h:'perm'},  'wink'],
  [{k:'human',c:'#ffe36e', a:'shades',    ac:'#5a5566', h:'buzz'},  'proud'],
  [{k:'human',c:'#d8c4ff', a:'party',     ac:'#8a5cff', h:'bob'},   'happy'],
  [{k:'cat',  c:'#fff0a8', a:'flower',    ac:'#ff8ab5'}, 'wow'],
  [{k:'panda',c:'#f2e7dc', a:'halo',      ac:'#ffe36e'}, 'happy'],
  [{k:'fox',  c:'#ffb37a', a:'star',      ac:'#ffce3d'}, 'wink'],
  [{k:'hamster',c:'#ffd59e',a:'bow',      ac:'#ff8ab5'}, 'happy'],
  [{k:'bunny',c:'#e8ffd6', a:'scarf',     ac:'#4fc65f'}, 'calm'],
  [{k:'bear', c:'#a3d5ff', a:'buds',      ac:'#8a5cff'}, 'wink'],
], { cell: 90, r: 35, labels: false }));

await browser.close();

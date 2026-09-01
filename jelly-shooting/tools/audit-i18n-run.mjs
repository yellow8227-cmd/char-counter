// 영어로 게임을 실제로 돌려 보고, 번역이 없어서 한글로 나간 문구를 그대로 받아 적는다.
//
// 왜 이 방식이 또 필요한가
//   audit-i18n.mjs 는 코드에 박힌 글자만 본다. 그런데 게임은 글자를 이어 붙여 문장을 만든다 —
//   toast('🎉 보스 격파! ⭐+'+bonus+' · 🪙+'+coin) 처럼. 이러면 코드에는 '🎉 보스 격파! ⭐+' 만
//   있고, 사전에 넣어야 하는 열쇠는 '🎉 보스 격파! ⭐+%d · 🪙+%d' 다. 그건 돌려 봐야 안다.
//   게임의 t() 는 못 찾은 문구를 window.__i18nMiss 에 숫자까지 %d 로 바꿔서 쌓아 둔다.
//   여기서는 그걸 꺼내 '사전에 이 줄들을 넣으세요' 형태로 뽑아 준다.
//
// 쓰기:  node tools/audit-i18n-run.mjs
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const PW = '/opt/node22/lib/node_modules/playwright/index.js';
const pwMod = await import(existsSync(PW) ? 'file://' + PW : 'playwright');
const chromium = (pwMod.chromium || (pwMod.default && pwMod.default.chromium));

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GAME = 'file://' + join(ROOT, 'index.html');
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const OUT = join(ROOT, 'press', 'i18n-빠진문구.txt');

// 게임 안에서 부를 것들 — 사람이 실제로 만나는 자리를 하나씩 건드린다.
// (부르다 실패하는 것은 조용히 넘어간다. 게임이 바뀌어도 이 파일이 안 깨지게)
const POKES = [
  ['판 시작',        `mode='normal';userMode='normal';startGame();`],
  ['레벨 올라감',    `level=1;prog=0;score=9999;elapsed=60*40;updateLevel();updateLevel();`],
  ['콤보 외침',      `for(const c of [3,5,7,9]){combo=c;popCombo&&popCombo();}`],
  ['아이템 다섯 개', `['heart','slow','clear','x2','magnet'].forEach((id,i)=>{crafted.includes(id)||crafted.push(id);bought[id]=4;inventory[id]=3;});
                      ['heart','slow','clear','x2','magnet'].forEach(id=>{try{useItem(id)}catch(e){}});`],
  ['젤리 놓침',      `if(jellies[0]){jellies[0].y=H+10;} loseLife();`],
  ['막았다',         `shieldT=60; if(jellies[0]) hit(jellies[0]);`],
  ['보스 등장·격파',  `level=BOSS_EVERY;bossLv=0;bossSpawn();
                      if(boss){boss.hp=1;bossHit(99,boss.x,boss.y);}`],
  ['거대 젤리 놓침',  `level=BOSS_EVERY;bossLv=0;boss=null;bossSpawn();if(boss){boss.y=H+999;bossStep();}`],
  ['황금 젤리',      `if(jellies[0]){jellies[0].gold=true;hit(jellies[0]);}`],
  ['폭탄 누름',      `jellies.push({x:100,y:200,r:26,vx:0,vy:1,color:'#4a4450',face:'happy',shape:'round',bomb:true,gold:false,pts:20,wob:0,dead:false});
                      hit(jellies[jellies.length-1]);`],
  ['판 끝',          `gameOver();`],
  ['던전 방해 받기',  `netMode=true;net.mp=true;net.foe={id:'p1',name:'JellyKing'};
                      for(const h of ['jelly','zig','bomb','fog','rush']) try{ hexApply({h:h,n:2}) }catch(e){}`],
  ['상대가 던진 젤리', `try{ throwIn({items:[{},{}],ghost:false}) }catch(e){}
                      try{ throwIn({items:[{},{}],ghost:true}) }catch(e){}`],
  ['충전 완료',       `bolt=BOLT_NEED-1; try{ boltAdd(9) }catch(e){}`],
  ['방이 꽉 찼을 때', `try{ netOn({t:'full'}) }catch(e){}`],
  ['홈으로',          `running=false;paused=false;try{boardUnlock()}catch(e){};openStart();`],
  ['프로필',          `openProfile('startScreen');buildProfile();`],
  ['공방',            `try{ buildCreator() }catch(e){}`],
  ['상점',            `try{ openShop() }catch(e){}`],
  ['도감·임무·출석',   `try{ openDex&&openDex() }catch(e){} try{ openMission&&openMission() }catch(e){}
                       try{ openAttend&&openAttend() }catch(e){} try{ buildMission&&buildMission() }catch(e){}`],
  ['랭킹',            `try{ openLb&&openLb() }catch(e){} try{ openRank&&openRank() }catch(e){}`],
  ['설정·피드백',      `try{ openSettings() }catch(e){} try{ openFeedback() }catch(e){}`],
  ['게임 방법·설명서',  `try{ openHow&&openHow() }catch(e){} try{ openGuide&&openGuide() }catch(e){}
                       try{ buildTolUI&&buildTolUI() }catch(e){}`],
  ['친구·채팅',        `try{ openFriends() }catch(e){} try{ openChat&&openChat() }catch(e){}`],
  ['난이도 고르기',     `try{ openMode&&openMode() }catch(e){} try{ buildSetupUI() }catch(e){}`],
  ['버티기(핵불닭)',    `try{ syncFireBar() }catch(e){} mode=userMode=FIRE;startGame();
                        elapsed=60*72; gameOver();`],
  ['끝없는 모드',       `nextEndless=true;restoreMode();startGame();`],
  ['던지기 게임 무기',  `try{ netGame='throw';hostRole='thrower';net.host=true;computeRole();startThrower();
                        for(const k of TW_ORDER){ tKind=k; refreshThrowBar(); }
                        for(let i=0;i<TSPD.length;i++){ tSpd=i; buildSpdBar&&buildSpdBar(); } }catch(e){}`],
  ['승리·패배 그림',    `try{ battleSet({name:'Kami',ch:charPack(),score:15200},{name:'JellyKing',ch:null,score:9800},'win','x');
                        celebShow&&celebShow(); const cv=$('celebCanvas'); if(cv){ const g=cv.getContext('2d');
                        drawCeleb(g,cv.width,cv.height,96,lastBattle,true); } }catch(e){}`],
  ['말풍선 고르기',     `try{ buildSayRow&&buildSayRow() }catch(e){} try{ sayPick&&sayPick(1) }catch(e){}`],
  ['결과 공유',        `try{ shareOpen() }catch(e){}`],
  ['관전',             `try{ watchOpen&&watchOpen() }catch(e){}`],
  ['계정',             `try{ openCloud&&openCloud() }catch(e){} try{ syncCloudUI() }catch(e){}`],
  // ── 결과 화면들. 영상에서 여기가 한국어로 남아 있는 걸 뒤늦게 발견했다.
  //    판을 끝까지 끌고 가야 나오는 자리라 위의 화면 열기만으로는 안 닿는다.
  ['던지기 결과 · 이김',  `net.foe={id:'p1',name:'JellyKing'}; net.foeOver=true; net.foeGone=false;
                          netGame='throw'; myRole='thrower'; net.myScore=1800; net.foeScore=2360;
                          net.foeReason='dead'; net.myReason='time'; net.mp=false; net.myOver=true;
                          net.foePopped=18; net.foeMissed=6; aiOn=true; net.prized=false;
                          try{ netResolve() }catch(e){}`],
  ['던지기 결과 · 짐',    `myRole='popper'; net.foeReason='time'; net.myReason='dead';
                          net.myOver=true; net.foeOver=true; pPopped=12; pMissed=9;
                          try{ netResolve() }catch(e){}`],
  ['던전 결과 · 1대1',    `netGame='dungeon'; net.mp=false; net.myOver=true; net.foeOver=true;
                          net.myReason='time'; net.foeReason='dead';
                          try{ netResolve() }catch(e){}`],
  ['던전 결과 · 무승부',  `net.myReason='time'; net.foeReason='time'; net.myScore=net.foeScore=9000;
                          try{ netResolve() }catch(e){}`],
  ['상대 연결 끊김',      `net.foeGone=true; try{ netResolve() }catch(e){} net.foeGone=false;`],
  ['상대 결과 기다림',    `net.foeOver=false; try{ netResolve() }catch(e){} net.foeOver=true;`],
  ['여러 명 결과',        `net.mp=true; net.peers={}; net.order=[];
                          try{ peerUpsert('p1',{name:'JellyKing',score:12800,lives:0,over:true});
                               peerUpsert('p2',{name:'Sky',score:6400,lives:2,over:true});
                               net.order.push('p1'); netResolve(); }catch(e){}`],
  ['AI 랭킹 안내',        `try{ noRankMsg() }catch(e){}`],
  ['탈락 알림',           `try{ toast(t('💀 %s님이 탈락했어요').replace('%s','JellyKing')) }catch(e){}`],
  ['버티기 결과',         `try{ mode=userMode=FIRE; startGame(); elapsed=60*72; gameOver();
                               for(const sec of [8,20,45,75,200]) try{ fireTaunt(sec) }catch(e){} }catch(e){}`],
  // ── 여기부터는 정적 검사에 걸린 화면들을 하나씩 열어 본다.
  //    (오류 문구는 서버를 못 쓰는 자리에서도 떠야 하니 그대로 불러 본다)
  ['도전장 보내기',      `try{ running=false; openStart(); }catch(e){}
                          try{ score=0; lastRun={seed:1,mode:'normal',score:0,net:false}; sendChallenge(); }catch(e){}
                          try{ nick=''; score=8000; lastRun={seed:1,mode:'normal',score:8000,net:false}; sendChallenge(); }catch(e){}
                          try{ nick='Kami'; lastRun={seed:1,mode:'normal',score:8000,net:true}; sendChallenge(); }catch(e){}`],
  ['도전장 받기',        `try{ openChallenge&&openChallenge() }catch(e){}
                          try{ chalOpen&&chalOpen() }catch(e){}
                          try{ takeChallenge&&takeChallenge('ZZZZ') }catch(e){}
                          try{ loadChallenge&&loadChallenge('ZZZZ') }catch(e){}`],
  ['친구 목록',          `try{ nick='Kami'; frAdd&&frAdd('Sky'); frAdd&&frAdd('Choco');
                               openFriends(); buildFriends(); frBadge(); }catch(e){}
                          try{ giftCode&&giftCode() }catch(e){}
                          try{ frPlayWith&&frPlayWith('Sky') }catch(e){}
                          try{ frDel&&frDel('Choco') }catch(e){}`],
  ['도감·업적',          `try{ dexInit(); openDex(); buildDex(); achCheck(); achLeft(); achBadge(); }catch(e){}`],
  ['임무·출석·오늘의 판',  `try{ openMission(); buildMission(); }catch(e){}
                          try{ markAttend(); openAttend(); }catch(e){}
                          try{ openDailyBoard(); buildDailyBoard(); checkDaily(); claimDaily(); }catch(e){}`],
  ['창작소',             `try{ openShop(); buildShop(); }catch(e){}
                          try{ for(const id in ITEMS) buyItem&&buyItem(id); }catch(e){}
                          try{ craftItem&&craftItem('clear') }catch(e){}`],
  ['닉네임',             `try{ nick=''; syncNickInputs(); syncNickUI(); draftNick&&draftNick('Kami');
                               nickCommitAsk&&nickCommitAsk(); nickTapLocked(); }catch(e){}`],
  ['계정 화면',          `try{ syncCloudUI(); cloudRefreshUI&&cloudRefreshUI(); cloudSay&&cloudSay();
                               cloudWhere&&cloudWhere(); cloudWhy&&cloudWhy(); cloudOutAsk&&cloudOutAsk(); }catch(e){}`],
  ['방 만들기·코드',      `try{ openNetMode&&openNetMode('dungeon') }catch(e){}
                          try{ netHost&&netHost() }catch(e){} try{ renderLobby&&renderLobby() }catch(e){}
                          try{ netJoinCode&&netJoinCode('ZZ') }catch(e){}
                          try{ hubJoin&&hubJoin(); hubRender&&hubRender(); }catch(e){}`],
  ['랭킹 줄',            `try{ renderRank([{name:'JellyKing',score:32831,me:true},
                                            {name:'Sky',score:12000,me:false}],0) }catch(e){}
                          try{ noRankMsg() }catch(e){}`],
  ['던지기 한계',        `try{ netGame='throw'; hostRole='thrower'; net.host=true; computeRole(); startThrower();
                               tEnergy=0; for(const k of TW_ORDER){ tKind=k; twTry&&twTry(k); }
                               mirror.length=0; for(let i=0;i<40;i++) mirror.push({netId:i,x:100,y:100,r:20,
                                 vx:0,vy:1,color:'#f88',face:'happy',shape:'round',bomb:false,ghost:false,
                                 gold:false,pts:20,wob:0,dead:false,foe:true,pay:1});
                               throwOne&&throwOne(0.5); }catch(e){}`],
  ['전체 초기화',        `try{ wipeAll&&wipeAll() }catch(e){}
                          try{ resetAll&&resetAll() }catch(e){}
                          try{ if(typeof askWipe==='function') askWipe(); }catch(e){}`],
  ['관전 화면',          `try{ watchOpen&&watchOpen(); watchRender&&watchRender(); }catch(e){}`],
];

const run = async () => {
  const browser = await chromium.launch({ executablePath: CHROME,
    args: ['--no-sandbox', '--allow-file-access-from-files', '--mute-audio'] });
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 },
    isMobile: true, hasTouch: true, locale: 'en-US' });
  await ctx.addInitScript(`try{ localStorage.setItem('jelly_lang','en');
    localStorage.setItem('jelly_tut','1'); }catch(e){}`);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(GAME);
  await page.waitForFunction("typeof openStart==='function'", null, { timeout: 20000 });
  await page.evaluate(`(()=>{ soundOn=false; bgmOn=false; coins=99999;
    saveNick('Kami'); ownedKinds=KINDS.map(k=>k.id); ownedHairs=HAIRS.map(h=>h.id);
    ['heart','slow','clear','x2','magnet'].forEach(id=>{ crafted.includes(id)||crafted.push(id);
      bought[id]=4; inventory[id]=3; });
    openStart(); return 1; })()`);
  const lang = await page.evaluate('lang');
  if (lang !== 'en') { console.error('❌ 화면 언어가 ' + lang + ' 입니다'); process.exit(1); }

  for (const [what, code] of POKES) {
    const before = await page.evaluate('Object.keys(window.__i18nMiss).length');
    await page.evaluate(`(()=>{ try{ ${code} }catch(e){ return 'x:'+e.message } return 1; })()`)
      .catch(e => console.log('   ⚠ ' + what + ' — ' + e.message.slice(0, 60)));
    await page.waitForTimeout(220);
    const after = await page.evaluate('Object.keys(window.__i18nMiss).length');
    console.log('· ' + what + (after > before ? '   (+' + (after - before) + ')' : ''));
  }

  const miss = await page.evaluate('window.__i18nMiss');
  await browser.close();

  // 일부러 한국어로 두는 것 — 언어 고르는 단추의 '한국어'
  const KEEP = new Set(['한국어']);
  const keys = Object.keys(miss).filter(k => !KEEP.has(k)).sort((a, b) => miss[b] - miss[a]);
  if (errs.length) { console.log('\n⚠ 페이지 오류 ' + errs.length + '건:'); for (const e of [...new Set(errs)].slice(0,5)) console.log('   ' + e.slice(0,90)); }
  if (!keys.length) { console.log('\n✅ 돌려 본 자리에서 번역이 빠진 문구 없음'); return; }
  const body = keys.map(k => '  [' + JSON.stringify(k) + ',"","")],'.replace(')]', ']')).join('\n');
  writeFileSync(OUT, keys.map(k => JSON.stringify(k)).join('\n') + '\n');
  console.log('\n❌ 번역이 빠진 문구 ' + keys.length + '개 — ' + OUT);
  for (const k of keys) console.log('  ' + JSON.stringify(k));
};
run().catch(e => { console.error('실패:', e.message); process.exit(1); });

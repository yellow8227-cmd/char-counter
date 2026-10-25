/* ───────── 저장 ───────── */
const LS="ttyEnglish.v1";
const today=()=>new Date().toLocaleDateString("sv-SE");
const addDays=(d,n)=>{const t=new Date(d+"T12:00:00");t.setDate(t.getDate()+n);return t.toLocaleDateString("sv-SE")};
const blank=()=>({v:1,updatedAt:0,xp:0,goal:100,days:{},read:{},qs:{},wrong:[],srs:{},mine:[]});
let S=blank();
try{const raw=localStorage.getItem(LS);if(raw)S=Object.assign(blank(),JSON.parse(raw))}catch(e){}
let remote=null,saveT=null,syncState="local";
function save(){S.updatedAt=Date.now();try{localStorage.setItem(LS,JSON.stringify(S))}catch(e){}
  if(remote){clearTimeout(saveT);saveT=setTimeout(pushRemote,1500)}}
let pushing=false,again=false;
async function pushRemote(){if(!remote)return;if(pushing){again=true;return}pushing=true;
  try{await remote.set(JSON.parse(JSON.stringify(S)));setSync("on")}catch(e){setSync("err")}
  pushing=false;if(again){again=false;pushRemote()}}
function setSync(s){syncState=s;const el=document.getElementById("sync");if(!el)return;
  el.className="sync"+(s==="on"?" on":"");el.textContent=s==="on"?"☁ 계정에 저장 중":s==="err"?"이 기기에만 저장됨":"이 기기에 저장"}
(async()=>{try{if(!window.claude?.use)return;const [user,db]=await Promise.all([claude.use("user"),claude.use("db")]);
  if(!user||!db)return;const id=await user.id();if(!id)return;
  const ref=db.doc("data/users/"+id+"/state");const snap=await ref.get();remote=ref;
  if(snap.exists){const r=snap.data();if((r.updatedAt||0)>(S.updatedAt||0)){S=Object.assign(blank(),JSON.parse(JSON.stringify(r)));try{localStorage.setItem(LS,JSON.stringify(S))}catch(e){}render()}else if(S.updatedAt>(r.updatedAt||0))pushRemote()}
  else if(S.updatedAt)pushRemote();setSync("on")}catch(e){setSync("err")}})();

/* ───────── 도우미 ───────── */
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const hl=s=>esc(s).replace(/\[\[(.+?)\]\]/g,'<mark class="hl">$1</mark>');
const plain=s=>String(s).replace(/\[\[|\]\]/g,"");
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const unitOf=id=>UNITS.find(u=>u.id===id);
function toast(t){const d=document.createElement("div");d.className="toast";d.textContent=t;document.body.append(d);setTimeout(()=>d.remove(),2200)}
function pop(t,c){const d=document.createElement("div");d.className="pop "+c;d.textContent=t;document.body.append(d);setTimeout(()=>d.remove(),950)}
function gain(n,why){S.xp+=n;const d=today();S.days[d]=(S.days[d]||0)+n;save();refreshTop();if(why)pop("+"+n+" XP","b")}
function streak(){let n=0,d=today();if(!S.days[d])d=addDays(d,-1);while(S.days[d]){n++;d=addDays(d,-1)}return n}
const LEVELS=[["NL",0],["NM",100],["NH",300],["IL",600],["IM1",1000],["IM2",1600],["IM3",2400],["IH",3500],["AL",5000]];
function level(){let i=0;LEVELS.forEach((l,k)=>{if(S.xp>=l[1])i=k});return i}

/* 발음 듣기 (브라우저 음성) */
let VO=null;
const clean=t=>plain(t).replace(/[→✗✓]/g,". ").replace(/ \/ /g,". ");
function pickVoice(){const vs=speechSynthesis.getVoices();VO=vs.find(v=>/en[-_]US/i.test(v.lang)&&/Samantha|Google US|Aria|Jenny|Natural/i.test(v.name))||vs.find(v=>/en[-_]US/i.test(v.lang))||vs.find(v=>/^en/i.test(v.lang))||null}
const hasTTS="speechSynthesis" in window;
if(hasTTS){pickVoice();speechSynthesis.onvoiceschanged=pickVoice}
function speak(t,slow){if(!hasTTS){toast("이 브라우저는 읽어주기를 지원하지 않아요. 사전 링크로 들어 보세요.");return}
  speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(clean(t));u.lang="en-US";if(VO)u.voice=VO;u.rate=slow?.72:.95;speechSynthesis.speak(u)}
const sayBtn=(t,slow=true)=>`<button class="say" data-say="${esc(plain(t))}" aria-label="원어민 발음 듣기">🔊</button>`+(slow?`<button class="say" data-say="${esc(plain(t))}" data-slow="1" aria-label="천천히 듣기">🐢</button>`:"");

/* 영영사전 · 실제 발음 링크 */
function dictLinks(t){const p=plain(t).trim();const w=p.split(/\s+/).length;const q=encodeURIComponent(p.toLowerCase().replace(/[.?!,]+$/,""));
  const L=[];if(w<=3){L.push(["Oxford 영영",`https://www.oxfordlearnersdictionaries.com/search/english/?q=${q}`],["네이버 영영",`https://dict.naver.com/enendict/#/search?query=${q}`])}
  L.push(["YouGlish 원어민 영상",`https://youglish.com/pronounce/${encodeURIComponent(p.replace(/[.?!]+$/,""))}/english/us`]);
  return `<div class="row">${L.map(([n,u])=>`<a class="btn sm ghost" href="${u}" target="_blank" rel="noopener">${n} ↗</a>`).join("")}</div>`}

/* 내 목소리 녹음 → 원어민과 비교 */
function recBox(t){return `<div class="rec card" style="padding:12px 14px;gap:8px;background:var(--bub);border:0">
  <div class="row" style="justify-content:space-between"><span class="lbl b">Shadowing · 따라 말하기</span>${sayBtn(t)}</div>
  <div class="row"><button class="btn sm" data-act="rec">🎙 녹음하기</button><label class="btn sm ghost">📱 녹음 앱으로<input type="file" accept="audio/*" data-act="recfile" hidden></label></div>
  <div class="recout row"></div>
  <p class="note" style="margin:0">원어민 → 내 목소리 → 원어민 순서로 번갈아 들어 보세요. 녹음은 이 화면에만 있고 저장되지 않아요.</p></div>`}
let mrec=null;
async function startRec(btn){const box=btn.closest(".rec"),out=box.querySelector(".recout");
  if(mrec&&mrec.state==="recording"){mrec.stop();return}
  try{const st=await navigator.mediaDevices.getUserMedia({audio:true});const ch=[];mrec=new MediaRecorder(st);
    mrec.ondataavailable=e=>ch.push(e.data);
    mrec.onstop=()=>{st.getTracks().forEach(t=>t.stop());showRec(out,new Blob(ch,{type:mrec.mimeType}));btn.textContent="🎙 다시 녹음"};
    mrec.start();btn.textContent="⏹ 녹음 멈추기"}
  catch(e){out.innerHTML=`<p class="note" style="margin:0">이 화면에선 마이크를 바로 켤 수 없어요. 옆의 <b>📱 녹음 앱으로</b>를 누르면 휴대폰 녹음기가 열리고, 녹음을 마치면 여기서 바로 들을 수 있어요.</p>`}}
function showRec(out,blob){out.innerHTML="";const a=document.createElement("audio");a.controls=true;a.src=URL.createObjectURL(blob);a.style.width="100%";a.style.maxWidth="420px";out.append(a)}

/* ───────── Claude에게 묻기 ───────── */
let sampleP=null;
const getSample=()=>sampleP||(sampleP=(window.claude?.use?claude.use("sample"):Promise.resolve(null)).catch(()=>null));
let aiOff=false;
function aiErr(e){const c=e?.code;if(["not_granted","sampling_disabled","not_declared","capability_disabled","capability_removed"].includes(c)){aiOff=true;return "이 화면에서는 AI를 쓸 수 없어요. 아티팩트 메뉴의 권한에서 Claude 사용을 허용하면 켜집니다."}
  if(c==="rate_limited")return "AI 사용량이 잠깐 찼어요. 조금 뒤에 다시 눌러 주세요.";if(c==="session_expired")return "다시 로그인한 뒤 눌러 주세요.";if(c==="invalid_json")return "답이 깨져서 왔어요. 한 번 더 눌러 주세요.";if(c==="cancelled")return "";return "AI가 답을 못 했어요. 한 번 더 눌러 주세요."}
const RULE="Rules: Explain ONLY in simple English (CEFR A2-B1 words). Never write Korean, never translate into Korean. Focus on meaning, feeling, and when people really say it, not grammar terms. Use natural, spoken, American English.";
async function aiJSON(prompt,el){const s=await getSample();if(!s){el.innerHTML=`<p class="note">AI는 Claude 앱이나 claude.ai에서 열었을 때 켜져요.</p>`;return null}
  el.innerHTML=`<p class="note">Thinking… (보통 10~30초)</p>`;try{const r=await s.json(prompt,{modelTier:"default"});return r}catch(e){el.innerHTML=`<p class="note">${esc(aiErr(e))}</p>`;return null}}
async function aiText(prompt,el){const s=await getSample();if(!s){el.textContent="AI는 Claude 앱이나 claude.ai에서 열었을 때 켜져요.";return}
  el.textContent="Thinking…";try{await s(prompt,{onText:({text})=>{el.textContent=text}})}catch(e){el.textContent=(e.text||"")+"\n"+aiErr(e)}}

const P={
 say:t=>`You are a friendly English speaking coach for a Korean adult preparing for the OPIc test (goal: IH to AL). The learner wants to say this in everyday spoken English:\n"""${t}"""\nGive what a native speaker would really say in that situation (not word-for-word translation). ${RULE}\nReply with only JSON: {"main":"the best natural sentence","others":[{"en":"another natural way","feel":"when you'd use it, max 12 words"}],"think":"Think in English: what the main sentence really means and when people say it, 2 simple sentences","trap":"a word-for-word sentence a Korean learner might make by mistake, or empty","chunks":[{"chunk":"key phrase","meaning":"simple English meaning"}],"examples":["2 other situations using the key phrase"],"idea":"which grammar feeling it uses in one short line, or empty"}`,
 explain:t=>`Explain this English word, phrase, or sentence like a learner's dictionary for a Korean learner of English:\n"""${t}"""\nIf it's a sentence, explain what the speaker means and the feeling behind it. ${RULE}\nReply with only JSON: {"term":"the word/phrase/sentence","kind":"word|phrase|sentence","simple":"one-line simple meaning","more":"2-3 sentences on how and when people use it, and the nuance","examples":["3 natural spoken examples in different situations"],"similar":["up to 3 similar words or phrases"],"careful":"one common confusion or mistake, or empty"}`,
 check:(mine,ko,en)=>`A Korean learner is practicing speaking English.${ko?` They wanted to say this (written in Korean): "${ko}".`:""}${en?` A model answer is: "${en}".`:""}\nThey said:\n"""${mine}"""\nJudge it like a kind native-speaker friend: does the meaning come across, and does it sound natural? ${RULE}\nReply with only JSON: {"verdict":"natural|ok|unnatural|wrong-meaning","comment":"1-2 encouraging, honest sentences","better":"a more natural version (same as theirs if already natural)","fixes":[{"from":"part they said","to":"better part","why":"short simple reason"}]}`,
 examples:(u,topic)=>`Make 5 natural spoken English sentences a Korean adult could really use in daily conversation or the OPIc test.\nIdea to practice: ${u.en} — ${u.big}\nTopic or situation: ${topic||"everyday life"}\nEach sentence max 16 words, casual and real. ${RULE}\nReply with only JSON: {"items":[{"en":"sentence","point":"which part shows the idea and what it means, max 15 words"}]}`,
 reps:(en,think)=>`Help a learner repeat one English expression in different situations, so they learn when to use it.\nExpression: "${en}"${think?`\nMeaning: ${think}`:""}\n${RULE}\nReply with only JSON: {"dlg":[["A","line"],["B","line"],["A","line"],["B","line that uses the expression"]],"para":"a short 3-sentence story in natural spoken English that uses the expression","situ":"an English description of a situation (start with 'You…') where you'd say it, without giving the expression","more":["2 short variations of the expression for other situations"]}`,
 ask:(u,q)=>`You are a kind English tutor. The learner is studying "${u.en}": ${u.big}\nAnswer their question in simple English with 2-3 short natural spoken examples. Keep it under 130 words. ${RULE}\nQuestion: ${q}`
};

/* ───────── 상단 ───────── */
let MODE="home";
const TABS=[["home","오늘","Today"],["grammar","문법","Grammar"],["speak","말하기","Speak"],["quiz","퀴즈","Quiz"],["coach","AI 코치","Coach"]];
function refreshTop(){const el=$("#statline");if(!el)return;const lv=LEVELS[level()][0];
  el.innerHTML=`<span>🔥 연속 <b>${streak()}</b>일</span><span>오늘 <b>${S.days[today()]||0}</b>/${S.goal} XP</span><span>레벨 <b>${lv}</b></span><span>총 <b>${S.xp.toLocaleString()}</b> XP</span><span class="sync" id="sync"></span>`;setSync(syncState)}
function tabs(){$("#tabs").innerHTML=TABS.map(([k,a,b])=>`<button data-tab="${k}" aria-pressed="${MODE===k}">${a}<small>${b}</small></button>`).join("")}
function go(m,arg){MODE=m;tabs();VIEWS[m](arg);window.scrollTo({top:0})}
function render(){refreshTop();tabs();VIEWS[MODE]()}

/* ───────── 오늘 ───────── */
function dueCards(){const d=today();return allCards().filter(c=>S.srs[c.id]&&S.srs[c.id].d<=d)}
function newCards(){return allCards().filter(c=>!S.srs[c.id])}
function unitAcc(id){const ids=QUIZ.map((q,i)=>[q,i]).filter(([q])=>q.u===id).map(([,i])=>i);let c=0,t=0;ids.forEach(i=>{const s=S.qs[i];if(s){c+=s.c;t+=s.c+s.w}});return t?{p:Math.round(c/t*100),t}:null}
function weakest(){let best=null;UNITS.forEach(u=>{const a=unitAcc(u.id);const v=a?a.p:-1;if(best===null||v<best.v)best={u,v}});return best.u}
const VIEWS={};
VIEWS.home=()=>{const td=S.days[today()]||0,pct=Math.min(100,Math.round(td/S.goal*100)),li=level(),lv=LEVELS[li],nx=LEVELS[li+1];
  const wk=[...Array(7)].map((_,i)=>{const d=addDays(today(),i-6);const v=S.days[d]||0;return{d,v}});const mx=Math.max(S.goal,...wk.map(w=>w.v));
  const due=dueCards().length,wu=weakest();
  $("#stage").innerHTML=`
  <div class="hero">
   <section class="card today"><div class="sec-h"><span class="lbl">오늘의 목표</span><div class="goalpick">하루 ${[50,100,150].map(g=>`<button data-goal="${g}" aria-pressed="${S.goal===g}">${g}</button>`).join("")} XP</div></div>
    <div class="big">${td}<small>/ ${S.goal} XP</small></div>
    <div class="meter ok"><i style="width:${pct}%"></i></div>
    <p class="note" style="margin:0">${pct>=100?"오늘 목표 달성! 남은 시간은 보너스예요.":td?`목표까지 ${S.goal-td} XP. 카드 몇 장이면 돼요.`:"작게 시작해요. 말하기 카드 10장이면 대략 60 XP예요."}</p>
    <div class="week">${wk.map(w=>`<div class="${w.v>=S.goal?"hit":""} ${w.d===today()?"now":""}"><i style="height:${Math.max(3,Math.round(w.v/mx*34))}px"></i><span>${"일월화수목금토"[new Date(w.d+"T12:00").getDay()]}</span></div>`).join("")}</div></section>
   <section class="card ladder"><span class="lbl b">말하기 레벨</span>
    <div class="row" style="align-items:baseline;gap:10px"><span class="lvname">${lv[0]}</span><span class="note">${nx?`${nx[0]}까지 ${nx[1]-S.xp} XP`:"최고 단계!"}</span></div>
    <div class="rungs">${LEVELS.map((l,i)=>`<div class="rung ${i<li?"got":""} ${i===li?"cur":""}">${l[0]}</div>`).join("")}</div>
    <p class="note" style="margin:0">오픽 등급 이름을 빌린 게임 레벨이에요. 실제 점수는 아니에요.</p></section>
  </div>
  <section class="card"><div class="sec-h"><h2>오늘 할 일</h2><span class="note">위에서부터 하나씩</span></div>
   <div class="mission">
    <button class="mis" data-go="speak" data-arg="due"><span class="n">${due||Math.min(10,newCards().length)}</span><b>말하기 ${due?"복습":"새 카드"}</b><span>${due?"오늘 다시 볼 차례인 문장":"한국말을 보고 바로 영어로"}</span></button>
    <button class="mis blue" data-go="unit" data-arg="${wu.id}"><span class="n">${wu.no}</span><b>${esc(wu.ko)}</b><span>${unitAcc(wu.id)?`정답률 ${unitAcc(wu.id).p}%. 지금 가장 약한 단원`:"아직 안 풀어 본 단원"}</span></button>
    <button class="mis green" data-go="quiz" data-arg="${wu.id}"><span class="n">10</span><b>퀴즈 10문제</b><span>방금 본 단원으로 확인하기</span></button>
   </div></section>
  <section class="card"><div class="sec-h"><h2>약한 곳 지도</h2><span class="note">퀴즈 정답률 · 60% 미만은 빨강</span></div>
   <div class="weak">${UNITS.map(u=>{const a=unitAcc(u.id);return `<button class="wk ${a&&a.p<60?"hot":""}" data-go="unit" data-arg="${u.id}"><span class="no">UNIT ${u.no}${S.read[u.id]?" · 읽음":""}</span><b>${esc(u.ko)}</b><div class="meter ${a&&a.p<60?"red":"ok"}"><i style="width:${a?a.p:0}%"></i></div><span class="pct">${a?a.p+"% · "+a.t+"문제":"아직 안 풂"}</span></button>`}).join("")}</div></section>
  <section class="card method"><span class="lbl b">영어식 사고를 기르는 3단계</span>
   <ol class="steps3"><li><b>① 통째로 받아들이기</b>한국어로 쪼개지 말고 문장 하나를 그대로. 뜻은 Think in English 풀이로.</li><li><b>② 다른 반복</b>같은 표현을 대화 → 짧은 글 → 영어 상황 퀴즈로 다시 만나기. 말하기 탭의 ‘다른 반복’.</li><li><b>③ 매일, 내 속도로</b>하루 목표는 작게. 10분이라도 매일 하는 게 이겨요.</li></ol>
   <p class="note" style="margin:0">참고: 러너블 「영어식 사고를 기르는 3단계」</p></section>`};

/* ───────── 문법 ───────── */
function pic(k){const W=600,H=150;const ax=`<line class="sv-axis" x1="30" y1="96" x2="570" y2="96"/><text x="30" y="124" class="t-m">past</text><text x="540" y="124" class="t-m">future</text><line class="sv-now" x1="380" y1="30" x2="380" y2="110"/><text x="364" y="24" class="t-red">NOW</text>`;
 const svg=b=>`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="개념 그림">${b}</svg>`;
 if(k==="now")return svg(ax+[80,150,220,290,460,530].map(x=>`<circle cx="${x}" cy="96" r="7" class="sv-inkf"/>`).join("")+`<text x="80" y="70" class="t-b">I drink coffee every day.</text><text x="80" y="86" class="t-m">(dots all along the line = habit)</text><path class="sv-acc" d="M340 60 q10 -12 20 0 t20 0 t20 0 t20 0"/><text x="330" y="48" class="t-acc">I'm drinking it now.</text>`);
 if(k==="line")return svg(ax+`<circle cx="140" cy="96" r="8" class="sv-accf"/><line class="sv-acc" x1="140" y1="96" x2="380" y2="96"/><polygon points="380,86 396,96 380,106" class="sv-accf"/><text x="110" y="74" class="t-acc">since 2019</text><text x="210" y="74" class="t-b">I've lived here (and still do)</text><text x="200" y="140" class="t-m">for seven years ←——→</text>`);
 if(k==="zigzag")return svg(ax+`<polyline class="sv-acc" points="140,96 160,70 180,96 200,70 220,96 240,70 260,96 280,70 300,96 320,70 340,96 360,70 380,96"/><text x="140" y="50" class="t-acc">I've been running…</text><text x="396" y="70" class="t-b">→ I'm sweaty now</text><text x="140" y="140" class="t-m">the activity itself, up to now</text>`);
 if(k==="spot")return svg(`<circle cx="120" cy="80" r="30" class="sv-faint"/><text x="86" y="84" class="t-m">someone?</text><line class="sv-acc" x1="160" y1="80" x2="330" y2="80"/><polygon points="330,70 346,80 330,90" class="sv-accf"/><text x="190" y="66" class="t-m">stole</text><ellipse cx="450" cy="80" rx="110" ry="46" class="sv-mark"/><text x="390" y="78" class="t-b">My bike</text><text x="390" y="98" class="t-acc">was stolen.</text><text x="370" y="142" class="t-m">spotlight on the receiver</text>`);
 if(k==="done")return svg(`<rect x="40" y="40" width="150" height="70" rx="12" class="sv-paper"/><text x="58" y="70" class="t-b">break</text><text x="58" y="92" class="t-m">(an action)</text><line class="sv-acc" x1="200" y1="75" x2="300" y2="75"/><polygon points="300,65 316,75 300,85" class="sv-accf"/><rect x="330" y="30" width="230" height="90" rx="12" class="sv-soft"/><text x="350" y="62" class="t-acc">broken ✓</text><text x="350" y="84" class="t-b">done / received</text><text x="350" y="104" class="t-m">a state that stays</text>`);
 if(k==="would")return svg(`<rect x="30" y="30" width="230" height="90" rx="14" class="sv-paper"/><text x="50" y="58" class="t-m">REAL</text><text x="50" y="84" class="t-b">will · can · is</text><text x="50" y="104" class="t-m">I will call you.</text><line class="sv-acc" x1="270" y1="75" x2="330" y2="75"/><polygon points="330,65 346,75 330,85" class="sv-accf"/><text x="262" y="60" class="t-m">one step away</text><rect x="352" y="22" width="220" height="106" rx="30" class="sv-soft" stroke-dasharray="6 5"/><text x="372" y="52" class="t-acc">WOULD</text><text x="372" y="76" class="t-b">imagined · past · polite</text><text x="372" y="100" class="t-m">I'd call you (if…)</text>`);
 if(k==="blocks")return svg(`<rect x="20" y="45" width="190" height="56" rx="10" class="sv-inkf"/><text x="36" y="79" style="fill:var(--sheet)" class="t-b">I stayed home</text><rect x="220" y="45" width="110" height="56" rx="10" class="sv-mark"/><text x="236" y="79" class="t-b">because</text><rect x="340" y="45" width="230" height="56" rx="10" class="sv-soft"/><text x="356" y="79" class="t-acc">it was raining.</text><text x="20" y="130" class="t-m">clause 1 (main idea)</text><text x="340" y="130" class="t-m">clause 2 (the reason)</text><text x="20" y="30" class="t-m">subject + verb = one block</text>`);
 if(k==="tag")return svg(`<rect x="30" y="50" width="170" height="54" rx="10" class="sv-inkf"/><text x="52" y="83" style="fill:var(--sheet)" class="t-b">the café</text><line class="sv-faint" x1="200" y1="77" x2="250" y2="77"/><path d="M250 50 h300 a10 10 0 0 1 10 10 v34 a10 10 0 0 1 -10 10 h-300 l-18 -27 z" class="sv-mark"/><circle cx="262" cy="77" r="5" class="sv-paper"/><text x="280" y="83" class="t-b">where we first met</text><text x="250" y="132" class="t-m">a name tag: WHICH café?</text>`);
 return ""}
VIEWS.grammar=()=>{$("#stage").innerHTML=`<section class="card" style="gap:8px"><div class="sec-h"><h2>회화용 문법 8단원</h2><span class="note">약하다고 한 것만 골랐어요</span></div>
  <p class="note" style="margin:0">설명은 모두 쉬운 영어예요. 모르는 단어는 드래그(길게 누르기)해서 <b>영영 풀이</b> 버튼을 누르세요.</p></section>
  <div class="unitlist">${UNITS.map(u=>{const a=unitAcc(u.id);return `<button class="utile" data-go="unit" data-arg="${u.id}"><span class="num">${u.no}</span><b>${esc(u.ko)}</b><span class="en">${esc(u.big)}</span><span class="meta">${S.read[u.id]?'<span class="tag ok">읽음</span>':'<span class="tag">안 읽음</span>'}${a?`<span class="tag ${a.p<60?"red":"blue"}">정답률 ${a.p}%</span>`:""}</span></button>`}).join("")}</div>`};
VIEWS.unit=id=>{const u=unitOf(id)||UNITS[0];MODE="grammar";tabs();
 $("#stage").innerHTML=`<section class="card">
   <span class="crumb">UNIT ${u.no} · ${esc(u.en.toUpperCase())}</span><h2 class="utitle">${esc(u.ko)}</h2>
   <p class="bigidea" style="margin:0">${esc(u.big)} ${sayBtn(u.big,false)}</p>
   <div class="pic">${pic(u.pic)}</div></section>
  <section class="card"><span class="lbl">The picture in your head</span>
   ${u.points.map((p,i)=>`<div class="point"><h3><span class="pn">${String(i+1).padStart(2,"0")}</span>${esc(p.h)}</h3><p>${esc(p.p)}</p><ul class="exs">${p.ex.map(e=>`<li><span class="en">${hl(e)}</span>${sayBtn(e.replace(/\(.*?\)/g,""),false)}</li>`).join("")}</ul></div>`).join("")}</section>
  <section class="card"><div class="sec-h"><span class="lbl b">Real talk · 실제 대화</span><button class="btn sm ghost" data-act="playdlg" data-u="${u.id}">🔊 전체 듣기</button></div>
   <div class="chat">${u.dialog.map(([w,t])=>`<div class="bub ${w}"><span class="who">${w}</span><span class="txt">${hl(t)}</span>${sayBtn(t,false)}</div>`).join("")}</div></section>
  <section class="card"><span class="lbl">Common mistakes · 자주 하는 실수</span>
   <div class="mist">${u.mistakes.map(m=>`<div class="mi"><span class="x">✗</span><span class="bad">${esc(m[0])}</span><span class="o">✓</span><span>${esc(m[1])} ${sayBtn(m[1].split(" / ")[0],false)}</span><span class="why">${esc(m[2])}</span></div>`).join("")}</div>
   <div class="opic"><b>OPIC TIP</b>${esc(u.opic)}</div></section>
  <section class="ai"><div class="h"><span class="dot">C</span>내 이야기로 예문 만들기</div>
   <p class="note" style="margin:0">내 상황을 적으면(한국어도 괜찮아요) 이 단원 문법으로 실제 쓸 문장 5개를 만들어 줘요.</p>
   <input type="text" id="extopic" placeholder="예: 회사, 고양이, 요즘 다이어트, 여행 계획">
   <div class="row"><button class="btn blue sm" data-act="mkex" data-u="${u.id}">예문 5개 만들기</button></div><div id="exout" class="res"></div></section>
  <section class="ai"><div class="h"><span class="dot">C</span>이 단원에 대해 질문하기</div>
   <textarea id="askq" rows="2" placeholder="예: I've lived랑 I've been living은 느낌이 얼마나 달라?"></textarea>
   <div class="row"><button class="btn blue sm" data-act="ask" data-u="${u.id}">영어로 설명 듣기</button></div><div id="askout" class="aiout"></div></section>
  <div class="row"><button class="btn grow ${S.read[u.id]?"ghost":"pri"}" data-act="read" data-u="${u.id}">${S.read[u.id]?"✓ 읽음":"다 읽었어요 +20 XP"}</button><button class="btn grow blue" data-go="quiz" data-arg="${u.id}">이 단원 퀴즈</button>${u.no<8?`<button class="btn grow ghost" data-go="unit" data-arg="${UNITS[u.no].id}">다음 단원 →</button>`:""}</div>`};

/* ───────── 말하기 ───────── */
function allCards(){return CARDS.concat(S.mine.map(m=>Object.assign({cat:"mine",tag:null},m)))}
let SP={mode:"ko",cat:"due",flash:false,queue:[],i:0,shown:false,step:0};
VIEWS.speak=arg=>{if(arg)SP.cat=arg;const all=allCards();const cnt=c=>c==="due"?dueCards().length:c==="all"?all.length:c==="mine"?S.mine.length:c==="rep"?all.filter(x=>x.dlg).length:all.filter(x=>x.cat===c).length;
 const chips=[["due","오늘 복습"],["all","전체"],["mine","내 문장"],...CATS];
 $("#stage").innerHTML=`<section class="card"><div class="sec-h"><h2>말하기 연습</h2><span class="note">소리 내서 먼저 말하고, 그다음 확인</span></div>
  <div class="deck">
   <button class="modebtn" data-sp="ko" aria-pressed="${SP.mode==="ko"}"><b>🇰🇷 → 🗣 바로 말하기</b><span>하고 싶은 말(한국어)을 보고 영어로 바로. 한국식 사고 ✗ vs 영어식 사고 ✓ 비교</span></button>
   <button class="modebtn" data-sp="situ" aria-pressed="${SP.mode==="situ"}"><b>🌎 영어 상황 퀴즈</b><span>한국어 없이 영어 상황 설명만 보고 떠올리기</span></button>
   <button class="modebtn" data-sp="rep" aria-pressed="${SP.mode==="rep"}"><b>🔁 다른 반복</b><span>한 표현을 문장 → 대화 → 짧은 글 → 상황 퀴즈로 4번 만나기</span></button>
  </div>
  ${SP.mode==="ko"?`<div class="chips">${chips.map(([k,n])=>`<button class="chip" data-cat="${k}" aria-pressed="${SP.cat===k}">${n}<small>${cnt(k)}</small></button>`).join("")}</div>
   <label class="toggle"><input type="checkbox" id="flash" ${SP.flash?"checked":""}> ⏱ 5초 순발력 모드 (5초 안에 입 밖으로!)</label>`:""}
  <button class="btn pri" data-act="spstart">시작하기</button>
  <p class="note" style="margin:0">카드 평가에 따라 다시 나오는 날이 정해져요: 못함 → 오늘 또, 생각함 → 내일, 바로 나옴 → 3일·7일·16일 뒤.</p></section>`};
function buildQueue(){const all=allCards();let pool;
 if(SP.mode==="situ"){pool=shuffle(all.filter(c=>c.situ)).concat(shuffle(QUIZ.filter(q=>q.t==="situ").map((q,i)=>({id:"qs"+i,situ:q.q,en:q.o[0],think:q.x,tag:q.u}))))}
 else if(SP.mode==="rep"){pool=shuffle(all.filter(c=>c.dlg)).concat(shuffle(all.filter(c=>!c.dlg)).slice(0,6))}
 else if(SP.cat==="due"){pool=shuffle(dueCards());if(pool.length<10)pool=pool.concat(shuffle(newCards()).slice(0,10-pool.length))}
 else if(SP.cat==="all")pool=shuffle(all);else if(SP.cat==="mine")pool=shuffle(all.filter(c=>c.cat==="mine"));else pool=shuffle(all.filter(c=>c.cat===SP.cat));
 SP.queue=pool.slice(0,SP.mode==="rep"?5:10);SP.i=0;SP.shown=false;SP.step=0}
let flashT=null;
function spCard(){clearInterval(flashT);const c=SP.queue[SP.i];if(!c){spDone();return}
 const head=`<div class="prog"><span>${SP.i+1} / ${SP.queue.length}</span><span>${c.tag?esc(unitOf(c.tag)?.ko||""):c.cat==="mine"?"내 문장":""}</span></div><div class="meter"><i style="width:${SP.i/SP.queue.length*100}%"></i></div>`;
 if(SP.mode==="rep"){spRep(c,head);return}
 const q=SP.mode==="situ"?`<div class="situ">${esc(c.situ)} ${sayBtn(c.situ,false)}</div>`:`<div class="row" style="justify-content:space-between;flex-wrap:nowrap;gap:12px"><div class="prompt-ko">${esc(c.ko)}</div>${SP.flash&&!SP.shown?`<svg class="ring" viewBox="0 0 54 54"><circle class="bg" cx="27" cy="27" r="22"/><circle class="fg" id="ringfg" cx="27" cy="27" r="22" stroke-dasharray="138.2" stroke-dashoffset="0" transform="rotate(-90 27 27)"/><text id="ringt" x="27" y="33" text-anchor="middle">5</text></svg>`:""}</div>`;
 $("#stage").innerHTML=`<section class="card flash">${head}${q}
  ${SP.shown?spReveal(c):`<textarea id="mine" rows="2" placeholder="소리 내서 말한 다음, 원하면 여기 적어 보세요 (안 적어도 돼요)"></textarea>
   <div class="row"><button class="btn pri grow" data-act="reveal">정답 보기</button><button class="btn ghost" data-act="skip">건너뛰기</button></div>`}</section>`;
 if(SP.flash&&!SP.shown&&SP.mode==="ko"){const t0=Date.now();flashT=setInterval(()=>{const e=(Date.now()-t0)/1000,l=Math.max(0,5-e);const fg=$("#ringfg"),tt=$("#ringt");if(!fg){clearInterval(flashT);return}fg.setAttribute("stroke-dashoffset",(138.2*(1-l/5)).toFixed(1));tt.textContent=Math.ceil(l);if(l<=0){clearInterval(flashT);SP.mineTxt=$("#mine")?.value||"";SP.shown=true;spCard()}},100)}}
function spReveal(c){const mine=SP.mineTxt||"";
 return `<div class="answer">${esc(c.en)}</div><div class="row">${sayBtn(c.en)}<button class="btn sm ghost" data-act="explain" data-t="${esc(c.en)}">영영 풀이</button></div>
  ${c.trap?`<div class="vs"><div class="kr"><span class="lbl">한국식 사고</span><p>${esc(c.trap)}</p></div><div class="eng"><span class="lbl g">영어식 사고</span><p>${esc(c.en)}</p></div></div>`:""}
  <div class="think"><span class="lbl b">Think in English</span>${esc(c.think)}</div>
  ${c.alt?`<p class="note en" style="margin:0;font-size:15px">Also: <b>${esc(c.alt)}</b> ${sayBtn(c.alt.replace(/\(.*?\)/g,""),false)}</p>`:""}
  ${mine?`<div class="ai" style="padding:12px"><div class="row" style="justify-content:space-between"><span class="note">내가 쓴 답: <b class="en" style="color:var(--ink)">${esc(mine)}</b></span><button class="btn blue sm" data-act="checkmine">AI로 검사</button></div><div id="chkout" class="res"></div></div>`:""}
  ${recBox(c.en)}
  ${dictLinks(c.en)}
  ${SP.mode==="ko"||SP.mode==="situ"?`<div class="rate"><button class="r0" data-rate="0">못 했어요<small>오늘 또</small></button><button class="r1" data-rate="1">생각했어요<small>내일 다시</small></button><button class="r2" data-rate="2">바로 나왔어요<small>나중에</small></button></div>`:""}`}
const BOX=[0,1,3,7,16,35];
function rate(r){const c=SP.queue[SP.i];const cur=S.srs[c.id]||{b:0};let b=r===2?Math.min(5,(cur.b||0)+1):r===1?Math.max(1,cur.b||0):0;
 if(!String(c.id).startsWith("qs"))S.srs[c.id]={b,d:addDays(today(),r===0?0:r===1?1:BOX[b])};
 if(r===0)SP.queue.push(c);gain([2,5,8][r],true);SP.i++;SP.shown=false;SP.mineTxt="";spCard()}
function spDone(){$("#stage").innerHTML=`<section class="card" style="align-items:flex-start"><span class="lbl g">끝!</span><div class="score">${SP.queue.length}<small> 장 완료</small></div><p class="muted" style="margin:0">오늘 ${S.days[today()]||0} XP. 방금 본 문장 중 하나를 오늘 실제로 써 보세요.</p><div class="row"><button class="btn pri" data-act="spagain">한 번 더</button><button class="btn ghost" data-go="home">오늘 화면</button></div></section>`}
async function spRep(c,head){const st=SP.step;const steps=["① 문장 통째로","② 대화 속에서","③ 짧은 글 속에서","④ 영어 상황 퀴즈"];
 let body="";
 if(!c.dlg&&st>0&&!c._ai){body=`<div class="ai"><div class="h"><span class="dot">C</span>이 문장은 아직 반복 자료가 없어요</div><button class="btn blue sm" data-act="mkreps">AI로 대화·글·상황 만들기</button><div id="repout"></div></div>`}
 else if(st===0)body=`<div class="answer">${esc(c.en)}</div><div class="row">${sayBtn(c.en)}</div><div class="think"><span class="lbl b">Think in English</span>${esc(c.think)}</div>${c.trap?`<div class="vs"><div class="kr"><span class="lbl">한국식 사고</span><p>${esc(c.trap)}</p></div><div class="eng"><span class="lbl g">영어식 사고</span><p>${esc(c.en)}</p></div></div>`:""}`;
 else if(st===1)body=`<div class="chat">${c.dlg.map(([w,t])=>`<div class="bub ${w}"><span class="who">${w}</span><span class="txt">${esc(t).replace(esc(c.en.replace(/[.?!]$/,"")),m=>`<mark class="hl">${m}</mark>`)}</span>${sayBtn(t,false)}</div>`).join("")}</div>`;
 else if(st===2)body=`<div class="para">${esc(c.para).replace(esc(c.en.replace(/[.?!]$/,"")),m=>`<mark class="hl">${m}</mark>`)}</div><div class="row">${sayBtn(c.para)}</div>${c.more?`<div class="more"><span class="lbl b">Same shape, other situations</span>${c.more.map(m=>`<div class="row"><span class="en" style="flex:1">${esc(m)}</span>${sayBtn(m.replace(/\(.*?\)/g,""),false)}</div>`).join("")}</div>`:""}`;
 else body=`<div class="situ">${esc(c.situ)} ${sayBtn(c.situ,false)}</div>${SP.shown?`<div class="answer">${esc(c.en)}</div>${recBox(c.en)}`:`<p class="note" style="margin:0">소리 내서 말해 본 다음 정답을 확인하세요.</p>`}`;
 const nextLbl=st<3?"다음 →":SP.shown?"이 표현 완료 ✓":"정답 보기";
 $("#stage").innerHTML=`<section class="card flash">${head}<div class="stepper">${steps.map((s,i)=>`<i class="${i<=st?"on":""}"></i>`).join("")}</div><span class="lbl b">${steps[st]}</span>${body}
  <div class="row">${st>0?`<button class="btn ghost" data-act="repprev">← 이전</button>`:""}${(c.dlg||st===0)?`<button class="btn pri grow" data-act="repnext">${nextLbl}</button>`:""}<button class="btn ghost" data-act="repskip">건너뛰기</button></div></section>`}

/* ───────── 퀴즈 ───────── */
let QZ={u:"all",kind:"normal",list:[],i:0,ans:null,right:0,hp:100,hearts:3,combo:0,wrongs:[]};
const TL={pick:"빈칸",mean:"무슨 뜻?",fix:"자연스러운 문장",situ:"영어 상황"};
VIEWS.quiz=arg=>{if(arg&&arg!=="wrong")QZ.u=arg;const cnt=u=>u==="all"?QUIZ.length:QUIZ.filter(q=>q.u===u).length;
 $("#stage").innerHTML=`<section class="card"><div class="sec-h"><h2>문법 퀴즈</h2><span class="note">뜻에 집중한 문제예요</span></div>
  <div class="chips"><button class="chip" data-qu="all" aria-pressed="${QZ.u==="all"}">전체 섞기<small>${cnt("all")}</small></button>${UNITS.map(u=>`<button class="chip" data-qu="${u.id}" aria-pressed="${QZ.u===u.id}">${u.no}. ${esc(u.ko)}<small>${cnt(u.id)}</small></button>`).join("")}</div>
  <div class="deck">
   <button class="modebtn" data-qk="normal" aria-pressed="${QZ.kind==="normal"}"><b>📝 10문제</b><span>천천히 풀고 영어 해설 읽기</span></button>
   <button class="modebtn" data-qk="boss" aria-pressed="${QZ.kind==="boss"}"><b>👾 보스전</b><span>원어민 보스의 HP를 깎아라. 하트 3개, 연속 정답 콤보</span></button>
   <button class="modebtn" data-qk="wrong" aria-pressed="${QZ.kind==="wrong"}"><b>📕 오답노트</b><span>틀린 문제만 다시 · ${S.wrong.length}문제</span></button>
  </div><button class="btn pri" data-act="qstart">시작하기</button></section>
  ${S.wrong.length?`<section class="card"><span class="lbl">오답노트 미리보기</span><div class="wlist">${S.wrong.slice(-4).reverse().map(i=>`<div class="wli">${esc(QUIZ[i].q)}\n<span class="a">→ ${esc(QUIZ[i].o[0])}</span></div>`).join("")}</div></section>`:""}`};
function qStart(){let pool=QUIZ.map((q,i)=>i);if(QZ.kind==="wrong"){pool=S.wrong.slice();if(!pool.length){toast("오답노트가 비어 있어요. 멋져요!");return}}else if(QZ.u!=="all")pool=pool.filter(i=>QUIZ[i].u===QZ.u);
 pool=shuffle(pool);QZ.list=QZ.kind==="boss"?pool.concat(shuffle(pool)):pool.slice(0,10);Object.assign(QZ,{i:0,ans:null,right:0,hp:100,hearts:3,combo:0,wrongs:[],opts:null});qCard()}
function qCard(){const qi=QZ.list[QZ.i];if(qi===undefined||(QZ.kind==="boss"&&(QZ.hp<=0||QZ.hearts<=0))){qDone();return}
 const q=QUIZ[qi];if(!QZ.opts)QZ.opts=shuffle(q.o.map((t,k)=>({t,k})));const a=QZ.ans;
 const boss=QZ.kind==="boss"?`<div class="boss" id="boss"><div class="bossface ${QZ.hp<=0?"dead":""}">N</div><div class="bossinfo"><span class="nm">The Native Speaker</span><div class="bhp"><i style="width:${QZ.hp}%"></i></div><div class="row" style="justify-content:space-between"><span class="hearts">${"♥".repeat(QZ.hearts)}<s>${"♥".repeat(3-QZ.hearts)}</s></span><span class="combo">${QZ.combo>1?QZ.combo+" COMBO!":""}</span></div></div></div>`:"";
 const quote=q.t==="mean";
 $("#stage").innerHTML=`${boss}<section class="card qcard"><div class="prog"><span>${QZ.kind==="boss"?"보스전":QZ.kind==="wrong"?"오답노트":"퀴즈"} · ${QZ.i+1}${QZ.kind==="boss"?"":" / "+QZ.list.length}</span><span><span class="qtype">${TL[q.t]}</span> ${esc(unitOf(q.u).ko)}</span></div>
  ${QZ.kind!=="boss"?`<div class="meter"><i style="width:${QZ.i/QZ.list.length*100}%"></i></div>`:""}
  ${quote?`<p class="note" style="margin:0">What does this mean?</p>`:""}<div class="qtxt ${quote?"quote":""}">${esc(q.q)}</div>
  <div class="opts">${QZ.opts.map((o,n)=>`<button class="opt ${a!==null?(o.k===0?"right":n===a?"wrong":""):""}" data-opt="${n}" ${a!==null?"disabled":""}><span class="dot">${"ABCD"[n]}</span><span>${esc(o.t)}</span></button>`).join("")}</div>
  ${a!==null?`<div class="why"><span class="v ${QZ.opts[a].k===0?"ok":"ng"}">${QZ.opts[a].k===0?"정답!":"아쉬워요"}</span><div class="think"><span class="lbl b">Why</span>${esc(q.x)}</div>
   <div class="row">${sayBtn(q.t==="pick"?q.q.replace("___",q.o[0]).replace(/^[AB]: /gm,""):q.t==="mean"?q.q:q.o[0])}<button class="btn sm ghost" data-act="explain" data-t="${esc(q.t==="mean"?q.q:q.o[0])}">영영 풀이</button></div>
   <button class="btn pri" data-act="qnext">${QZ.kind!=="boss"&&QZ.i+1>=QZ.list.length?"결과 보기":"다음 문제 →"}</button></div>`:""}</section>`}
function qAnswer(n){if(QZ.ans!==null)return;QZ.ans=n;const qi=QZ.list[QZ.i];const ok=QZ.opts[n].k===0;const s=S.qs[qi]||{c:0,w:0};
 if(ok){s.c++;QZ.right++;QZ.combo++;S.wrong=S.wrong.filter(x=>x!==qi);if(QZ.kind==="boss")QZ.hp=Math.max(0,QZ.hp-(8+Math.min(QZ.combo,5)*2));gain(10,true)}
 else{s.w++;QZ.combo=0;QZ.wrongs.push(qi);if(!S.wrong.includes(qi))S.wrong.push(qi);if(QZ.kind==="boss")QZ.hearts--;pop("✗","r")}
 S.qs[qi]=s;save();qCard();if(!ok)$(".qcard")?.classList.add("shake")}
function qDone(){const boss=QZ.kind==="boss",win=boss&&QZ.hp<=0;if(win)gain(50,true);
 $("#stage").innerHTML=`<section class="card" style="align-items:flex-start"><span class="lbl ${win||!boss?"g":""}">${boss?(win?"보스 격파!":"보스 승리… 다시 도전!"):"결과"}</span>
  <div class="score">${QZ.right}<small> / ${boss?QZ.i:QZ.list.length} 정답</small></div>${win?`<p class="muted" style="margin:0">보너스 +50 XP</p>`:""}
  ${QZ.wrongs.length?`<span class="lbl">틀린 문제 (오답노트에 들어갔어요)</span><div class="wlist" style="align-self:stretch">${QZ.wrongs.map(i=>`<div class="wli">${esc(QUIZ[i].q)}\n<span class="a">→ ${esc(QUIZ[i].o[0])}</span>\n<span class="muted">${esc(QUIZ[i].x)}</span></div>`).join("")}</div>`:`<p class="muted" style="margin:0">하나도 안 틀렸어요!</p>`}
  <div class="row"><button class="btn pri" data-act="qstart">다시 하기</button><button class="btn ghost" data-go="quiz">퀴즈 목록</button></div></section>`}

/* ───────── AI 코치 ───────── */
let CM="say";
const CMODES=[["say","이 말 영어로","하고 싶은 말을 한국어(또는 엉터리 영어)로 쓰면 원어민 문장 + 영어 풀이"],["explain","영영 뜻풀이","단어·표현·문장을 영어로만 설명"],["check","내 영어 검사","내가 만든 문장이 자연스러운지"],["examples","예문 만들기","문법 단원 + 내 상황으로 예문 5개"]];
VIEWS.coach=()=>{const m=CMODES.find(x=>x[0]===CM);
 $("#stage").innerHTML=`<section class="card"><div class="sec-h"><h2>AI 코치</h2><span class="note">설명은 늘 영어로</span></div>
  <div class="chips">${CMODES.map(([k,n])=>`<button class="chip" data-cm="${k}" aria-pressed="${CM===k}">${n}</button>`).join("")}</div>
  <p class="note" style="margin:0">${esc(m[2])}</p>
  ${CM==="examples"?`<div class="chips">${UNITS.map(u=>`<button class="chip" data-exu="${u.id}" aria-pressed="${(window._exu||"u1")===u.id}">${u.no}. ${esc(u.ko)}</button>`).join("")}</div>`:""}
  <textarea id="cin" rows="3" placeholder="${{say:"예: 집이 좀 누추하지? / 나 요즘 운동에 꽂혔어",explain:"예: swamped / I'm good with water / wouldn't hurt",check:"예: I'm studying English since last year.",examples:"내 상황: 예) 우리 강아지, 회사 회식, 제주 여행"}[CM]}"></textarea>
  <div class="row"><button class="btn blue" data-act="coachgo">Claude에게 묻기</button></div><div id="cout" class="res"></div></section>
  <section class="card"><div class="sec-h"><h2>내 문장 <span class="muted" style="font-size:16px">${S.mine.length}</span></h2><button class="btn sm ghost" data-go="speak" data-arg="mine">말하기로 연습</button></div>
   ${S.mine.length?`<div class="mylist">${S.mine.slice().reverse().map(p=>`<div class="my"><div class="body"><span class="en">${esc(p.en)}</span>${p.ko?`<span class="ko">${esc(p.ko)}</span>`:""}<span class="tk">${esc(p.think||"")}</span></div>${sayBtn(p.en,false)}<button class="x-del" data-del="${p.id}" aria-label="삭제">삭제</button></div>`).join("")}</div>`:`<p class="empty">‘이 말 영어로’에서 저장한 문장이 여기 모여요. 하고 싶은 말을 전부 영어로 만들어 쌓아 보세요.</p>`}</section>`};
function renderSay(r,src,el){if(!r||!r.main){if(r)el.innerHTML=`<p class="note">답이 비었어요. 다시 눌러 주세요.</p>`;return}
 window._lastSay={ko:src,en:r.main,think:r.think||"",alt:(r.others||[])[0]?.en||"",trap:r.trap||""};
 el.innerHTML=`<span class="k">Natives would say</span><div class="main en">${esc(r.main)}</div><div class="row">${sayBtn(r.main)}<button class="btn sm blue" data-act="savesay">＋ 내 문장에 저장</button></div>
  ${r.trap?`<div class="vs"><div class="kr"><span class="lbl">한국식 사고</span><p>${esc(r.trap)}</p></div><div class="eng"><span class="lbl g">영어식 사고</span><p>${esc(r.main)}</p></div></div>`:""}
  ${r.think?`<div class="think"><span class="lbl b">Think in English</span>${esc(r.think)}</div>`:""}
  ${(r.chunks||[]).length?`<span class="k">Key chunks</span><div class="chunk">${r.chunks.map(c=>`<span><b>${esc(c.chunk)}</b> = ${esc(c.meaning)}</span>`).join("")}</div>`:""}
  ${(r.others||[]).length?`<span class="k">Other ways</span><ul>${r.others.map(o=>`<li><b>${esc(o.en)}</b> — ${esc(o.feel||"")} ${sayBtn(o.en,false)}</li>`).join("")}</ul>`:""}
  ${(r.examples||[]).length?`<span class="k">Same chunk, other situations</span><ul>${r.examples.map(e=>`<li>${esc(e)} ${sayBtn(e,false)}</li>`).join("")}</ul>`:""}
  ${r.idea?`<p class="note en" style="margin:0">💡 ${esc(r.idea)}</p>`:""}${recBox(r.main)}${dictLinks(r.main)}`}
function renderExplain(r,el){if(!r)return;el.innerHTML=`<div class="main en">${esc(r.term||"")}</div><div class="row">${sayBtn(r.term||"")}<span class="tag blue">${esc(r.kind||"")}</span></div>
  <div class="think"><span class="lbl b">Simple meaning</span>${esc(r.simple||"")}</div>${r.more?`<p class="en" style="margin:0;font-size:16px;line-height:1.65">${esc(r.more)}</p>`:""}
  ${(r.examples||[]).length?`<span class="k">Examples</span><ul>${r.examples.map(e=>`<li>${esc(e)} ${sayBtn(e,false)}</li>`).join("")}</ul>`:""}
  ${(r.similar||[]).length?`<span class="k">Similar</span><div class="chunk">${r.similar.map(s=>`<span>${esc(s)}</span>`).join("")}</div>`:""}
  ${r.careful?`<div class="opic"><b>BE CAREFUL</b>${esc(r.careful)}</div>`:""}${dictLinks(r.term||"")}`}
function renderCheck(r,el){if(!r)return;el.innerHTML=`<span class="verdict ${esc(r.verdict)}">${{natural:"Natural! 👍",ok:"Understandable",unnatural:"A bit unnatural","wrong-meaning":"Different meaning"}[r.verdict]||esc(r.verdict)}</span>
  <p class="en" style="margin:0;font-size:16px">${esc(r.comment||"")}</p>${r.better?`<span class="k">Try this</span><div class="main en" style="font-size:19px">${esc(r.better)}</div><div class="row">${sayBtn(r.better)}</div>`:""}
  ${(r.fixes||[]).length?`<ul>${r.fixes.map(f=>`<li><s class="muted">${esc(f.from)}</s> → <b>${esc(f.to)}</b> · ${esc(f.why)}</li>`).join("")}</ul>`:""}`}
function renderExamples(r,el){if(!r||!Array.isArray(r.items))return;el.innerHTML=`<ul class="exs">${r.items.map(it=>`<li style="flex-wrap:wrap"><span class="en">${esc(it.en)}<br><span class="note">${esc(it.point||"")}</span></span>${sayBtn(it.en,false)}</li>`).join("")}</ul>`}

/* 드래그해서 영영 풀이 */
let selBtn=null;
document.addEventListener("selectionchange",()=>{clearTimeout(window._selT);window._selT=setTimeout(()=>{const s=getSelection();const t=s&&String(s).trim();
 if(!t||t.length>160||!/[a-z]/i.test(t)||/[가-힣]/.test(t)||s.anchorNode?.parentElement?.closest("textarea,input,.sheet")){selBtn?.remove();selBtn=null;return}
 const r=s.getRangeAt(0).getBoundingClientRect();if(!selBtn){selBtn=document.createElement("button");selBtn.className="selbtn";selBtn.textContent="📖 영영 풀이";selBtn.addEventListener("mousedown",e=>e.preventDefault());document.body.append(selBtn)}
 selBtn.dataset.t=t;selBtn.dataset.act="explain";selBtn.style.top=(window.scrollY+r.bottom+8)+"px";selBtn.style.left=Math.max(8,Math.min(window.scrollX+r.left,window.scrollX+innerWidth-150))+"px"},250)});
function openSheet(t){closeSheet();const d=document.createElement("div");d.className="sheet";d.id="sheet";d.innerHTML=`<div class="in"><div class="row" style="justify-content:space-between"><span class="lbl b">Think in English · 영영 풀이</span><button class="btn sm ghost" data-act="closesheet">닫기 ✕</button></div><div id="sout" class="res"></div></div>`;document.body.append(d);
 aiJSON(P.explain(t),$("#sout")).then(r=>{if(r)renderExplain(r,$("#sout"));else $("#sout").insertAdjacentHTML("beforeend",`<div class="main en">${esc(t)}</div><div class="row">${sayBtn(t)}</div>${dictLinks(t)}`)})}
function closeSheet(){$("#sheet")?.remove()}

/* ───────── 클릭 처리 ───────── */
document.addEventListener("click",e=>{const b=e.target.closest("button,[data-act]");if(!b)return;const d=b.dataset;
 if(d.say!==undefined){speak(d.say,d.slow);return}
 if(d.tab){go(d.tab);return}
 if(d.go){if(d.go==="unit")go("unit",d.arg);else go(d.go,d.arg);return}
 if(d.goal){S.goal=+d.goal;save();render();return}
 if(d.sp){SP.mode=d.sp;VIEWS.speak();return}
 if(d.cat){SP.cat=d.cat;VIEWS.speak();return}
 if(d.qu){QZ.u=d.qu;VIEWS.quiz();return}
 if(d.qk){QZ.kind=d.qk;VIEWS.quiz();return}
 if(d.opt!==undefined){qAnswer(+d.opt);return}
 if(d.rate!==undefined){rate(+d.rate);return}
 if(d.cm){CM=d.cm;VIEWS.coach();return}
 if(d.exu){window._exu=d.exu;document.querySelectorAll("[data-exu]").forEach(x=>x.setAttribute("aria-pressed",x.dataset.exu===d.exu));return}
 if(d.del){S.mine=S.mine.filter(m=>m.id!==d.del);delete S.srs[d.del];save();VIEWS.coach();return}
 const A=d.act;if(!A)return;
 if(A==="explain"){selBtn?.remove();selBtn=null;openSheet(d.t);return}
 if(A==="closesheet"){closeSheet();return}
 if(A==="rec"){startRec(b);return}
 if(A==="read"){if(!S.read[d.u]){S.read[d.u]=today();gain(20,true)}VIEWS.unit(d.u);return}
 if(A==="playdlg"){const u=unitOf(d.u);if(!u||!hasTTS)return;speechSynthesis.cancel();u.dialog.forEach(([w,t],i)=>{const x=new SpeechSynthesisUtterance(clean(t));x.lang="en-US";const vs=speechSynthesis.getVoices().filter(v=>/^en/i.test(v.lang));x.voice=(w==="B"&&vs[1])?vs[1]:VO;x.rate=.95;speechSynthesis.speak(x)});return}
 if(A==="mkex"){const u=unitOf(d.u);aiJSON(P.examples(u,$("#extopic").value.trim()),$("#exout")).then(r=>renderExamples(r,$("#exout")));return}
 if(A==="ask"){const q=$("#askq").value.trim();if(!q){$("#askq").focus();return}aiText(P.ask(unitOf(d.u),q),$("#askout"));return}
 if(A==="spstart"){SP.flash=!!$("#flash")?.checked;buildQueue();if(!SP.queue.length){toast(SP.cat==="mine"?"아직 저장한 내 문장이 없어요. AI 코치에서 만들어 보세요.":"이 묶음은 오늘 볼 카드가 없어요.");return}spCard();return}
 if(A==="reveal"){SP.mineTxt=$("#mine")?.value.trim()||"";SP.shown=true;spCard();return}
 if(A==="skip"){SP.i++;SP.shown=false;spCard();return}
 if(A==="spagain"){buildQueue();spCard();return}
 if(A==="checkmine"){const c=SP.queue[SP.i];aiJSON(P.check(SP.mineTxt,c.ko,c.en),$("#chkout")).then(r=>renderCheck(r,$("#chkout")));return}
 if(A==="repnext"){const c=SP.queue[SP.i];if(SP.step<3){SP.step++;SP.shown=false;spCard()}else if(!SP.shown){SP.shown=true;spCard()}else{gain(15,true);SP.i++;SP.step=0;SP.shown=false;spCard()}return}
 if(A==="repskip"){SP.i++;SP.step=0;SP.shown=false;spCard();return}
 if(A==="repprev"){SP.step=Math.max(0,SP.step-1);SP.shown=false;spCard();return}
 if(A==="mkreps"){const c=SP.queue[SP.i];aiJSON(P.reps(c.en,c.think),$("#repout")).then(r=>{if(r&&Array.isArray(r.dlg)&&r.para&&r.situ){Object.assign(c,{dlg:r.dlg,para:r.para,situ:r.situ,more:r.more||[],_ai:true});spCard()}});return}
 if(A==="qstart"){qStart();return}
 if(A==="qnext"){QZ.i++;QZ.ans=null;QZ.opts=null;qCard();return}
 if(A==="coachgo"){const t=$("#cin").value.trim(),el=$("#cout");if(!t){$("#cin").focus();return}
  if(CM==="say")aiJSON(P.say(t),el).then(r=>renderSay(r,t,el));
  else if(CM==="explain")aiJSON(P.explain(t),el).then(r=>renderExplain(r,el));
  else if(CM==="check")aiJSON(P.check(t),el).then(r=>renderCheck(r,el));
  else aiJSON(P.examples(unitOf(window._exu||"u1"),t),el).then(r=>renderExamples(r,el));return}
 if(A==="savesay"){const l=window._lastSay;if(!l)return;if(S.mine.some(m=>m.en===l.en)){toast("이미 저장했어요");return}
  S.mine.push(Object.assign({id:"m"+Date.now().toString(36)},l));if(S.mine.length>400)S.mine.shift();gain(5,true);toast("내 문장에 저장했어요. 말하기 ‘내 문장’에서 연습할 수 있어요.");b.disabled=true;b.textContent="✓ 저장됨";
  const list=document.querySelector(".mylist");if(!list)VIEWS.coach();return}
});
document.addEventListener("change",e=>{const f=e.target;if(f.dataset?.act==="recfile"&&f.files[0]){showRec(f.closest(".rec").querySelector(".recout"),f.files[0]);f.value=""}});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSheet()});

/* 시작 */
const H=(location.hash||"").slice(1);if(TABS.some(t=>t[0]===H))MODE=H;
render();

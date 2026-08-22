const d = require('docx');
const {Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
       Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
       PageBreak, LevelFormat, convertInchesToTwip} = d;
const fs = require('fs');

const W = 9000;                       // content width (A4, 1" margins)
const FONT = "Malgun Gothic";
const INK = "1A1A1C", MUTED = "6A6E72", KEY = "A9560A", RED = "C0392B";

const P = (text, o={}) => new Paragraph({
  spacing: {before: o.before ?? 60, after: o.after ?? 60, line: 300},
  alignment: o.align,
  indent: o.indent,
  border: o.border,
  children: [new TextRun({text, font: FONT, size: o.size ?? 20,
    bold: o.bold, italics: o.italics, color: o.color ?? INK})]
});

const RUNS = (parts, o={}) => new Paragraph({
  spacing: {before: o.before ?? 60, after: o.after ?? 60, line: 300},
  children: parts.map(p => new TextRun({text: p[0], font: FONT, size: p[2] ?? 20,
    bold: p[1]===true || p[1]==='b', italics: p[1]==='i',
    color: (typeof p[1]==='string' && p[1].length===6) ? p[1] : INK}))
});

const H1 = t => new Paragraph({heading: HeadingLevel.HEADING_1, spacing:{before:360, after:140},
  children:[new TextRun({text:t, font:FONT, size:30, bold:true, color:INK})]});
const H2 = t => new Paragraph({heading: HeadingLevel.HEADING_2, spacing:{before:280, after:110},
  children:[new TextRun({text:t, font:FONT, size:24, bold:true, color:INK})]});
const H3 = t => new Paragraph({heading: HeadingLevel.HEADING_3, spacing:{before:200, after:80},
  children:[new TextRun({text:t, font:FONT, size:21, bold:true, color:KEY})]});
const SPACER = () => new Paragraph({spacing:{before:0, after:0}, children:[new TextRun({text:"", size:10})]});

const cell = (text, o={}) => new TableCell({
  width: {size: o.w, type: WidthType.DXA},
  shading: o.fill ? {type: ShadingType.CLEAR, fill: o.fill, color: "auto"} : undefined,
  margins: {top: 80, bottom: 80, left: 120, right: 120},
  children: (Array.isArray(text) ? text : [text]).map(t =>
    new Paragraph({spacing:{before:20, after:20, line:280}, children:[
      new TextRun({text: t, font: FONT, size: o.size ?? 18,
                   bold: o.bold, color: o.color ?? INK, italics: o.italics})]}))
});

const table = (cols, rows, opts={}) => new Table({
  width: {size: W, type: WidthType.DXA},
  columnWidths: cols,
  rows: rows.map((r, i) => new TableRow({
    tableHeader: i===0 && opts.header !== false,
    children: r.map((c, j) => cell(c, {
      w: cols[j],
      fill: (i===0 && opts.header !== false) ? "E8EAEC" : (opts.zebra && i%2===0 ? "F6F7F8" : undefined),
      bold: (i===0 && opts.header !== false) || (opts.boldCol0 && j===0),
      size: opts.size, color: (i===0 && opts.header!==false) ? "3B454F" : undefined
    }))
  }))
});

const {SC, RULES, REFS} = require('./_data2.js');
const kids = [];

kids.push(new Paragraph({spacing:{before:1800, after:0}, children:[new TextRun({text:"DIALOGUE SCRIPT  ·  2nd DRAFT", font:FONT, size:18, bold:true, color:MUTED})]}));
kids.push(new Paragraph({spacing:{before:120, after:0}, children:[new TextRun({text:"11:11", font:FONT, size:96, bold:true, color:INK})]}));
kids.push(new Paragraph({spacing:{before:60, after:0}, children:[new TextRun({text:"EP 01 – 10  ·  대사 · 사연 · 자막 대본", font:FONT, size:26, color:MUTED})]}));
kids.push(new Paragraph({spacing:{before:420, after:0}, border:{top:{style:BorderStyle.SINGLE, size:6, color:"C7CED4"}}, children:[new TextRun({text:"", size:10})]}));
kids.push(P("단막극 다섯 편을 읽고 전면 개고했다.", {size:26, bold:true, before:280}));
kids.push(P("1고의 대사는 전부 화면을 설명하고 있었다. 이 고에서는 아무도 자기 감정을 말하지 않는다.", {size:19, color:MUTED, before:40}));
kids.push(P("ONE MINUTE STUDIO  ·  @oneminute.studio", {size:18, color:KEY, bold:true, before:520}));
kids.push(new Paragraph({children:[new PageBreak()]}));

// ── 0. 1고 진단 ──────────────────────────────────────────────
kids.push(H1("0. 1고는 왜 못 썼나"));
kids.push(P("고칠 것을 정확히 적어둔다. 다음에 또 같은 실수를 하지 않기 위해서다.", {color:MUTED}));
kids.push(table([2600,3200,3200], [
  ["문제","1고","2고"],
  ["템플릿 반복","사연 V.O. 10화 전부 “~해달라고 빌었어요 / 이뤄졌습니다 / 그런데…”. 3화면 다음 줄이 예측된다","화자·톤·문장 길이를 매 화 바꿨다. 웃으면서 말하는 화, 만족스럽게 말하는 화, 자기 사연을 못 알아보는 화"],
  ["대사가 화면 설명","“줄어들고 있어” “내가 흘렸구나” “내가 죽이고 있었어” — 그림이 이미 보여준 것을 말로 반복","“그거, 고장 난 거예요?” “…한 번 더.” “…안 부른 날은, 안 줄었네.”"],
  ["서브텍스트 없음","전원이 자기가 느끼는 것을 정확히 말한다. 거짓말하는 대사가 한 줄도 없었다","밀어내는 말이 고백이 되고(EP07), 확인이 각오가 된다(EP09)"],
  ["인물 구분 없음","린도 도하도 PD도 같은 표준 문어체","린은 라디오 작가답게 기록하듯 말하고, 감정은 남의 사연처럼 말한다. PD는 숫자만 본다"],
  ["사물이 없다","시계 부품 하나뿐. 나머지는 전부 대사로 설명","녹음기 · 신발 · 손글씨 노트 · 톱니 · 이름표 · 원고. 각각 두 화 이상에 걸쳐 회수된다"],
  ["대사가 일반적","“누구세요?” “멈춰. 제발.” — 이 드라마 대사가 아니라 아무 드라마 대사","“…녹음, 꺼야 되나.” “그만 좀 빌어.” — 이 인물만 할 수 있는 말"],
], {zebra:true, boldCol0:true, size:17}));

kids.push(H3("참고한 대본"));
kids.push(table([2600,2400,4000], [["작품","분류","가져온 것"]].concat(REFS), {zebra:true, boldCol0:true, size:17}));
kids.push(new Paragraph({children:[new PageBreak()]}));

// ── 1. 대사 규칙 ─────────────────────────────────────────────
kids.push(H1("1. 대사 규칙 10"));
kids.push(P("다섯 편에서 반복적으로 관찰된 것만 남겼다. 앞으로 모든 회차의 대사는 이 표를 통과해야 한다.", {color:MUTED}));
RULES.forEach(([title, why, ex, mine], i) => {
  kids.push(H2(`${String(i+1).padStart(2,"0")}. ${title}`));
  kids.push(P(why, {size:19}));
  kids.push(table([1400,7600], [
    ["참고 대본", ex],
    ["11:11 적용", mine],
  ], {header:false, zebra:true, boldCol0:true, size:17}));
});
kids.push(new Paragraph({children:[new PageBreak()]}));

// ── 2. 채널 · 자막 규격 ──────────────────────────────────────
kids.push(H1("2. 소리 채널과 자막 규격"));
kids.push(table([1600,2200,5200], [
  ["채널","형태","규칙"],
  ["사연 V.O.","라디오 낭독 · 게스트 목소리","매 화 3~4줄. 세계관은 전부 여기로. 화면에 그 사람은 절대 안 나온다. 매 화 화자의 나이·톤·말버릇을 바꾼다"],
  ["대사","현장 · 인물 입","화당 2줄 이내. 감정을 말하지 않는다. 도하는 시즌 전체 2문장(7화·10화)"],
  ["화면 텍스트","훅 카드 · 엔딩 카드 · 인서트","0–2초 훅, 55–60초 엔딩. 손글씨 노트와 몽타주 자막이 대사 대신 정보를 나른다"],
  ["사물","소품","대사보다 세고 번역이 필요 없다. 매 화 하나씩, 두 화 이상 걸쳐 회수한다"],
], {zebra:true, boldCol0:true}));
kids.push(H3("자막 규격"));
kids.push(table([2400,6600], [
  ["항목","값"],
  ["한국어","1줄 13자 이내 · 최대 2줄 · 노출 최소 1.2초"],
  ["영어","1줄 32자 이내 · 최대 2줄 · 한국어와 같은 프레임"],
  ["세이프존","하단 22% 안쪽. 인스타 UI가 아래를 먹는다"],
  ["카운트다운(10화)","붉은색 #E2342B · 화면 정중앙 · 초당 1숫자"],
], {zebra:true, boldCol0:true}));
kids.push(H3("도하의 2문장"));
kids.push(RUNS([["EP 07   ", MUTED, 18],["“묻지 마세요. 물을수록 짧아집니다.”", true, 22]]));
kids.push(RUNS([["EP 09   ", MUTED, 18],["린 — “안 물어볼게요.”", KEY, 20]], {before:80}));
kids.push(P("두 화 건너 도착하는 대답이다. 그가 묻지 말라 했고, 그녀는 두 화 뒤에 묻지 않기로 한다. 그 약속이 규칙 9(누구를 위한 값인지 모른 채 동의해야 빚이 이전된다)를 충족시켜 결말을 성립시킨다.", {size:18, color:MUTED, before:60}));
kids.push(RUNS([["EP 10   ", MUTED, 18],["“당신이 처음이었습니다.”", true, 22]], {before:140}));
kids.push(P("무엇의 처음인지는 시즌 안에서 아무도 설명하지 않는다.", {color:MUTED, size:18}));
kids.push(new Paragraph({children:[new PageBreak()]}));

// ── 3. 에피소드 ──────────────────────────────────────────────
kids.push(H1("3. 에피소드 대본"));
SC.forEach(([no,kr,en,clock,guest,voice,hook,vo,lines,end,prop,note], i) => {
  kids.push(H2(`EP ${no}. ${kr}  ·  ${en}`));
  kids.push(table([1400,7600], [
    ["시계", clock],
    ["사연", guest],
    ["게스트 목소리", voice],
    ["사물", prop],
  ], {header:false, zebra:true, boldCol0:true, size:17}));

  kids.push(H3("훅 카드  0.0 – 2.0초"));
  kids.push(table([4500,4500], [[hook[0], hook[1]]], {header:false, size:18}));

  kids.push(H3("사연 V.O."));
  kids.push(table([1100,3900,4000], [["타임코드","한국어","ENGLISH SUB"]].concat(vo), {zebra:true, boldCol0:true, size:17}));

  kids.push(H3(`대사  ${lines.length}줄`));
  kids.push(table([900,700,2100,2200,3100],
    [["타임코드","인물","대사","ENGLISH SUB","지문"]].concat(lines), {zebra:true, size:17}));

  if (end[0] !== "—") {
    kids.push(H3("엔딩 카드  55 – 60초"));
    kids.push(table([4500,4500], [[end[0], end[1]]], {header:false, size:18}));
  }
  kids.push(H3("노트"));
  kids.push(P(note, {size:18}));
  if (i < SC.length-1) kids.push(new Paragraph({children:[new PageBreak()]}));
});

// ── 4. 부록 ──────────────────────────────────────────────────
kids.push(new Paragraph({children:[new PageBreak()]}));
kids.push(H1("4. 부록 · 대사 총량 감사"));
kids.push(table([900,1700,1100,900,4400],
  [["EP","제목","시계","대사","발화자 · 첫 줄"]].concat(
    SC.map(e => [e[0], e[1], e[3], `${e[8].length}줄`, e[8].map(l=>`${l[1]} “${l[2]}”`).join("   /   ")])
  ), {zebra:true, boldCol0:true, size:16}));
kids.push(P(`시즌 총 대사 ${SC.reduce((a,e)=>a+e[8].length,0)}줄. 도하 2줄, PD 1줄, 나머지 린.`, {bold:true, before:160}));
kids.push(P("사연 V.O.는 전부 게스트 목소리이고 화면에 얼굴이 나오지 않는다. 다만 1고와 달리 화자의 나이와 톤이 매 화 다르므로 성우는 최소 3명을 쓴다. 10화의 화자는 린 본인이다.", {color:MUTED, size:18}));

kids.push(H1("5. 부록 · 사물 회수표"));
kids.push(table([1800,1400,5800], [
  ["사물","심는 화","회수"],
  ["녹음기","EP01","EP03 — 그녀의 안전장치가 그를 죽인 흉기가 된다"],
  ["톱니","EP02","EP05 — 시계방 문을 여는 열쇠가 된다"],
  ["손글씨 노트","EP04","EP10 — 마지막 컷. 자기 글씨인데 무슨 말인지 모른다"],
  ["이름표 붙은 시계","EP05","EP09 — 발견한 것을 집어 든다"],
  ["원고 “사연 없음”","EP06","EP10 — 마지막 사연이 그녀의 것이라는 사실과 대구"],
  ["신발","EP03","단발. 돌아왔지만 돌아오지 않은 상태를 한 컷으로"],
], {zebra:true, boldCol0:true, size:17}));

kids.push(H1("6. 다음 단계 — 프롬프트"));
kids.push(table([2200,6800], [
  ["순서","내용"],
  ["1","이 대본의 타임코드를 컷 단위로 쪼갠다. 60초 = 20~26컷"],
  ["2","컷마다 미드저니 프롬프트 1개. 캐릭터는 --oref 로 시트 이미지를 물린다"],
  ["3","--sref 는 시즌 하나로 고정. 10화 전체가 같은 코드를 쓴다"],
  ["4","이미지 → Kling / Runway 로 3초 클립. 대사 컷만 립싱크 필요 — 이 대본은 18컷뿐이다"],
  ["5","붉은 11:11 자막과 카운트다운은 편집에서 얹는다. 숫자는 생성에 맡기지 않는다"],
], {zebra:true, boldCol0:true}));

kids.push(new Paragraph({spacing:{before:600}, border:{top:{style:BorderStyle.SINGLE, size:6, color:"C7CED4"}}, children:[new TextRun({text:"", size:10})]}));
kids.push(P("ONE MINUTE STUDIO · 11:11 Dialogue Script 2nd Draft · EP 01–10", {size:16, color:MUTED, align:AlignmentType.CENTER, before:160}));

const doc = new Document({
  creator: "ONE MINUTE STUDIO",
  title: "11:11 — Dialogue Script 2nd Draft",
  styles: {default: {document: {run: {font: FONT, size: 20, color: INK}}}},
  sections: [{ properties: {page: {margin: {top:1440, right:1440, bottom:1440, left:1440}}}, children: kids }]
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync("11-11_dialogue_script_v2.docx", b); console.log("written", b.length); });

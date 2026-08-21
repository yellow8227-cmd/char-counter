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

const {SC} = require('./_data.js');
const kids = [];

// ── COVER ────────────────────────────────────────────────────
kids.push(new Paragraph({spacing:{before:1800, after:0}, children:[new TextRun({text:"DIALOGUE SCRIPT", font:FONT, size:18, bold:true, color:MUTED})]}));
kids.push(new Paragraph({spacing:{before:120, after:0}, children:[new TextRun({text:"11:11", font:FONT, size:96, bold:true, color:INK})]}));
kids.push(new Paragraph({spacing:{before:60, after:0}, children:[new TextRun({text:"EP 01 – 10  ·  대사 · 사연 · 자막 대본", font:FONT, size:26, color:MUTED})]}));
kids.push(new Paragraph({spacing:{before:420, after:0}, border:{top:{style:BorderStyle.SINGLE, size:6, color:"C7CED4"}}, children:[new TextRun({text:"", size:10})]}));
kids.push(P("도하는 시즌 전체에서 두 문장만 말한다.", {size:26, bold:true, before:280}));
kids.push(P("EP 07  ·  EP 10", {size:20, color:RED, bold:true, before:40}));
kids.push(P("ONE MINUTE STUDIO  ·  @oneminute.studio", {size:18, color:KEY, bold:true, before:520}));
kids.push(new Paragraph({children:[new PageBreak()]}));

// ── 원칙 ─────────────────────────────────────────────────────
kids.push(H1("0. 대본 원칙"));
kids.push(P("이 대본에는 세 개의 소리 채널만 있다. 셋을 섞지 않는 것이 이 시리즈의 톤이다.", {bold:true}));
kids.push(table([1600,2200,5200], [
  ["채널","형태","규칙"],
  ["사연 V.O.","라디오 낭독 · 게스트 목소리","매 화 3~4줄. 정보와 세계관은 전부 여기로 들어간다. 화면에는 절대 그 사람이 안 나온다"],
  ["대사","현장 · 인물 입","화당 2줄 이내. 도하는 시즌 전체 2문장(7화·10화)"],
  ["화면 텍스트","훅 카드 · 엔딩 카드 · 인서트","0–2초 훅 카드, 55–60초 엔딩 카드. 언어를 몰라도 읽히게 짧게"],
], {zebra:true, boldCol0:true}));

kids.push(H3("왜 대사를 줄이는가"));
kids.push(table([2400,6600], [
  ["이유","내용"],
  ["번역 비용 0","대사가 적으면 자막만 갈아끼워 그대로 중국어·영어권에 올릴 수 있다. 중드·미드 확장의 전제다"],
  ["무음 시청","인스타 첫 재생은 대부분 소리가 꺼져 있다. 화면 텍스트와 표정만으로 60초가 성립해야 한다"],
  ["도하의 무게","말하지 않는 인물이 두 번 말하면 그 두 문장이 시즌 전체의 사건이 된다"],
  ["컷 속도","2~3초 컷에 대사를 넣으면 컷이 늘어진다. 대사는 컷을 멈추는 곳에만 쓴다"],
], {zebra:true, boldCol0:true}));

kids.push(H3("자막 규격"));
kids.push(table([2400,6600], [
  ["항목","값"],
  ["한국어","1줄 13자 이내 · 최대 2줄 · 노출 최소 1.2초"],
  ["영어","1줄 32자 이내 · 최대 2줄 · 한국어와 같은 프레임에 붙인다"],
  ["세이프존","하단 22% 안쪽. 인스타 UI(계정명·캡션)가 아래를 먹는다"],
  ["훅/엔딩 카드","화면 중앙 · 대문자 · 자간 넓게 · 배경 딤 40%"],
  ["카운트다운(10화)","붉은색 #E2342B · 화면 정중앙 · 초당 1숫자"],
], {zebra:true, boldCol0:true}));

kids.push(H3("도하의 2문장"));
kids.push(RUNS([["EP 07   ", MUTED, 18],["“묻지 마세요. 물을수록 짧아집니다.”", true, 22]]));
kids.push(RUNS([["         ", MUTED, 18],["“Don’t ask. Every question makes it shorter.”", MUTED, 18]]));
kids.push(RUNS([["EP 10   ", MUTED, 18],["“당신이 처음이었습니다.”", true, 22]], {before:140}));
kids.push(RUNS([["         ", MUTED, 18],["“You were the first.”", MUTED, 18]]));
kids.push(P("두 번째 문장의 뜻은 시즌 안에서 아무도 설명하지 않는다. 그를 원한 첫 사람이라는 뜻이지만, 그 규칙을 밝히지 않았기 때문이다.", {color:MUTED, size:18, before:140}));
kids.push(new Paragraph({children:[new PageBreak()]}));

// ── 에피소드 ─────────────────────────────────────────────────
kids.push(H1("에피소드 대본"));
SC.forEach(([no,kr,en,clock,guest,hook,vo,lines,end,note], i) => {
  kids.push(H2(`EP ${no}. ${kr}  ·  ${en}`));
  kids.push(table([1400,3200,4400], [
    ["시계", clock, ""],
    ["사연", guest, ""],
    ["대사 수", `${lines.length}줄`, lines.some(l=>l[1]==="도하") ? "★ 도하 발화 있음" : "도하 무언"],
  ], {header:false, zebra:true, boldCol0:true, size:17}));

  kids.push(H3("훅 카드  0.0 – 2.0초"));
  kids.push(table([4500,4500], [[hook[0], hook[1]]], {header:false, size:18}));

  kids.push(H3("사연 V.O."));
  kids.push(table([1100,3900,4000],
    [["타임코드","한국어","ENGLISH SUB"]].concat(vo), {zebra:true, boldCol0:true, size:17}));

  kids.push(H3("대사"));
  kids.push(table([900,800,2500,2500,2300],
    [["타임코드","인물","대사","ENGLISH SUB","연출"]].concat(lines), {zebra:true, size:17}));

  if (end[0] !== "—") {
    kids.push(H3("엔딩 카드  55 – 60초"));
    kids.push(table([4500,4500], [[end[0], end[1]]], {header:false, size:18}));
  }

  kids.push(H3("노트"));
  kids.push(P(note, {size:18}));
  if (i < SC.length-1) kids.push(new Paragraph({children:[new PageBreak()]}));
});

// ── 부록 ─────────────────────────────────────────────────────
kids.push(new Paragraph({children:[new PageBreak()]}));
kids.push(H1("부록. 대사 총량 감사"));
kids.push(table([1000,1800,1400,1400,3400],
  [["EP","제목","시계","대사","발화자"]].concat(
    SC.map(e => [e[0], e[1], e[3], `${e[7].length}줄`, e[7].map(l=>l[1]).join(" · ")])
  ), {zebra:true, boldCol0:true, size:17}));
kids.push(P(`시즌 총 대사 ${SC.reduce((a,e)=>a+e[7].length,0)}줄. 이 중 도하 2줄. 나머지는 린 15줄, PD 1줄.`, {bold:true, before:160}));
kids.push(P("사연 V.O.는 전부 게스트 목소리이고 화면에 얼굴이 나오지 않는다. 성우 1명이 톤만 바꿔 10화를 전부 소화할 수 있다.", {color:MUTED, size:18}));

kids.push(H1("부록. 다음 단계 — 프롬프트로 넘어갈 때"));
kids.push(table([2200,6800], [
  ["순서","내용"],
  ["1","이 대본의 타임코드를 컷 단위로 쪼갠다. 60초 = 20~25컷"],
  ["2","컷마다 미드저니 프롬프트 1개. 캐릭터는 --oref 로 시트 이미지를 물린다"],
  ["3","--sref 는 시즌 하나로 고정. 10화 전체가 같은 코드를 쓴다"],
  ["4","이미지 → Kling / Runway 로 3초 클립. 대사 컷만 립싱크 필요"],
  ["5","붉은 11:11 자막은 편집 단계에서 얹는다. 생성에 맡기지 않는다 — 숫자는 AI가 자주 틀린다"],
], {zebra:true, boldCol0:true}));

kids.push(new Paragraph({spacing:{before:600}, border:{top:{style:BorderStyle.SINGLE, size:6, color:"C7CED4"}}, children:[new TextRun({text:"", size:10})]}));
kids.push(P("ONE MINUTE STUDIO · 11:11 Dialogue Script · EP 01–10", {size:16, color:MUTED, align:AlignmentType.CENTER, before:160}));

const doc = new Document({
  creator: "ONE MINUTE STUDIO",
  title: "11:11 — Dialogue Script EP01-10",
  styles: {default: {document: {run: {font: FONT, size: 20, color: INK}}}},
  sections: [{ properties: {page: {margin: {top:1440, right:1440, bottom:1440, left:1440}}}, children: kids }]
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync("11-11_dialogue_script_ep01-10.docx", b); console.log("written", b.length); });

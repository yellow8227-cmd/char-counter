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

const {SC, VOICE, HOOKS} = require('./_data3.js');
const kids = [];

kids.push(new Paragraph({spacing:{before:1800, after:0}, children:[new TextRun({text:"DIALOGUE SCRIPT  ·  3rd DRAFT", font:FONT, size:18, bold:true, color:MUTED})]}));
kids.push(new Paragraph({spacing:{before:120, after:0}, children:[new TextRun({text:"11:11", font:FONT, size:96, bold:true, color:INK})]}));
kids.push(new Paragraph({spacing:{before:60, after:0}, children:[new TextRun({text:"EP 01 – 10  ·  대사 · 사연 · 자막 대본", font:FONT, size:26, color:MUTED})]}));
kids.push(new Paragraph({spacing:{before:420, after:0}, border:{top:{style:BorderStyle.SINGLE, size:6, color:"C7CED4"}}, children:[new TextRun({text:"", size:10})]}));
kids.push(P("도하가 말한다.", {size:26, bold:true, before:280}));
kids.push(P("말이 많은데도 정체는 계속 모른다. 그게 이 개고의 전부다.", {size:19, color:MUTED, before:40}));
kids.push(P("ONE MINUTE STUDIO  ·  @oneminute.studio", {size:18, color:KEY, bold:true, before:520}));
kids.push(new Paragraph({children:[new PageBreak()]}));

kids.push(H1("0. 2고는 왜 또 틀렸나"));
kids.push(P("남주를 무언으로 둔 것.", {bold:true, size:22}));
kids.push(table([2600,6400], [
  ["문제","내용"],
  ["참고 대본 확인","다섯 편 남주가 전부 말이 많다. 민재는 쉴 새 없이 떠들고, 재박은 내레이션까지 붙어 한순간도 조용하지 않다. 준보·원빈·재우 전부 말한다"],
  ["미스터리의 출처","그 대본들의 긴장은 침묵이 아니라 말하면서 숨기는 것에서 나온다. 재박은 그렇게 떠들면서 정작 유희에게 아무것도 묻지 않는다. 그 공백이 긴장이다"],
  ["세로 숏폼의 현실","60초는 얼굴과 말로 돈다. 무언 남주는 신비가 아니라 “쓸 게 없어서 안 쓴 것”으로 읽힌다. 스크롤을 잡지 못한다"],
  ["팬덤","짤리는 건 대사다. 시즌 2문장으로 10화를 버틸 수 없다. 계정을 키우려면 인용될 문장이 매 화 하나씩 나와야 한다"],
  ["해결","말수를 늘리되 인칭을 잠갔다. 도하는 20줄을 말하지만 “저는”으로 자기 마음을 말한 건 두 문장뿐이다"],
], {zebra:true, boldCol0:true, size:17}));
kids.push(new Paragraph({children:[new PageBreak()]}));

kids.push(H1("1. 도하 화법 규칙"));
kids.push(P("말이 많아도 정체를 모르게 만드는 여섯 가지 장치.", {color:MUTED}));
VOICE.forEach(([t, why, ex], i) => {
  kids.push(H2(`${String(i+1).padStart(2,"0")}. ${t}`));
  kids.push(P(why, {size:19}));
  kids.push(RUNS([["      ", MUTED, 18],[ex, KEY, 19]]));
});

kids.push(H3("도하의 대사 20줄 · 전문"));
kids.push(table([900,7000,1100],
  [["EP","대사","비고"]].concat(
    SC.flatMap(e => e[8].filter(l=>l[1]==="도하").map(l => [e[0], `“${l[2]}”`, l[4].startsWith("★★") ? "★★ 인칭 해제" : (l[4].startsWith("★") ? "★" : "")]))
  ), {zebra:true, boldCol0:true, size:17}));
kids.push(P("이 중 “저는 / 당신이”로 자기 마음을 말한 문장은 EP07·EP10 두 개뿐이다. 나머지 18줄은 전부 상대나 상황에 대한 관찰이다.", {bold:true, before:140}));
kids.push(new Paragraph({children:[new PageBreak()]}));

kids.push(H1("2. 궁금증 설계"));
kids.push(P("매 화 질문을 하나씩 심는다. 세 개는 끝까지 답하지 않는다 — 댓글이 붙는 자리이자 다음 작품의 여지다.", {color:MUTED}));
kids.push(table([1100,3400,4500], [["심는 화","질문","답"]].concat(HOOKS), {zebra:true, boldCol0:true, size:17}));

kids.push(H3("소리 채널"));
kids.push(table([1600,2200,5200], [
  ["채널","형태","규칙"],
  ["사연 V.O.","라디오 낭독 · 게스트","매 화 3~4줄. 세계관은 전부 여기로. 화자의 나이·톤·말버릇을 매 화 바꾼다"],
  ["대사","현장 · 인물 입","화당 3~4줄. 감정을 말하지 않는다. 도하는 대답하되 자기 얘기만 안 한다"],
  ["화면 텍스트","훅 카드 · 엔딩 카드 · 인서트","도하의 대사가 엔딩을 감당하는 화(01·04·07)는 엔딩 카드를 쓰지 않는다"],
  ["사물","소품","대사보다 세고 번역이 필요 없다. 두 화 이상 걸쳐 회수한다"],
], {zebra:true, boldCol0:true}));
kids.push(H3("자막 규격"));
kids.push(table([2400,6600], [
  ["항목","값"],
  ["한국어","1줄 13자 이내 · 최대 2줄 · 노출 최소 1.2초"],
  ["영어","1줄 32자 이내 · 최대 2줄 · 한국어와 같은 프레임"],
  ["세이프존","하단 22% 안쪽"],
  ["카운트다운(10화)","붉은색 #E2342B · 화면 정중앙 · 초당 1숫자"],
], {zebra:true, boldCol0:true}));
kids.push(new Paragraph({children:[new PageBreak()]}));

kids.push(H1("3. 에피소드 대본"));
SC.forEach(([no,kr,en,clock,guest,voice,hook,vo,lines,end,prop,note], i) => {
  kids.push(H2(`EP ${no}. ${kr}  ·  ${en}`));
  kids.push(table([1400,7600], [
    ["시계", clock], ["사연", guest], ["게스트 목소리", voice], ["사물", prop],
  ], {header:false, zebra:true, boldCol0:true, size:17}));
  kids.push(H3("훅 카드  0.0 – 2.0초"));
  kids.push(table([4500,4500], [[hook[0], hook[1]]], {header:false, size:18}));
  kids.push(H3("사연 V.O."));
  kids.push(table([1100,3900,4000], [["타임코드","한국어","ENGLISH SUB"]].concat(vo), {zebra:true, boldCol0:true, size:17}));
  kids.push(H3(`대사  ${lines.length}줄  ·  도하 ${lines.filter(l=>l[1]==="도하").length}줄`));
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

kids.push(new Paragraph({children:[new PageBreak()]}));
kids.push(H1("4. 부록 · 대사 총량"));
kids.push(table([800,1500,900,900,900,4000],
  [["EP","제목","시계","전체","도하","도하 대사"]].concat(
    SC.map(e => [e[0], e[1], e[3], `${e[8].length}줄`, `${e[8].filter(l=>l[1]==="도하").length}줄`,
      e[8].filter(l=>l[1]==="도하").map(l=>`“${l[2]}”`).join("  /  ")])
  ), {zebra:true, boldCol0:true, size:16}));
const tot = SC.reduce((a,e)=>a+e[8].length,0);
const dh  = SC.reduce((a,e)=>a+e[8].filter(l=>l[1]==="도하").length,0);
kids.push(P(`시즌 총 대사 ${tot}줄. 도하 ${dh}줄, PD 1줄, 나머지 린 ${tot-dh-1}줄.`, {bold:true, before:160}));
kids.push(P("2고 대비 대사가 두 배가 됐지만 화당 3~4줄이라 컷 리듬(2~3초 컷, 60초 20~26컷)은 그대로 유지된다. 립싱크가 필요한 컷은 화당 3~4개뿐이다.", {color:MUTED, size:18}));

kids.push(H1("5. 부록 · 사물 회수표"));
kids.push(table([1800,1400,5800], [
  ["사물","심는 화","회수"],
  ["녹음기","EP01","EP03 — 그녀의 안전장치가 그를 죽인 흉기가 된다"],
  ["톱니","EP02","EP05 — 시계방 문을 여는 열쇠"],
  ["손글씨 노트","EP04","EP10 — 마지막 컷. 자기 글씨인데 무슨 말인지 모른다"],
  ["이름표 붙은 시계","EP05","EP09 — 발견한 것을 집어 든다"],
  ["원고 “사연 없음”","EP06","EP10 — 마지막 사연이 그녀의 것"],
  ["신발","EP03","단발. 돌아왔지만 돌아오지 않은 상태를 한 컷으로"],
], {zebra:true, boldCol0:true, size:17}));

kids.push(H1("6. 다음 단계 — 프롬프트"));
kids.push(table([2200,6800], [
  ["순서","내용"],
  ["1","타임코드를 컷 단위로 쪼갠다. 60초 = 20~26컷"],
  ["2","컷마다 미드저니 프롬프트 1개. 캐릭터는 --oref 로 시트를 물린다"],
  ["3","--sref 는 시즌 하나로 고정. 10화 전체가 같은 코드"],
  ["4","이미지 → Kling / Runway 로 3초 클립. 립싱크는 화당 3~4컷만"],
  ["5","붉은 11:11 자막과 카운트다운은 편집에서 얹는다. 숫자는 생성에 맡기지 않는다"],
], {zebra:true, boldCol0:true}));

kids.push(new Paragraph({spacing:{before:600}, border:{top:{style:BorderStyle.SINGLE, size:6, color:"C7CED4"}}, children:[new TextRun({text:"", size:10})]}));
kids.push(P("ONE MINUTE STUDIO · 11:11 Dialogue Script 3rd Draft · EP 01–10", {size:16, color:MUTED, align:AlignmentType.CENTER, before:160}));

const doc = new Document({
  creator: "ONE MINUTE STUDIO",
  title: "11:11 — Dialogue Script 3rd Draft",
  styles: {default: {document: {run: {font: FONT, size: 20, color: INK}}}},
  sections: [{ properties: {page: {margin: {top:1440, right:1440, bottom:1440, left:1440}}}, children: kids }]
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync("11-11_dialogue_script_v3.docx", b); console.log("written", b.length); });

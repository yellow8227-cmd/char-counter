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

const {GRAMMAR, SC, SOUND, PROD} = require('./_teaser.js');
const CENTER = AlignmentType.CENTER;
const kids = [];

// 표지
kids.push(P("〈11:11〉", {size:64, bold:true, align:CENTER, before:1600, after:0}));
kids.push(P("ELEVEN ELEVEN", {size:20, color:MUTED, align:CENTER, before:40}));
kids.push(P("30초 티저 예고편 시나리오", {size:30, bold:true, align:CENTER, before:320}));
kids.push(P("EP 01–10 기반 · 미스터리 로맨스 · 세로 숏드라마", {size:19, color:MUTED, align:CENTER, before:60}));
kids.push(new Paragraph({spacing:{before:420, after:0}, alignment:CENTER,
  border:{top:{style:BorderStyle.SINGLE, size:6, color:"C7CED4"}}, children:[new TextRun({text:"", size:10})]}));
kids.push(P("매일 밤 11시 11분, 딱 1분 동안만 그를 볼 수 있다.", {size:24, bold:true, align:CENTER, before:280}));
kids.push(P("그녀가 그를 원할수록, 그는 사라진다.", {size:20, color:MUTED, align:CENTER, before:40}));
kids.push(P("ONE MINUTE STUDIO  ·  @oneminute.studio", {size:18, color:KEY, bold:true, align:CENTER, before:560}));
kids.push(new Paragraph({children:[new PageBreak()]}));

// 분석
kids.push(H1("참고 티저 분석"));
kids.push(P("〈사채왕의 천재손자〉 30초 티저에서 가져온 문법 여덟 가지. 이 티저는 그 구조를 그대로 따른다.", {color:MUTED}));
kids.push(table([1800,4000,3200], [["문법","참고 티저","11:11 적용"]].concat(GRAMMAR), {zebra:true, boldCol0:true, size:17}));
kids.push(P("가장 크게 배운 것은 소리다. 참고 티저는 심박음 하나로 30초를 설계했다. 죽음에서 삶으로 넘어가는 지점을 그림이 아니라 정적 3초와 학교 종소리로 처리했고, 후반엔 흉부압박 리듬을 그대로 BGM 박자로 썼다. 11:11에는 이미 초침이라는 소리가 있다. 심박음 자리에 초침을 그대로 갈아 끼웠다.", {before:200}));
kids.push(new Paragraph({children:[new PageBreak()]}));

// 시나리오
kids.push(H1("시나리오"));
SC.forEach(([no, place, tc, action, se, lines, sub]) => {
  kids.push(new Paragraph({spacing:{before:340, after:120},
    children:[new TextRun({text:`${no}. ${place}`, font:FONT, size:22, bold:true, color:INK}),
              new TextRun({text:`      (${tc})`, font:FONT, size:19, color:KEY, bold:true})]}));
  action.forEach(a => kids.push(P(a, {size:20, before:40, after:40})));
  se.forEach(s => kids.push(P(`S.E.  ${s}`, {size:18, italics:true, color:MUTED, before:60, after:60})));
  lines.forEach(([who, kr, en]) => {
    kids.push(P(who, {size:19, bold:true, align:CENTER, before:140, after:20}));
    kids.push(P(kr, {size:22, align:CENTER, after:20}));
    kids.push(P(en, {size:17, color:MUTED, italics:true, align:CENTER, after:60}));
  });
  if (sub) {
    kids.push(P(`자막:  ${sub[0]}`, {size:21, bold:true, color:RED, before:140, after:20}));
    kids.push(P(`SUB:  ${sub[1]}`, {size:17, color:MUTED, after:40}));
  }
});
kids.push(new Paragraph({children:[new PageBreak()]}));

// 사운드
kids.push(H1("사운드 설계 — 초침 하나로 30초"));
kids.push(P("이 티저에는 멜로디가 없다. 초침만 있고, 초침의 속도가 곧 편집이다.", {color:MUTED}));
kids.push(table([1500,2800,4700], [["구간","초침","역할"]].concat(SOUND), {zebra:true, boldCol0:true, size:17}));
kids.push(P("0:15–0:18의 완전 무음이 이 티저의 심장이다. 멈춘 시계 수백 개가 화면을 가득 채우는데 소리가 하나도 없다. 30초 안에서 3초를 비우는 것이 아깝게 느껴지면 그 자리를 채우고 싶어지는데, 참고 티저가 증명한 대로 그 정적이 뒤의 7초를 살린다.", {before:200}));

// 제작
kids.push(H1("제작 노트"));
kids.push(table([1600,7400], PROD, {header:false, zebra:true, boldCol0:true, size:17}));
kids.push(H3("컷 배분"));
kids.push(table([2000,1400,5600], [
  ["구간","컷","내용"],
  ["0:00–0:09  세계","5컷","줄 · 부스 · 손 몽타주 3컷. 얼굴 없음"],
  ["0:09–0:15  소모","3컷","시계 · 실루엣 · 빈 손. 정적으로 끝"],
  ["0:15–0:21  발견","4컷","시계방 · 이름표. 무음에서 초침 하나로"],
  ["0:21–0:30  선언","6컷","도하 얼굴 · 급속 몽타주 5컷 · 정면 + 타이틀"],
], {zebra:true, boldCol0:true, size:17}));

kids.push(H3("이어지는 것"));
kids.push(table([2200,6800], [
  ["다음","내용"],
  ["15초 컷다운","0:00–0:09와 0:24–0:30만 남긴다. 릴스 상단 노출용"],
  ["6초 루프","S#05만. 손목을 잡았는데 손이 비는 3초를 두 번 반복. 프로필 고정용"],
  ["본편","티저가 통과되면 EP01 컷 프롬프트로 넘어간다. 60초 20~26컷"],
], {zebra:true, boldCol0:true, size:17}));

kids.push(new Paragraph({spacing:{before:600}, border:{top:{style:BorderStyle.SINGLE, size:6, color:"C7CED4"}}, children:[new TextRun({text:"", size:10})]}));
kids.push(P("ONE MINUTE STUDIO · 11:11 · 30초 티저 예고편 시나리오", {size:16, color:MUTED, align:CENTER, before:160}));

const doc = new Document({
  creator: "ONE MINUTE STUDIO",
  title: "11:11 — 30초 티저 예고편 시나리오",
  styles: {default: {document: {run: {font: FONT, size: 20, color: INK}}}},
  sections: [{ properties: {page: {margin: {top:1440, right:1440, bottom:1440, left:1440}}}, children: kids }]
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync("11-11_teaser_30s.docx", b); console.log("written", b.length); });

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

// ── episode data ─────────────────────────────────────────────
const EPS = [
 ["01","줄","11:11","시험에 붙게 해달라 빈 학생. 붙었다. 같이 준비한 친구가 떨어졌다. 학생은 우연인 줄 안다.",
  [["0.0–2.0","[훅] 어둠 속에 수십 명이 줄지어 서 있다. 전부 같은 곳을 보고 있다"],
   ["2.0–2.4","타이틀 11:11 플래시"],
   ["2.4–18","라디오 부스. 사연 낭독(음성). 린이 주소를 받아적는다"],
   ["18–34","밤거리를 걸어간다. 낡은 간판, 젖은 골목. 손목시계 11:09"],
   ["34–44","11:10. 아무도 없다. 돌아서려는 순간"],
   ["44–54","11:11:00. 뒤를 돌아본다. 그가 서 있다 — 얼굴은 반쯤 그늘"],
   ["54–60","[마지막] 카메라가 그의 뒤를 본다. 줄이 있다. 수십 명이 어둠 속에서 그를 보고 있다"]]],
 ["02","어머니","9:11","어머니가 낫게 해달라 빈 아들. 나았다. 그런데 아들을 알아보지 못한다. '낫게'만 빌었으니까.",
  [["0.0–2.0","[훅] 린이 그의 손목을 잡고 달린다 — 결말에서 가져온 컷"],
   ["2.0–2.4","타이틀 플래시"],
   ["2.4–18","사연. 병실. 어머니가 아들을 낯설게 본다"],
   ["18–34","어젯밤. 줄 선 사람들이 한 명씩 앞으로 나와 입을 움직인다 — 무음"],
   ["34–46","그때마다 그의 시계 숫자가 툭툭 떨어진다. 클로즈업 반복. 린이 알아챈다"],
   ["46–55","11:11:50. 시계 급감. 린이 뛰어들어 손목을 잡는다"],
   ["55–60","[마지막] 11:12. 그가 사라진다. 손에 아무것도 없다. 바닥에 시계 부품 하나"]]],
 ["03","돌아와","7:11","헤어진 연인이 돌아오게 해달라. 돌아왔다. 그런데 왜 왔는지 본인도 모른다. 사랑은 빌지 않았으니까.",
  [["0.0–2.0","[훅] 그녀의 집 문 앞에 낯선 사람 셋이 서 있다"],
   ["2.0–2.4","타이틀 플래시"],
   ["2.4–18","사연. 돌아온 연인이 문 앞에서 멍하니 서 있다"],
   ["18–32","린이 그를 폐건물 옥상으로 옮긴다. 여긴 아무도 모른다"],
   ["32–44","다음 밤 11:11. 안전하다. 그런데 발소리가 올라온다"],
   ["44–55","린이 자기 방송 녹취를 되감아 듣는다"],
   ["55–60","[마지막] 자기 목소리 — \"그 골목은…\" 내가 위치를 흘렸다"]]],
 ["04","거울","6:11","젊어지게 해달라 빈 남자. 젊어졌다. 이제 아무도 그를 알아보지 못한다.",
  [["0.0–2.0","[훅] 거울 속 자기 얼굴이 낯설다"],
   ["2.0–2.4","타이틀 플래시"],
   ["2.4–18","사연. 젊어진 남자가 가족에게 문전박대당한다"],
   ["18–32","린이 코너 폐지를 신청한다. PD가 반대한다 — 청취율이 최고인데"],
   ["32–44","밤. 어제 일을 떠올리려 한다. 안 떠오른다. 노트를 편다 — 자기 글씨인데 내용이 낯설다"],
   ["44–55","11:11. 그가 온다. \"나 어떻게 되는 거예요?\" 그는 대답하지 않는다"],
   ["55–60","[마지막] 화장실 거울. 자기 얼굴을 오래 본다"]]],
 ["05","이름","4:11","잊게 해달라 빈 사람. 잊었다. 소중한 것까지 전부.",
  [["0.0–2.0","[훅] 벽을 가득 덮은 멈춘 시계 수백 개"],
   ["2.0–2.4","타이틀 플래시"],
   ["2.4–16","사연. 아무것도 기억나지 않는 사람이 텅 빈 방에 앉아 있다"],
   ["16–30","린이 시계 부품을 단서로 추적한다. 낡은 시계방. 잠겨 있다"],
   ["30–42","그가 만졌던 부품이 열쇠가 된다. 문이 열린다"],
   ["42–54","안. 멈춘 시계 수백 개. 하나씩 클로즈업 — 전부 11:11. 각각 이름표가 붙어 있다"],
   ["54–60","[마지막] 한 시계의 이름표 — 서린"]]],
 ["06","부름","3:11","다시 만나게 해달라 빈 사람. 만났다. 장례식장에서.",
  [["0.0–2.0","[훅] 그녀가 눈을 감고 있는데 그가 서 있다"],
   ["2.0–2.4","타이틀 플래시"],
   ["2.4–16","사연. 장례식장. 오랜만에 마주친 두 사람"],
   ["16–32","린이 규칙을 시험한다. 오늘은 그를 생각하지 않기로"],
   ["32–42","11:11. 그가 오지 않는다. 시계도 줄지 않았다"],
   ["42–54","다음 날. 무심코 떠올린다. 11:11. 그가 온다. 시계가 줄어 있다. 몽타주 — 생각한 날 / 안 한 날"],
   ["54–60","[마지막] 내가 그를 죽이고 있다 · 선택지 투표"]]],
 ["07","문장","2:11","유명해지게 해달라 빈 사람. 됐다. 사고 영상으로.",
  [["0.0–2.0","[훅] 집 앞 골목이 사람으로 가득하다"],
   ["2.0–2.4","타이틀 플래시"],
   ["2.4–14","사연. 조회수가 폭발하는 화면. 댓글이 쏟아진다"],
   ["14–30","대사 없음. 시계를 서랍에 넣는다. 라디오를 끈다. 불을 끄고 눕는다"],
   ["30–42","11:11에 눈이 떠진다. 그가 서 있다. 다음 날도. 그다음 날도. 더 자주"],
   ["42–54","창밖. 사람들이 그녀의 집을 찾아냈다"],
   ["54–60","[마지막] 도하가 처음 입을 연다 — \"묻지 마세요. 물을수록 짧아집니다.\""]]],
 ["08","11월 11일","1:11","오늘 하루만 행복하게 해달라. 이뤄졌다. 딱 하루만.",
  [["0.0–2.0","[훅] 거리 전광판이 전부 11:11"],
   ["2.0–2.4","타이틀 플래시"],
   ["2.4–14","사연. 하루가 끝나가는 사람의 얼굴"],
   ["14–30","11월 11일 아침. 도시 전체가 그 숫자. 상점, 광고, 피드"],
   ["30–42","밤이 온다. 사람들이 폰을 꺼내 시각을 확인한다"],
   ["42–55","11:11:00. 전 세계가 동시에 빈다. 그의 시계가 초 단위로 떨어진다 — 빠른 컷 연발"],
   ["55–60","[마지막] 숫자가 멈추지 않는다"]]],
 ["09","대신","0:33","누군가를 위해 대신 아프게 해달라 빈 사람. 그건 그대로 이뤄졌다. 시즌에서 유일하게 뒤틀리지 않은 소원.",
  [["0.0–2.0","[훅] 린이 손목을 내민다"],
   ["2.0–2.4","타이틀 플래시"],
   ["2.4–16","사연. 병상 옆에 앉은 사람. 이번엔 아무것도 어긋나지 않았다"],
   ["16–30","린이 시계방으로 간다. 자기 이름표가 붙은 시계를 집어 든다"],
   ["30–44","도하 앞에 선다. \"내가 대신할게요\""],
   ["44–54","그의 표정이 처음으로 흔들린다. 그리고 고개를 젓는다"],
   ["54–60","[마지막] 그가 그녀의 관자놀이에 손을 얹는다 · 선택지 투표"]]],
 ["10","11초","0:11","이 화의 사연은 린의 것이다. 코너에 마지막으로 도착한 사연은 그녀가 쓴 것이었다.",
  [["0.0–2.0","[훅] 시계가 0:11을 가리킨다"],
   ["2.0–2.4","타이틀 플래시"],
   ["2.4–16","11월 11일 11시 11분. 마지막 만남. 두 사람은 아무 말도 하지 않는다"],
   ["16–38","11초 카운트다운. 11 · 10 · 9 … 그동안의 컷들이 스치듯 지나간다"],
   ["38–48","도하 — \"당신이 처음이었습니다.\""],
   ["48–54","0. 그가 사라진다. 아무것도 남지 않는다"],
   ["54–60","[마지막] 아침. 린이 눈을 뜬다. 기억이 없다. 손목의 멈춘 시계 — 초침이 다시 움직이기 시작한다"]]],
];

const kids = [];

// ── COVER ────────────────────────────────────────────────────
kids.push(new Paragraph({spacing:{before:1800, after:0}, children:[new TextRun({text:"PRODUCTION BIBLE", font:FONT, size:18, color:MUTED, bold:true})]}));
kids.push(new Paragraph({spacing:{before:120, after:0}, children:[new TextRun({text:"11:11", font:FONT, size:96, bold:true, color:INK})]}));
kids.push(new Paragraph({spacing:{before:60, after:0}, children:[new TextRun({text:"ELEVEN ELEVEN · 十一点十一分", font:FONT, size:26, color:MUTED})]}));
kids.push(new Paragraph({spacing:{before:420, after:0},
  border:{top:{style:BorderStyle.SINGLE, size:6, color:"C7CED4"}}, children:[new TextRun({text:"", size:10})]}));
kids.push(P("매일 밤 11시 11분, 딱 1분 동안만 그를 볼 수 있다.", {size:26, bold:true, before:280}));
kids.push(P("인스타그램 세로 숏드라마 · 에피소드형 10화 × 1분 완결 · 미스터리 로맨스", {size:19, color:MUTED, before:40}));
kids.push(P("ONE MINUTE STUDIO", {size:18, color:KEY, bold:true, before:520}));
kids.push(new Paragraph({children:[new PageBreak()]}));

// ── 1. 기획 ──────────────────────────────────────────────────
kids.push(H1("1. 기획"));
kids.push(H3("로그라인"));
kids.push(P("심야 라디오 작가가 괴담 코너 아이템을 쫓다가, 매일 밤 11시 11분에 1분만 존재하는 남자를 만난다. 그리고 그가 왜 1분밖에 남지 않았는지 알게 된다.", {size:21}));
kids.push(H3("구조"));
kids.push(P("매 화가 소원 사연 하나로 완결되고, 그 위에 도하와 린의 이야기가 흐른다. 아무 화나 걸려도 이해되도록 설계했다 — 알고리즘이 밀어주는 것은 언제나 랜덤한 한 화이기 때문이다."));
kids.push(H3("사연의 원리 — 10화를 관통하는 한 줄"));
kids.push(P("소원은 정확히 이뤄진다. 사람들이 정확하게 빌지 않을 뿐이다.", {size:22, bold:true, color:KEY}));
kids.push(P("어머니가 낫게 해달라 빌면 낫는다 — 다만 아들을 알아보지 못한다. '낫게'만 빌었으니까. 이 원리 하나에서 10개의 사연이 전부 나온다."));
kids.push(H3("제목이 세 시장에서 동시에 작동한다"));
kids.push(table([2200,6800], [
  ["시장","의미"],
  ["서구권","11:11 — 소원을 비는 시각. 이미 전 세계가 아는 미신"],
  ["중화권","双十一 · 光棍节 — 혼자인 사람들의 날"],
  ["한국","11월 11일 — 기념일 문화가 이미 있다"],
], {zebra:true, boldCol0:true}));
kids.push(P("번역이 필요 없는 제목이면서 세 곳에서 각각 다른 의미로 읽힌다.", {color:MUTED, size:18}));

// ── 2. 채널 ──────────────────────────────────────────────────
kids.push(H1("2. 채널"));
kids.push(P("시리즈 계정이 아니라 스튜디오 계정으로 판다. 중드·미드까지 제작한다면 11:11 전용 계정은 다음 작품 때 버려진다. 포맷 자체를 이름으로 삼으면 어떤 언어권 작품이든 그 아래 들어간다."));
kids.push(table([1800,7200], [
  ["항목","값"],
  ["핸들","@oneminute.studio  (대안: @1min.studio · @elevenframe)"],
  ["이름 필드","ONE MINUTE — Vertical Drama Studio   ※ 검색 대상이므로 키워드를 넣는다"],
  ["Bio","1-minute episodes. New series every season. / Now airing: 11:11 / biz@[도메인]"],
  ["언어","전부 영어. 초기에는 한국어 병기도 뺀다 — 인스타 초기 배포가 계정 언어를 보고 대상을 정한다"],
  ["업로드","매주 정해진 요일 밤 11시 11분"],
  ["표시","프로필 설정에서 AI creator 태그 ON — 계정 단위로 한 번에 표시된다"],
], {zebra:true, boldCol0:true}));

// ── 3. 캐릭터 ────────────────────────────────────────────────
kids.push(H1("3. 캐릭터"));
kids.push(table([1700,3650,3650], [
  ["","차도하 · CHA DO-HA","서린 · SEO-RIN (RIN)"],
  ["한자","車道河","徐凛"],
  ["나이 · 성별","28세 · 남성","26세 · 여성"],
  ["직업","시계 수리공 (현재는 폐업)\nWatch repairer, shop long closed","심야 라디오 작가 · 「자정 우편함」\nLate-night radio writer, Midnight Mailbox"],
  ["신분","밤 11시 11분, 1분만 실체가 된다\nBecomes real for one minute a day","소원이 아니라 그를 원한 유일한 사람\nThe only one who wants him, not a wish"],
  ["성격","말수가 거의 없고 표정이 변하지 않는다. 감정을 설명하는 대신 상대가 흘린 말을 정확히 기억해 둔다. 다정함을 행동으로만 드러내서 자주 오해받는다.","겉으로는 침착하고 냉담해 보이지만 한번 정하면 물러서지 않는다. 관찰력이 좋아 남들이 놓치는 디테일을 잡아낸다. 자기 감정을 인정하는 데 오래 걸린다."],
  ["특징","왼손목의 시계를 절대 풀지 않는다. 사진에도 영상에도 녹음에도 남지 않는다. 다만 그가 만진 물건은 남는다.","매일 밤 11시 11분에 알람을 맞춘다. 그 1분을 기록으로 남기려 하지만 어떤 기록도 남지 않는다."],
], {zebra:true, boldCol0:true, size:17}));

kids.push(H3("외형 구성 요소 · Wardrobe & Props"));
kids.push(table([1500,3750,3750], [
  ["","DO-HA","RIN"],
  ["상의","흰 드레스 셔츠, 소매 걷음 / white dress shirt, sleeves rolled","흰 셔츠 / white dress shirt"],
  ["하의","검정 슬랙스 / black tailored trousers","검정 슬랙스 / black tailored trousers"],
  ["시계 ★","은색 손목시계, 왼손목 / silver wristwatch, left wrist","얇은 은색 손목시계 / slim silver wristwatch"],
  ["신발","검정 가죽 구두 / black leather shoes","검정 플랫 / black flat shoes"],
  ["헤어","현대식 숏컷, 이마 덮는 앞머리 / modern short cut, fringe over forehead","허리 아래 검은 생머리 / long straight black hair past the waist"],
  ["소품","회중시계 · 시계 수리 공구 · 11:11에 멈춘 벽시계","11:11 알람이 뜬 휴대폰 · 녹음기 · 손글씨 노트"],
], {zebra:true, boldCol0:true, size:17}));
kids.push(P("두 사람이 같은 옷을 입는 것은 의도다. 흰 셔츠 + 검정 슬랙스 + 은색 시계. 한 쌍으로 묶이고, 마지막 화에서 시계가 그녀에게 넘어가는 것이 대사 없이 성립한다.", {bold:true}));

kids.push(H3("표정 시트 8종"));
kids.push(P("기본 neutral · 옅은 미소 faint smile · 웃음 laughing · 분노 angry · 슬픔 sad · 놀람 surprised · 차가운 응시 cold glare · 당황 embarrassed"));
kids.push(H3("컬러 팔레트"));
kids.push(P("#090E12   #151E24   #202E38   #304050   #4A5D75   #5E7AA6   #97A8C0   #E9EEF2", {size:19}));
kids.push(RUNS([["#E2342B", RED, 19],["   ← 화면에서 유일하게 채도 있는 색. 이것이 11:11 숫자다.", null, 18]]));

kids.push(new Paragraph({children:[new PageBreak()]}));

// ── 4. 설정 규칙서 ───────────────────────────────────────────
kids.push(H1("4. 설정 규칙서"));
kids.push(P("내부용. 시청자에게 밝히지 않는다. 규칙은 일관성을 지키기 위해 갖고 있는 것이지 설명하기 위한 것이 아니다.", {bold:true, color:KEY}));
const RULES = [
 "11:11에 빈 소원은 이뤄진다. 값은 시간으로 지불된다.",
 "대납자가 있는 동안 아무도 값을 내지 않는다 — 그래서 소원이 공짜로 보인다.",
 "대납자는 한 시대에 한 명. 가장 큰 빚을 진 자가 자리를 물려받는다.",
 "도하는 항상 존재하나 실체가 아니다. 11:11의 1분만 실체가 된다.",
 "시계는 남은 총량을 가리킨다. 1회 출현에 최대 1분 소모.",
 "그의 1분은 그를 가장 강하게 원하는 사람 앞에서 소모된다 — 선택권이 없다.",
 "소원은 말할 필요가 없다. 11:11에 마음이 향하면 접수된다.",
 "그래서 린이 그리워하는 것 자체가 그를 죽인다. 억누르면 오히려 강해진다.",
 "빚은 이전 가능하다. 단 누구를 위한 값인지 모른 채 동의해야 한다.",
 "도하가 사라지면 청구서가 소원 빈 본인들에게 간다.",
];
kids.push(table([700,8300], [["#","규칙"]].concat(RULES.map((r,i)=>[String(i+1), r])), {zebra:true, boldCol0:true}));
kids.push(H3("시청자가 아는 것은 넷뿐"));
kids.push(P("11:11에만 온다 · 시간이 줄어든다 · 그녀가 원하면 온다 · 결국 사라진다. 왜인지는 끝까지 밝히지 않는다."));
kids.push(H3("절대 하지 않을 것"));
kids.push(P("시간을 되돌리지 않는다 · 11:11 존재는 도하 하나뿐이다 · 소원은 취소되지 않는다 · 도하는 능력을 쓰지 않는다. 그는 강한 존재가 아니라 빚진 사람이다."));

kids.push(new Paragraph({children:[new PageBreak()]}));

// ── 5. 10화 구성 ─────────────────────────────────────────────
kids.push(H1("5. 10화 구성"));
kids.push(P("시계는 11:11에서 시작해 0:11로 끝난다. 매 화 시계값이 모두 :11로 끝나, 제목이 매 화 화면에 박힌다.", {bold:true}));
EPS.forEach(([n,t,clock,guest,beats], idx) => {
  kids.push(H2(`EP ${n}. ${t}`));
  kids.push(table([1500,7500], [["시계", clock],["사연", guest]], {header:false, zebra:true, boldCol0:true, size:17}));
  kids.push(SPACER());
  kids.push(table([1300,7700], [["타임코드","비트"]].concat(beats), {zebra:true, boldCol0:true, size:17}));
  if (idx===4) kids.push(new Paragraph({children:[new PageBreak()]}));
});

kids.push(new Paragraph({children:[new PageBreak()]}));

// ── 6. 연출 규칙 ─────────────────────────────────────────────
kids.push(H1("6. 연출 규칙"));
kids.push(H3("후킹"));
kids.push(table([2400,6600], [
  ["규칙","내용"],
  ["첫 2초","그 화의 마지막에서 가져온다. 결말 이미지를 앞에 던지고 되감는 구조"],
  ["컷 길이","2~3초. 60초에 20~25컷. 3초를 넘기면 손가락이 올라간다"],
  ["예외","마지막 컷 하나만 5초 붙잡아 여운을 만든다"],
  ["심장박동","매 화 최소 한 번 숫자가 줄어드는 순간을 보여준다 — 시계 클로즈업 + 숫자가 실제로 바뀌는 컷"],
  ["대사","화당 2줄 이내. 도하는 시즌 전체에서 2문장만 말한다 (7화 · 10화)"],
  ["표식","붉은 디지털 11:11이 매 화 최소 한 번 화면에 뜬다 — 언어를 몰라도 알아보는 표식"],
], {zebra:true, boldCol0:true}));

kids.push(H3("컷 리듬"));
kids.push(table([2000,1800,5200], [
  ["구간","컷당","역할"],
  ["0 – 10초","1.5 – 2초","훅. 가장 강한 이미지를 먼저 던진다"],
  ["10 – 35초","3초","전개. 정보가 들어가는 유일한 구간"],
  ["35 – 55초","1 – 1.5초","절정. 속도가 곧 긴장"],
  ["55 – 60초","5초 한 컷","마지막. 길게 붙잡아 여운"],
], {zebra:true, boldCol0:true}));

kids.push(H3("도하의 2문장"));
kids.push(P("EP 07  —  \"묻지 마세요. 물을수록 짧아집니다.\"", {size:21, bold:true}));
kids.push(P("EP 10  —  \"당신이 처음이었습니다.\"", {size:21, bold:true}));
kids.push(P("두 번째 문장의 뜻은 시즌 안에서 아무도 모른다. 그를 원한 첫 사람이라는 뜻인데, 그 규칙을 밝히지 않았기 때문이다.", {color:MUTED, size:18}));

kids.push(H1("7. 운영"));
kids.push(table([2200,6800], [
  ["항목","내용"],
  ["업로드","매주 정해진 요일 밤 11시 11분. 알람 걸어두는 팬이 생기면 초기 도달이 고정된다"],
  ["역산","마지막 화를 11월 11일에 공개하려면 10주 전에 1화를 올린다"],
  ["참여","캡션마다 \"What would you wish for at 11:11?\" 그리고 다음 화 사연에 실제 댓글을 넣는다"],
  ["투표","질문은 하나 — \"린은 그를 계속 생각해야 할까?\" 6화 · 9화에 던진다"],
  ["제작량","10화 × 1분 = 10분. 총 200~250컷. 주 1화 기준 10주"],
], {zebra:true, boldCol0:true}));

kids.push(new Paragraph({spacing:{before:600}, border:{top:{style:BorderStyle.SINGLE, size:6, color:"C7CED4"}}, children:[new TextRun({text:"", size:10})]}));
kids.push(P("ONE MINUTE STUDIO · 11:11 Production Bible", {size:16, color:MUTED, align:AlignmentType.CENTER, before:160}));

const doc = new Document({
  creator: "ONE MINUTE STUDIO",
  title: "11:11 — Production Bible",
  styles: {default: {document: {run: {font: FONT, size: 20, color: INK}}}},
  sections: [{
    properties: {page: {margin: {top:1440, right:1440, bottom:1440, left:1440}}},
    children: kids
  }]
});

Packer.toBuffer(doc).then(b => { fs.writeFileSync("11-11_production_bible.docx", b); console.log("written", b.length); });

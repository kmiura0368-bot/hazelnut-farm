// 投資家向けピッチデック「畑みまもり便」生成スクリプト（明るくポップ版・テーマA）
const pptxgen = require("pptxgenjs");
const p = new pptxgen();
p.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
p.author = "向野ヘーゼルナッツ農園";
p.title = "畑みまもり便 投資家向け資料";

const W = 13.333, H = 7.5;
const C = {
  paper: "FCFBF8", ink: "23211C", sub: "8A8576", hair: "E6E1D6",
  green: "3E9D52", greenD: "2F7D43", leaf: "EDF4E0", leafLine: "CFE3B8",
  orange: "F0883E", yellow: "F6C544", white: "FFFFFF", mossD: "6E8A5E",
};
const FF = "Yu Gothic";

function bg(s, c) { s.background = { color: c }; }
function kicker(s, t) { s.addText(t, { x: 0.9, y: 0.62, w: 9, h: 0.3, fontFace: FF, fontSize: 12, color: C.green, bold: true, charSpacing: 3, margin: 0 }); }
function headline(s, t) { s.addText(t, { x: 0.9, y: 0.98, w: 11.6, h: 0.8, fontFace: FF, fontSize: 25, color: C.ink, bold: true, margin: 0, lineSpacingMultiple: 1.15 }); }
function foot(s, n) {
  s.addText("畑みまもり便", { x: 0.9, y: H - 0.45, w: 4, h: 0.3, fontFace: FF, fontSize: 9, color: C.sub, margin: 0 });
  s.addText(String(n), { x: W - 1.3, y: H - 0.45, w: 0.5, h: 0.3, fontFace: FF, fontSize: 9, color: C.sub, align: "right", margin: 0 });
}
function vline(s, x, y, h) { s.addShape(p.shapes.LINE, { x, y, w: 0, h, line: { color: C.hair, width: 1 } }); }
function hline(s, x, y, w) { s.addShape(p.shapes.LINE, { x, y, w, h: 0, line: { color: C.hair, width: 1 } }); }

/* 1. 表紙（明るい淡グリーン＋ポップな円） */
let s = p.addSlide(); bg(s, C.leaf);
s.addShape(p.shapes.OVAL, { x: 10.35, y: 0.6, w: 1.9, h: 1.9, fill: { color: C.yellow, transparency: 12 } });
s.addShape(p.shapes.OVAL, { x: 11.45, y: 1.55, w: 1.35, h: 1.35, fill: { color: C.orange, transparency: 8 } });
s.addShape(p.shapes.OVAL, { x: 10.15, y: 1.95, w: 1.05, h: 1.05, fill: { color: C.green, transparency: 8 } });
s.addText("投資家向け資料 ・ 2026", { x: 0.95, y: 1.0, w: 9, h: 0.3, fontFace: FF, fontSize: 13, color: C.orange, bold: true, charSpacing: 2, margin: 0 });
s.addText("畑みまもり便", { x: 0.9, y: 2.5, w: 10, h: 1.3, fontFace: FF, fontSize: 62, color: C.greenD, bold: true, margin: 0 });
s.addText("通えない畑、まるごとお預かりします。", { x: 0.95, y: 3.95, w: 11, h: 0.6, fontFace: FF, fontSize: 21, color: "5E7A52", margin: 0 });
s.addShape(p.shapes.LINE, { x: 0.95, y: 6.05, w: 1.4, h: 0, line: { color: C.orange, width: 3 } });
s.addText("向野ヘーゼルナッツ農園 ・ 青森県弘前市", { x: 0.95, y: 6.2, w: 11, h: 0.4, fontFace: FF, fontSize: 14, color: C.mossD, margin: 0 });

/* 2. 課題 */
s = p.addSlide(); bg(s, C.paper); kicker(s, "課題"); headline(s, "「畑に通えない人」が、増え続けている");
const stat = [
  ["25.7", "万ha", "全国の荒廃農地", "毎年2.5万haずつ増加", C.green],
  ["69.2", "歳", "農家の平均年齢", "担い手は20年で半減", C.green],
  ["72", "%", "65歳以上が占める", "小さな畑は誰も見ていない", C.orange],
];
stat.forEach((d, i) => {
  const x = 0.9 + i * 4.0;
  if (i > 0) vline(s, x - 0.45, 2.85, 2.25);
  s.addText([{ text: d[0], options: { fontSize: 54 } }, { text: d[1], options: { fontSize: 22 } }], { x, y: 2.8, w: 3.6, h: 1.0, fontFace: FF, color: d[4], bold: true, margin: 0 });
  s.addText(d[2], { x, y: 3.95, w: 3.6, h: 0.4, fontFace: FF, fontSize: 15, color: C.ink, bold: true, margin: 0 });
  s.addText(d[3], { x, y: 4.4, w: 3.5, h: 0.5, fontFace: FF, fontSize: 12.5, color: C.sub, margin: 0 });
});
s.addText("出典：農林水産省（2024）", { x: 0.9, y: 6.55, w: 6, h: 0.3, fontFace: FF, fontSize: 11, color: C.sub, margin: 0 });
foot(s, 2);

/* 3. 市場の空白 */
s = p.addSlide(); bg(s, C.paper); kicker(s, "市場の空白");
s.addText([{ text: "でも、その小さな畑を", options: { breakLine: true } }, { text: "見ている人は、まだいない。", options: {} }],
  { x: 0.9, y: 2.5, w: 11.6, h: 2.0, fontFace: FF, fontSize: 40, color: C.ink, bold: true, lineSpacingMultiple: 1.25, margin: 0 });
s.addShape(p.shapes.LINE, { x: 0.95, y: 4.95, w: 1.1, h: 0, line: { color: C.orange, width: 3 } });
s.addText([{ text: "大手警備・IoT企業は、採算が合わず小さな畑を相手にしない。", options: { breakLine: true } }, { text: "かといって現地に人を常駐させるのはコストに合わない。", options: {} }],
  { x: 0.95, y: 5.15, w: 11, h: 1.0, fontFace: FF, fontSize: 15, color: C.sub, lineSpacingMultiple: 1.4, margin: 0 });
foot(s, 3);

/* 4. なぜ今 */
s = p.addSlide(); bg(s, C.paper); kicker(s, "なぜ今か"); headline(s, "需要の拡大と、見守りコストの崩壊が同時に起きた");
const why = [
  ["需要は構造的に拡大", "高齢化・相続で「持て余す農地」が毎年増える。止まらないメガトレンド。"],
  ["監視が一気に安く", "ソーラー＋SIMカメラが1〜2万円台に。電源も回線もない畑を月数百円で見守れる。"],
  ["公費の追い風", "スマート農業・鳥獣対策の補助金が、顧客の初期負担を下げる材料に。"],
];
why.forEach((d, i) => {
  const x = 0.9 + i * 4.0;
  if (i > 0) vline(s, x - 0.45, 2.7, 2.4);
  s.addShape(p.shapes.OVAL, { x, y: 2.72, w: 0.16, h: 0.16, fill: { color: C.orange } });
  s.addText(d[0], { x: x + 0.3, y: 2.55, w: 3.3, h: 0.6, fontFace: FF, fontSize: 18, color: C.green, bold: true, margin: 0 });
  s.addText(d[1], { x, y: 3.4, w: 3.5, h: 1.7, fontFace: FF, fontSize: 13.5, color: C.ink, lineSpacingMultiple: 1.3, margin: 0 });
});
foot(s, 4);

/* 5. 解決策 */
s = p.addSlide(); bg(s, C.paper); kicker(s, "解決策");
s.addText([{ text: "売り物は「労働」ではなく、", options: { breakLine: true } }, { text: "「安心」という情報。", options: {} }],
  { x: 0.9, y: 1.9, w: 11.6, h: 1.9, fontFace: FF, fontSize: 34, color: C.ink, bold: true, lineSpacingMultiple: 1.25, margin: 0 });
hline(s, 0.9, 4.5, 11.5);
const pil = [["いつでも見える", "畑をオンデマンド閲覧。離れた家族も見られる。"], ["異変を知らせる", "鳥獣・不審者・不法投棄を検知して通知。"], ["毎月レポート", "AIが画像を読み「今月の畑」を自動報告。"]];
pil.forEach((d, i) => {
  const x = 0.9 + i * 4.0;
  s.addShape(p.shapes.OVAL, { x, y: 4.95, w: 0.14, h: 0.14, fill: { color: C.orange } });
  s.addText(d[0], { x: x + 0.28, y: 4.78, w: 3.4, h: 0.45, fontFace: FF, fontSize: 16, color: C.green, bold: true, margin: 0 });
  s.addText(d[1], { x, y: 5.35, w: 3.6, h: 1.0, fontFace: FF, fontSize: 13, color: C.sub, lineSpacingMultiple: 1.3, margin: 0 });
});
foot(s, 5);

/* 6. 仕組み */
s = p.addSlide(); bg(s, C.paper); kicker(s, "仕組み"); headline(s, "電源も回線もない畑で、低コストに回る設計");
const flow = [
  ["① 設置", "鳶の技で3mにソーラーSIMカメラ。盗難に強く死角なし。"],
  ["② 検知＋のぞき見", "動いた時だけ録画・通知。見たい時だけライブ。"],
  ["③ AIレポート", "月次で画像をAI要約。異常・鳥獣痕跡を自動報告。"],
  ["④ 草刈り", "必要時に施工。カメラが前後を検収＝品質の証拠。"],
];
flow.forEach((d, i) => {
  const x = 0.9 + i * 3.0;
  s.addText(d[0], { x, y: 3.0, w: 2.6, h: 0.5, fontFace: FF, fontSize: 17, color: C.green, bold: true, margin: 0 });
  s.addText(d[1], { x, y: 3.55, w: 2.55, h: 1.6, fontFace: FF, fontSize: 12.5, color: C.ink, lineSpacingMultiple: 1.3, margin: 0 });
  if (i < 3) s.addText("→", { x: x + 2.55, y: 3.0, w: 0.45, h: 0.5, fontFace: FF, fontSize: 20, color: C.orange, bold: true, align: "center", margin: 0 });
});
foot(s, 6);

/* 7. 採算の肝 */
s = p.addSlide(); bg(s, C.paper); kicker(s, "採算の肝"); headline(s, "通信費は、設計ひとつでこう変わる");
s.addText("常時クラウド配信", { x: 1.2, y: 2.9, w: 4.0, h: 0.4, fontFace: FF, fontSize: 15, color: C.sub, align: "center", margin: 0 });
s.addText("¥6,000 / 月", { x: 1.2, y: 3.3, w: 4.0, h: 1.0, fontFace: FF, fontSize: 40, color: C.sub, bold: true, align: "center", margin: 0 });
s.addText("→", { x: 5.6, y: 3.25, w: 2.0, h: 1.0, fontFace: FF, fontSize: 44, color: C.orange, bold: true, align: "center", margin: 0 });
s.addText("検知＋のぞき見", { x: 8.0, y: 2.9, w: 4.2, h: 0.4, fontFace: FF, fontSize: 15, color: C.green, align: "center", margin: 0 });
s.addText("¥300〜1,100 / 月", { x: 8.0, y: 3.3, w: 4.2, h: 1.0, fontFace: FF, fontSize: 40, color: C.green, bold: true, align: "center", margin: 0 });
s.addText("ソーラーカメラは構造上この方式が標準。「いつでも覗ける安心」はオンデマンドで両立し、常時配信は不要。", { x: 0.9, y: 5.5, w: 11.6, h: 0.6, fontFace: FF, fontSize: 14, color: C.ink, align: "center", margin: 0 });
foot(s, 7);

/* 8. 収益構造 */
s = p.addSlide(); bg(s, C.paper); kicker(s, "収益構造"); headline(s, "入口は単発、本命は積み上がる月額ストック");
const hd = (t, al) => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.green }, align: al || "left", valign: "middle" } });
const pr = (t) => ({ text: t, options: { align: "right", bold: true, color: C.orange, valign: "middle" } });
const rows = [
  [hd("メニュー"), hd("内容"), hd("料金（仮）", "right")],
  ["カメラ設置（初期）", "ソーラーSIMカメラを設置・初期設定", pr("3〜5万円")],
  [{ text: "みまもり月額  ★", options: { bold: true, valign: "middle" } }, "閲覧＋通信＋月次AIレポート＋異常連絡", pr("月 3,000〜5,000円")],
  ["草刈りスポット", "年2〜4回の草刈り・刈草処理（入口）", pr("半日 15,000円〜")],
  [{ text: "まるごと年契約  ★", options: { bold: true, valign: "middle" } }, "見守り＋定期草刈り＋レポート", pr("年 8〜15万円／反")],
];
s.addTable(rows, { x: 0.9, y: 2.2, w: 11.6, colW: [3.2, 5.4, 3.0], rowH: 0.62, fontFace: FF, fontSize: 13, color: C.ink, valign: "middle", border: { type: "solid", color: C.hair, pt: 1 }, fill: { color: C.paper } });
s.addText("★ ＝ ストック収入。相続農地は手放しにくく解約が少ない（低churn・高LTV）。", { x: 0.9, y: 5.7, w: 11.6, h: 0.4, fontFace: FF, fontSize: 13, color: C.sub, margin: 0 });
foot(s, 8);

/* 9. ユニットエコノミクス */
s = p.addSlide(); bg(s, C.paper); kicker(s, "採算"); headline(s, "カメラ1台で、粗利率 50〜70%");
s.addText("粗利 ／ 台・月", { x: 0.9, y: 2.9, w: 5, h: 0.4, fontFace: FF, fontSize: 15, color: C.sub, margin: 0 });
s.addText([{ text: "¥1,500", options: { fontSize: 60 } }, { text: "〜3,500", options: { fontSize: 30, color: C.ink } }], { x: 0.9, y: 3.35, w: 7.2, h: 1.3, fontFace: FF, color: C.orange, bold: true, margin: 0 });
vline(s, 8.4, 3.0, 2.2);
s.addText([
  { text: "売上　＋3,000〜5,000", options: { breakLine: true, color: C.ink } },
  { text: "通信　−300〜1,100", options: { breakLine: true, color: C.sub } },
  { text: "償却　−約560", options: { breakLine: true, color: C.sub } },
  { text: "保守ほか　−500〜1,500", options: { color: C.sub } },
], { x: 8.8, y: 3.2, w: 3.7, h: 1.9, fontFace: FF, fontSize: 14, lineSpacingMultiple: 1.5, margin: 0 });
s.addText("初期設置3〜5万円で機材原価を即回収 → 月額はほぼ丸ごと利益。", { x: 0.9, y: 5.7, w: 11.6, h: 0.4, fontFace: FF, fontSize: 14, color: C.green, bold: true, margin: 0 });
foot(s, 9);

/* 10. 成長見通し */
s = p.addSlide(); bg(s, C.paper); kicker(s, "成長見通し"); headline(s, "台数が増えるほど、ストック粗利が積み上がる");
s.addChart(p.charts.BAR, [{ name: "月次ストック粗利", labels: ["10台", "30台", "50台"], values: [24000, 72000, 120000] }], {
  x: 0.9, y: 2.2, w: 11.6, h: 3.6, barDir: "col", barGapWidthPct: 80,
  chartColors: [C.green],
  showValue: true, dataLabelPosition: "outEnd", dataLabelColor: C.ink, dataLabelFontSize: 14, dataLabelFontFace: FF, dataLabelFormatCode: '#,##0"円"',
  catAxisLabelColor: C.ink, catAxisLabelFontFace: FF, catAxisLabelFontSize: 14,
  valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" },
  showLegend: false, showTitle: false, chartArea: { fill: { color: C.paper } }, plotArea: { fill: { color: C.paper } },
});
s.addText("30台で月7万円のストック粗利（草刈り収入とは別に積み上がる）。", { x: 0.9, y: 6.05, w: 11.6, h: 0.4, fontFace: FF, fontSize: 14, color: C.sub, margin: 0 });
foot(s, 10);

/* 11. 市場規模 */
s = p.addSlide(); bg(s, C.paper); kicker(s, "市場規模"); headline(s, "全国の放置農地から、まず津軽圏で面を取る");
const mk = [
  ["TAM", "全国の放置農地・遠隔/高齢所有者", "荒廃農地25.7万ha。再生可能だけで9.4万ha＝広大な未管理ストック", C.green],
  ["SAM", "北東北の遠隔・高齢所有者", "過疎・相続が濃い地域。空き家管理（月5千〜1万円）の隣接市場", C.mossD],
  ["SOM", "津軽圏・弘前で初期獲得", "顔が見える地域から数十件→数百件。1人＋協力者で到達可能", C.orange],
];
mk.forEach((d, i) => {
  const y = 2.25 + i * 1.25;
  if (i > 0) hline(s, 0.9, y - 0.15, 11.6);
  s.addText(d[0], { x: 0.9, y, w: 1.7, h: 0.8, fontFace: FF, fontSize: 24, color: d[3], bold: true, valign: "middle", margin: 0 });
  s.addText(d[1], { x: 2.9, y: y + 0.05, w: 9.5, h: 0.45, fontFace: FF, fontSize: 16, color: C.ink, bold: true, margin: 0 });
  s.addText(d[2], { x: 2.9, y: y + 0.5, w: 9.5, h: 0.4, fontFace: FF, fontSize: 12.5, color: C.sub, margin: 0 });
});
s.addText("「空き家管理サービスの農地版」── 実証済みの月額モデルを、競合の手薄な放置農地に移植する。", { x: 0.9, y: 6.35, w: 11.6, h: 0.4, fontFace: FF, fontSize: 13, color: C.green, italic: true, margin: 0 });
foot(s, 11);

/* 12. 競合優位 */
s = p.addSlide(); bg(s, C.paper); kicker(s, "競合優位"); headline(s, "個人にしか築けない、4つの堀");
const moat = [
  ["鳶の3m設置", "高所作業の技で盗難・破壊に強く、自前施工で設置原価を圧縮。"],
  ["AI × 発信", "カメラ画像から月次レポートを自動生成。便利屋には無理。"],
  ["地域・顔が見える", "他人に畑を任せる心理ハードルを、地元の信頼で越える。"],
  ["小回り", "0.5反〜の小さな畑も断らない。大手が拾わない隙間を取る。"],
];
hline(s, 0.9, 4.25, 11.6); vline(s, 6.65, 2.35, 3.6);
moat.forEach((d, i) => {
  const x = 0.9 + (i % 2) * 5.95;
  const y = 2.45 + Math.floor(i / 2) * 1.95;
  s.addShape(p.shapes.OVAL, { x, y: y + 0.08, w: 0.14, h: 0.14, fill: { color: C.orange } });
  s.addText(d[0], { x: x + 0.28, y, w: 5.1, h: 0.5, fontFace: FF, fontSize: 19, color: C.green, bold: true, margin: 0 });
  s.addText(d[1], { x, y: y + 0.55, w: 5.4, h: 1.0, fontFace: FF, fontSize: 13, color: C.sub, lineSpacingMultiple: 1.3, margin: 0 });
});
foot(s, 12);

/* 13. 成長戦略 */
s = p.addSlide(); bg(s, C.paper); kicker(s, "成長戦略"); headline(s, "1人で回す → カメラ検収つき雇用型ネットワークへ");
const ph = [
  ["Phase 1", "自分で施工", "コアを学び、実証データと品質基準を作る。単価は外注費が乗っても黒字の水準で設定。"],
  ["Phase 2", "都度雇用でオーバーフロー", "手が回らない分だけ地元ワーカーを“雇用”（労災・賠償が明確）。カメラが施工を検収。"],
  ["Phase 3", "協力者プール＋評価", "2〜3人をカメラ評価で振り分け。客提示価格で需要を吸収。地域の元請けに。"],
];
ph.forEach((d, i) => {
  const x = 0.9 + i * 4.0;
  if (i > 0) vline(s, x - 0.4, 2.55, 2.7);
  s.addText(d[0], { x, y: 2.55, w: 3.6, h: 0.35, fontFace: FF, fontSize: 13, color: C.orange, bold: true, charSpacing: 1, margin: 0 });
  s.addText(d[1], { x, y: 2.95, w: 3.6, h: 0.5, fontFace: FF, fontSize: 17, color: C.ink, bold: true, margin: 0 });
  s.addText(d[2], { x, y: 3.55, w: 3.55, h: 1.7, fontFace: FF, fontSize: 13, color: C.sub, lineSpacingMultiple: 1.3, margin: 0 });
});
s.addText("開放型「草刈りUber」は密度・安全・季節の壁でNG。雇用型＋カメラ検収＋客提示価格の“管理型”だから成立する。", { x: 0.9, y: 5.75, w: 11.6, h: 0.4, fontFace: FF, fontSize: 13, color: C.sub, italic: true, margin: 0 });
foot(s, 13);

/* 14. 計画＆撤退ライン */
s = p.addSlide(); bg(s, C.paper); kicker(s, "計画とリスク"); headline(s, "小さく実証し、ダメなら畳む。リスクは限定済み");
const road = [["〜3ヶ月", "自分の畑にカメラ1台を実証設置。閲覧画面・AIレポートをサンプル化。"], ["3〜6ヶ月", "コンセプトと畑の様子を発信し、問い合わせで需要をテスト。"], ["6〜12ヶ月", "1〜数件を実績化。保険・安全教育を整備し、都度雇用を開始。"]];
road.forEach((d, i) => {
  const y = 2.4 + i * 0.95;
  s.addShape(p.shapes.OVAL, { x: 0.95, y: y + 0.08, w: 0.18, h: 0.18, fill: { color: C.green } });
  s.addText(d[0], { x: 1.4, y, w: 2.0, h: 0.45, fontFace: FF, fontSize: 16, color: C.green, bold: true, margin: 0 });
  s.addText(d[1], { x: 3.5, y, w: 9.0, h: 0.45, fontFace: FF, fontSize: 13.5, color: C.ink, margin: 0 });
});
s.addShape(p.shapes.LINE, { x: 0.95, y: 5.55, w: 0, h: 0.9, line: { color: C.orange, width: 3 } });
s.addText([{ text: "撤退ライン", options: { bold: true, color: C.orange, breakLine: true } }, { text: "半年発信して問い合わせ0件なら撤退し、草刈り単体に戻す。失う実費はカメラ実証費（数万円）のみ。", options: { color: C.ink } }],
  { x: 1.25, y: 5.55, w: 11.2, h: 0.9, fontFace: FF, fontSize: 14, lineSpacingMultiple: 1.3, valign: "middle", margin: 0 });
foot(s, 14);

/* 15. チーム＆Ask（明るい・帯アクセント） */
s = p.addSlide(); bg(s, C.leaf);
s.addText("チーム ＆ お願いしたいこと", { x: 0.9, y: 0.85, w: 11.5, h: 0.7, fontFace: FF, fontSize: 28, color: C.greenD, bold: true, margin: 0 });
s.addShape(p.shapes.LINE, { x: 0.95, y: 1.65, w: 1.4, h: 0, line: { color: C.orange, width: 3 } });
s.addShape(p.shapes.LINE, { x: 6.6, y: 2.4, w: 0, h: 3.8, line: { color: C.leafLine, width: 1.5 } });
s.addText("代表　三浦", { x: 0.9, y: 2.35, w: 5, h: 0.5, fontFace: FF, fontSize: 18, color: C.orange, bold: true, margin: 0 });
const team = [["元・鳶職人", "高所作業の技 ＝ 3mカメラ設置の競合優位"], ["新規就農者", "自分の畑がそのまま実証ショールーム"], ["AI活用の実務者", "会計・レポート自動化を自力で構築・運用"]];
team.forEach((d, i) => {
  const y = 3.05 + i * 1.05;
  s.addText(d[0], { x: 0.9, y, w: 5.2, h: 0.4, fontFace: FF, fontSize: 15, color: C.green, bold: true, margin: 0 });
  s.addText(d[1], { x: 0.9, y: y + 0.4, w: 5.2, h: 0.5, fontFace: FF, fontSize: 12.5, color: C.ink, margin: 0 });
});
s.addText("求めるもの", { x: 7.0, y: 2.35, w: 5, h: 0.5, fontFace: FF, fontSize: 18, color: C.orange, bold: true, margin: 0 });
const ask = [["実証フェーズの少額資金", "カメラ・SIM・保険など立ち上げ実費"], ["初期顧客の紹介", "遠隔地に農地を持つ層へのつなぎ"], ["保険・労務の助言", "雇用型ネットワーク設計の知見"]];
ask.forEach((d, i) => {
  const y = 3.05 + i * 1.05;
  s.addText(d[0], { x: 7.0, y, w: 5.4, h: 0.4, fontFace: FF, fontSize: 15, color: C.green, bold: true, margin: 0 });
  s.addText(d[1], { x: 7.0, y: y + 0.4, w: 5.4, h: 0.5, fontFace: FF, fontSize: 12.5, color: C.ink, margin: 0 });
});
s.addText("畑みまもり便 ・ 向野ヘーゼルナッツ農園（青森県弘前市）", { x: 0.9, y: 6.85, w: 11.5, h: 0.4, fontFace: FF, fontSize: 12, color: C.mossD, margin: 0 });

p.writeFile({ fileName: "C:\\Users\\user\\hazelnut-farm\\hatake-mimamori-pitch.pptx" }).then(f => console.log("OK:", f));

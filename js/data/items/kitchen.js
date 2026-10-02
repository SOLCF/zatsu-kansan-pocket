// キッチンの換算項目。前提値の根拠は各コメントを参照（2026-10 時点でWeb確認）。
import { baseCompute, isNum } from '../../calc.js';
import { approx, approxRange, approxMinSec, fmtNum } from '../../format.js';

// ---- 米 ----
// 1合=180mL≒約150g、水は米と同量〜1合あたり約200mL、炊き上がりは生米の約2.2倍（体積・重量とも）。
// 出典: https://panasonic.jp/life/food/110156.html ほか
export const rice = {
  id: 'rice',
  genre: 'キッチン',
  title: '米',
  kind: 'calc',
  hint: '合・g・水・茶碗杯数',
  fields: [
    { key: 'go', label: '合数', unit: '合', toBase: (v) => v, fromBase: (b) => b },
    { key: 'rawG', label: '生米', unit: 'g', toBase: (v, a) => v / a.gPerGo, fromBase: (b, a) => b * a.gPerGo },
    { key: 'waterMl', label: '水', unit: 'mL', toBase: (v, a) => v / a.waterPerGo, fromBase: (b, a) => b * a.waterPerGo },
    { key: 'cookedG', label: '炊き上がり', unit: 'g', toBase: (v, a) => v / (a.gPerGo * a.cookRatio), fromBase: (b, a) => b * a.gPerGo * a.cookRatio },
    { key: 'bowls', label: '茶碗', unit: '杯', toBase: (v, a) => (v * a.bowlG) / (a.gPerGo * a.cookRatio), fromBase: (b, a) => (b * a.gPerGo * a.cookRatio) / a.bowlG },
  ],
  assumptions: [
    { key: 'gPerGo', label: '1合', unit: 'g', value: 150 },
    { key: 'waterPerGo', label: '水（1合あたり）', unit: 'mL', value: 200 },
    { key: 'cookRatio', label: '炊き上がり倍率', unit: '倍', value: 2.2 },
    { key: 'bowlG', label: '茶碗1杯', unit: 'g', value: 150, myKey: 'chawanG' },
  ],
  describe: (v, a) => (isNum(v.go) ? [`${approx(v.go * 180, 'mL')}（計量カップの量）`] : []),
};
rice.compute = baseCompute(rice.fields);

// ---- 乾麺 ----
// 茹で上がり倍率の目安（実測の幅）。出典: https://kantaro.fans/kanmen/ ほか
//   パスタ 2.1〜2.5 / そうめん 2.5〜3.0 / 乾そば 2.6〜2.7 / 乾うどん 2.5〜3.0
// 代表値は SPEC の値（パスタ2.3・そうめん2.8・乾そば2.6・乾うどん2.5）を使う。
const NOODLES = [
  { value: 'pasta', label: 'パスタ', ratio: 2.3, range: [2.1, 2.5] },
  { value: 'somen', label: 'そうめん', ratio: 2.8, range: [2.5, 3.0] },
  { value: 'soba', label: '乾そば', ratio: 2.6, range: [2.6, 2.7] },
  { value: 'udon', label: '乾うどん', ratio: 2.5, range: [2.5, 3.0] },
];
export const noodle = {
  id: 'noodle',
  genre: 'キッチン',
  title: '乾麺',
  kind: 'calc',
  hint: '茹で前 ⇄ 茹で後の重さ',
  selects: [
    {
      key: 'type',
      label: '麺の種類',
      options: NOODLES.map((n) => ({ value: n.value, label: n.label, set: { ratio: n.ratio }, range: n.range })),
    },
  ],
  fields: [
    { key: 'dryG', label: '茹で前', unit: 'g', toBase: (v) => v, fromBase: (b) => b },
    { key: 'cookedG', label: '茹で後', unit: 'g', toBase: (v, a) => v / a.ratio, fromBase: (b, a) => b * a.ratio },
  ],
  assumptions: [{ key: 'ratio', label: '茹で上がり倍率', unit: '倍', value: 2.3 }],
  describe: (v, a, sel) => {
    const opt = NOODLES.find((n) => n.value === sel.type);
    if (!opt || !isNum(v.cookedG) || !isNum(v.dryG)) return [];
    // 倍率を編集していない限り、種類ごとの幅で茹で後の範囲も示す
    if (a.ratio !== opt.ratio) return [];
    return [`倍率の目安 ${opt.range[0]}〜${opt.range[1]}倍 → 茹で後 ${approxRange(v.dryG * opt.range[0], v.dryG * opt.range[1], 'g')}`];
  },
};
noodle.compute = baseCompute(noodle.fields);

// ---- 電子レンジ ----
// 加熱時間 = 表記W × 表記時間 ÷ 自宅W（熱量 J = W × 秒 が同じになる時間）。
// 出典: https://cojicaji.jp/cooking/cooking-tips/2291 ほか
export const microwave = {
  id: 'microwave',
  genre: 'キッチン',
  title: '電子レンジ',
  kind: 'calc',
  hint: 'レシピのW数を自宅用に',
  fields: [
    // 表記のW数は最初から500Wを入れておく（レシピや惣菜・冷凍食品の表記は500Wが多いため）
    { key: 'labelW', label: '表記のW数', unit: 'W', param: true, default: 500 },
    // 時間欄は画面では「◯分◯秒」の2欄。値は秒で持つ。
    { key: 'labelSec', label: '表記の時間', unit: '秒', type: 'time', param: true },
    { key: 'homeSec', label: '自宅での時間', unit: '秒', type: 'time' },
    { key: 'joule', label: '総熱量（おまけ）', unit: 'J', readonly: true },
  ],
  assumptions: [{ key: 'homeW', label: '自宅レンジ', unit: 'W', value: 600, myKey: 'rangeW' }],
  compute: (key, value, values, a) => {
    const out = { ...values, [key]: value };
    // 自宅の時間から表記の時間を逆算する場合：自宅の時間を入れた場合。または、先に自宅の時間だけ入れてあとから
    // 表記のW数を入れた場合（表記の時間が空なので、入力済みの自宅の時間を消さずに逆算する）。
    const fromHome = key === 'homeSec' || (key === 'labelW' && !isNum(out.labelSec) && isNum(out.homeSec));
    if (fromHome) {
      out.labelSec = isNum(out.labelW) ? (out.homeSec * a.homeW) / out.labelW : null;
    } else {
      out.homeSec = isNum(out.labelW) && isNum(out.labelSec) ? (out.labelW * out.labelSec) / a.homeW : null;
    }
    out.joule = isNum(out.labelW) && isNum(out.labelSec) ? out.labelW * out.labelSec : null;
    return out;
  },
  describe: (v) => (isNum(v.homeSec) ? [`自宅では ${approxMinSec(v.homeSec)}`] : []),
};

// ---- 計量（大さじ・小さじ・カップ ⇄ g）----
// 小さじ=5mL・大さじ=15mL・1カップ=200mL。食材ごとの重さ（g）は大阪市「カップ・スプーンによる食品の重量」の表。
//   出典: https://www.city.osaka.lg.jp/kenko/page/0000017084.html （同じ値が他の自治体・栄養学校の表にもある）
// 米は 1合=180mL≒150g（米の項目と同じ）から、0.833g/mL として求めた値。
// 粉類は、ふるい方・詰め方で重さが変わる。
export const MEASURE_FOODS = [
  { value: 'sugar', label: '砂糖（上白糖）', gS: 3, gT: 9, gC: 130 },
  { value: 'salt', label: '食塩', gS: 6, gT: 18, gC: 240 },
  { value: 'shoyu', label: 'しょうゆ', gS: 6, gT: 18, gC: 236 },
  { value: 'miso', label: 'みそ', gS: 6, gT: 18, gC: 230 },
  { value: 'mirin', label: 'みりん', gS: 6, gT: 18, gC: 230 },
  { value: 'water', label: '水・酢・酒', gS: 5, gT: 15, gC: 200 },
  { value: 'oil', label: '油', gS: 4, gT: 12, gC: 180 },
  { value: 'butter', label: 'バター・マーガリン', gS: 4, gT: 12, gC: 180 },
  { value: 'mayo', label: 'マヨネーズ', gS: 4, gT: 12, gC: 190 },
  { value: 'ketchup', label: 'トマトケチャップ', gS: 5, gT: 15, gC: 230 },
  { value: 'flour', label: '小麦粉', gS: 3, gT: 9, gC: 110 },
  { value: 'starch', label: 'かたくり粉', gS: 3, gT: 9, gC: 130 },
  { value: 'breadcrumb', label: 'パン粉', gS: 1, gT: 3, gC: 40 },
  { value: 'skimmilk', label: 'スキムミルク', gS: 2, gT: 6, gC: 90 },
  { value: 'rice', label: '米（精白米）', gS: 25 / 6, gT: 12.5, gC: 500 / 3 },
];
export const CUP_ML = 200;
export const GO_ML = 180;

export const measure = {
  id: 'measure',
  genre: 'キッチン',
  title: '計量',
  kind: 'calc',
  hint: '大さじ・小さじ・カップ ⇄ g（食材別）',
  selects: [
    {
      key: 'food',
      label: '食材',
      default: 'sugar',
      options: MEASURE_FOODS.map((f) => ({ value: f.value, label: f.label, set: { gS: f.gS, gT: f.gT, gC: f.gC } })),
    },
  ],
  fields: [
    { key: 'tbsp', label: '大さじ（15mL）', unit: '杯', toBase: (v, a) => v * a.gT, fromBase: (b, a) => b / a.gT },
    { key: 'tsp', label: '小さじ（5mL）', unit: '杯', toBase: (v, a) => v * a.gS, fromBase: (b, a) => b / a.gS },
    { key: 'cup', label: 'カップ（200mL）', unit: '杯', toBase: (v, a) => v * a.gC, fromBase: (b, a) => b / a.gC },
    { key: 'g', label: '重さ', unit: 'g', toBase: (v) => v, fromBase: (b) => b },
    { key: 'ml', label: '体積', unit: 'mL', toBase: (v, a) => (v * a.gC) / CUP_ML, fromBase: (b, a) => (b * CUP_ML) / a.gC },
  ],
  assumptions: [],
  describe: (v, a, sel) => {
    if (sel.food !== 'rice' || !isNum(v.ml)) return [];
    return [`お米は1合＝${GO_ML}mL なので ${approx(v.ml / GO_ML, '合', 2)}（約${fmtNum(v.g, 2)}g）`];
  },
  note: '小さじ・大さじ・カップはすり切りが基準です。粉類はふるい方や詰め方でも変わります。お米のカップは1合＝180mLです。',
};
measure.compute = baseCompute(measure.fields);

export const kitchenItems = [rice, noodle, microwave, measure];

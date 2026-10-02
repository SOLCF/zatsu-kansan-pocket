// 日用品の換算項目（モバイルバッテリー・電池）。根拠は各コメントを参照（2026-10 時点でWeb確認）。
import { baseCompute, isNum } from '../../calc.js';
import { approx, approxRange } from '../../format.js';

// ---- モバイルバッテリー ----
// Wh = mAh × 3.7V ÷ 1000（表記mAhはセル電圧3.7V基準が一般的）。
// 実効容量は表記の約60〜70%（変換・ケーブル損失込み）、代表値65%。
//   出典: https://www.phileweb.com/review/column/202008/03/1098.html
//         https://snapgadget.jp/mobile-battery-conversion-loss/
export const CELL_V = 3.7;
export const EFF_RANGE = [60, 70];

// 機内持ち込みの目安。国土交通省「モバイルバッテリーの機内持込みの新たなルール」(2026-04-24適用):
//   160Wh以下に限り1人2個まで／機内での本体充電・他機器への給電は禁止／預け入れ不可。
//   出典: https://www.mlit.go.jp/report/press/kouku10_hh_000310.html
// 100Wh超の扱いは航空会社ごとに異なる場合があるため、断定せず確認を促す。
export function flightGuide(wh) {
  if (!isNum(wh)) return [];
  const head =
    wh <= 100
      ? '機内持ち込みの目安：持ち込める容量（1人2個まで）'
      : wh <= 160
        ? '機内持ち込みの目安：持ち込める容量だが、100Wh超は航空会社の条件を要確認（1人2個まで）'
        : '機内持ち込みの目安：160Wh超は持ち込めない容量';
  return [
    head,
    '預け入れ荷物には入れられません。機内での充電・給電も禁止です（2026年4月24日〜）。',
    'あくまで目安です。航空会社・国土交通省の公式規定を確認してください。',
  ];
}

export const powerbank = {
  id: 'powerbank',
  genre: '日用品',
  title: 'モバイルバッテリー',
  kind: 'calc',
  hint: 'mAh・Wh・スマホ充電回数・機内持ち込み',
  fields: [
    { key: 'mah', label: '表記容量', unit: 'mAh', toBase: (v, a) => (v * a.cellV) / 1000, fromBase: (b, a) => (b * 1000) / a.cellV },
    { key: 'wh', label: 'エネルギー', unit: 'Wh', toBase: (v) => v, fromBase: (b) => b },
    {
      key: 'charges',
      label: 'スマホ充電（フル）',
      unit: '回',
      toBase: (v, a) => (v * ((a.phoneMah * a.cellV) / 1000)) / (a.eff / 100),
      fromBase: (b, a) => (b * (a.eff / 100)) / ((a.phoneMah * a.cellV) / 1000),
    },
  ],
  assumptions: [
    { key: 'cellV', label: 'セル電圧', unit: 'V', value: CELL_V },
    { key: 'eff', label: '変換効率', unit: '%', value: 65 },
    { key: 'phoneMah', label: 'スマホの電池', unit: 'mAh', value: 4000, myKey: 'phoneMah' },
  ],
  describe: (v, a) => {
    if (!isNum(v.wh)) return [];
    const phoneWh = (a.phoneMah * a.cellV) / 1000;
    const [lo, hi] = EFF_RANGE.map((e) => (v.wh * (e / 100)) / phoneWh);
    return [`充電回数は ${approxRange(lo, hi, '回', 2)}（効率60〜70%）`, ...flightGuide(v.wh)];
  },
  note: 'mAh表記はセル電圧3.7V基準が一般的です。Wh表記があればそちらを使ってください。',
};
powerbank.compute = baseCompute(powerbank.fields);

// ---- 電池（対照表）----
// 寸法: IEC 60086 / JIS C 8500。https://ja.wikipedia.org/wiki/乾電池
// アルカリの容量目安: 単1 12,500〜17,000 / 単2 5,700〜7,700 / 単3 2,000〜2,700 / 単4 850〜1,300 mAh
//   （負荷や銘柄で大きく変わる）https://hayamihyou.net/battery/ ほか
// エネループ(ニッケル水素)標準: 単3 最小2,000 / 単4 最小800 mAh、繰り返し約2,100回
//   https://panasonic.jp/battery/feature/eneloop.html
// 9V(006P/6LR61) 26.5×17.5×48.5mm、容量 約400〜600mAh（公称450）
// CR2032 220〜240mAh、CR2450 620mAh(24.5×5.0mm)、LR44/SR44 11.6×5.4mm、LR41 7.9×3.6mm、SR626SW 6.8×2.6mm
//   https://www.phileweb.com/review/column/202008/05/1102.html
// 型番の読み方: 先頭 CR=リチウム／LR=アルカリ／SR=酸化銀、数字は「直径mm(2桁)＋厚みmm×10(2桁)」。
const dry = {
  title: '乾電池',
  columns: ['種類', 'サイズ(径×高mm)', 'アルカリの容量目安', 'メモ'],
  rows: [
    ['単1形（R20 / LR20）', '34.2 × 61.5', '約12,500〜17,000mAh', '大型ライト・ガスコンロの点火など'],
    ['単2形（R14 / LR14）', '26.2 × 50.0', '約5,700〜7,700mAh', ''],
    ['単3形（R6 / LR6）', '14.5 × 50.5', '約2,000〜2,700mAh', '一番よく使うサイズ'],
    ['単4形（R03 / LR03）', '10.5 × 44.5', '約850〜1,300mAh', 'リモコン・小型機器'],
    ['単5形（R1 / LR1）', '12.0 × 30.2', '—', '使う機器が少ない。他のサイズでは代用できない'],
    ['9V形（006P / 6LR61）', '26.5 × 17.5 × 48.5', '約400〜600mAh', '角型。煙感知器・測定器など'],
  ],
};

const chem = {
  title: '種類の比べ方（単3・単4）',
  columns: ['種類', '電圧', '容量の目安（単3 / 単4）', '向いている使い方'],
  rows: [
    ['アルカリ（LR6/LR03）', '1.5V', '約2,000〜2,700 / 850〜1,300mAh', '力が要る機器・ライト・おもちゃ。迷ったらこれ'],
    ['マンガン（R6/R03）', '1.5V', 'アルカリの約1/4程度（負荷による）', '小さな電流で長く使う壁掛け時計・リモコン向き'],
    ['ニッケル水素（HR6/HR03）', '1.2V', '約2,000 / 800mAh（エネループ標準・最小値）', '繰り返し充電（約2,100回）。デジカメなど大電流の機器向き'],
  ],
  note: 'ニッケル水素は1.2Vなので、機器によっては1.5Vの電池前提で動作が弱く見えることがあります。',
};

const button = {
  title: 'ボタン電池',
  columns: ['型番', '種類', 'サイズ(径×厚mm)', '容量の目安', '互換・メモ'],
  rows: [
    ['CR2032', 'リチウム 3V', '20 × 3.2', '約220〜240mAh', 'キーレス・体重計・PCのマザーボードなど。BR2032は電圧がやや低く、機器によって代用可否が分かれる'],
    ['CR2025', 'リチウム 3V', '20 × 2.5', '—', 'CR2032より薄い。径は同じでも厚みが違うので基本的に代用不可'],
    ['CR2016', 'リチウム 3V', '20 × 1.6', '—', 'さらに薄い。CR2032とは代用不可'],
    ['CR2450', 'リチウム 3V', '24.5 × 5.0', '約620mAh', '大きめ。スマートタグなど'],
    ['CR1632', 'リチウム 3V', '16 × 3.2', '—', ''],
    ['CR1620', 'リチウム 3V', '16 × 2.0', '—', ''],
    ['LR44', 'アルカリ 1.5V', '11.6 × 5.4', '—', 'SR44（酸化銀 1.55V）・AG13と同寸。機器によっては入れ替え可（時計はSR44が向く）'],
    ['LR41', 'アルカリ 1.5V', '7.9 × 3.6', '—', 'AG3・SR41と同寸'],
    ['SR626SW', '酸化銀 1.55V', '6.8 × 2.6', '—', '腕時計用。377・AG4と同寸'],
  ],
};

export const battery = {
  id: 'battery',
  genre: '日用品',
  title: '電池',
  kind: 'table',
  hint: '乾電池・ボタン電池のサイズと互換',
  tables: [dry, chem, button],
  notes: [
    '容量は負荷・銘柄・温度で大きく変わる目安です。',
    '持ち時間の目安 ≒ 容量(mAh) ÷ 機器の消費電流(mA)。実際はこれより短くなります。',
  ],
};

export const dailyItems = [powerbank, battery];

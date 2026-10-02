// 天気・自然の項目（標高差・風速・降水量）。根拠は各コメントを参照（2026-10 時点でWeb確認）。
import { isNum } from '../../calc.js';
import { approx, fmtNum } from '../../format.js';

// ---- 標高差 ----
// 気温は標高が100m上がるごとに約0.6℃下がる（国際標準大気では0.649℃/100m）。実際は天候・湿度で変わる
// （乾いた空気では大きく、雲の中では小さくなる）。出典: https://blog.ontrails.jp/mountain-temperature/ ほか
export const LAPSE_RATE = 0.6; // ℃/100m

export const elevation = {
  id: 'elevation',
  genre: '天気・自然',
  title: '標高差',
  kind: 'calc',
  hint: '標高差 ⇄ 気温差、山頂などの推定気温',
  anchorMain: true,
  fields: [
    { key: 'elev', label: '標高差（高い地点 − 低い地点）', unit: 'm' },
    { key: 'drop', label: '気温差（高い地点のほうが低い）', unit: '℃' },
    { key: 'base', label: '低い地点の気温（任意）', unit: '℃', param: true, optional: true, signed: true, blankValue: null },
    { key: 'est', label: '高い地点の推定気温', unit: '℃', readonly: true },
  ],
  assumptions: [{ key: 'lapse', label: '気温減率', unit: '℃/100m', value: LAPSE_RATE }],
  compute: (key, value, values, a) => {
    const out = { ...values, [key]: value };
    if (key === 'elev') out.drop = (value / 100) * a.lapse;
    else if (key === 'drop') out.elev = (value / a.lapse) * 100;
    out.est = isNum(out.drop) && isNum(out.base) ? out.base - out.drop : null;
    return out;
  },
  describe: (v) => {
    if (!isNum(v.drop)) return [];
    const lines = [`標高が ${fmtNum(v.elev)}m 上がると、気温は ${approx(v.drop, '℃', 2)} 低くなります`];
    if (isNum(v.est)) lines.push(`高い地点の気温は ${approx(v.est, '℃', 3)}`);
    lines.push('あくまで目安です。天候や湿度、風で体感は大きく変わります。');
    return lines;
  },
};

// ---- 風速 ----
// 気象庁「風の強さと吹き方」（平成29年9月一部改正）の区分。平均風速は10分間の平均。
//   出典: https://www.jma.go.jp/jma/kishou/know/yougo_hp/kazehyo.html（表は画像／PDF）
// 表は10m/s以上の区分のみ。10m/s未満は表に区分が無い。
const WIND_CAR_STRONG = '通常の速度で運転するのが困難になる。';
const WIND_BIG = [
  ['人への影響', '屋外での行動は極めて危険。'],
  ['屋外・樹木', '多くの樹木が倒れる。電柱や街灯で倒れるものがある。ブロック塀で倒壊するものがある。'],
  ['走行中の車', '走行中のトラックが横転する。'],
];
export const WIND_BANDS = [
  {
    min: 10, max: 15, label: 'やや強い風', range: '10以上15未満 m/s', speed: '〜約50km/h',
    details: [
      ['人への影響', '風に向かって歩きにくくなる。傘がさせない。'],
      ['屋外・樹木', '樹木全体が揺れ始める。電線が鳴り始める。'],
      ['走行中の車', '道路の吹流しの角度が水平に近くなり、高速運転中は横風に流される感覚を受ける。'],
      ['建造物', '樋（とい）が揺れ始める。'],
    ],
  },
  {
    min: 15, max: 20, label: '強い風', range: '15以上20未満 m/s', speed: '〜約70km/h',
    details: [
      ['人への影響', '風に向かって歩けなくなり、転倒する人も出る。高所での作業は極めて危険。'],
      ['屋外・樹木', '電線が揺れ始める。看板やトタン板が外れ始める。'],
      ['走行中の車', '高速運転中では、横風に流される感覚が大きくなる。'],
      ['建造物', '屋根瓦・屋根葺材がはがれるものがある。雨戸やシャッターが揺れる。'],
    ],
  },
  {
    min: 20, max: 30, label: '非常に強い風', range: '20以上30未満 m/s', speed: '〜約90〜110km/h',
    details: [
      ['人への影響', '何かにつかまっていないと立っていられない。飛来物によって負傷するおそれがある。'],
      ['屋外・樹木', '細い木の幹が折れたり、根の張っていない木が倒れ始める。看板が落下・飛散する。道路標識が傾く。'],
      ['走行中の車', WIND_CAR_STRONG],
      ['建造物', '屋根瓦・屋根葺材が飛散するものがある。固定されていないプレハブ小屋が移動、転倒する。ビニールハウスのフィルム（被覆材）が広範囲に破れる。'],
    ],
  },
  {
    min: 30, max: 35, label: '猛烈な風', range: '30以上35未満 m/s', speed: '〜約125km/h',
    details: [...WIND_BIG, ['建造物', '固定の不十分な金属屋根の葺材がめくれる。養生の不十分な仮設足場が崩落する。']],
  },
  {
    min: 35, max: 40, label: '猛烈な風', range: '35以上40未満 m/s', speed: '〜約140km/h',
    details: [...WIND_BIG, ['建造物', '外装材が広範囲にわたって飛散し、下地材が露出するものがある。']],
  },
  {
    min: 40, max: Infinity, label: '猛烈な風', range: '40以上 m/s', speed: '約140km/h以上',
    details: [...WIND_BIG, ['建造物', '住家で倒壊するものがある。鉄骨構造物で変形するものがある。']],
  },
];

export const wind = {
  id: 'wind',
  genre: '天気・自然',
  title: '風速',
  kind: 'guide',
  hint: 'm/s ごとの体感と、できなくなること',
  unit: 'm/s',
  bands: WIND_BANDS,
  below: '気象庁の「風の強さと吹き方」の表は10m/s以上が対象です。10m/s未満の区分は表にありません。',
  extra: (v) => `${approx(v * 3.6, 'km/h', 2)}（1m/s ＝ 3.6km/h）`,
  disclaimer:
    '気象庁「風の強さと吹き方」の区分です（目安）。平均風速は10分間の平均で、瞬間風速は平均の1.5倍程度になることが多く、3倍以上になることもあります。地形や周りの建物で風は大きく変わります。強風の警報・注意報の基準は地域で異なるので、最新の気象情報を確認してください。',
};

// ---- 降水量 ----
// 気象庁「雨の強さと降り方」（平成29年9月一部改正）の区分。1時間雨量。
//   出典: https://www.jma.go.jp/jma/kishou/know/yougo_hp/amehyo.html（結合セルまで確認）
// 表は10mm/h以上の区分のみ。
const RAIN_SLEEP = ['屋内（木造住宅）', '寝ている人の半数くらいが雨に気がつく'];
export const RAIN_BANDS = [
  {
    min: 10, max: 20, label: 'やや強い雨', range: '10以上20未満 mm/h', image: 'ザーザーと降る',
    details: [
      ['人への影響', '地面からの跳ね返りで足元がぬれる'],
      ['屋内（木造住宅）', '雨の音で話し声が良く聞き取れない'],
      ['屋外の様子', '地面一面に水たまりができる'],
    ],
  },
  {
    min: 20, max: 30, label: '強い雨', range: '20以上30未満 mm/h', image: 'どしゃ降り',
    details: [
      ['人への影響', '傘をさしていてもぬれる'],
      RAIN_SLEEP,
      ['屋外の様子', '地面一面に水たまりができる'],
      ['車に乗っていて', 'ワイパーを速くしても見づらい'],
    ],
  },
  {
    min: 30, max: 50, label: '激しい雨', range: '30以上50未満 mm/h', image: 'バケツをひっくり返したように降る',
    details: [
      ['人への影響', '傘をさしていてもぬれる'],
      RAIN_SLEEP,
      ['屋外の様子', '道路が川のようになる'],
      ['車に乗っていて', '高速走行時、車輪と路面の間に水膜が生じブレーキが効かなくなる（ハイドロプレーニング現象）'],
    ],
  },
  {
    min: 50, max: 80, label: '非常に激しい雨', range: '50以上80未満 mm/h', image: '滝のように降る（ゴーゴーと降り続く）',
    details: [
      ['人への影響', '傘は全く役に立たなくなる'],
      RAIN_SLEEP,
      ['屋外の様子', '水しぶきであたり一面が白っぽくなり、視界が悪くなる'],
      ['車に乗っていて', '車の運転は危険'],
    ],
  },
  {
    min: 80, max: Infinity, label: '猛烈な雨', range: '80以上 mm/h', image: '息苦しくなるような圧迫感がある。恐怖を感ずる',
    details: [
      ['人への影響', '傘は全く役に立たなくなる'],
      RAIN_SLEEP,
      ['屋外の様子', '水しぶきであたり一面が白っぽくなり、視界が悪くなる'],
      ['車に乗っていて', '車の運転は危険'],
    ],
  },
];

export const rain = {
  id: 'rain',
  genre: '天気・自然',
  title: '降水量',
  kind: 'guide',
  hint: 'mm/h ごとの降り方と体感',
  unit: 'mm/h',
  bands: RAIN_BANDS,
  below: '気象庁の「雨の強さと降り方」の表は10mm/h以上が対象です。10mm/h未満の区分は表にありません。',
  disclaimer:
    '気象庁「雨の強さと降り方」の区分です（目安）。大雨による災害のおそれがあるときは警報・注意報が出ます。基準は地域で異なるので、最新の気象情報を確認してください。',
};

export const natureItems = [elevation, wind, rain];

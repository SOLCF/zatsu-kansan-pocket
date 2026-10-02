// 天気・自然の項目（標高差・風速・降水量・雨水量・体感・雲底高度）。根拠は各コメントを参照（2026-10 時点でWeb確認）。
import { isNum } from '../../calc.js';
import { approx, approxRange, fmtNum } from '../../format.js';

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

// ---- 雨水量 ----
// 降水量1mm ＝ 1㎡あたり1L（1㎡に1mmの深さで降る水は1L）。屋根は真上から見た広さ（水平に投影した面積）で考える。
// 実際に貯められるのは、流れ損失やフィルターで8割程度と見込むことが多い。
//   出典: https://ietateta-tips.com/rainwater-tank-calculator/ ほか。バケツ10L・浴槽約200L・ペットボトル2Lは目安。
export const RAIN_COLLECT_RANGE = [80, 100];

export const rainwater = {
  id: 'rainwater',
  genre: '天気・自然',
  title: '雨水量',
  kind: 'calc',
  hint: '降水量と面積 → 雨水の量（L）',
  fields: [
    { key: 'mm', label: '降水量（降った雨の深さ）', unit: 'mm' },
    { key: 'area', label: '面積（屋根・庭・駐車場など）', unit: '㎡', param: true },
    { key: 'liters', label: '雨水の量', unit: 'L' },
  ],
  assumptions: [{ key: 'collect', label: '集水率', unit: '%', value: 100 }],
  compute: (key, value, values, a) => {
    const out = { ...values, [key]: value };
    const k = isNum(out.area) && out.area > 0 ? out.area * (a.collect / 100) : 0; // 1mmの雨で貯まるL
    if (key === 'liters') out.mm = k > 0 ? value / k : null;
    else if (isNum(out.mm)) out.liters = k > 0 ? out.mm * k : null;
    else if (isNum(out.liters)) out.mm = k > 0 ? out.liters / k : null;
    return out;
  },
  describe: (v, a) => {
    if (!isNum(v.liters) || v.liters <= 0) return [];
    const L = v.liters;
    const lines = [`バケツ（10L）${approx(L / 10, '杯分', 2)} ／ 浴槽（約200L）${approx(L / 200, '杯分', 2)} ／ 2Lペットボトル ${approx(L / 2, '本分', 2)}`];
    if (L >= 1000) lines.push(`${approx(L / 1000, 'トン', 2)}（1㎥）`);
    if (a.collect === 100) {
      const [lo, hi] = RAIN_COLLECT_RANGE;
      lines.push(`実際に貯められるのは ${approxRange((L * lo) / 100, (L * hi) / 100, 'L', 2)}（集水率${lo}〜${hi}%）`);
    }
    return lines;
  },
  note: '1mmの雨は1㎡に1L。屋根は斜面の面積ではなく、真上から見た広さで計算します。風や蒸発、最初の汚れた雨などは含みません。',
};

// ---- 体感（不快指数）----
// 不快指数 DI = 0.81×気温 + 0.01×湿度×(0.99×気温 − 14.3) + 46.3。区分は一般に使われる目安。
//   出典: https://www.jsme.or.jp/jsme-medwiki/doku.php?id=03%3A1011145 ／ https://www.calc-site.com/healths/discomfort_index
// 風があると体感は下がる。風速1m/sごとに約1℃というのは登山などでよく使う目安（正確な式ではない）。
//   出典: https://www.sotolover.com/2024/01/81492/
export const DI_BANDS = [
  { min: -Infinity, max: 55, range: '〜55未満', label: '寒い' },
  { min: 55, max: 60, range: '55以上60未満', label: '肌寒い' },
  { min: 60, max: 65, range: '60以上65未満', label: '何も感じない' },
  { min: 65, max: 70, range: '65以上70未満', label: '快い' },
  { min: 70, max: 75, range: '70以上75未満', label: '暑くない' },
  { min: 75, max: 80, range: '75以上80未満', label: 'やや暑い' },
  { min: 80, max: 85, range: '80以上85未満', label: '暑くて汗が出る' },
  { min: 85, max: Infinity, range: '85以上', label: '暑くてたまらない' },
];

export const discomfortIndex = (t, h) => 0.81 * t + 0.01 * h * (0.99 * t - 14.3) + 46.3;
export const diBand = (di) => DI_BANDS.find((b) => di >= b.min && di < b.max) ?? null;

export const comfort = {
  id: 'comfort',
  genre: '天気・自然',
  title: '体感（不快指数）',
  kind: 'calc',
  hint: '気温と湿度 → 不快指数と体感、風の影響',
  fields: [
    { key: 't', label: '気温', unit: '℃', param: true, signed: true },
    { key: 'h', label: '湿度', unit: '%', param: true },
    { key: 'wind', label: '風速（任意）', unit: 'm/s', param: true, optional: true, blankValue: null },
    { key: 'di', label: '不快指数', unit: '', readonly: true },
    { key: 'feels', label: '風を考えた体感温度', unit: '℃', readonly: true },
  ],
  assumptions: [{ key: 'windCool', label: '風速1m/sあたりの低下', unit: '℃', value: 1 }],
  compute: (key, value, values, a) => {
    const out = { ...values, [key]: value };
    out.di = isNum(out.t) && isNum(out.h) && out.h >= 0 && out.h <= 100 ? discomfortIndex(out.t, out.h) : null;
    out.feels = isNum(out.t) && isNum(out.wind) ? out.t - out.wind * a.windCool : null;
    return out;
  },
  describe: (v) => {
    const lines = [];
    if (isNum(v.h) && (v.h < 0 || v.h > 100)) return ['湿度は0〜100%で入れてください'];
    if (isNum(v.di)) {
      lines.push(`不快指数 ${fmtNum(v.di, 3)}：${diBand(v.di)?.label ?? ''}（目安）`);
      lines.push('熱中症の危険度は「暑さ指数（WBGT）」で見ます。不快指数とは別なので、環境省などの最新の情報を確認してください。');
    }
    if (isNum(v.feels)) lines.push(`風があると 体感は ${approx(v.feels, '℃', 3)} くらい（風速1m/sで約1℃下がる目安）`);
    return lines;
  },
  reference: [
    {
      title: '不快指数の目安',
      columns: ['不快指数', '体感'],
      rows: DI_BANDS.map((b) => [b.range, b.label]),
      note: '一般に使われる目安です。体感は人や服装、日差し、風でも変わります。',
    },
  ],
  note: '不快指数 ＝ 0.81×気温 ＋ 0.01×湿度×(0.99×気温 − 14.3) ＋ 46.3。風は不快指数には入っていません。',
};

// ---- 雲底高度と湿度 ----
// 積雲（もくもくした雲）の底の高さ（地上からの高さ）は、気温と露点温度の差から 125×(気温−露点) m（Henningの式）。
//   空気が上昇すると気温は約0.98℃/100m、露点は約0.17℃/100mずつ下がり、その差が縮む割合は約0.8℃/100m。
//   出典: https://ja.wikipedia.org/wiki/持ち上げ凝結高度
// 気温と露点から相対湿度への換算はマグヌスの式の近似（A=17.625, B=243.04）。
// 気温がわからないときは20℃として計算する（気温を0〜30℃で変えても湿度は±数%ほどしか変わらない）。
export const CLOUD_M_PER_DEG = 125;
const MAGNUS_A = 17.625;
const MAGNUS_B = 243.04;
export const MAX_CLOUD_BASE_M = 6000;

export const rhFromDew = (t, td) => 100 * Math.exp((MAGNUS_A * td) / (MAGNUS_B + td) - (MAGNUS_A * t) / (MAGNUS_B + t));
export const dewFromRh = (t, rh) => {
  const g = Math.log(rh / 100) + (MAGNUS_A * t) / (MAGNUS_B + t);
  return (MAGNUS_B * g) / (MAGNUS_A - g);
};
export const rhFromCloudBase = (baseM, t) => rhFromDew(t, t - baseM / CLOUD_M_PER_DEG);
export const cloudBaseFromRh = (rh, t) => CLOUD_M_PER_DEG * (t - dewFromRh(t, rh));

export const cloudbase = {
  id: 'cloudbase',
  genre: '天気・自然',
  title: '雲底高度と湿度',
  kind: 'calc',
  hint: '雲の底の高さ・気温と露点 ⇄ 地上の湿度（ざっくり）',
  anchorMain: true,
  fields: [
    { key: 'base', label: '雲底高度（地上からの高さ）', unit: 'm' },
    { key: 'temp', label: '地上の気温（露点から求めるときは必須）', unit: '℃', param: true, optional: true, signed: true, blankValue: null },
    { key: 'dew', label: '露点温度', unit: '℃', signed: true },
    { key: 'rh', label: '地上の湿度', unit: '%' },
  ],
  assumptions: [{ key: 'tDefault', label: '気温（雲底高度・湿度だけのとき）', unit: '℃', value: 20 }],
  compute: (key, value, values, a) => {
    const out = { ...values, [key]: value };
    // 「どれを入れて求めたか」（src）を覚えておく。あとから気温を変えたときに、入れた値を保って他を出し直すため。
    if (['base', 'rh', 'dew'].includes(key)) out.src = key;
    const src = out.src ?? 'base';
    const hasT = isNum(out.temp);
    const t = hasT ? out.temp : a.tDefault;
    const baseOk = (b) => isNum(b) && b >= 0 && b <= MAX_CLOUD_BASE_M;
    const rhOk = (r) => isNum(r) && r > 0 && r <= 100;
    if (src === 'dew') {
      // 気温と露点から湿度（と雲底高度）。露点は気温との差で意味を持つので、気温が空欄のときは求めない
      const base = hasT && isNum(out.dew) ? CLOUD_M_PER_DEG * (out.temp - out.dew) : null;
      const ok = baseOk(base);
      out.base = ok ? base : null;
      out.rh = ok ? rhFromDew(out.temp, out.dew) : null;
    } else if (src === 'rh') {
      out.base = rhOk(out.rh) ? cloudBaseFromRh(out.rh, t) : null;
    } else {
      out.rh = baseOk(out.base) ? rhFromCloudBase(out.base, t) : null;
    }
    if (src !== 'dew') out.dew = hasT && baseOk(out.base) ? out.temp - out.base / CLOUD_M_PER_DEG : null; // 露点は気温があるときに求まる
    return out;
  },
  describe: (v, a) => {
    if (v.src === 'dew' && isNum(v.dew)) {
      if (!isNum(v.temp)) return ['露点温度から湿度を求めるには、地上の気温も入れてください'];
      if (v.dew > v.temp) return ['露点温度は気温以下で入れてください（露点が気温より高いことはありません）'];
    }
    if (isNum(v.base) && v.base > MAX_CLOUD_BASE_M) return [`雲底高度は ${MAX_CLOUD_BASE_M}m までで入れてください（積雲の底の高さの目安です）`];
    if (!isNum(v.base) || !isNum(v.rh)) {
      return v.src === 'dew' && isNum(v.dew) && isNum(v.temp) ? ['気温と露点の差が大きすぎます（雲底高度が6000mを超える）。入力を見直してください'] : [];
    }
    const lines = [`気温と露点の差（湿数）は 約${fmtNum(v.base / CLOUD_M_PER_DEG, 2)}℃（雲底高度 ÷ 125m）`];
    if (v.src === 'dew') lines.push(`気温 ${fmtNum(v.temp, 3)}℃・露点 ${fmtNum(v.dew, 3)}℃ → 湿度 約${fmtNum(v.rh, 3)}%`);
    else if (!isNum(v.temp)) lines.push(`気温は ${a.tDefault}℃として計算しています（気温が違っても湿度は±数%ほど）`);
    lines.push('積雲（もくもくした雲）の底の高さの目安です。層状の雲や、上空の高い雲には使えません');
    return lines;
  },
  reference: [
    {
      title: '雲底高度と湿度の目安（気温20℃）',
      columns: ['雲底高度', '地上の湿度'],
      rows: [250, 500, 1000, 1500, 2000, 3000].map((b) => [`${b}m`, `約${fmtNum(rhFromCloudBase(b, 20), 2)}%`]),
      note: '雲底が低いほど湿度が高く、100%に近づきます。',
    },
  ],
  note: '雲底高度(m) ≒ 125 × (気温 − 露点温度)。地上の湿度が低いほど、雲の底は高くなります。',
};

export const natureItems = [elevation, wind, rain, rainwater, comfort, cloudbase];

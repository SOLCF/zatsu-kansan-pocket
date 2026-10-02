// カメラの換算項目（露出・星の流れ）。根拠は各コメントを参照（2026-10 時点でWeb確認）。
import { isNum, fractionParts } from '../../calc.js';
import { approx, fmtNum } from '../../format.js';

// ---- シャッタースピードの表示 ----
// 入力欄は「分子 ／ 分母」の2欄（calc-view の type: 'fraction'）。値は秒（1 ／ 125 → 0.008、30 ／ 1 → 30）。
// 説明文に出す表記（1/250秒、30秒）。1/2、1/3のような分数にできる値は分数、それ以外は小数の秒。
export function shutterText(sec) {
  const p = fractionParts(sec);
  if (!p) return '';
  return p.den === '1' ? p.num : `${p.num}/${p.den}`;
}
export const shutterLabel = (sec) => `${shutterText(sec)}秒`;

// ---- 露出（明るさ）----
// EV100 = log2(F値² ÷ シャッター秒) − log2(ISO ÷ 100)。
// 「この設定で適正な明るさになる場面の明るさ」。数字が小さいほど暗い場所で撮れる（＝明るく写せる設定）。
// 絞り・シャッター・ISOはどれも1段ごとに光の量が2倍（絞りは1.4倍刻み）。
// 場面のEV（ISO100）の目安: 快晴15・晴れ14・薄日13・曇り12・雨曇り11・夕方10〜11・明るい部屋9・体育館7・
//   夜の室内やイルミネーション6・夜の繁華街4。雪や快晴の海岸は16〜17。
//   出典: https://soft-no-sosa.com/2020/01/23/camera_exposure2/ ／ https://wliteblog.com/exposure-value/ ほか
export const SCENES = [
  { value: 'snow', label: '雪山・快晴の海岸', ev: 16 },
  { value: 'sun', label: '快晴の屋外', ev: 15 },
  { value: 'fine', label: '晴れ', ev: 14 },
  { value: 'thin', label: '薄日', ev: 13 },
  { value: 'cloud', label: '曇り', ev: 12 },
  { value: 'rain', label: '雨・暗い曇り', ev: 11 },
  { value: 'dusk', label: '夕方', ev: 10 },
  { value: 'bright', label: '明るい室内', ev: 9 },
  { value: 'gym', label: '普通の室内・体育館', ev: 7 },
  { value: 'illum', label: '夜の室内・イルミネーション', ev: 6 },
  { value: 'city', label: '夜の繁華街', ev: 4 },
];

export const evOf = (t, n, iso) => Math.log2((n * n) / t) - Math.log2(iso / 100);
const valid = (t, n, iso) => isNum(t) && isNum(n) && isNum(iso) && t > 0 && n > 0 && iso > 0;

// 場面のEVに合わせるための、どれか1つだけを変えた設定
export function settingsFor(sceneEv, t, n, iso) {
  const light = 2 ** sceneEv;
  return {
    shutter: (n * n) / (light * (iso / 100)),
    iso: (100 * n * n) / (t * light),
    aperture: Math.sqrt(t * light * (iso / 100)),
  };
}

const round1 = (x) => Math.round(x * 10) / 10;

export const exposure = {
  id: 'exposure',
  genre: 'カメラ',
  title: '露出（明るさ）',
  kind: 'calc',
  hint: 'シャッター・絞り・ISO → 明るさスコアと、場面に合う設定',
  computeOnLoad: true, // 初期値（1/125・F4・ISO100）だけで結果が出せる
  selects: [
    {
      key: 'scene',
      label: '撮りたい場面',
      default: 'cloud',
      options: SCENES.map((s) => ({ value: s.value, label: `${s.label}（EV${s.ev}）`, set: { sceneEv: s.ev, sceneLabel: s.label } })),
    },
  ],
  fields: [
    { key: 'shutter', label: 'シャッタースピード（分子 ／ 分母）', unit: '秒', type: 'fraction', param: true, default: 0.008 },
    { key: 'aperture', label: '絞り（F値）', unit: 'F', param: true, default: 4 },
    { key: 'iso', label: 'ISO感度', unit: 'ISO', param: true, default: 100 },
    { key: 'ev', label: '明るさスコア（EV）', unit: 'EV', readonly: true },
    { key: 'diff', label: '選んだ場面での写り（＋明るすぎ／−暗い）', unit: '段', readonly: true },
  ],
  assumptions: [],
  compute: (key, value, values, a) => {
    const out = { ...values, [key]: value };
    const ok = valid(out.shutter, out.aperture, out.iso);
    out.ev = ok ? evOf(out.shutter, out.aperture, out.iso) : null;
    out.diff = ok && isNum(a.sceneEv) ? a.sceneEv - out.ev : null;
    return out;
  },
  describe: (v, a) => {
    if (!isNum(v.ev)) return [];
    const { shutter: t, aperture: n, iso } = v;
    const lines = [`この設定で適正になる場面の明るさは EV${v.ev.toFixed(1)}（ISO100換算）。数字が小さいほど暗い場所に強い設定です`];
    if (isNum(v.diff)) {
      const d = Math.abs(v.diff);
      if (d <= 0.5) lines.push(`${a.sceneLabel}なら ほぼ適正（${fmtNum(v.diff, 2)}段）`);
      else lines.push(`${a.sceneLabel}だと ${approx(d, '段', 2)} ${v.diff > 0 ? '明るすぎ（白飛びしやすい）' : '暗い（黒つぶれ・暗く写る）'}`);
      if (d > 0.05) {
        const s = settingsFor(a.sceneEv, t, n, iso);
        lines.push(`${a.sceneLabel}に合わせるなら、どれか1つだけ変えて：シャッター ${shutterLabel(s.shutter)} ／ ISO ${fmtNum(s.iso, 2)} ／ 絞り F${round1(s.aperture)}`);
      }
    }
    lines.push(`1段明るくするには：シャッターを2倍の長さ（${shutterLabel(t * 2)}） ／ 絞りを1段開く（F${round1(n / Math.SQRT2)}） ／ ISOを2倍（ISO ${fmtNum(iso * 2, 3)}）`);
    lines.push('代わりに起きること：シャッターを遅くすると手ブレ・被写体ブレ、絞りを開くとピントの合う範囲が浅くなる、ISOを上げるとノイズが増える');
    return lines;
  },
  reference: [
    {
      title: '場面の明るさの目安（EV、ISO100）',
      columns: ['場面', 'EV'],
      rows: SCENES.map((s) => [s.label, `EV${s.ev}`]),
      note: '光の当たり方で前後します。迷ったら、撮りたい場面の近いものを選んでください。',
    },
  ],
  note: 'EV＝log2(F値²÷秒)−log2(ISO÷100)。絞り・シャッター・ISOは、どれも1段で光の量が2倍（絞りはF値が約1.4倍）です。',
};

// ---- 星の流れ ----
// 地球は恒星日（約86164秒）で1回転するので、星は天の赤道付近で約15.04秒角/秒（1時間で15°）動く。
//   センサー上の流れ（mm）＝ 焦点距離(mm) × 角速度(rad/s) × 秒 × cos(赤緯)。北極星のそばは動きが小さい。
// 500ルール：焦点距離(35mm換算,mm)×秒 < 500。SNSなど小さく見る用途の目安で、高画素機で等倍に見るならもっと短く。
//   出典: https://starscapeguide.hiroakisekioka.com/guide/500-rule ／ https://drasworld.com/500rule/ ほか
export const SIDEREAL_DAY_S = 86164.1;
export const EARTH_RATE = (2 * Math.PI) / SIDEREAL_DAY_S; // rad/s
export const ARCSEC_PER_S = (360 * 3600) / SIDEREAL_DAY_S;

// 幅・高さはmm。縦横比はセンサーごとに違う
export const SENSORS = [
  { n: 1, id: 'ff', short: 'フルサイズ', w: 36, h: 24 },
  { n: 2, id: 'apsc', short: 'APS-C（ソニー・ニコン・富士）', w: 23.5, h: 15.6 },
  { n: 3, id: 'apscc', short: 'APS-C（キヤノン）', w: 22.3, h: 14.9 },
  { n: 4, id: 'mft', short: 'マイクロフォーサーズ', w: 17.3, h: 13 },
  { n: 5, id: 'one', short: '1型', w: 13.2, h: 8.8 },
  { n: 6, id: 'mf', short: '中判（富士GFX）', w: 43.8, h: 32.9 },
].map((s) => ({ ...s, label: `${s.short}（${s.w}×${s.h}mm）` }));
export const DEFAULT_SENSOR_N = 1;
export const DEFAULT_MEGAPIXELS = 24;

// 35mm判（対角43.27mm）に対する焦点距離の倍率
export const cropFactor = (s) => 43.27 / Math.hypot(s.w, s.h);

// 星の流れ。megapixels は画素数（百万画素）。結果は mm / 画素 / 画像幅に対する%
export function starTrail({ t, f, sensor, megapixels, cosDec = 1 }) {
  const mm = f * EARTH_RATE * t * cosDec;
  const pxWide = Math.sqrt(megapixels * 1e6 * (sensor.w / sensor.h)); // 横の画素数
  return { mm, px: (mm * pxWide) / sensor.w, pct: (mm / sensor.w) * 100, pxWide, rule500: 500 / (f * cropFactor(sensor)) };
}

export const trailVerdict = (px) =>
  px <= 1.5 ? '点に写る（ほぼ流れない）' : px <= 3 ? 'ほぼ点（等倍で拡大すると少し流れる）' : px <= 6 ? '拡大すると流れて見える（SNSなど小さい表示ならほぼ点）' : '線のように流れて見える';

const sensorOption = (s) => ({ value: s.id, label: s.label, set: { idx: s.n, sw: s.w, sh: s.h } });

export const startrail = {
  id: 'startrail',
  genre: 'カメラ',
  title: '星の流れ',
  kind: 'calc',
  hint: 'シャッター・焦点距離・センサー → 星がどれだけ流れるか',
  computeOnLoad: true, // 初期値（20秒・24mm）だけで結果が出せる
  selects: [
    {
      key: 'sensor',
      label: 'センサーサイズ',
      myKey: 'cameraSensor',
      by: 'idx',
      default: 'ff',
      options: SENSORS.map(sensorOption),
    },
  ],
  fields: [
    { key: 'shutter', label: 'シャッタースピード（分子 ／ 分母）', unit: '秒', type: 'fraction', param: true, default: 20 },
    { key: 'focal', label: '焦点距離（レンズの表記）', unit: 'mm', param: true, default: 24 },
    { key: 'trailMm', label: 'センサー上の流れ', unit: 'mm', readonly: true },
    { key: 'trailPx', label: '画素に直すと', unit: '画素', readonly: true },
    { key: 'trailPct', label: '画像の横幅に対して', unit: '%', readonly: true },
    { key: 'rule', label: '500ルールの目安', unit: '秒', readonly: true },
  ],
  assumptions: [
    { key: 'mp', label: '画素数', unit: '百万画素', value: DEFAULT_MEGAPIXELS, myKey: 'cameraMp' },
    { key: 'cosDec', label: '星の位置（天の赤道=1・北極星のそば=0）', unit: '', value: 1 },
  ],
  compute: (key, value, values, a) => {
    const out = { ...values, [key]: value };
    if (!(isNum(out.shutter) && isNum(out.focal) && out.shutter > 0 && out.focal > 0)) {
      return Object.assign(out, { trailMm: null, trailPx: null, trailPct: null, rule: null });
    }
    const r = starTrail({ t: out.shutter, f: out.focal, sensor: { w: a.sw, h: a.sh }, megapixels: a.mp, cosDec: a.cosDec });
    return Object.assign(out, { trailMm: r.mm, trailPx: r.px, trailPct: r.pct, rule: r.rule500 });
  },
  describe: (v, a) => {
    if (!isNum(v.trailPx)) return [];
    const sensor = { w: a.sw, h: a.sh };
    const crop = cropFactor(sensor);
    const lines = [`${trailVerdict(v.trailPx)}（目安）`];
    lines.push(`35mm換算 ${approx(v.focal * crop, 'mm', 3)} → 500ルールでは ${approx(v.rule, '秒', 2)}まで。${v.shutter <= v.rule ? '今の設定は範囲内です' : '今の設定はそれより長いです'}`);
    lines.push(`星は天の赤道付近で約${fmtNum(ARCSEC_PER_S, 4)}秒角/秒（1時間で15度）動きます。${shutterLabel(v.shutter)}では ${approx(ARCSEC_PER_S * v.shutter, '秒角', 3)}`);
    lines.push('高画素のカメラで等倍に見るなら、500ルールより短くするのが安心です（NPFルールなど）');
    return lines;
  },
  reference: [
    {
      title: 'センサーサイズ（換算倍率）',
      columns: ['センサー', '大きさ', '35mm換算の倍率'],
      rows: SENSORS.map((s) => [s.short, `${s.w}×${s.h}mm`, `${fmtNum(cropFactor(s), 3)}倍`]),
    },
  ],
  note: '星は地球の自転で動きます。広角・短いシャッターほど点に写ります。画素数はお使いのカメラの値を前提値（またはマイ基準値）で変えてください。',
};

export const cameraItems = [exposure, startrail];

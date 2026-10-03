// 移動・地図の換算項目（徒歩・緯度経度とkm）。根拠は各コメントを参照（2026-10 時点でWeb確認）。
import { baseCompute, isNum } from '../../calc.js';
import { approx, approxHourMin, fmtNum } from '../../format.js';

// 歩行速度の初期値 80m/分 は、不動産広告の「徒歩1分＝80m」（不動産の表示に関する公正競争規約施行規則）と同じ。
//   不動産広告では80m未満の端数は切り上げ、信号待ちや坂道は考慮しない。
//   出典: https://www.home4u.jp/sell/juku/course/basic/sell-523-35477 ／ https://www.athome.co.jp/contents/words/term_59/
// 歩幅の初期値 70cm はSPEC（仮置き）。人により違うので設定画面で変える前提。
export const REAL_ESTATE_M_PER_MIN = 80;

// 距離(m)から不動産広告流の徒歩分数（80m=1分・端数切り上げ）
export const realEstateMinutes = (m) => Math.ceil(m / REAL_ESTATE_M_PER_MIN);

export const walk = {
  id: 'walk',
  genre: '移動・地図',
  title: '徒歩',
  kind: 'calc',
  hint: '距離・徒歩の時間・歩数',
  fields: [
    { key: 'km', label: '距離', unit: 'km', toBase: (v) => v * 1000, fromBase: (b) => b / 1000 },
    { key: 'min', label: '徒歩の時間', unit: '分', toBase: (v, a) => v * a.speed, fromBase: (b, a) => b / a.speed },
    { key: 'steps', label: '歩数', unit: '歩', toBase: (v, a) => (v * a.stride) / 100, fromBase: (b, a) => (b * 100) / a.stride },
  ],
  assumptions: [
    { key: 'speed', label: '歩行速度', unit: 'm/分', value: 80, myKey: 'walkSpeed' },
    { key: 'stride', label: '歩幅', unit: 'cm', value: 70, myKey: 'stride' },
  ],
  describe: (v) => {
    if (!isNum(v.km) || v.km <= 0) return [];
    return [
      `${approxHourMin(v.min)}（${approx(v.steps, '歩', 2)}）`,
      `不動産広告の「徒歩○分」表記なら ${realEstateMinutes(v.km * 1000)}分（1分＝80m・端数切り上げ）`,
    ];
  },
  note: '信号待ち・坂道・混雑は含みません。歩幅と速度は設定画面のマイ基準値で変えられます。',
};
walk.compute = baseCompute(walk.fields);

// ---- 緯度経度とkm ----
// 緯度1度は地球上どこでもほぼ一定で約111km（赤道付近110.57km〜極付近111.70km、平均約111.2km）。
// 経度1度は赤道で約111.32kmで、緯度が高いほど縮む（× cos(緯度)）。日本付近では緯度1秒≒30m・経度1秒≒25m。
// 緯度1分＝1海里（1.852km）。地球の丸み・楕円体は無視した近似。
//   出典: https://eco.mtk.nao.ac.jp/koyomi/wiki/C3CFB5E52FB7D0C5D9A4C8B0DEC5D9.html ／ https://towatowa.net/ido-keido/
export const KM_PER_DEG_LAT = 111.2;
export const KM_PER_DEG_LON_EQUATOR = 111.32;
export const NAUTICAL_MILE_KM = 1.852;

// 縮尺 1:N の地図で、地図上の長さ(cm) ⇄ 実際の距離(km)。1km＝100000cm なので 実際(km)＝cm×N÷100000
export const mapCmToKm = (cm, n) => (cm * n) / 100000;
export const kmToMapCm = (km, n) => (km * 100000) / n;
// 代表的な縮尺（参考表用）
const SCALES = [
  { n: 2500, label: '1:2,500（都市計画図など）' },
  { n: 10000, label: '1:10,000' },
  { n: 25000, label: '1:25,000（地形図）' },
  { n: 50000, label: '1:50,000（地形図）' },
  { n: 200000, label: '1:200,000（地勢図）' },
];
// メートル数を m か km で「約」付きに書く（1000m以上は km）
const approxLength = (m) => (m >= 1000 ? approx(m / 1000, 'km', 3) : approx(m, 'm', 3));

// その緯度での経度1度の長さ(km)
export const kmPerDegLon = (latDeg, eq = KM_PER_DEG_LON_EQUATOR) => eq * Math.cos((latDeg * Math.PI) / 180);

export const latlon = {
  id: 'latlon',
  genre: '移動・地図',
  title: '緯度経度と縮尺',
  kind: 'calc',
  hint: '緯度・経度の差（度）⇄ 距離（km）、縮尺 ⇄ 地図上の長さ（cm）',
  computeOnLoad: true,
  fields: [
    { key: 'lat', label: '基準にする緯度（北緯＋・南緯−）', unit: '°', param: true, signed: true, default: 35 },
    // 縮尺。1:N の地図では地図上1cm＝実際のN cm。実際の距離(km)＝地図上の長さ(cm)×N÷100000。初期値は国土地理院の2万5千分の1地形図
    { key: 'scale', label: '縮尺（1：○）', unit: '分の1', param: true, integer: true, exact: true, default: 25000 },
    // 実際の距離は、南北の距離と東西の距離を2辺とする直線（斜辺）の長さ
    { key: 'realKm', label: '実際の距離（直線）', unit: 'km' },
    { key: 'mapCm', label: '地図上の長さ', unit: 'cm' },
    { key: 'ns', label: '南北の距離', unit: 'km' },
    { key: 'dLat', label: '緯度の差（南北）', unit: '度' },
    { key: 'ew', label: '東西の距離', unit: 'km' },
    { key: 'dLon', label: '経度の差（東西）', unit: '度' },
  ],
  assumptions: [
    { key: 'kmLat', label: '緯度1度', unit: 'km', value: KM_PER_DEG_LAT },
    { key: 'kmLonEq', label: '経度1度（赤道）', unit: 'km', value: KM_PER_DEG_LON_EQUATOR },
  ],
  compute: (key, value, values, a) => {
    const out = { ...values, [key]: value };
    const okLat = isNum(out.lat) && Math.abs(out.lat) <= 90;
    const kmLon = okLat ? kmPerDegLon(out.lat, a.kmLonEq) : 0;
    const usable = kmLon > 0.01; // 極の近くは経度1度がほぼ0kmで、距離から経度に戻せない
    const okN = isNum(out.scale) && out.scale > 0;
    const setNs = (km) => { out.ns = km; out.dLat = isNum(km) ? km / a.kmLat : null; };

    // 実際の距離（斜辺）から南北の距離を出す。東西の距離が入っていればそれを保ち（斜辺²−東西²の平方根）、なければ真南北とみなす。
    const distToNs = () => {
      const ew = isNum(out.ew) ? out.ew : 0;
      setNs(out.realKm >= ew ? Math.sqrt(out.realKm ** 2 - ew ** 2) : null); // 東西の距離のほうが長いと距離が合わない
    };
    // 南北・東西の距離（片方だけでも）から実際の距離（斜辺）を出す
    const nsEwToDist = () => {
      if (isNum(out.ns) || isNum(out.ew)) out.realKm = Math.hypot(isNum(out.ns) ? out.ns : 0, isNum(out.ew) ? out.ew : 0);
    };
    const distToMap = () => { out.mapCm = isNum(out.realKm) && okN ? kmToMapCm(out.realKm, out.scale) : null; };

    if (key === 'mapCm') {
      out.realKm = okN ? mapCmToKm(value, out.scale) : null;
      if (isNum(out.realKm)) distToNs();
    } else if (key === 'realKm') {
      distToMap();
      distToNs();
    } else if (key === 'scale') {
      // 縮尺を変えたら、実際の距離を保って地図上の長さを出し直す。実際の距離が空で地図上の長さだけあるときは、そこから出す。
      if (isNum(out.realKm)) distToMap();
      else if (isNum(out.mapCm) && okN) {
        out.realKm = mapCmToKm(out.mapCm, out.scale);
        distToNs();
      }
    } else {
      if (key === 'dLat') out.ns = value * a.kmLat;
      else if (key === 'ns') out.dLat = value / a.kmLat;
      else if (key === 'dLon') out.ew = okLat ? value * kmLon : null;
      else if (key === 'ew') out.dLon = usable ? value / kmLon : null;
      else if (isNum(out.dLon)) out.ew = okLat ? out.dLon * kmLon : null; // 緯度を変えたら、経度の差を保ったまま東西の距離を出し直す
      else if (isNum(out.ew)) out.dLon = usable ? out.ew / kmLon : null;
      nsEwToDist();
      distToMap();
    }
    return out;
  },
  describe: (v, a) => {
    const lines = [];
    if (!isNum(v.lat) || Math.abs(v.lat) > 90) {
      lines.push('緯度は −90〜90度で入れてください');
    } else {
      const kmLon = kmPerDegLon(v.lat, a.kmLonEq);
      lines.push(
        `緯度1度 ＝ 約${fmtNum(a.kmLat, 4)}km ／ 経度1度 ＝ 約${fmtNum(kmLon, 3)}km（緯度${fmtNum(v.lat, 3)}度）`,
        `1分 ＝ 緯度 約${fmtNum(a.kmLat / 60, 3)}km（1海里）・経度 約${fmtNum(kmLon / 60, 3)}km ／ 1秒 ＝ 緯度 約${fmtNum((a.kmLat * 1000) / 3600, 2)}m・経度 約${fmtNum((kmLon * 1000) / 3600, 2)}m`,
      );
      if (isNum(v.ns) && isNum(v.ew)) {
        const d = Math.hypot(v.ns, v.ew);
        lines.push(`南北${approx(v.ns, 'km', 3)}・東西${approx(v.ew, 'km', 3)}離れた2点は、直線で ${approx(d, 'km', 3)}（地球の丸みは無視した近似）`);
      }
    }
    if (isNum(v.scale) && v.scale > 0) {
      lines.push(`縮尺1:${fmtNum(v.scale, 3)} は、地図上1cm ＝ 実際の${approxLength(v.scale / 100)}（1km ＝ 地図上${approx(kmToMapCm(1, v.scale), 'cm', 3)}）`);
    }
    return lines;
  },
  reference: [
    {
      title: '地図の縮尺の目安',
      columns: ['縮尺', '地図上1cm', '1kmは地図上で'],
      rows: SCALES.map((s) => [s.label, approxLength(s.n / 100), `${fmtNum(kmToMapCm(1, s.n), 3)}cm`]),
      note: '国土地理院の地形図は2万5千分の1・5万分の1、地勢図は20万分の1が代表的です。都市計画図など2,500分の1の地図もあります。',
    },
  ],
  note: '緯度1度はどこでもほぼ約111km、経度1度は赤道から離れるほど短くなります。大きな距離や正確な測量には、専用の計算（測地線）が必要です。地図上の長さは、縮尺が1:○のとき 実際の距離 ÷ ○ です（地図の紙の伸び縮みや、地図が図法で歪む分は無視）。実際の距離は南北と東西の直線（斜辺）で、距離だけを入れたときは東西が空欄なら真南北として緯度の差を出します。東西を先に入れておくと、それを保って南北を出します。',
};


export const transportItems = [walk, latlon];

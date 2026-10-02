// 住まいの換算項目（エアコン・壁紙/塗料・部屋面積）。根拠は各コメントを参照（2026-10 時点でWeb確認）。
import { baseCompute, isNum } from '../../calc.js';
import { approx, approxRange, fmtNum } from '../../format.js';

// ---- エアコン ----
// 冷房の適用畳数（カタログ表記）。「6〜9畳」は範囲ではなく「木造なら6畳・鉄筋なら9畳まで」の意味。
//   木造＝平屋・南向き和室、鉄筋＝集合住宅の中間階・南向き洋室を想定した業界共通の目安（保証値ではない）。
//   出典: https://hayamihyou.net/aircon-capacity/ ／ https://enechange.jp/articles/aircon-choose-performance
//   （2.2〜3.6kWはダイキンのカタログ表記とも一致）
// 暖房の畳数は冷房より狭く表示される傾向があるが、出典間で値が食い違うため数値は載せず注意書きにとどめる。
export const AIRCON = [
  { kw: 2.2, wood: 6, rc: 9 },
  { kw: 2.5, wood: 7, rc: 10 },
  { kw: 2.8, wood: 8, rc: 12 },
  { kw: 3.6, wood: 10, rc: 15 },
  { kw: 4.0, wood: 11, rc: 17 },
  { kw: 5.6, wood: 15, rc: 23 },
  { kw: 6.3, wood: 17, rc: 26 },
  { kw: 7.1, wood: 20, rc: 30 },
];

// kW → 適用畳数。表の行の間は直線で補間し、表の範囲外は null。
export function tatamiForKw(kw, struct) {
  if (!isNum(kw) || kw < AIRCON[0].kw || kw > AIRCON[AIRCON.length - 1].kw) return null;
  for (let i = 0; i < AIRCON.length - 1; i++) {
    const lo = AIRCON[i];
    const hi = AIRCON[i + 1];
    if (kw >= lo.kw && kw <= hi.kw) return lo[struct] + ((hi[struct] - lo[struct]) * (kw - lo.kw)) / (hi.kw - lo.kw);
  }
  return null;
}

// 畳数 → その畳数をまかなえる最小のカタログ kW。表の範囲外は null。
export function kwForTatami(tatami, struct) {
  if (!isNum(tatami) || tatami <= 0) return null;
  const row = AIRCON.find((r) => r[struct] >= tatami);
  return row ? row.kw : null;
}

export const aircon = {
  id: 'aircon',
  genre: '住まい',
  title: 'エアコン',
  kind: 'calc',
  hint: 'kW ⇄ 適用畳数（木造・鉄筋）',
  selects: [
    {
      key: 'struct',
      label: '建物の構造',
      options: [
        { value: 'wood', label: '木造（平屋・南向き和室の基準）', set: { struct: 'wood' } },
        { value: 'rc', label: '鉄筋（集合住宅・南向き洋室の基準）', set: { struct: 'rc' } },
      ],
    },
  ],
  fields: [
    { key: 'kw', label: '冷房能力（カタログ表記）', unit: 'kW' },
    { key: 'tatami', label: '部屋の広さ（適用畳数）', unit: '畳' },
  ],
  assumptions: [],
  compute: (key, value, values, a) => {
    const out = { ...values, [key]: value };
    if (key === 'kw') out.tatami = tatamiForKw(value, a.struct);
    else out.kw = kwForTatami(value, a.struct);
    return out;
  },
  describe: (v) => {
    const lines = [];
    if (isNum(v.kw)) {
      const wood = tatamiForKw(v.kw, 'wood');
      const rc = tatamiForKw(v.kw, 'rc');
      lines.push(wood === null ? '表の範囲（2.2〜7.1kW）の外です' : `適用畳数の目安 ${approxRange(wood, rc, '畳', 2)}（木造〜鉄筋）`);
    }
    if (isNum(v.tatami)) {
      const w = kwForTatami(v.tatami, 'wood');
      const r = kwForTatami(v.tatami, 'rc');
      lines.push(w === null || r === null ? '表の範囲（〜木造20畳／鉄筋30畳）の外です' : `${fmtNum(v.tatami)}畳なら 木造は ${w}kW以上、鉄筋は ${r}kW以上が目安`);
    }
    if (lines.length) lines.push('あくまで目安です。日当たり・断熱・天井高・階数で変わります。暖房の畳数は冷房より狭く表示されるのが一般的です。');
    return lines;
  },
  note: '「6〜9畳」は、木造なら6畳・鉄筋なら9畳まで、という意味です。迷ったら小さい数字（木造）を基準に。',
};

// ---- 壁紙・塗料 ----
// 壁面積 = 2×(幅＋奥行)×天井高 − 開口部。天井は含まない。
// 壁紙: 幅92cm、国産は92cm×50m巻きが一般的。ロス率は無地5〜10%・柄物10〜15%、切り損じ分で1〜2割見込む。
//   代表値15%、説明では10〜20%の範囲を示す（SPEC）。
//   出典: https://kabegamiyahonpo.com/blogs/yomimono/kabegami-keisan ほか
// 塗料: 1回塗りの塗布面積（缶表示の面積を容量で割った値）。
//   標準（水性・室内壁用）: アサヒペン 水性インテリアカラー1.6L=11〜14㎡、ニッペ水性フレッシュワイド1.6L=13〜16.5㎡
//     → 約7〜10㎡/L、代表値8。 https://www.asahipen.jp/products/view/70216 ほか
//   吸い込みの強い下地: 同アサヒペン1.6Lで5〜9㎡ → 約3〜5.6㎡/L、代表値4。
//   ミルクペイント系: ターナー 1.2L=2度塗りで約6〜8.4㎡ → 1回あたり約10〜14㎡/L、下限の10を代表値に。
// 缶サイズ: 0.7L／1.6L／4L／7L が一般的。
const PAINTS = [
  { value: 'standard', label: '水性・室内壁用（標準）', coverage: 8, range: [7, 10] },
  { value: 'absorb', label: '吸い込みの強い下地（石膏ボード・無塗装）', coverage: 4, range: [3, 5.6] },
  { value: 'milk', label: 'ミルクペイント系', coverage: 10, range: [10, 14] },
];
const CANS = [0.7, 1.6, 4, 7];

export const LOSS_RANGE = [10, 20];

// 壁面積から各数量を求める（テスト対象）
export function wallQuantities(area, a) {
  if (!isNum(area)) return { wpM: null, rolls: null, paintL: null, cans: null };
  const wpM = (area / a.stripW) * (1 + a.loss / 100);
  const paintL = (area * a.coats) / a.coverage;
  return { wpM, rolls: Math.ceil(wpM / a.rollLen), paintL, cans: Math.ceil(paintL / a.canL) };
}

export const wall = {
  id: 'wall',
  genre: '住まい',
  title: '壁紙・塗料',
  kind: 'calc',
  hint: '部屋の寸法 → 壁面積・壁紙・塗料',
  selects: [
    {
      key: 'paint',
      label: '塗料の種類',
      options: PAINTS.map((p) => ({ value: p.value, label: p.label, set: { coverage: p.coverage } })),
    },
    {
      key: 'can',
      label: '缶のサイズ',
      default: '1.6',
      options: CANS.map((c) => ({ value: String(c), label: `${c}L缶`, set: { canL: c } })),
    },
  ],
  fields: [
    { key: 'w', label: '部屋の幅', unit: 'm', param: true },
    { key: 'd', label: '部屋の奥行', unit: 'm', param: true },
    { key: 'hgt', label: '天井高', unit: 'm', param: true },
    { key: 'open', label: '開口部（ドア・窓）の合計', unit: '㎡', param: true, optional: true },
    { key: 'wallArea', label: '壁面積（天井を除く）', unit: '㎡' },
    { key: 'wpM', label: '壁紙の長さ', unit: 'm', readonly: true },
    { key: 'rolls', label: '壁紙のロール数', unit: '本', readonly: true, exact: true },
    { key: 'paintL', label: '塗料の量', unit: 'L', readonly: true },
    { key: 'cans', label: '塗料の缶数', unit: '缶', readonly: true, exact: true },
  ],
  assumptions: [
    { key: 'stripW', label: '壁紙の幅', unit: 'm', value: 0.92 },
    { key: 'rollLen', label: '1ロール', unit: 'm', value: 50 },
    { key: 'loss', label: '壁紙のロス率', unit: '%', value: 15 },
    { key: 'coverage', label: '塗布量（1回塗り）', unit: '㎡/L', value: 8 },
    { key: 'coats', label: '塗り回数', unit: '回', value: 2 },
    { key: 'canL', label: '塗料1缶', unit: 'L', value: 1.6 },
  ],
  compute: (key, value, values, a) => {
    const out = { ...values, [key]: value };
    // 壁面積を直接入れたときは、前に入れた寸法と食い違わないよう寸法欄を空にする
    if (key === 'wallArea') Object.assign(out, { w: null, d: null, hgt: null, open: null });
    if (['w', 'd', 'hgt', 'open'].includes(key)) {
      out.wallArea =
        isNum(out.w) && isNum(out.d) && isNum(out.hgt) ? Math.max(0, 2 * (out.w + out.d) * out.hgt - (isNum(out.open) ? out.open : 0)) : null;
    }
    Object.assign(out, wallQuantities(out.wallArea, a));
    return out;
  },
  describe: (v, a) => {
    if (!isNum(v.wallArea) || v.wallArea <= 0) return [];
    const [lo, hi] = LOSS_RANGE.map((l) => (v.wallArea / a.stripW) * (1 + l / 100));
    return [
      `壁紙は ロス${LOSS_RANGE[0]}〜${LOSS_RANGE[1]}%で ${approxRange(lo, hi, 'm', 2)}（${approx(v.wpM, 'm', 2)}＋余裕を見て購入）`,
      `塗料は ${a.coats}回塗りで ${approx(v.paintL, 'L', 2)}。缶は ${v.cans}缶（${a.canL}L缶）`,
    ];
  },
  note: '開口部の例：ドア（幅0.8×高2.0m）≒1.6㎡、掃き出し窓（幅1.7×高2.0m）≒3.4㎡。壁紙は柄物だと柄合わせでさらに多く要ります。塗料は製品の缶表示を優先してください。',
};

// ---- 部屋面積 ----
// 1帖＝1.62㎡（不動産の表示に関する公正競争規約施行規則：一畳当たり1.62㎡以上）。1坪＝400/121㎡≒3.3058㎡（約2畳分）。
// 畳の実寸: 京間 191×95.5cm=1.824㎡ / 中京間 182×91=1.656㎡ / 江戸間 176×88=1.549㎡ / 団地間 170×85=1.445㎡
//   出典: https://suumo.jp/article/oyakudachi/oyaku/sumai_nyumon/other/kyouma/ ほか
export const TATAMI_SIZES = [
  { value: 1.824, label: '京間（191×95.5cm）' },
  { value: 1.656, label: '中京間（182×91cm）' },
  { value: 1.549, label: '江戸間（176×88cm）' },
  { value: 1.445, label: '団地間（170×85cm）' },
];

// 縦:横=3:4 の長方形にしたときの寸法（例：9.72㎡ → 2.7×3.6m）
export function sampleSize(area) {
  const unit = Math.sqrt(area / 12);
  return [unit * 3, unit * 4];
}

export const room = {
  id: 'room',
  genre: '住まい',
  title: '部屋面積',
  kind: 'calc',
  hint: '帖・㎡・坪・畳（実寸）',
  fields: [
    { key: 'jo', label: '帖（不動産表示）', unit: '帖', toBase: (v, a) => v * a.joArea, fromBase: (b, a) => b / a.joArea },
    { key: 'sqm', label: '面積', unit: '㎡', toBase: (v) => v, fromBase: (b) => b },
    { key: 'tsubo', label: '坪', unit: '坪', toBase: (v, a) => v * a.tsuboArea, fromBase: (b, a) => b / a.tsuboArea },
    { key: 'tatami', label: '畳（実寸・自宅の規格）', unit: '畳', toBase: (v, a) => v * a.tatamiArea, fromBase: (b, a) => b / a.tatamiArea },
  ],
  assumptions: [
    { key: 'joArea', label: '1帖（不動産表示）', unit: '㎡', value: 1.62 },
    { key: 'tsuboArea', label: '1坪', unit: '㎡', value: 3.3058 },
    { key: 'tatamiArea', label: '畳1枚（自宅の規格）', unit: '㎡', value: 1.824, myKey: 'tatamiArea' },
  ],
  describe: (v) => {
    if (!isNum(v.sqm) || v.sqm <= 0) return [];
    const [x, y] = sampleSize(v.sqm);
    return [`縦3：横4の部屋なら 約${Number(x.toPrecision(2))}m × ${Number(y.toPrecision(2))}m`];
  },
  note: '不動産表示の1帖は「1.62㎡以上」と決まっていて、実際の畳より小さめです。畳の規格は設定画面で選べます。',
};
room.compute = baseCompute(room.fields);

export const housingItems = [aircon, wall, room];

// 工作・趣味の換算項目（フィラメント・縮尺）。根拠は各コメントを参照（2026-10 時点でWeb確認）。
import { isNum } from '../../calc.js';
import { approx, fmtNum } from '../../format.js';

// ---- フィラメント ----
// 重量 = 断面積 × 長さ × 密度。1.75mm・PLA 1kg で約335m（SPECの「約330m」と同水準）。
// 密度 g/cm³: PLA 1.24、ABS 1.04（出典で一致）、PETG 1.23〜1.27（SPECの1.27を採用）、TPU 1.19〜1.23（SPECの1.21を採用）。
//   出典: https://skhonpo.com/pages/filament-features ほか。銘柄で差があるので設定画面・前提値で変えられる。
export const MATERIALS = [
  { value: 1.24, label: 'PLA' },
  { value: 1.27, label: 'PETG' },
  { value: 1.04, label: 'ABS' },
  { value: 1.21, label: 'TPU' },
];
export const FILAMENT_DIAMETERS = [
  { value: 1.75, label: '1.75mm' },
  { value: 2.85, label: '2.85mm（3mm）' },
];

// 1mあたりの重さ(g)。径 dia(mm)、密度 density(g/cm³)。
export const gramsPerMeter = (dia, density) => Math.PI * (dia / 20) ** 2 * 100 * density;

export const filament = {
  id: 'filament',
  genre: '工作・趣味',
  title: 'フィラメント',
  kind: 'calc',
  hint: '長さ ⇄ 重さ、残量で作れる個数',
  anchorMain: true, // 素材や径を変えたら、直前に入れた長さ／重さを基準に再計算する
  selects: [
    {
      key: 'material',
      label: '素材',
      myKey: 'filamentDensity',
      by: 'density',
      options: MATERIALS.map((m) => ({ value: m.label, label: `${m.label}（${m.value}g/cm³）`, set: { density: m.value } })),
    },
  ],
  fields: [
    { key: 'lengthM', label: 'フィラメントの長さ', unit: 'm' },
    { key: 'weightG', label: '重さ（スプールを除く）', unit: 'g' },
    { key: 'modelG', label: '作りたいモデル1個の重さ（任意）', unit: 'g', param: true, optional: true },
    { key: 'models', label: '残量で作れる個数', unit: '個', readonly: true, exact: true },
  ],
  assumptions: [
    { key: 'dia', label: 'フィラメント径', unit: 'mm', value: 1.75, myKey: 'filamentDia' },
    { key: 'density', label: '密度', unit: 'g/cm³', value: 1.24 },
  ],
  compute: (key, value, values, a) => {
    const out = { ...values, [key]: value };
    const perM = gramsPerMeter(a.dia, a.density);
    if (key === 'lengthM') out.weightG = value * perM;
    else if (key === 'weightG') out.lengthM = value / perM;
    out.models = isNum(out.weightG) && isNum(out.modelG) && out.modelG > 0 ? Math.floor(out.weightG / out.modelG) : null;
    return out;
  },
  describe: (v, a) => {
    const lines = [];
    if (isNum(v.models)) lines.push(`残量で ${v.models}個（1個 ${fmtNum(v.modelG)}g）。サポート材や失敗分は含みません`);
    if (isNum(v.lengthM)) lines.push(`1mあたり ${approx(gramsPerMeter(a.dia, a.density), 'g', 3)}`);
    return lines;
  },
  note: 'スプールごと量った場合は、空スプールの重さを引いて入れてください。',
};

// ---- 縮尺（鉄道模型）----
// 軌間（レール幅）の模型寸法 × 縮尺の分母 = 実物換算。慣習上表す実物の軌間とのずれを併記する。
//   N 1/150: 日本の在来線（狭軌1067mm）を表す慣習、1/160: 新幹線・海外型（標準軌1435mm）。軌間9mm。
//   16番 1/80: 軌間16.5mmのまま日本型を1/80にした。実物換算1320mmで、狭軌1067mmより広い。
//   HO 1/87: 軌間16.5mm、標準軌1435mm。HOj 1/87・12mm: 狭軌1067mmを表す。
//   出典: https://ja.wikipedia.org/wiki/HOゲージ ／ https://ja.wikipedia.org/wiki/16番ゲージ ほか
export const NARROW = { name: '狭軌', mm: 1067 };
export const STANDARD = { name: '標準軌', mm: 1435 };
export const SCALES = [
  { value: 'n150', label: 'N（1/150）', ratio: 150, gauge: 9, represents: NARROW },
  { value: 'n160', label: 'N（1/160・新幹線）', ratio: 160, gauge: 9, represents: STANDARD },
  { value: 'j16', label: '16番（1/80）', ratio: 80, gauge: 16.5, represents: NARROW },
  { value: 'ho', label: 'HO（1/87）', ratio: 87, gauge: 16.5, represents: STANDARD },
  { value: 'hoj', label: 'HOj（1/87・12mm）', ratio: 87, gauge: 12, represents: NARROW },
];

// レール幅の実物換算と、慣習上表す軌間とのずれ
export function gaugeInfo(scale, ratio = scale.ratio) {
  const converted = scale.gauge * ratio;
  const diffPct = ((converted - scale.represents.mm) / scale.represents.mm) * 100;
  return { converted, diffPct };
}

const diffText = (pct) => (Math.abs(pct) < 3 ? 'ほぼ一致' : `実物換算のほうが約${Math.abs(Math.round(pct))}%${pct > 0 ? '広い' : '狭い'}`);

export const scale = {
  id: 'scale',
  genre: '工作・趣味',
  title: '縮尺',
  kind: 'calc',
  hint: '鉄道模型の寸法 ⇄ 実物、レール幅の換算',
  selects: [
    {
      key: 'scale',
      label: '縮尺・ゲージ',
      options: [...SCALES.map((s) => ({ value: s.value, label: s.label, set: { ratio: s.ratio } })), { value: 'custom', label: 'その他（縮尺を直接入力）', set: {} }],
    },
  ],
  fields: [
    { key: 'modelMm', label: '模型の寸法', unit: 'mm' },
    { key: 'realM', label: '実物の寸法', unit: 'm' },
  ],
  assumptions: [{ key: 'ratio', label: '縮尺', unit: '分の1', value: 150 }],
  compute: (key, value, values, a) => {
    const out = { ...values, [key]: value };
    if (key === 'modelMm') out.realM = (value * a.ratio) / 1000;
    else out.modelMm = (value * 1000) / a.ratio;
    return out;
  },
  describe: (v, a, sel) => {
    const s = SCALES.find((x) => x.value === sel.scale);
    if (!s) return [];
    const { converted, diffPct } = gaugeInfo(s, a.ratio);
    return [
      `レール幅 ${s.gauge}mm → 実物換算 ${approx(converted, 'mm', 3)}`,
      `慣習上は${s.represents.name}（${s.represents.mm}mm）を表す：${diffText(diffPct)}`,
    ];
  },
  reference: [
    {
      title: '縮尺と軌間の一覧',
      columns: ['名称', 'レール幅', '実物換算', '慣習上表す軌間', 'ずれ'],
      rows: SCALES.map((s) => {
        const { converted, diffPct } = gaugeInfo(s);
        return [s.label, `${s.gauge}mm`, `約${fmtNum(converted, 3)}mm`, `${s.represents.name} ${s.represents.mm}mm`, diffText(diffPct)];
      }),
      note: '16番はレール幅16.5mmのまま縮尺を1/80にしたため、狭軌の実物より広い軌間になります。',
    },
  ],
  note: 'N・HO・16番の縮尺は、車種や年代で例外があります。',
};

export const hobbyItems = [filament, scale];

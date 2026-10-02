// お金の換算項目（収入・燃料費と割り勘）。根拠は各コメントを参照（2026-10 時点でWeb確認）。
import { baseCompute, isNum } from '../../calc.js';
import { approxYen, approxYenRange, approx } from '../../format.js';

// ---- 収入 ----
// 時給 × 1日の労働時間 × 月の勤務日数 = 月収、月収 × 12 = 年収（額面）。労働時間・勤務日数はマイ基準値（SPEC: 8時間・20日）。
// 年収を12で割った月収はボーナス込みの平均。
// 手取りは額面の約75〜85%。年収500万円ほどまでは約80%、800万円で約75%、1,500万円で約67%と、高いほど割合は下がる。
//   出典: https://www.smbc-card.com/nyukai/magazine/recommend/net_salary.jsp ／ https://www.cr.mufg.jp/mycard/beginner/22082/index.html ほか
//   （SPEC は75〜80%としていたが、出典に合わせ75〜85%の幅で示す）
export const TAKE_HOME_RANGE = [75, 85];

export const income = {
  id: 'income',
  genre: 'お金',
  title: '収入',
  kind: 'calc',
  hint: '時給・月収・年収（手取りの目安つき）',
  fields: [
    { key: 'hourly', label: '時給', unit: '円', toBase: (v, a) => v * a.hours * a.days, fromBase: (b, a) => b / (a.hours * a.days) },
    { key: 'monthly', label: '月収（額面）', unit: '円', toBase: (v) => v, fromBase: (b) => b },
    { key: 'yearly', label: '年収（額面）', unit: '円', toBase: (v, a) => v / a.months, fromBase: (b, a) => b * a.months },
  ],
  assumptions: [
    { key: 'hours', label: '1日の労働時間', unit: '時間', value: 8, myKey: 'workHours' },
    { key: 'days', label: '月の勤務日数', unit: '日', value: 20, myKey: 'workDays' },
    { key: 'months', label: '年の月数', unit: 'か月', value: 12 },
  ],
  describe: (v) => {
    if (!isNum(v.monthly) || v.monthly <= 0) return [];
    const [lo, hi] = TAKE_HOME_RANGE.map((p) => p / 100);
    return [
      `手取りの目安：月 ${approxYenRange(v.monthly * lo, v.monthly * hi)} ／ 年 ${approxYenRange(v.yearly * lo, v.yearly * hi)}`,
      `額面の${TAKE_HOME_RANGE[0]}〜${TAKE_HOME_RANGE[1]}%で計算。年収が高いほど割合は下がり、扶養や住んでいる地域でも変わります。`,
    ];
  },
  note: '年収は「月収 × 12」です。ボーナスがある場合は、年収を入れると平均の月収が出ます。',
};
income.compute = baseCompute(income.fields);

// ---- 燃料費・割り勘 ----
// 燃料 = 距離 ÷ 燃費、燃料費 = 燃料 × 単価、合計 = 燃料費 + 高速代 + 駐車場、1人あたり = 合計 ÷ 人数。
// 燃費・単価はマイ基準値。単価170円/Lは2026-09-28のレギュラー全国平均170.2円/L（資源エネルギー庁調査）と同水準。
//   https://nenryo-teigakuhikisage.go.jp/current_graph.pdf
export const fuel = {
  id: 'fuel',
  genre: 'お金',
  title: '燃料費・割り勘',
  kind: 'calc',
  hint: '距離・人数 → ガソリン代と1人あたり',
  fields: [
    { key: 'km', label: '走行距離（往復ならその合計）', unit: 'km' },
    { key: 'fuelL', label: 'ガソリン', unit: 'L' },
    { key: 'people', label: '人数（空欄は1人）', unit: '人', param: true, optional: true },
    { key: 'toll', label: '高速代', unit: '円', param: true, optional: true },
    { key: 'parking', label: '駐車場代', unit: '円', param: true, optional: true },
    { key: 'fuelCost', label: 'ガソリン代', unit: '円', readonly: true },
    { key: 'total', label: '合計', unit: '円', readonly: true },
    { key: 'perPerson', label: '1人あたり', unit: '円', readonly: true },
  ],
  assumptions: [
    { key: 'economy', label: '燃費', unit: 'km/L', value: 15, myKey: 'carKmpl' },
    { key: 'price', label: 'ガソリン単価', unit: '円/L', value: 170, myKey: 'gasPrice' },
  ],
  compute: (key, value, values, a) => {
    const out = { ...values, [key]: value };
    if (key === 'km') out.fuelL = value / a.economy;
    else if (key === 'fuelL') out.km = value * a.economy;
    if (isNum(out.fuelL)) {
      const n = isNum(out.people) && out.people > 0 ? out.people : 1;
      out.fuelCost = out.fuelL * a.price;
      out.total = out.fuelCost + (isNum(out.toll) ? out.toll : 0) + (isNum(out.parking) ? out.parking : 0);
      out.perPerson = out.total / n;
    } else {
      Object.assign(out, { fuelCost: null, total: null, perPerson: null });
    }
    return out;
  },
  describe: (v) => {
    if (!isNum(v.perPerson)) return [];
    const n = isNum(v.people) && v.people > 0 ? v.people : 1;
    return [`1人あたり ${approxYen(v.perPerson)}（合計 ${approxYen(v.total)} ÷ ${n}人）`, `ガソリンは ${approx(v.fuelL, 'L', 2)}`];
  },
  note: '燃費は実際に走ったときの値に近いほど当たります。設定画面のマイ基準値で変えられます。',
};

export const moneyItems = [income, fuel];

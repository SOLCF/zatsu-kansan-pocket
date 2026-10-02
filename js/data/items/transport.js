// 移動の換算項目（徒歩）。根拠は各コメントを参照（2026-10 時点でWeb確認）。
import { baseCompute, isNum } from '../../calc.js';
import { approx, approxHourMin } from '../../format.js';

// 歩行速度の初期値 80m/分 は、不動産広告の「徒歩1分＝80m」（不動産の表示に関する公正競争規約施行規則）と同じ。
//   不動産広告では80m未満の端数は切り上げ、信号待ちや坂道は考慮しない。
//   出典: https://www.home4u.jp/sell/juku/course/basic/sell-523-35477 ／ https://www.athome.co.jp/contents/words/term_59/
// 歩幅の初期値 70cm はSPEC（仮置き）。人により違うので設定画面で変える前提。
export const REAL_ESTATE_M_PER_MIN = 80;

// 距離(m)から不動産広告流の徒歩分数（80m=1分・端数切り上げ）
export const realEstateMinutes = (m) => Math.ceil(m / REAL_ESTATE_M_PER_MIN);

export const walk = {
  id: 'walk',
  genre: '移動',
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

export const transportItems = [walk];

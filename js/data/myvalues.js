// マイ基準値の定義（初期値は仮置き）。設定画面で変更でき、関係する全換算に反映される。
// 項目を追加するたびに、関係するものを追記する。options があるものは設定画面で選択式になる（値は数値）。
import { TATAMI_SIZES } from './items/housing.js';

export const MY_VALUE_DEFS = [
  { key: 'chawanG', label: '茶碗1杯の量（ご飯）', unit: 'g', value: 150, usedBy: '米' },
  { key: 'rangeW', label: '自宅レンジのW数', unit: 'W', value: 600, usedBy: '電子レンジ' },
  { key: 'phoneMah', label: 'スマホの電池容量', unit: 'mAh', value: 4000, usedBy: 'モバイルバッテリー' },
  { key: 'carKmpl', label: '車の燃費', unit: 'km/L', value: 15, usedBy: '燃料費・割り勘' },
  { key: 'gasPrice', label: 'ガソリン単価', unit: '円/L', value: 170, usedBy: '燃料費・割り勘' },
  { key: 'workHours', label: '1日の労働時間', unit: '時間', value: 8, usedBy: '収入' },
  { key: 'workDays', label: '月の勤務日数', unit: '日', value: 20, usedBy: '収入' },
  { key: 'tatamiArea', label: '畳の規格', unit: '㎡/枚', value: 1.824, usedBy: '部屋面積', options: TATAMI_SIZES },
];

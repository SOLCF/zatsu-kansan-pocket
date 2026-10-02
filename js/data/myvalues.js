// マイ基準値の定義（初期値は仮置き）。設定画面で変更でき、関係する全換算に反映される。
// 項目を追加するたびに、関係するものを追記する。options があるものは設定画面で選択式になる（値は数値）。
import { TATAMI_SIZES } from './items/housing.js';
import { MATERIALS, FILAMENT_DIAMETERS } from './items/hobby.js';
import { MODELS, DEFAULT_MODEL_N } from './items/claude.js';
import { SENSORS, DEFAULT_SENSOR_N, DEFAULT_MEGAPIXELS } from './items/camera.js';

export const MY_VALUE_DEFS = [
  { key: 'chawanG', label: '茶碗1杯の量（ご飯）', unit: 'g', value: 150, usedBy: '米' },
  { key: 'rangeW', label: '自宅レンジのW数', unit: 'W', value: 600, usedBy: '電子レンジ' },
  { key: 'phoneMah', label: 'スマホの電池容量', unit: 'mAh', value: 4000, usedBy: 'モバイルバッテリー' },
  { key: 'carKmpl', label: '車の燃費', unit: 'km/L', value: 15, usedBy: '燃料費・割り勘' },
  { key: 'gasPrice', label: 'ガソリン単価', unit: '円/L', value: 170, usedBy: '燃料費・割り勘' },
  { key: 'workHours', label: '1日の労働時間', unit: '時間', value: 8, usedBy: '収入' },
  { key: 'workDays', label: '月の勤務日数', unit: '日', value: 20, usedBy: '収入' },
  { key: 'stride', label: '歩幅', unit: 'cm', value: 70, usedBy: '徒歩' },
  { key: 'walkSpeed', label: '歩行速度', unit: 'm/分', value: 80, usedBy: '徒歩' },
  { key: 'filamentDia', label: 'フィラメントの径', unit: 'mm', value: 1.75, usedBy: 'フィラメント', options: FILAMENT_DIAMETERS },
  { key: 'filamentDensity', label: 'フィラメントの素材', unit: '', value: 1.24, usedBy: 'フィラメント', options: MATERIALS },
  { key: 'cameraSensor', label: 'カメラのセンサーサイズ', unit: '', value: DEFAULT_SENSOR_N, usedBy: '星の流れ', options: SENSORS.map((s) => ({ value: s.n, label: s.label })) },
  { key: 'cameraMp', label: 'カメラの画素数', unit: '百万画素', value: DEFAULT_MEGAPIXELS, usedBy: '星の流れ' },
  { key: 'claudeModel', label: 'よく使う Claude のモデル', unit: '', value: DEFAULT_MODEL_N, usedBy: 'Claude の4項目', options: MODELS.map((m) => ({ value: m.n, label: m.label })) },
  { key: 'usdJpy', label: '為替レート（1ドル）', unit: '円', value: 158, usedBy: 'Claude の料金（2026-10-01 は約158円）' },
  { key: 'tatamiArea', label: '畳の規格', unit: '㎡/枚', value: 1.824, usedBy: '部屋面積', options: TATAMI_SIZES },
];

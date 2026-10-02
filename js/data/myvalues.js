// マイ基準値の定義（初期値は仮置き）。設定画面で変更でき、関係する全換算に反映される。
// 今回の範囲では、キッチン3項目に関係する2つのみ。残りは項目の追加時に追記する。
export const MY_VALUE_DEFS = [
  { key: 'chawanG', label: '茶碗1杯の量（ご飯）', unit: 'g', value: 150, usedBy: '米' },
  { key: 'rangeW', label: '自宅レンジのW数', unit: 'W', value: 600, usedBy: '電子レンジ' },
];

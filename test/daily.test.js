import { test } from 'node:test';
import assert from 'node:assert/strict';
import { powerbank, battery, flightGuide } from '../js/data/items/daily.js';
import { defaultAssumptions } from '../js/calc.js';

const near = (actual, expected, eps = 1e-9) => assert.ok(Math.abs(actual - expected) < eps, `${actual} ≒ ${expected}`);
const a = defaultAssumptions(powerbank, { phoneMah: 4000 });

test('モバイルバッテリー: 10,000mAh → 37Wh、スマホ約1.6回（効率65%）', () => {
  const v = powerbank.compute('mah', 10000, {}, a);
  near(v.wh, 37);
  near(v.charges, 1.625);
});

test('モバイルバッテリー: Wh・回数から mAh に戻る（双方向）', () => {
  near(powerbank.compute('wh', 37, {}, a).mah, 10000, 1e-6);
  near(powerbank.compute('charges', 1.625, {}, a).mah, 10000, 1e-6);
});

test('モバイルバッテリー: スマホ電池のマイ基準値が反映される', () => {
  const big = defaultAssumptions(powerbank, { phoneMah: 5000 });
  near(powerbank.compute('mah', 10000, {}, big).charges, 1.3);
});

test('モバイルバッテリー: 100Wh・160Whの境界（27,027mAh / 43,243mAh付近）', () => {
  near(powerbank.compute('mah', 27027, {}, a).wh, 100, 0.01);
  assert.match(flightGuide(100)[0], /持ち込める容量（1人2個まで）/);
  assert.match(flightGuide(100.5)[0], /航空会社の条件を要確認/);
  assert.match(flightGuide(160)[0], /航空会社の条件を要確認/);
  assert.match(flightGuide(160.1)[0], /持ち込めない/);
});

test('モバイルバッテリー: 機内の注意と「目安」「公式規定の確認」が必ず付く', () => {
  const lines = flightGuide(37).join('\n');
  assert.match(lines, /預け入れ荷物には入れられません/);
  assert.match(lines, /充電・給電も禁止/);
  assert.match(lines, /目安/);
  assert.match(lines, /公式規定を確認/);
  assert.deepEqual(flightGuide(null), []);
});

test('モバイルバッテリー: 充電回数は範囲（60〜70%）で説明される', () => {
  const v = powerbank.compute('mah', 10000, {}, a);
  const [line] = powerbank.describe(v, a);
  assert.match(line, /約1\.5〜1\.7回/);
});

test('電池: 全ての表で行の列数が見出しと一致する', () => {
  for (const t of battery.tables) {
    for (const r of t.rows) assert.equal(r.length, t.columns.length, `${t.title}: ${r[0]}`);
  }
});

test('電池: 型番が重複しない（ボタン電池）', () => {
  const names = battery.tables.find((t) => t.title === 'ボタン電池').rows.map((r) => r[0]);
  assert.equal(new Set(names).size, names.length);
});

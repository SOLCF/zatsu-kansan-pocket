import { test } from 'node:test';
import assert from 'node:assert/strict';
import { walk, realEstateMinutes } from '../js/data/items/transport.js';
import { filament, scale, gramsPerMeter, gaugeInfo, SCALES, MATERIALS } from '../js/data/items/hobby.js';
import { defaultAssumptions } from '../js/calc.js';
import { approxHourMin } from '../js/format.js';
import { MY_VALUE_DEFS } from '../js/data/myvalues.js';

const near = (actual, expected, eps = 1e-9) => assert.ok(Math.abs(actual - expected) < eps, `${actual} ≒ ${expected}`);
const wa = defaultAssumptions(walk, { walkSpeed: 80, stride: 70 });

test('徒歩: 1km → 12.5分・約1,430歩', () => {
  const v = walk.compute('km', 1, {}, wa);
  near(v.min, 12.5);
  near(v.steps, 1000 / 0.7, 1e-6);
});

test('徒歩: 分・歩数からも距離に戻る（双方向）', () => {
  near(walk.compute('min', 25, {}, wa).km, 2);
  near(walk.compute('steps', 7000, {}, wa).km, 4.9, 1e-9);
});

test('徒歩: 歩幅・歩行速度のマイ基準値が反映される', () => {
  const slow = defaultAssumptions(walk, { walkSpeed: 60, stride: 60 });
  near(walk.compute('km', 1, {}, slow).min, 1000 / 60, 1e-9);
  near(walk.compute('km', 1, {}, slow).steps, 1000 / 0.6, 1e-6);
});

test('徒歩: 不動産広告の表記は80m=1分・端数切り上げ', () => {
  assert.equal(realEstateMinutes(80), 1);
  assert.equal(realEstateMinutes(100), 2);
  assert.equal(realEstateMinutes(1000), 13); // 12.5 → 13
  assert.match(walk.describe(walk.compute('km', 0.1, {}, wa), wa)[1], /2分/);
});

test('表示: 時間は「約1時間12分」の形', () => {
  assert.equal(approxHourMin(45), '約45分');
  assert.equal(approxHourMin(72), '約1時間12分');
  assert.equal(approxHourMin(120), '約2時間');
});

test('フィラメント: 1.75mm・PLA 1kg ≒ 335m（1mあたり約2.98g）', () => {
  near(gramsPerMeter(1.75, 1.24), 2.9826, 1e-3);
  const a = defaultAssumptions(filament, { filamentDia: 1.75 });
  near(filament.compute('weightG', 1000, {}, a).lengthM, 335.3, 0.1);
});

test('フィラメント: 長さ⇄重さが戻り、径・密度で変わる', () => {
  const a = { dia: 1.75, density: 1.24 };
  const w = filament.compute('lengthM', 100, {}, a).weightG;
  near(filament.compute('weightG', w, {}, a).lengthM, 100, 1e-9);
  const abs = { dia: 1.75, density: 1.04 };
  assert.ok(filament.compute('lengthM', 100, {}, abs).weightG < w);
  const thick = { dia: 2.85, density: 1.24 };
  near(filament.compute('lengthM', 1, {}, thick).weightG / filament.compute('lengthM', 1, {}, a).weightG, (2.85 / 1.75) ** 2, 1e-9);
});

test('フィラメント: 残量で作れる個数（モデル重量が空欄なら出さない）', () => {
  const a = { dia: 1.75, density: 1.24 };
  let v = filament.compute('weightG', 500, {}, a);
  assert.equal(v.models, null);
  v = filament.compute('modelG', 120, v, a);
  assert.equal(v.models, 4); // 500 ÷ 120 = 4.16
  v = filament.compute('modelG', 0, v, a);
  assert.equal(v.models, null);
});

test('フィラメント: 素材の選択肢はマイ基準値の密度と対応する', () => {
  const sel = filament.selects[0];
  assert.equal(sel.by, 'density');
  const def = MY_VALUE_DEFS.find((d) => d.key === sel.myKey);
  assert.equal(def.value, 1.24);
  for (const m of MATERIALS) assert.ok(sel.options.some((o) => o.set.density === m.value));
});

test('縮尺: 1/150で模型100mm → 実物15m、逆算も戻る', () => {
  const a = { ratio: 150 };
  near(scale.compute('modelMm', 100, {}, a).realM, 15);
  near(scale.compute('realM', 20, {}, a).modelMm, 20000 / 150);
});

test('縮尺: レール幅の実物換算と慣習上の軌間とのずれ', () => {
  const by = Object.fromEntries(SCALES.map((s) => [s.value, gaugeInfo(s)]));
  near(by.n150.converted, 1350); // 狭軌1067より約26%広い
  near(by.n150.diffPct, 26.5, 0.1);
  near(by.j16.converted, 1320); // 16番: 狭軌1067より約24%広い
  near(by.j16.diffPct, 23.7, 0.1);
  near(by.ho.converted, 1435.5); // 標準軌1435とほぼ一致
  assert.ok(Math.abs(by.ho.diffPct) < 0.1);
  near(by.hoj.converted, 1044); // 狭軌1067に近い
  near(by.n160.converted, 1440);
});

test('縮尺: 説明文に実物換算・慣習上の軌間・ずれが出る', () => {
  const j16 = scale.describe({}, { ratio: 80 }, { scale: 'j16' }).join('\n');
  assert.match(j16, /実物換算 約1,320mm/);
  assert.match(j16, /狭軌（1067mm）/);
  assert.match(j16, /約24%広い/);
  assert.match(scale.describe({}, { ratio: 87 }, { scale: 'ho' }).join('\n'), /ほぼ一致/);
  assert.deepEqual(scale.describe({}, { ratio: 100 }, { scale: 'custom' }), []);
});

test('縮尺: 参考表の行は見出しと同じ列数', () => {
  const t = scale.reference[0];
  assert.equal(t.rows.length, SCALES.length);
  for (const r of t.rows) assert.equal(r.length, t.columns.length);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { income, fuel } from '../js/data/items/money.js';
import { defaultAssumptions } from '../js/calc.js';
import { yen, approxYen, approxYenRange } from '../js/format.js';

const near = (actual, expected, eps = 1e-9) => assert.ok(Math.abs(actual - expected) < eps, `${actual} ≒ ${expected}`);
const ia = defaultAssumptions(income, { workHours: 8, workDays: 20 });
const fa = defaultAssumptions(fuel, { carKmpl: 15, gasPrice: 170 });

test('収入: 時給1,500円 → 月収24万円 → 年収288万円', () => {
  const v = income.compute('hourly', 1500, {}, ia);
  near(v.monthly, 240000);
  near(v.yearly, 2880000);
});

test('収入: 年収・月収から時給に戻る（双方向）', () => {
  near(income.compute('yearly', 4800000, {}, ia).hourly, 2500);
  near(income.compute('monthly', 320000, {}, ia).hourly, 2000);
});

test('収入: 労働時間・勤務日数のマイ基準値が反映される', () => {
  const part = defaultAssumptions(income, { workHours: 5, workDays: 12 });
  near(income.compute('hourly', 1000, {}, part).monthly, 60000);
});

test('収入: 手取りは額面の75〜85%の範囲で、条件を断らずに断定しない', () => {
  const v = income.compute('monthly', 300000, {}, ia);
  const [line, caveat] = income.describe(v, ia);
  assert.match(line, /月 約23〜26万円/); // 22.5万→23, 25.5万→26
  assert.match(line, /年 約270〜310万円/);
  assert.match(caveat, /75〜85%/);
  assert.deepEqual(income.describe({}, ia), []);
});

test('燃料費: 150km・15km/L・170円 → 10L・1,700円', () => {
  const v = fuel.compute('km', 150, {}, fa);
  near(v.fuelL, 10);
  near(v.fuelCost, 1700);
  near(v.total, 1700);
  near(v.perPerson, 1700); // 人数が空欄なら1人
});

test('燃料費: 高速代・駐車場を含めて人数で割る', () => {
  let v = fuel.compute('km', 150, {}, fa);
  v = fuel.compute('toll', 2000, v, fa);
  v = fuel.compute('parking', 500, v, fa);
  v = fuel.compute('people', 3, v, fa);
  near(v.total, 4200);
  near(v.perPerson, 1400);
  assert.match(fuel.describe(v, fa)[0], /1人あたり 約1,400円（合計 約4,200円 ÷ 3人）/);
});

test('燃料費: ガソリン量から距離に戻り、人数0は1人扱い', () => {
  const v = fuel.compute('fuelL', 20, { people: 0 }, fa);
  near(v.km, 300);
  near(v.perPerson, 3400);
});

test('燃料費: 距離が無い状態では金額を出さない', () => {
  const v = fuel.compute('toll', 1000, {}, fa);
  assert.equal(v.total, null);
  assert.equal(v.perPerson, null);
  assert.deepEqual(fuel.describe(v, fa), []);
});

test('燃料費: 燃費・単価のマイ基準値が反映される', () => {
  const a = defaultAssumptions(fuel, { carKmpl: 20, gasPrice: 180 });
  near(fuel.compute('km', 200, {}, a).fuelCost, 1800);
});

test('表示: 金額は万円・億円でまとめる', () => {
  assert.equal(yen(980), '980円');
  assert.equal(yen(240000), '24万円');
  assert.equal(yen(123456789), '1.23億円');
  assert.equal(approxYen(4200), '約4,200円');
  assert.equal(approxYenRange(5000, 7000), '約5,000〜7,000円');
});

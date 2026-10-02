import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aircon, wall, room, tatamiForKw, kwForTatami, wallQuantities, sampleSize, TATAMI_SIZES } from '../js/data/items/housing.js';
import { defaultAssumptions } from '../js/calc.js';
import { MY_VALUE_DEFS } from '../js/data/myvalues.js';

const near = (actual, expected, eps = 1e-9) => assert.ok(Math.abs(actual - expected) < eps, `${actual} ≒ ${expected}`);

test('エアコン: カタログ表の値（2.2kW=6〜9畳、2.8kW=8〜12畳）', () => {
  assert.equal(tatamiForKw(2.2, 'wood'), 6);
  assert.equal(tatamiForKw(2.2, 'rc'), 9);
  assert.equal(tatamiForKw(2.8, 'wood'), 8);
  assert.equal(tatamiForKw(2.8, 'rc'), 12);
  assert.equal(tatamiForKw(7.1, 'rc'), 30);
});

test('エアコン: 表の間は補間、範囲外は null', () => {
  near(tatamiForKw(3.2, 'wood'), 9); // 2.8(8)と3.6(10)の中点
  assert.equal(tatamiForKw(2.0, 'wood'), null);
  assert.equal(tatamiForKw(8.0, 'rc'), null);
});

test('エアコン: 畳数 → 必要な最小kW（構造別）', () => {
  assert.equal(kwForTatami(6, 'wood'), 2.2);
  assert.equal(kwForTatami(6.5, 'wood'), 2.5);
  assert.equal(kwForTatami(8, 'rc'), 2.2);
  assert.equal(kwForTatami(14, 'rc'), 3.6); // 鉄筋は15畳まで3.6kW
  assert.equal(kwForTatami(16, 'rc'), 4.0);
  assert.equal(kwForTatami(31, 'rc'), null);
});

test('エアコン: compute は構造の選択を反映し、説明は範囲と「目安」を含む', () => {
  const wood = aircon.compute('tatami', 10, {}, { struct: 'wood' });
  const rc = aircon.compute('tatami', 10, {}, { struct: 'rc' });
  assert.equal(wood.kw, 3.6);
  assert.equal(rc.kw, 2.5);
  const lines = aircon.describe(aircon.compute('kw', 2.5, {}, { struct: 'wood' }), {}).join('\n');
  assert.match(lines, /約7〜10畳（木造〜鉄筋）/);
  assert.match(lines, /目安/);
});

test('壁紙・塗料: 6畳（3.6×2.7m・天井2.4m・開口4.5㎡）→ 壁面積約26㎡、壁紙1本', () => {
  const a = defaultAssumptions(wall, {});
  let v = wall.compute('w', 3.6, {}, a);
  v = wall.compute('d', 2.7, v, a);
  v = wall.compute('hgt', 2.4, v, a);
  near(v.wallArea, 2 * (3.6 + 2.7) * 2.4); // 開口部未入力＝0
  v = wall.compute('open', 4.5, v, a);
  near(v.wallArea, 30.24 - 4.5);
  near(v.wpM, (25.74 / 0.92) * 1.15, 1e-9);
  assert.equal(v.rolls, 1);
});

test('壁紙・塗料: 塗料は塗り回数×面積÷塗布量、缶数は切り上げ', () => {
  const a = { stripW: 0.92, rollLen: 50, loss: 15, coverage: 8, coats: 2, canL: 1.6 };
  const q = wallQuantities(25.74, a);
  near(q.paintL, (25.74 * 2) / 8);
  assert.equal(q.cans, 5); // 6.435L ÷ 1.6L = 4.02 → 5缶
  assert.equal(wallQuantities(100, a).rolls, 3); // 125m ÷ 50m → 3本
});

test('壁紙・塗料: 壁面積を直接入力でき、寸法が欠けると結果は null', () => {
  const a = defaultAssumptions(wall, {});
  const direct = wall.compute('wallArea', 20, { w: 3, d: 3, hgt: 2.4, open: 1 }, a);
  assert.ok(direct.rolls >= 1);
  assert.deepEqual([direct.w, direct.d, direct.hgt, direct.open], [null, null, null, null]); // 食い違う寸法は消す
  const partial = wall.compute('w', 3, {}, a);
  assert.equal(partial.wallArea, null);
  assert.equal(partial.cans, null);
});

test('壁紙・塗料: 開口部が壁面積を超えても負にならない', () => {
  const a = defaultAssumptions(wall, {});
  let v = wall.compute('w', 1, {}, a);
  v = wall.compute('d', 1, v, a);
  v = wall.compute('hgt', 1, v, a);
  assert.equal(wall.compute('open', 50, v, a).wallArea, 0);
});

test('部屋面積: 6帖 = 9.72㎡ ≒ 2.7×3.6m、1坪 ≒ 3.31㎡', () => {
  const a = defaultAssumptions(room, { tatamiArea: 1.824 });
  const v = room.compute('jo', 6, {}, a);
  near(v.sqm, 9.72);
  near(v.tsubo, 9.72 / 3.3058, 1e-9);
  near(v.tatami, 9.72 / 1.824, 1e-9);
  const [x, y] = sampleSize(v.sqm);
  near(x, 2.7, 1e-9);
  near(y, 3.6, 1e-9);
  near(room.compute('tsubo', 1, {}, a).sqm, 3.3058);
});

test('部屋面積: 畳の規格のマイ基準値が反映される', () => {
  const edo = defaultAssumptions(room, { tatamiArea: 1.549 });
  near(room.compute('jo', 6, {}, edo).tatami, 9.72 / 1.549, 1e-9);
});

test('マイ基準値: 畳の規格は選択式で、初期値は京間', () => {
  const def = MY_VALUE_DEFS.find((d) => d.key === 'tatamiArea');
  assert.equal(def.value, 1.824);
  assert.ok(def.options.some((o) => o.value === def.value));
  assert.equal(TATAMI_SIZES.length, 4);
});

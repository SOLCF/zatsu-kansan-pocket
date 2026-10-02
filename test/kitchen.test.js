import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rice, noodle, microwave } from '../js/data/items/kitchen.js';
import { defaultAssumptions } from '../js/calc.js';
import { roundSig, approx, approxMinSec } from '../js/format.js';

const near = (actual, expected, eps = 1e-9) => assert.ok(Math.abs(actual - expected) < eps, `${actual} ≒ ${expected}`);
const my = { chawanG: 150, rangeW: 600 };

test('米: 1合 → 生米150g・水200mL・炊き上がり330g・茶碗2.2杯', () => {
  const a = defaultAssumptions(rice, my);
  const v = rice.compute('go', 1, {}, a);
  near(v.rawG, 150);
  near(v.waterMl, 200);
  near(v.cookedG, 330);
  near(v.bowls, 2.2);
});

test('米: どの欄から入力しても合数に戻る（双方向）', () => {
  const a = defaultAssumptions(rice, my);
  for (const [key, value] of [['rawG', 450], ['waterMl', 600], ['cookedG', 990], ['bowls', 6.6]]) {
    near(rice.compute(key, value, {}, a).go, 3, 1e-9);
  }
});

test('米: 茶碗1杯のマイ基準値が反映される', () => {
  const a = defaultAssumptions(rice, { chawanG: 200 });
  near(rice.compute('go', 1, {}, a).bowls, 1.65);
});

test('乾麺: パスタ100g → 茹で後230g、逆算で戻る', () => {
  const a = { ratio: 2.3 };
  near(noodle.compute('dryG', 100, {}, a).cookedG, 230);
  near(noodle.compute('cookedG', 230, {}, a).dryG, 100);
});

test('乾麺: 種類ごとの倍率で茹で後の幅が説明に出る', () => {
  const a = { ratio: 2.3 };
  const v = noodle.compute('dryG', 100, {}, a);
  const [line] = noodle.describe(v, a, { type: 'pasta' });
  assert.match(line, /2\.1〜2\.5倍/);
  assert.match(line, /約210〜250g/);
  assert.deepEqual(noodle.describe(v, { ratio: 3 }, { type: 'pasta' }), []);
});

test('レンジ: 600Wで3分 → 500Wで216秒（3分36秒）、総熱量108,000J', () => {
  const a = { homeW: 500 };
  const v = microwave.compute('labelSec', 180, { labelW: 600 }, a);
  near(v.homeSec, 216);
  near(v.joule, 108000);
  assert.equal(approxMinSec(v.homeSec), '約3分36秒');
});

test('レンジ: 自宅時間から表記時間へ逆算できる', () => {
  const v = microwave.compute('homeSec', 216, { labelW: 600 }, { homeW: 500 });
  near(v.labelSec, 180);
});

test('レンジ: 表記W未入力なら結果は null（NaNを出さない）', () => {
  const v = microwave.compute('labelSec', 60, {}, { homeW: 600 });
  assert.equal(v.homeSec, null);
  assert.equal(v.joule, null);
});

test('表示: 有効数字と「約」', () => {
  assert.equal(roundSig(333.333, 3), 333);
  assert.equal(roundSig(0.012345, 2), 0.012);
  assert.equal(approx(1234.5, 'g'), '約1,230g');
});

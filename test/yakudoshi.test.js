import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yakudoshi, describeYakudoshi, age } from '../js/data/items/date.js';
import { dayNumber } from '../js/dates.js';

test('男性の厄年：前厄41・本厄42（大厄）・後厄43', () => {
  assert.equal(yakudoshi(41, 'm').status, '前厄');
  const hon = yakudoshi(42, 'm');
  assert.deepEqual([hon.status, hon.taiyaku], ['本厄', true]);
  assert.equal(yakudoshi(43, 'm').status, '後厄');
  assert.equal(yakudoshi(44, 'm').status, null);
});

test('女性の厄年：19・33（大厄）・37・61', () => {
  for (const n of [19, 33, 37, 61]) assert.equal(yakudoshi(n, 'f').status, '本厄');
  assert.equal(yakudoshi(33, 'f').taiyaku, true);
  assert.equal(yakudoshi(37, 'f').taiyaku, false);
  assert.equal(yakudoshi(36, 'f').status, '前厄');
  assert.equal(yakudoshi(34, 'f').status, '後厄');
  assert.equal(yakudoshi(42, 'f').status, null);
});

test('次の厄年までの年数', () => {
  assert.deepEqual(yakudoshi(37, 'm').next, { hon: 42, years: 4 }); // 前厄は数え41
  assert.deepEqual(yakudoshi(24, 'm').next, { hon: 42, years: 17 }); // 24は前厄（25の前年）なので次は42
  assert.equal(yakudoshi(70, 'm').next, null);
  assert.equal(yakudoshi(30, 'x'), null);
});

test('年齢の説明に厄年が入る（性別の選択で変わる）', () => {
  const asOf = dayNumber(2026, 10, 3);
  const v = age.compute('birth', dayNumber(1985, 5, 1), { asOf }, {}); // 数え42
  assert.ok(age.describe(v, { sex: 'm' }).some((l) => l.includes('本厄') && l.includes('大厄')));
  assert.ok(age.describe(v, { sex: 'f' }).some((l) => l.includes('厄年にあたりません')));
  assert.ok(describeYakudoshi(42, 'm', 1985).join('').includes('1985年'.replace('1985', '2026')));
});

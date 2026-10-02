import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNumber, shouldWrite } from '../js/calc.js';
import { microwave } from '../js/data/items/kitchen.js';
import { aircon } from '../js/data/items/housing.js';

test('数値の読み取り: 全角数字・全角記号・カンマ・空白に対応', () => {
  assert.equal(parseNumber('123'), 123);
  assert.equal(parseNumber('１２３'), 123);
  assert.equal(parseNumber('１，２３４．５'), 1234.5);
  assert.equal(parseNumber(' 1,234 '), 1234);
  assert.equal(parseNumber('－３'), -3);
  assert.equal(parseNumber('−3.5'), -3.5);
  assert.equal(parseNumber('.5'), 0.5);
  assert.equal(parseNumber('1e3'), 1000);
});

test('数値の読み取り: 数値でない文字は NaN（空欄・16進・無限大を含む）', () => {
  for (const s of ['', '  ', 'abc', '1a', '0x10', 'Infinity', '-', '.', '1..2', '12 34 5x']) {
    assert.ok(Number.isNaN(parseNumber(s)), `「${s}」は NaN`);
  }
});

test('欄の書き戻し: 入力した値（1234）を丸め値（1230）で上書きしない', () => {
  assert.equal(shouldWrite(1234, 1234, 1230), false); // 厳密な値と同じ → そのまま
  assert.equal(shouldWrite(1230, 1234, 1230), false); // 丸めた値と同じ → そのまま
  assert.equal(shouldWrite(1000, 1234, 1230), true); // どちらとも違う → 書き換える
  assert.equal(shouldWrite(NaN, 1234, 1230), true); // 空欄 → 書き込む
  assert.equal(shouldWrite(NaN, null, null), false); // 空欄のまま、値も無い → 触らない
  assert.equal(shouldWrite(5, null, null), true); // 値が無くなった → 欄を空にする
});

test('レンジ: 先に自宅の時間を入れ、あとから表記のW数を入れても時間が消えない', () => {
  const a = { homeW: 600 };
  let v = microwave.compute('homeSec', 216, {}, a); // 3分36秒（表記Wはまだ空）
  assert.equal(v.labelSec, null);
  assert.equal(v.homeSec, 216);
  v = microwave.compute('labelW', 500, v, a);
  assert.equal(v.homeSec, 216); // 入力済みの時間は残る
  assert.ok(Math.abs(v.labelSec - 259.2) < 1e-9); // 216×600÷500
  assert.ok(Math.abs(v.joule - 500 * 259.2) < 1e-6);
});

test('レンジ: 表記の時間が入っているときにW数を変えると、自宅の時間を再計算する（従来どおり）', () => {
  const a = { homeW: 500 };
  let v = microwave.compute('labelW', 600, {}, a);
  v = microwave.compute('labelSec', 180, v, a);
  assert.equal(v.homeSec, 216);
  v = microwave.compute('labelW', 700, v, a);
  assert.ok(Math.abs(v.homeSec - 252) < 1e-9);
});

test('エアコン: 補間した畳数の説明に小数のノイズが出ない', () => {
  const v = aircon.compute('kw', 3.1, {}, { struct: 'wood' });
  const lines = aircon.describe(v, {}).join('\n');
  assert.doesNotMatch(lines, /\d\.\d{4,}/);
});

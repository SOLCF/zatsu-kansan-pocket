import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elevation, wind, rain, WIND_BANDS, RAIN_BANDS } from '../js/data/items/nature.js';
import { findBand, defaultAssumptions } from '../js/calc.js';
import { ITEMS } from '../js/data/index.js';

const near = (actual, expected, eps = 1e-9) => assert.ok(Math.abs(actual - expected) < eps, `${actual} ≒ ${expected}`);
const ea = defaultAssumptions(elevation, {});

test('標高差: 1,000m → 気温差6℃、低い地点20℃なら14℃', () => {
  let v = elevation.compute('elev', 1000, {}, ea);
  near(v.drop, 6);
  assert.equal(v.est, null); // 基準気温が空欄なら推定気温は出さない
  v = elevation.compute('base', 20, v, ea);
  near(v.est, 14);
});

test('標高差: 気温差から標高差に戻る（双方向）', () => {
  near(elevation.compute('drop', 3.6, {}, ea).elev, 600);
});

test('標高差: 基準気温がマイナスでも計算でき、空欄に戻すと推定気温が消える', () => {
  let v = elevation.compute('elev', 500, {}, ea);
  v = elevation.compute('base', -2, v, ea);
  near(v.est, -5);
  v = elevation.compute('base', null, v, ea); // 空欄（blankValue: null）
  assert.equal(v.est, null);
  assert.equal(elevation.fields.find((f) => f.key === 'base').signed, true);
});

test('標高差: 気温減率の前提値が反映され、説明に「目安」が入る', () => {
  near(elevation.compute('elev', 1000, {}, { lapse: 0.65 }).drop, 6.5);
  const v = elevation.compute('elev', 1000, {}, ea);
  assert.match(elevation.describe(v, ea).join('\n'), /目安/);
  assert.deepEqual(elevation.describe({}, ea), []);
});

test('風速: 区分の境目（気象庁の区分）', () => {
  assert.equal(findBand(WIND_BANDS, 9.9), null);
  assert.equal(findBand(WIND_BANDS, 10).label, 'やや強い風');
  assert.equal(findBand(WIND_BANDS, 14.9).label, 'やや強い風');
  assert.equal(findBand(WIND_BANDS, 15).label, '強い風');
  assert.equal(findBand(WIND_BANDS, 20).label, '非常に強い風');
  assert.equal(findBand(WIND_BANDS, 29.9).label, '非常に強い風');
  assert.equal(findBand(WIND_BANDS, 30).label, '猛烈な風');
  assert.equal(findBand(WIND_BANDS, 45).range, '40以上 m/s');
});

test('風速: 10〜15m/sで傘がさせない（SPECの例）', () => {
  const text = findBand(WIND_BANDS, 12).details.flat().join('');
  assert.match(text, /傘がさせない/);
});

test('降水量: 30〜50mm/hはバケツをひっくり返したような雨（SPECの例）', () => {
  const b = findBand(RAIN_BANDS, 40);
  assert.equal(b.label, '激しい雨');
  assert.match(b.image, /バケツをひっくり返した/);
  assert.equal(findBand(RAIN_BANDS, 9.9), null);
  assert.equal(findBand(RAIN_BANDS, 10).label, 'やや強い雨');
  assert.equal(findBand(RAIN_BANDS, 80).label, '猛烈な雨');
});

test('降水量: 気象庁の表の列の対応（屋内は寝ている人／屋外は水たまり）', () => {
  const get = (v, k) => findBand(RAIN_BANDS, v).details.find(([key]) => key === k)?.[1];
  assert.equal(get(15, '屋外の様子'), '地面一面に水たまりができる');
  assert.equal(get(25, '屋内（木造住宅）'), '寝ている人の半数くらいが雨に気がつく');
  assert.match(get(35, '車に乗っていて'), /ハイドロプレーニング/);
  assert.equal(get(60, '車に乗っていて'), '車の運転は危険');
});

test('帯の定義: 連続していて隙間・重なりがなく、最後は上限なし', () => {
  for (const bands of [WIND_BANDS, RAIN_BANDS]) {
    for (let i = 1; i < bands.length; i++) assert.equal(bands[i].min, bands[i - 1].max);
    assert.equal(bands.at(-1).max, Infinity);
    for (const b of bands) assert.ok(b.details.length >= 3 && b.range && b.label);
  }
});

test('目安表示型は免責（目安・地域差・最新情報）を必ず持つ', () => {
  for (const item of [wind, rain]) {
    assert.match(item.disclaimer, /目安/);
    assert.match(item.disclaimer, /地域/);
    assert.match(item.disclaimer, /最新の気象情報/);
    assert.ok(item.below);
  }
  assert.match(wind.extra(10), /36km\/h/);
});

test('全項目: idが重複せず、種別は3つの共通部品のどれか', () => {
  const ids = ITEMS.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const i of ITEMS) assert.ok(['calc', 'table', 'guide'].includes(i.kind), i.id);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measure, MEASURE_FOODS } from '../js/data/items/kitchen.js';
import { rainwater, comfort, discomfortIndex, diBand, DI_BANDS } from '../js/data/items/nature.js';
import { wareki, datecalc, age, describeWareki } from '../js/data/items/date.js';
import { dayNumber, dateText } from '../js/dates.js';
import { ITEMS } from '../js/data/index.js';

const near = (actual, expected, eps = 1e-9) => assert.ok(Math.abs(actual - expected) < eps, `${actual} ≒ ${expected}`);
const D = (y, m, d) => dayNumber(y, m, d);
const food = (id) => MEASURE_FOODS.find((f) => f.value === id);
const aFood = (id) => ({ gS: food(id).gS, gT: food(id).gT, gC: food(id).gC });

// ---- 計量 ----
test('計量: 砂糖 大さじ2 = 18g = 小さじ6、カップ0.138杯・体積27.7mL', () => {
  const v = measure.compute('tbsp', 2, {}, aFood('sugar'));
  near(v.g, 18);
  near(v.tsp, 6);
  near(v.cup, 18 / 130);
  near(v.ml, (18 * 200) / 130);
});

test('計量: 小麦粉 100g = 大さじ11.1 = カップ0.91、双方向で戻る', () => {
  const a = aFood('flour');
  const v = measure.compute('g', 100, {}, a);
  near(v.tbsp, 100 / 9);
  near(v.cup, 100 / 110);
  near(measure.compute('cup', 1, {}, a).g, 110);
  near(measure.compute('tsp', 3, {}, a).tbsp, 1);
  near(measure.compute('ml', 200, {}, a).g, 110); // 200mL = 1カップ
});

test('計量: 食材の値は大阪市の表どおり（代表）', () => {
  const t = Object.fromEntries(MEASURE_FOODS.map((f) => [f.value, [f.gS, f.gT, f.gC]]));
  assert.deepEqual(t.sugar, [3, 9, 130]);
  assert.deepEqual(t.salt, [6, 18, 240]);
  assert.deepEqual(t.shoyu, [6, 18, 236]);
  assert.deepEqual(t.water, [5, 15, 200]);
  assert.deepEqual(t.oil, [4, 12, 180]);
  assert.deepEqual(t.flour, [3, 9, 110]);
  assert.deepEqual(t.breadcrumb, [1, 3, 40]);
  assert.equal(MEASURE_FOODS.length, 15);
});

test('計量: 大さじは小さじの3倍の重さ（全食材）。食材のvalueは重複しない', () => {
  for (const f of MEASURE_FOODS) near(f.gT, f.gS * 3, 1e-9);
  assert.equal(new Set(MEASURE_FOODS.map((f) => f.value)).size, MEASURE_FOODS.length);
});

test('計量: お米は1合(180mL)＝約150gで、1合の説明が出る', () => {
  const a = aFood('rice');
  const v = measure.compute('g', 150, {}, a);
  near(v.ml, 180, 1e-6);
  assert.match(measure.describe(v, a, { food: 'rice' })[0], /約1合/);
  assert.deepEqual(measure.describe(v, a, { food: 'sugar' }), []);
});

// ---- 雨水量 ----
test('雨水量: 10mm × 50㎡ = 500L、双方向で戻る', () => {
  const a = { collect: 100 };
  let v = rainwater.compute('area', 50, {}, a);
  assert.equal(v.liters, undefined); // 降水量が空なら未計算
  v = rainwater.compute('mm', 10, v, a);
  near(v.liters, 500);
  near(rainwater.compute('liters', 500, { area: 50 }, a).mm, 10);
  near(rainwater.compute('area', 100, { mm: 10 }, a).liters, 1000);
});

test('雨水量: 面積が無ければ出さない。集水率80%なら8割', () => {
  assert.equal(rainwater.compute('mm', 10, {}, { collect: 100 }).liters, null);
  assert.equal(rainwater.compute('liters', 100, {}, { collect: 100 }).mm, null);
  near(rainwater.compute('mm', 10, { area: 50 }, { collect: 80 }).liters, 400);
});

test('雨水量: バケツ・浴槽・ペットボトルの目安と、実際の幅が出る', () => {
  const a = { collect: 100 };
  const v = rainwater.compute('mm', 10, { area: 50 }, a);
  const text = rainwater.describe(v, a).join('\n');
  assert.match(text, /バケツ（10L）約50杯分/);
  assert.match(text, /浴槽（約200L）約2\.5杯分/);
  assert.match(text, /2Lペットボトル 約250本分/);
  assert.match(text, /約400〜500L（集水率80〜100%）/);
  const big = rainwater.compute('mm', 30, { area: 50 }, a);
  assert.match(rainwater.describe(big, a).join('\n'), /約1\.5トン/);
  assert.deepEqual(rainwater.describe({ liters: 0 }, a), []);
});

// ---- 体感 ----
test('体感: 不快指数の式（30℃・70% = 81.4、25℃・50% = 71.8）', () => {
  near(discomfortIndex(30, 70), 81.38, 1e-9);
  near(discomfortIndex(25, 50), 71.775, 1e-9);
  assert.equal(diBand(discomfortIndex(30, 70)).label, '暑くて汗が出る');
  assert.equal(diBand(discomfortIndex(25, 50)).label, '暑くない');
  assert.equal(diBand(discomfortIndex(10, 40)).label, '寒い');
});

test('体感: 区分の境目と、両端（マイナス・上限なし）', () => {
  const l = (x) => diBand(x).label;
  assert.equal(l(54.99), '寒い');
  assert.equal(l(55), '肌寒い');
  assert.equal(l(65), '快い');
  assert.equal(l(75), 'やや暑い');
  assert.equal(l(85), '暑くてたまらない');
  assert.equal(l(120), '暑くてたまらない');
  assert.equal(l(-5), '寒い');
  assert.equal(DI_BANDS.length, 8);
  for (let i = 1; i < DI_BANDS.length; i++) assert.equal(DI_BANDS[i].min, DI_BANDS[i - 1].max);
});

test('体感: 風があると体感温度が下がる（風速1m/sで1℃）。風速が空欄なら出さない', () => {
  const a = { windCool: 1 };
  let v = comfort.compute('t', 10, {}, a);
  v = comfort.compute('h', 50, v, a);
  assert.equal(v.feels, null);
  v = comfort.compute('wind', 5, v, a);
  near(v.feels, 5);
  v = comfort.compute('wind', null, v, a); // 空欄（blankValue: null）
  assert.equal(v.feels, null);
  assert.equal(comfort.fields.find((f) => f.key === 'wind').blankValue, null);
});

test('体感: 湿度が範囲外なら出さず、熱中症は別の指標（WBGT）と案内する', () => {
  const a = { windCool: 1 };
  const bad = comfort.compute('h', 120, { t: 25 }, a);
  assert.equal(bad.di, null);
  assert.match(comfort.describe(bad, a)[0], /0〜100%/);
  const ok = comfort.compute('h', 60, { t: 30 }, a);
  const text = comfort.describe(ok, a).join('\n');
  assert.match(text, /不快指数 .*（目安）/);
  assert.match(text, /WBGT/);
  assert.equal(comfort.reference[0].rows.length, 8);
});

// ---- 西暦⇄和暦 ----
test('西暦⇄和暦: 西暦 → 和暦、和暦 → 西暦（選んだ元号で）', () => {
  const a = { eraName: '令和' };
  assert.equal(wareki.compute('seireki', 2026, {}, a).wareki, 8);
  assert.equal(wareki.compute('seireki', 1990, {}, a).wareki, null); // 令和の範囲外
  assert.equal(wareki.compute('seireki', 1990, {}, { eraName: '平成' }).wareki, 2);
  assert.equal(wareki.compute('wareki', 8, {}, a).seireki, 2026);
  assert.equal(wareki.compute('wareki', 65, {}, { eraName: '昭和' }).seireki, null);
  assert.equal(wareki.compute('seireki', 2026.5, {}, a).wareki, null);
});

test('西暦⇄和暦: 説明（改元の年・干支・今年の年齢・明治より前）', () => {
  assert.deepEqual(describeWareki(2026, 2026).slice(0, 2), ['2026年 ＝ 令和8年', '干支：丙午']);
  assert.match(describeWareki(2026, 2026)[2], /0歳になる年/);
  assert.equal(describeWareki(1989, 2026)[0], '1989年 ＝ 昭和64年・平成元年');
  assert.match(describeWareki(1990, 2026).join('\n'), /2026年に 36歳になる年（誕生日の前は35歳）/);
  assert.match(describeWareki(1700, 2026)[0], /明治より前/);
  assert.equal(describeWareki(2100, 2026).length, 2); // 未来の年には年齢を出さない
  assert.deepEqual(describeWareki(NaN, 2026), []);
  const lines = wareki.describe({ wareki: 65 }, { eraName: '昭和' }).join('');
  assert.match(lines, /昭和は64年まで（1926〜1989年）/);
});

// ---- 日数計算 ----
test('日数計算: 起点 + 100日 = 終点、終点から日数、起点を変えると終点が動く', () => {
  const start = D(2026, 10, 3);
  let v = datecalc.compute('days', 100, { start }, {});
  assert.equal(dateText(v.end), '2027年1月11日（月）');
  assert.equal(datecalc.compute('end', D(2027, 1, 11), { start }, {}).days, 100);
  v = datecalc.compute('start', D(2026, 11, 1), v, {});
  assert.equal(v.days, 100); // 日数は保つ
  assert.equal(v.end, D(2026, 11, 1) + 100);
  assert.equal(datecalc.compute('days', -10, { start }, {}).end, start - 10);
});

test('日数計算: 起点が空なら終点を出さず、範囲外は出さない', () => {
  assert.equal(datecalc.compute('days', 5, {}, {}).end, null);
  assert.equal(datecalc.compute('days', 3_000_000, { start: 0 }, {}).end, null);
  const f = Object.fromEntries(datecalc.fields.map((x) => [x.key, x]));
  assert.equal(f.days.signed, true); // マイナス（○日前）を許す
  assert.equal(typeof f.start.default, 'function'); // 初期値は開いた時点の今日
  assert.equal(f.start.type, 'date');
});

test('日数計算: 説明に曜日・週・両端を含めた日数・か月・和暦が出る', () => {
  const start = D(2026, 10, 3);
  const v = datecalc.compute('days', 100, { start }, {});
  const text = datecalc.describe(v, {}).join('\n');
  assert.match(text, /2026年10月3日（土）.*100日後 ＝ 2027年1月11日（月）/);
  assert.match(text, /14週間2日（両端の日を含めて数えると 101日間）/);
  assert.match(text, /およそ 3\.3か月/);
  assert.match(text, /令和9年/);
  assert.match(datecalc.describe(datecalc.compute('days', -7, { start }, {}), {}).join(''), /7日前/);
  assert.deepEqual(datecalc.describe({}, {}), []);
});

// ---- 年齢 ----
test('年齢: 生年月日と基準日から、満年齢・数え年・日数・次の誕生日', () => {
  const asOf = D(2026, 10, 3);
  const v = age.compute('birth', D(1990, 7, 1), { asOf }, {});
  assert.deepEqual([v.age, v.kazoe, v.toNext], [36, 37, 271]);
  assert.equal(v.lived, asOf - D(1990, 7, 1));
  const w = age.compute('asOf', D(2030, 7, 1), v, {});
  assert.deepEqual([w.age, w.toNext], [40, 0]);
  assert.match(age.describe(w, {}).join('\n'), /今日が誕生日です/);
});

test('年齢: 説明（生まれた曜日・和暦・干支・次の誕生日）、基準日が生年月日より前なら案内', () => {
  const asOf = D(2026, 10, 3);
  const v = age.compute('birth', D(1990, 7, 1), { asOf }, {});
  const text = age.describe(v, {}).join('\n');
  assert.match(text, /1990年7月1日（日）.*平成2年・干支 庚午/);
  assert.match(text, /次の誕生日は 2027年7月1日（木）（あと271日）/);
  const early = age.compute('asOf', D(1980, 1, 1), v, {});
  assert.equal(early.age, null);
  assert.match(age.describe(early, {}).join(''), /生年月日より前/);
  assert.equal(age.compute('birth', null, { asOf }, {}).age, null);
});

test('日付の欄: 年齢の基準日の初期値は今日、年や日数は丸めない整数欄', () => {
  const f = Object.fromEntries(age.fields.map((x) => [x.key, x]));
  assert.equal(typeof f.asOf.default, 'function');
  assert.equal(f.asOf.param, true);
  for (const k of ['age', 'kazoe', 'lived', 'toNext']) assert.equal(f[k].integer, true);
  for (const x of wareki.fields) assert.equal(x.integer, true); // 2026 を 2030 に丸めない
});

// ---- 並び順 ----
test('並び順: Claude が一番下、日付はその直前。ジャンルは1か所にまとまる', () => {
  const genres = [...new Set(ITEMS.map((i) => i.genre))];
  assert.equal(genres.at(-1), 'Claude');
  assert.equal(genres.at(-2), '日付');
  for (const g of genres) {
    const idx = ITEMS.map((i, n) => (i.genre === g ? n : -1)).filter((n) => n >= 0);
    assert.equal(idx.at(-1) - idx[0] + 1, idx.length, `${g} の項目が連続している`);
  }
  assert.ok(ITEMS.find((i) => i.id === 'measure'));
  assert.equal(ITEMS.find((i) => i.id === 'measure').genre, 'キッチン');
  assert.equal(ITEMS.find((i) => i.id === 'rainwater').genre, '天気・自然');
  assert.equal(ITEMS.find((i) => i.id === 'comfort').genre, '天気・自然');
});

test('日数計算: 小数の日数は日付にならないので終点を出さず、説明にも不正な文字が出ない', () => {
  const start = D(2026, 10, 3);
  const v = datecalc.compute('days', 123.4, { start }, {});
  assert.equal(v.end, null);
  const text = datecalc.describe(v, {}).join('');
  assert.doesNotMatch(text, /NaN|undefined|null/);
  // 整数に直せば計算できる
  assert.equal(datecalc.compute('days', 123, { start }, {}).end, start + 123);
});

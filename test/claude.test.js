import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokens, tokencost, callcost, image, MODELS, KINDS, pricePerMTok, callCost, imageTokens, IMAGE_TIERS } from '../js/data/items/claude.js';
import { defaultAssumptions } from '../js/calc.js';
import { MY_VALUE_DEFS } from '../js/data/myvalues.js';
import { approxUsd } from '../js/format.js';

const near = (actual, expected, eps = 1e-9) => assert.ok(Math.abs(actual - expected) < eps, `${actual} ≒ ${expected}`);
const model = (id) => MODELS.find((m) => m.id === id);
// 選択したモデルの前提値（画面では select の set で入る）
const aFor = (id, extra = {}) => {
  const m = model(id);
  return { pIn: m.pIn, pOut: m.pOut, pRead: m.pRead, ctx: m.ctx, hires: m.hires ? 1 : 0, usdJpy: 158, tokPerJa: 1.4, tokPerWord: 1.33, pageChars: 400, kind: 'in', batch: 1, ...extra };
};

test('料金表: 公式の料金表（2026-10-03）と一致する', () => {
  const t = Object.fromEntries(MODELS.map((m) => [m.id, [m.pIn, m.pOut, m.pRead]]));
  assert.deepEqual(t.fable51, [10, 50, 0.25]);
  assert.deepEqual(t.opus55, [4, 20, 0.2]);
  assert.deepEqual(t.opus5, [5, 25, 0.5]);
  assert.deepEqual(t.sonnet55, [2, 10, 0.2]);
  assert.deepEqual(t.sonnet46, [3, 15, 0.3]);
  assert.deepEqual(t.haiku45, [1, 5, 0.1]);
});

test('料金表: 識別番号は重複せず、コンテキストはHaikuだけ200K', () => {
  assert.equal(new Set(MODELS.map((m) => m.n)).size, MODELS.length);
  assert.equal(new Set(MODELS.map((m) => m.id)).size, MODELS.length);
  for (const m of MODELS) assert.equal(m.ctx, m.id === 'haiku45' ? 200_000 : 1_000_000);
  for (const m of MODELS) assert.ok(m.pRead < m.pIn && m.pIn < m.pOut, m.id); // キャッシュ読み取りは入力より安く、出力は入力より高い
});

test('マイ基準値: モデルの選択肢は料金表と対応し、初期値はSonnet 5.5', () => {
  const def = MY_VALUE_DEFS.find((d) => d.key === 'claudeModel');
  assert.equal(def.value, model('sonnet55').n);
  assert.equal(def.options.length, MODELS.length);
  assert.equal(MY_VALUE_DEFS.find((d) => d.key === 'usdJpy').value, 158);
  // 各項目のモデル選択は、マイ基準値の識別番号(idx)で初期選択される
  for (const item of [tokens, tokencost, callcost, image]) {
    const s = item.selects.find((x) => x.key === 'model');
    assert.equal(s.myKey, 'claudeModel');
    assert.equal(s.by, 'idx');
    assert.deepEqual(s.options.map((o) => o.set.idx), MODELS.map((m) => m.n));
  }
});

test('文章量: 日本語10万字 = 14万トークン = 原稿用紙250枚、双方向で戻る', () => {
  const a = defaultAssumptions(tokens, {});
  const v = tokens.compute('ja', 100000, {}, a);
  near(v.tokens, 140000);
  near(v.page, 250, 1e-9);
  near(tokens.compute('tokens', 140000, {}, a).ja, 100000, 1e-6);
  near(tokens.compute('page', 250, {}, a).tokens, 140000, 1e-6);
  near(tokens.compute('en', 750, {}, { ...a, tokPerWord: 1.33 }).tokens, 997.5);
});

test('文章量: 日本語は1〜2トークン/字の幅で示し、コンテキストに対する割合と目安の注記が出る', () => {
  const a = { ...defaultAssumptions(tokens, {}), ctx: 1_000_000 };
  const v = tokens.compute('tokens', 100000, {}, a);
  const lines = tokens.describe(v, a).join('\n');
  assert.match(lines, /約50,000〜100,000字/);
  assert.match(lines, /約10%/);
  assert.match(lines, /文庫本/);
  assert.deepEqual(tokens.describe({}, a), []);
});

test('料金: 種類ごとの単価（Sonnet 5.5）', () => {
  const a = aFor('sonnet55');
  const price = (kind) => pricePerMTok({ ...a, kind });
  near(price('in'), 2);
  near(price('out'), 10);
  near(price('read'), 0.2);
  near(price('write5'), 2.5); // 入力の1.25倍
  near(price('batchIn'), 1);
  near(price('batchOut'), 5);
  assert.deepEqual(KINDS.map((k) => k.set.kind), ['in', 'out', 'read', 'write5', 'batchIn', 'batchOut']);
});

test('料金: 100万トークン → $2 → 316円、双方向で戻る', () => {
  const a = aFor('sonnet55');
  const v = tokencost.compute('tokens', 1_000_000, {}, a);
  near(v.usd, 2);
  near(v.yen, 316);
  near(v.ja, 1_000_000 / 1.4, 1e-6);
  near(tokencost.compute('yen', 316, {}, a).tokens, 1_000_000, 1e-6);
  near(tokencost.compute('usd', 2, {}, a).tokens, 1_000_000, 1e-6);
  near(tokencost.compute('ja', 100000, {}, a).tokens, 140000, 1e-6);
});

test('料金: 出力・キャッシュ読み取りで単価が変わる', () => {
  const out = tokencost.compute('tokens', 1_000_000, {}, aFor('opus55', { kind: 'out' }));
  near(out.usd, 20);
  const read = tokencost.compute('tokens', 1_000_000, {}, aFor('fable51', { kind: 'read' }));
  near(read.usd, 0.25);
  assert.match(tokencost.describe({}, aFor('sonnet55')).join(''), /1万トークン ≒ 約3\.16円/);
});

test('呼び出し: Opus 5.5 で入力1万・出力2千 → $0.08 → 約12.6円', () => {
  const a = aFor('opus55');
  let v = callcost.compute('inTok', 10000, {}, a);
  v = callcost.compute('outTok', 2000, v, a);
  near(v.usd1, 0.08);
  near(v.yen1, 12.64);
  near(v.yenN, 12.64); // 回数が空欄なら1回
  v = callcost.compute('calls', 100, v, a);
  near(v.yenN, 1264);
});

test('呼び出し: キャッシュ（書き込み1.25倍・読み取り）と Batch の50%引き', () => {
  const a = aFor('opus55');
  assert.ok(Math.abs(callCost(a, { cwTok: 1_000_000 }) - 5) < 1e-9); // 5分キャッシュ書き込み $5/MTok
  assert.ok(Math.abs(callCost(a, { crTok: 1_000_000 }) - 0.2) < 1e-9); // 読み取り $0.20/MTok
  assert.ok(Math.abs(callCost({ ...a, batch: 0.5 }, { inTok: 1_000_000, outTok: 1_000_000 }) - 12) < 1e-9); // (4+20)×0.5
  const v = callcost.compute('inTok', 1000, {}, a);
  assert.match(callcost.describe(v, a).join('\n'), /Batch API（50%引き）なら/);
  assert.doesNotMatch(callcost.describe(v, { ...a, batch: 0.5 }).join('\n'), /Batch API（50%引き）なら/);
});

test('呼び出し: 何も入れなければ料金を出さない', () => {
  const v = callcost.compute('calls', 5, {}, aFor('opus55'));
  assert.equal(v.usd1, null);
  assert.equal(v.yenN, null);
  assert.deepEqual(callcost.describe(v, aFor('opus55')), []);
});

test('画像: 公式のサイズ別の表と一致する（高解像度ティア）', () => {
  const hi = IMAGE_TIERS.hires;
  assert.equal(imageTokens(200, 200, hi), 64);
  assert.equal(imageTokens(1000, 1000, hi), 1296);
  assert.equal(imageTokens(1092, 1092, hi), 1521);
  assert.equal(imageTokens(1920, 1080, hi), 2691);
  assert.equal(imageTokens(2000, 1500, hi), 3888);
  assert.equal(imageTokens(3840, 2160, hi), 4784);
});

test('画像: 公式のサイズ別の表と一致する（標準ティア。縮小時は上限に近い値）', () => {
  const std = IMAGE_TIERS.standard;
  assert.equal(imageTokens(200, 200, std), 64);
  assert.equal(imageTokens(1000, 1000, std), 1296);
  assert.equal(imageTokens(1092, 1092, std), 1521);
  for (const [w, h, doc] of [[1920, 1080, 1560], [2000, 1500, 1564], [3840, 2160, 1560]]) {
    const t = imageTokens(w, h, std);
    assert.ok(t <= std.cap && Math.abs(t - doc) / doc < 0.01, `${w}x${h}: ${t} ≒ ${doc}`);
  }
});

test('画像: モデルのティアで料金が変わり、枚数と8000pxの上限を扱う', () => {
  let v = image.compute('w', 1000, {}, aFor('opus5'));
  v = image.compute('h', 1000, v, aFor('opus5'));
  assert.equal(v.tokens, 1296);
  near(v.yen1, ((1296 * 5) / 1e6) * 158, 1e-9); // 公式の例: Opus 5 で1000枚あたり約$6.48
  near(((1296 * 5) / 1e6) * 1000, 6.48, 1e-9);
  v = image.compute('count', 1000, v, aFor('opus5'));
  near(v.yenN, v.yen1 * 1000, 1e-9);
  const big = image.compute('h', 9000, v, aFor('opus5'));
  assert.equal(big.tokens, null);
  assert.match(image.describe(big, aFor('opus5')).join(''), /8,000px/);
  const hi = image.compute('h', 2160, image.compute('w', 3840, {}, aFor('opus5')), aFor('opus5'));
  const lo = image.compute('h', 2160, image.compute('w', 3840, {}, aFor('haiku45')), aFor('haiku45'));
  assert.ok(hi.tokens > lo.tokens * 2.5); // 高解像度は標準の約3倍
});

test('表示: ドルは「約$0.08」', () => {
  assert.equal(approxUsd(0.08), '約$0.08');
  assert.equal(approxUsd(6.48), '約$6.48');
});

test('画像: 上限値は丸めずに表示し、トークン欄は整数表示の指定を持つ', () => {
  const a = aFor('opus5');
  const v = image.compute('h', 2160, image.compute('w', 3840, {}, a), a);
  const text = image.describe(v, a).join('\n');
  assert.match(text, /長辺2,576px・最大4,784トークン/);
  const f = image.fields.find((x) => x.key === 'tokens');
  assert.equal(f.integer, true); // 画面で 1296 を 1300 に丸めない
  assert.equal(f.exact, true);
});

test('呼び出し: 回数は丸めずに表示する（1,234回）', () => {
  const a = aFor('opus55');
  let v = callcost.compute('inTok', 1000, {}, a);
  v = callcost.compute('calls', 1234, v, a);
  assert.match(callcost.describe(v, a)[0], /× 1,234回/);
});

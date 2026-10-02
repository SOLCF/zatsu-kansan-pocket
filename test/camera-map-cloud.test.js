import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseShutter, shutterText, shutterLabel, evOf, settingsFor, SCENES, exposure,
  startrail, starTrail, cropFactor, trailVerdict, SENSORS, ARCSEC_PER_S, EARTH_RATE, SIDEREAL_DAY_S,
} from '../js/data/items/camera.js';
import { latlon, kmPerDegLon, walk } from '../js/data/items/transport.js';
import { cloudbase, rhFromDew, dewFromRh, rhFromCloudBase, cloudBaseFromRh, MAX_CLOUD_BASE_M } from '../js/data/items/nature.js';
import { ITEMS } from '../js/data/index.js';
import { MY_VALUE_DEFS } from '../js/data/myvalues.js';
import { getGroupOpen, setGroupOpen, setAllGroupsOpen } from '../js/storage.js';

const near = (actual, expected, eps = 1e-9) => assert.ok(Math.abs(actual - expected) < eps, `${actual} ≒ ${expected}`);

// ---- シャッタースピードの入力・表示 ----
test('シャッター入力: 分数・分の1・秒・全角・単位つきを読める', () => {
  const t = 1 / 250;
  for (const s of ['1/250', '1／250', '１/２５０', '250分の1', ' 1 / 250 ', '1/250秒']) near(parseShutter(s), t, 1e-12);
  near(parseShutter('0.5'), 0.5);
  near(parseShutter('30'), 30);
  near(parseShutter('30秒'), 30);
  near(parseShutter('30"'), 30);
  near(parseShutter('1/0.5'), 2);
});

test('シャッター入力: 読めない・0以下は NaN', () => {
  for (const s of ['', '  ', 'abc', '0', '-1', '1/0', '1/', '/250', '1//250', '1.2.3', 'Infinity']) assert.ok(Number.isNaN(parseShutter(s)), `「${s}」`);
});

test('シャッター表示: 1/N・秒の表記に直す', () => {
  assert.equal(shutterText(0.008), '1/125');
  assert.equal(shutterText(1 / 250), '1/250');
  assert.equal(shutterText(1 / 60), '1/60');
  assert.equal(shutterText(30), '30');
  assert.equal(shutterText(0.5), '0.5');
  assert.equal(shutterText(2), '2');
  assert.equal(shutterText(NaN), '');
  assert.equal(shutterLabel(0.004), '1/250秒');
  near(parseShutter(shutterText(0.004)), 0.004, 1e-12); // 表示 → 入力で元に戻る
});

// ---- 露出 ----
test('露出: EVの式（EV0 = 1秒・F1・ISO100、サニー16 ≒ EV15）', () => {
  near(evOf(1, 1, 100), 0);
  near(evOf(1 / 125, 4, 100), Math.log2(16 * 125), 1e-12); // 10.97
  near(evOf(1 / 125, 4, 400), Math.log2(16 * 125) - 2, 1e-12); // ISO4倍 = 2段
  assert.ok(Math.abs(evOf(1 / 100, 16, 100) - 15) < 0.5); // 晴天の屋外: F16・1/100・ISO100
});

test('露出: 1段ごとに2倍（シャッター2倍・ISO2倍・絞り√2倍）', () => {
  const base = evOf(1 / 125, 4, 100);
  near(evOf(1 / 125 * 2, 4, 100), base - 1, 1e-12); // 長くすると明るい側（EVは小さく）
  near(evOf(1 / 125, 4, 200), base - 1, 1e-12);
  near(evOf(1 / 125, 4 / Math.SQRT2, 100), base - 1, 1e-12);
});

test('露出: 場面に合わせる設定は、どれも元の場面のEVに一致する', () => {
  const s = settingsFor(12, 0.008, 4, 100);
  near(s.shutter, 1 / 256, 1e-12);
  near(evOf(s.shutter, 4, 100), 12, 1e-9);
  near(evOf(0.008, 4, s.iso), 12, 1e-9);
  near(evOf(0.008, s.aperture, 100), 12, 1e-9);
});

test('露出: 画面の計算（スコアと、選んだ場面との差）', () => {
  const a = { sceneEv: 12, sceneLabel: '曇り' };
  let v = exposure.compute('shutter', 0.008, {}, a);
  v = exposure.compute('aperture', 4, v, a);
  v = exposure.compute('iso', 100, v, a);
  near(v.ev, Math.log2(2000), 1e-9);
  near(v.diff, 12 - Math.log2(2000), 1e-9); // 約+1.03段（明るすぎ）
  const v2 = exposure.compute('iso', 400, v, a); // ISO を2段上げると2段明るく写る → 差は +3.03
  near(v2.diff, v.diff + 2, 1e-9);
  assert.equal(exposure.compute('aperture', 0, v, a).ev, null);
  assert.equal(exposure.compute('iso', -100, v, a).ev, null);
  assert.equal(exposure.compute('shutter', NaN, v, a).ev, null);
});

test('露出: 説明（判定・合わせる設定・1段明るくする・副作用）', () => {
  const a = { sceneEv: 12, sceneLabel: '曇り' };
  let v = exposure.compute('shutter', 0.008, {}, a);
  v = exposure.compute('aperture', 4, v, a);
  v = exposure.compute('iso', 100, v, a);
  const text = exposure.describe(v, a).join('\n');
  assert.match(text, /EV11.0（ISO100換算）/);
  assert.match(text, /曇りだと 約1段 明るすぎ/);
  assert.match(text, /シャッター 1\/256秒 ／ ISO 49 ／ 絞り F5\.7/); // ISO は有効数字2桁（48.8 → 49）
  assert.match(text, /1段明るくするには：シャッターを2倍の長さ（1\/63秒） ／ 絞りを1段開く（F2\.8） ／ ISOを2倍（ISO 200）/);
  assert.match(text, /手ブレ.*ノイズ/);
  const dark = exposure.describe({ ...v, diff: -2.4 }, a).join('');
  assert.match(dark, /約2\.4段 暗い/);
  const ok = exposure.describe({ ...v, diff: 0.3 }, { ...a, sceneEv: 11.3 }).join('');
  assert.match(ok, /ほぼ適正/);
  assert.deepEqual(exposure.describe({}, a), []);
});

test('露出: 場面の一覧（EV16〜4）と、選択肢が揃っている', () => {
  assert.equal(SCENES.length, 11);
  assert.deepEqual([SCENES[0].ev, SCENES.find((s) => s.value === 'cloud').ev, SCENES.at(-1).ev], [16, 12, 4]);
  for (let i = 1; i < SCENES.length; i++) assert.ok(SCENES[i].ev < SCENES[i - 1].ev); // 明るい順
  const sel = exposure.selects[0];
  assert.equal(sel.options.length, SCENES.length);
  assert.equal(sel.options.find((o) => o.value === sel.default).set.sceneEv, 12);
  assert.equal(exposure.fields.find((f) => f.key === 'shutter').default, 0.008);
  assert.equal(exposure.reference[0].rows.length, SCENES.length);
});

// ---- 星の流れ ----
test('星の流れ: 地球の自転は恒星日で約15.04秒角/秒', () => {
  near(SIDEREAL_DAY_S, 86164.1);
  near(ARCSEC_PER_S, 15.04, 0.01);
  near(EARTH_RATE, 7.292e-5, 1e-8);
});

test('星の流れ: フルサイズ・24mm・20秒・2400万画素 → 約0.035mm・約5.8画素', () => {
  const s = SENSORS.find((x) => x.id === 'ff');
  const r = starTrail({ t: 20, f: 24, sensor: s, megapixels: 24 });
  near(r.mm, 24 * EARTH_RATE * 20, 1e-12);
  near(r.mm, 0.035, 0.0001);
  near(r.pxWide, 6000, 1e-6);
  near(r.px, 5.83, 0.01);
  near(r.pct, 0.0972, 0.0005);
  near(r.rule500, 500 / 24, 0.01); // 500ルール: 約20.8秒（換算倍率が1.00008のため、ごく小さな差）
});

test('星の流れ: 焦点距離・時間に比例し、赤緯（北極星のそば）で小さくなる', () => {
  const s = SENSORS[0];
  const base = starTrail({ t: 10, f: 20, sensor: s, megapixels: 24 }).mm;
  near(starTrail({ t: 20, f: 20, sensor: s, megapixels: 24 }).mm, base * 2, 1e-12);
  near(starTrail({ t: 10, f: 40, sensor: s, megapixels: 24 }).mm, base * 2, 1e-12);
  near(starTrail({ t: 10, f: 20, sensor: s, megapixels: 24, cosDec: 0 }).mm, 0);
  near(starTrail({ t: 10, f: 20, sensor: s, megapixels: 24, cosDec: 0.5 }).mm, base / 2, 1e-12);
});

test('星の流れ: 高画素ほど画素数は増え、小さいセンサーは同じ焦点距離だと画面の割合が大きい', () => {
  const ff = SENSORS.find((x) => x.id === 'ff');
  const mft = SENSORS.find((x) => x.id === 'mft');
  assert.ok(starTrail({ t: 20, f: 24, sensor: ff, megapixels: 48 }).px > starTrail({ t: 20, f: 24, sensor: ff, megapixels: 24 }).px);
  assert.ok(starTrail({ t: 20, f: 24, sensor: mft, megapixels: 20 }).pct > starTrail({ t: 20, f: 24, sensor: ff, megapixels: 20 }).pct);
});

test('星の流れ: 換算倍率（フルサイズ1・APS-C約1.5・M4/3 2・1型約2.7）と500ルール', () => {
  const c = (id) => cropFactor(SENSORS.find((x) => x.id === id));
  near(c('ff'), 1, 0.001);
  near(c('apsc'), 1.53, 0.01);
  near(c('apscc'), 1.61, 0.01);
  near(c('mft'), 2, 0.01);
  near(c('one'), 2.73, 0.01);
  near(c('mf'), 0.79, 0.01);
  const apsc = SENSORS.find((x) => x.id === 'apsc');
  near(starTrail({ t: 1, f: 16, sensor: apsc, megapixels: 24 }).rule500, 500 / (16 * c('apsc')), 1e-9);
});

test('星の流れ: 判定の目安（点・ほぼ点・拡大すると・線）', () => {
  assert.match(trailVerdict(1), /点に写る/);
  assert.match(trailVerdict(2.5), /ほぼ点/);
  assert.match(trailVerdict(5.8), /拡大すると流れて見える/);
  assert.match(trailVerdict(20), /線のように/);
});

test('星の流れ: 画面の計算と説明（目安・500ルール・秒角）', () => {
  const a = { sw: 36, sh: 24, mp: 24, cosDec: 1 };
  let v = startrail.compute('shutter', 20, {}, a);
  assert.equal(v.trailPx, null); // 焦点距離が未入力
  v = startrail.compute('focal', 24, v, a);
  near(v.trailPx, 5.83, 0.01);
  near(v.rule, 20.83, 0.01);
  const text = startrail.describe(v, a).join('\n');
  assert.match(text, /拡大すると流れて見える（SNSなど小さい表示ならほぼ点）（目安）/);
  assert.match(text, /500ルールでは 約21秒まで。今の設定は範囲内です/);
  assert.match(text, /約15\.04秒角\/秒/);
  assert.match(text, /NPFルール/);
  const longer = startrail.compute('shutter', 30, v, a);
  assert.match(startrail.describe(longer, a).join(''), /それより長いです/);
  assert.equal(startrail.compute('focal', 0, v, a).trailMm, null);
});

test('星の流れ: センサーはマイ基準値（識別番号）で初期選択され、画素数も基準値になる', () => {
  const sel = startrail.selects[0];
  assert.equal(sel.myKey, 'cameraSensor');
  assert.equal(sel.by, 'idx');
  assert.deepEqual(sel.options.map((o) => o.set.idx), SENSORS.map((s) => s.n));
  const sensorDef = MY_VALUE_DEFS.find((d) => d.key === 'cameraSensor');
  assert.equal(sensorDef.value, 1);
  assert.equal(sensorDef.options.length, SENSORS.length);
  assert.equal(MY_VALUE_DEFS.find((d) => d.key === 'cameraMp').value, 24);
  assert.equal(startrail.assumptions.find((x) => x.key === 'mp').myKey, 'cameraMp');
  assert.equal(new Set(SENSORS.map((s) => s.n)).size, SENSORS.length);
});

// ---- 緯度経度とkm ----
test('緯度経度: 経度1度の長さは赤道で111.32km、緯度35度で約91.2km、極で0', () => {
  near(kmPerDegLon(0), 111.32, 1e-9);
  near(kmPerDegLon(35), 91.19, 0.01);
  near(kmPerDegLon(60), 55.66, 0.01);
  near(kmPerDegLon(-35), kmPerDegLon(35), 1e-12); // 南緯も同じ
  assert.ok(kmPerDegLon(90) < 1e-10);
});

test('緯度経度: 度 ⇄ km（緯度1度≒111.2km、経度は緯度で変わる）', () => {
  const a = { kmLat: 111.2, kmLonEq: 111.32 };
  const base = { lat: 35 };
  near(latlon.compute('dLat', 1, base, a).ns, 111.2);
  near(latlon.compute('ns', 111.2, base, a).dLat, 1);
  near(latlon.compute('dLon', 1, base, a).ew, 91.19, 0.01);
  near(latlon.compute('ew', 91.19, base, a).dLon, 1, 0.001);
  // 緯度を変えると、経度の差を保って東西の距離が出し直される
  const v = latlon.compute('lat', 60, { lat: 35, dLon: 1, ew: 91.19 }, a);
  near(v.ew, 55.66, 0.01);
  assert.equal(v.dLon, 1);
  // 距離だけ入っていれば、経度の差が出し直される
  near(latlon.compute('lat', 60, { lat: 35, ew: 55.66 }, a).dLon, 1, 0.001);
});

test('緯度経度: 極の近く・範囲外の緯度は距離から経度に戻さない', () => {
  const a = { kmLat: 111.2, kmLonEq: 111.32 };
  assert.equal(latlon.compute('ew', 10, { lat: 90 }, a).dLon, null);
  assert.equal(latlon.compute('dLon', 1, { lat: 100 }, a).ew, null);
  assert.equal(latlon.compute('dLat', 1, { lat: 100 }, a).ns, 111.2); // 南北は緯度に関係しない
});

test('緯度経度: 説明（1度・1分・1秒、2点の直線距離）', () => {
  const a = { kmLat: 111.2, kmLonEq: 111.32 };
  let v = latlon.compute('dLat', 1, { lat: 35 }, a);
  v = latlon.compute('dLon', 1, v, a);
  const text = latlon.describe(v, a).join('\n');
  assert.match(text, /緯度1度 ＝ 約111\.2km ／ 経度1度 ＝ 約91\.2km（緯度35度）/);
  assert.match(text, /1分 ＝ 緯度 約1\.85km（1海里）/);
  assert.match(text, /1秒 ＝ 緯度 約31m・経度 約25m/);
  assert.match(text, /直線で 約144km/); // √(111.2² + 91.19²) = 143.8
  assert.match(latlon.describe({ lat: 120 }, a)[0], /−90〜90度/);
  assert.equal(latlon.fields.find((f) => f.key === 'lat').default, 35);
});

test('ジャンル名: 「移動」は「移動・地図」に改称され、徒歩と緯度経度が入る', () => {
  const genres = new Set(ITEMS.map((i) => i.genre));
  assert.ok(genres.has('移動・地図'));
  assert.ok(!genres.has('移動'));
  assert.deepEqual(ITEMS.filter((i) => i.genre === '移動・地図').map((i) => i.id), ['walk', 'latlon']);
  assert.equal(walk.genre, '移動・地図');
});

// ---- 雲底高度と湿度 ----
test('雲底: 気温20℃・露点12℃ → 湿度約60%、雲底1000m（125m×8℃）', () => {
  near(rhFromDew(20, 12), 60, 0.1);
  near(rhFromCloudBase(1000, 20), 60, 0.1);
  near(rhFromCloudBase(0, 20), 100, 1e-9); // 雲底が地面なら湿度100%
  near(cloudBaseFromRh(60, 20), 1000, 5);
  near(dewFromRh(20, 60), 12, 0.05);
  near(dewFromRh(20, 100), 20, 1e-9);
});

test('雲底: 往復で戻り、湿度が低いほど雲底は高い。気温が違っても湿度は数%しか動かない', () => {
  for (const [b, t] of [[500, 10], [1500, 15], [3000, 25]]) near(cloudBaseFromRh(rhFromCloudBase(b, t), t), b, 1e-6);
  assert.ok(rhFromCloudBase(500, 20) > rhFromCloudBase(1000, 20));
  assert.ok(rhFromCloudBase(1000, 20) > rhFromCloudBase(2000, 20));
  const spread = [0, 10, 20, 30].map((t) => rhFromCloudBase(1000, t));
  assert.ok(Math.max(...spread) - Math.min(...spread) < 10, spread.join(','));
});

test('雲底: 画面の計算（雲底→湿度、湿度→雲底、気温を入れると露点）', () => {
  const a = { tDefault: 20 };
  let v = cloudbase.compute('base', 1000, {}, a);
  near(v.rh, 60, 0.1);
  assert.equal(v.dew, null); // 気温が空欄なら露点は出さない
  v = cloudbase.compute('temp', 25, v, a);
  near(v.dew, 17, 1e-9); // 25 − 1000/125
  assert.ok(v.rh > 60 && v.rh < 63);
  v = cloudbase.compute('temp', null, v, a); // 空欄に戻す
  near(v.rh, 60, 0.1);
  assert.equal(v.dew, null);
  near(cloudbase.compute('rh', 60, {}, a).base, 1000, 5);
});

test('雲底: 範囲外は出さない（湿度0以下・100超、雲底が負・6000m超）', () => {
  const a = { tDefault: 20 };
  for (const r of [0, -5, 101, 120]) assert.equal(cloudbase.compute('rh', r, {}, a).base, null, String(r));
  for (const b of [-1, MAX_CLOUD_BASE_M + 1]) assert.equal(cloudbase.compute('base', b, {}, a).rh, null, String(b));
  assert.match(cloudbase.describe({ base: 7000 }, a)[0], /6000m までで/);
  assert.deepEqual(cloudbase.describe({}, a), []);
});

test('雲底: 説明（湿数・気温の仮定・積雲だけの注意）と、参考表', () => {
  const a = { tDefault: 20 };
  const v = cloudbase.compute('base', 1000, {}, a);
  const text = cloudbase.describe(v, a).join('\n');
  assert.match(text, /湿数）は 約8℃（雲底高度 ÷ 125m）/);
  assert.match(text, /気温は 20℃として計算/);
  assert.match(text, /層状の雲/);
  const withT = cloudbase.compute('temp', 25, v, a);
  assert.doesNotMatch(cloudbase.describe(withT, a).join(''), /気温は 20℃として/);
  const ref = cloudbase.reference[0];
  assert.equal(ref.rows.length, 6);
  assert.deepEqual(ref.rows[2], ['1000m', '約60%']);
  assert.equal(cloudbase.anchorMain, true);
  assert.equal(cloudbase.fields.find((f) => f.key === 'temp').blankValue, null);
});

// ---- 並び順・ジャンル ----
test('並び順: カメラ（露出・星の流れ）が新ジャンルで、Claude が一番下、雲底高度は天気・自然', () => {
  const genres = [...new Set(ITEMS.map((i) => i.genre))];
  assert.deepEqual(genres, ['キッチン', '日用品', '住まい', 'お金', '移動・地図', '工作・趣味', 'カメラ', '天気・自然', '日付', 'Claude']);
  assert.deepEqual(ITEMS.filter((i) => i.genre === 'カメラ').map((i) => i.id), ['exposure', 'startrail']);
  assert.equal(ITEMS.find((i) => i.id === 'cloudbase').genre, '天気・自然');
  for (const g of genres) {
    const idx = ITEMS.map((i, n) => (i.genre === g ? n : -1)).filter((n) => n >= 0);
    assert.equal(idx.at(-1) - idx[0] + 1, idx.length, `${g} が連続している`);
  }
  assert.equal(new Set(ITEMS.map((i) => i.id)).size, ITEMS.length);
});

// ---- ホームの折り畳み（保存） ----
function fakeStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}
beforeEach(() => {
  globalThis.localStorage = fakeStorage();
});

test('折り畳み: 保存が無ければ既定（閉じる）。お気に入り欄は開いた状態から', () => {
  assert.equal(getGroupOpen('キッチン'), false);
  assert.equal(getGroupOpen('★ お気に入り', true), true);
});

test('折り畳み: 開閉を保存でき、ジャンルごとに独立している', () => {
  setGroupOpen('キッチン', true);
  setGroupOpen('日用品', false);
  assert.equal(getGroupOpen('キッチン'), true);
  assert.equal(getGroupOpen('日用品', true), false); // 明示的に閉じた状態が優先される
  assert.equal(getGroupOpen('住まい'), false);
  setGroupOpen('キッチン', false);
  assert.equal(getGroupOpen('キッチン', true), false);
});

test('折り畳み: すべて開く／閉じる（お気に入り欄などジャンル以外の保存は消さない）', () => {
  setGroupOpen('★ お気に入り', false);
  setAllGroupsOpen(['キッチン', '日用品', 'Claude'], true);
  assert.deepEqual(['キッチン', '日用品', 'Claude'].map((g) => getGroupOpen(g)), [true, true, true]);
  assert.equal(getGroupOpen('★ お気に入り', true), false);
  setAllGroupsOpen(['キッチン', '日用品', 'Claude'], false);
  assert.deepEqual(['キッチン', '日用品', 'Claude'].map((g) => getGroupOpen(g, true)), [false, false, false]);
});

test('折り畳み: 壊れた保存データや保存できない環境でも落ちない', () => {
  for (const bad of ['{broken', '[1,2]', '"x"', 'null', '123']) {
    globalThis.localStorage = fakeStorage({ 'zkp.groups': bad });
    assert.equal(getGroupOpen('キッチン'), false, bad);
    assert.doesNotThrow(() => setGroupOpen('キッチン', true), bad);
  }
  delete globalThis.localStorage;
  assert.equal(getGroupOpen('キッチン'), false);
  assert.doesNotThrow(() => setGroupOpen('キッチン', true));
});

test('開いた時点で結果を出す項目（露出・星の流れ）は、全ての入力欄に初期値がある', () => {
  for (const item of [exposure, startrail]) {
    assert.equal(item.computeOnLoad, true, item.id);
    const inputs = item.fields.filter((f) => f.param);
    assert.ok(inputs.length >= 2);
    for (const f of inputs) assert.notEqual(f.default, undefined, `${item.id}.${f.key} に初期値`);
  }
  // 初期値だけで計算が成り立つ（画面は初期値を values に入れて compute を呼ぶ）
  const ex = exposure.compute('iso', 100, { shutter: 0.008, aperture: 4, iso: 100 }, { sceneEv: 12, sceneLabel: '曇り' });
  assert.ok(Number.isFinite(ex.ev) && Number.isFinite(ex.diff));
  const st = startrail.compute('focal', 24, { shutter: 20, focal: 24 }, { sw: 36, sh: 24, mp: 24, cosDec: 1 });
  assert.ok(Number.isFinite(st.trailPx));
});

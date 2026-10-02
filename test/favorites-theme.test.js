import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getFavorites, isFavorite, toggleFavorite, getTheme, setTheme, getMyValues, setMyValue } from '../js/storage.js';
import { THEMES, normalizeTheme, applyTheme } from '../js/theme.js';
import { microwave } from '../js/data/items/kitchen.js';
import { ITEMS } from '../js/data/index.js';

// ブラウザの localStorage の代わり
function fakeStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}
beforeEach(() => {
  globalThis.localStorage = fakeStorage();
});

test('お気に入り: 付け外しができ、結果（今お気に入りか）を返す', () => {
  assert.deepEqual(getFavorites(), []);
  assert.equal(toggleFavorite('rice'), true);
  assert.equal(toggleFavorite('wind'), true);
  assert.deepEqual(getFavorites(), ['rice', 'wind']);
  assert.equal(isFavorite('rice'), true);
  assert.equal(toggleFavorite('rice'), false);
  assert.deepEqual(getFavorites(), ['wind']);
  assert.equal(isFavorite('rice'), false);
});

test('お気に入り: 壊れた保存データでも落ちず、文字列以外は無視する', () => {
  globalThis.localStorage = fakeStorage({ 'zkp.favorites': '{broken' });
  assert.deepEqual(getFavorites(), []);
  globalThis.localStorage = fakeStorage({ 'zkp.favorites': '{"a":1}' });
  assert.deepEqual(getFavorites(), []);
  globalThis.localStorage = fakeStorage({ 'zkp.favorites': '["rice", 3, null, "wind"]' });
  assert.deepEqual(getFavorites(), ['rice', 'wind']);
});

test('お気に入り: 保存できない環境（localStorageなし）でも落ちない', () => {
  delete globalThis.localStorage;
  assert.deepEqual(getFavorites(), []);
  assert.doesNotThrow(() => toggleFavorite('rice'));
  assert.equal(getTheme(), 'auto');
});

test('お気に入り: 実在しないidが残っていても、ホームは項目の並び順で実在するものだけ出せる', () => {
  toggleFavorite('no-such-item');
  toggleFavorite('wind');
  toggleFavorite('rice');
  const favIds = new Set(getFavorites());
  const shown = ITEMS.filter((i) => favIds.has(i.id)).map((i) => i.id);
  assert.deepEqual(shown, ['rice', 'wind']); // 項目の並び順（キッチン→天気・自然）
});

test('画面の色: 初期値はauto、保存でき、不正な値はautoに戻る', () => {
  assert.equal(getTheme(), 'auto');
  setTheme('dark');
  assert.equal(getTheme(), 'dark');
  setTheme('light');
  assert.equal(getTheme(), 'light');
  setTheme('pink');
  assert.equal(getTheme(), 'auto');
  assert.equal(normalizeTheme(undefined), 'auto');
  assert.deepEqual(THEMES.map((t) => t.value), ['auto', 'light', 'dark']);
});

test('画面の色: data-theme を付け外しする（autoは付けない）', () => {
  const root = { dataset: {} };
  applyTheme('dark', root);
  assert.equal(root.dataset.theme, 'dark');
  applyTheme('light', root);
  assert.equal(root.dataset.theme, 'light');
  applyTheme('auto', root);
  assert.equal('theme' in root.dataset, false);
  applyTheme('bogus', root);
  assert.equal('theme' in root.dataset, false);
});

test('画面の色: index.html の先頭スクリプトと保存キー・CSSのセレクターが一致する', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  setTheme('dark');
  assert.match(html, /localStorage\.getItem\('zkp\.theme'\)/);
  assert.match(html, /<script>try\{var t=/); // CSSより前のインラインスクリプト
  assert.ok(html.indexOf("zkp.theme") < html.indexOf('css/style.css'));
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /:root:not\(\[data-theme="light"\]\)/); // 端末ダークでライト固定のときは打ち消す
  assert.match(css, /:root\[data-theme="light"\]\s*\{\s*color-scheme: light/);
});

test('マイ基準値の保存は従来どおり（お気に入り・色の保存と干渉しない）', () => {
  setMyValue('rangeW', 500);
  toggleFavorite('rice');
  setTheme('dark');
  assert.equal(getMyValues().rangeW, 500);
  assert.deepEqual(getFavorites(), ['rice']);
  assert.equal(getTheme(), 'dark');
});

test('レンジ: 表記のW数は初期値500Wで、入れておいた500Wで自宅の時間が計算される', () => {
  const f = microwave.fields.find((x) => x.key === 'labelW');
  assert.equal(f.default, 500);
  // 画面は起動時に values.labelW = 500 を入れる。表記の時間だけ入れれば計算できる
  const v = microwave.compute('labelSec', 180, { labelW: f.default }, { homeW: 600 });
  assert.equal(v.homeSec, 150); // 500W×180秒 ÷ 600W
  assert.equal(v.joule, 90000);
});

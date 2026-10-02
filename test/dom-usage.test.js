import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

// replaceChildren に null を渡すと画面に「null」と出る。コンポーネントは dom.js の fill() を使うこと。
test('コンポーネントで replaceChildren を直接呼ばない（fill を使う）', () => {
  const dir = new URL('../js/components/', import.meta.url);
  for (const f of readdirSync(dir)) {
    assert.doesNotMatch(readFileSync(new URL(f, dir), 'utf8'), /\.replaceChildren\(/, `${f} は fill() を使う`);
  }
});

// 入れ子の配列が1段しか展開されないと、画面に「[object HTMLDivElement]」と出る（お気に入り欄で発生した）
import { normalizeKids, fill } from '../js/dom.js';

test('子要素の整理: 入れ子の配列を何段でも展開し、null/false/undefined を捨てる', () => {
  const a = { n: 'a' }, b = { n: 'b' }, c = { n: 'c' }, d = { n: 'd' };
  assert.deepEqual(normalizeKids([a, [b, [c, [d]]], null, false, undefined, [null, []]]), [a, b, c, d]);
  assert.deepEqual(normalizeKids([]), []);
  assert.deepEqual(normalizeKids(['文字', 0, [1]]), ['文字', 0, 1]); // 0 は捨てない
});

test('fill: 条件付き・入れ子の子要素をそのまま渡せる（replaceChildrenには展開済みだけ渡る）', () => {
  let received;
  const el = { replaceChildren: (...args) => (received = args) };
  const x = { n: 'x' }, y = { n: 'y' }, z = { n: 'z' };
  fill(el, true ? [x, [y]] : null, false, [z]);
  assert.deepEqual(received, [x, y, z]);
  fill(el, null, [[]]);
  assert.deepEqual(received, []);
});

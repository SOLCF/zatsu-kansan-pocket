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

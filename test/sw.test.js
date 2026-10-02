import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';

// 新しいファイルを足して sw.js の ASSETS に入れ忘れると、オフラインで動かなくなる。
const root = new URL('../', import.meta.url);
const files = (dir) =>
  readdirSync(new URL(dir, root)).flatMap((n) => {
    const p = `${dir}${n}`;
    return statSync(new URL(p, root)).isDirectory() ? files(`${p}/`) : [p];
  });

test('js/ の全ファイルが sw.js のオフライン用リストに入っている', () => {
  const sw = readFileSync(new URL('sw.js', root), 'utf8');
  for (const f of files('js/')) assert.ok(sw.includes(`'${f}'`), `${f} が sw.js の ASSETS に無い`);
});

test('index.html・manifest・CSS・アイコンもリストに入っている', () => {
  const sw = readFileSync(new URL('sw.js', root), 'utf8');
  for (const f of ['index.html', 'manifest.webmanifest', 'css/style.css', 'icons/icon-192.png', 'icons/icon-512.png']) {
    assert.ok(sw.includes(`'${f}'`), `${f} が sw.js の ASSETS に無い`);
  }
});

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

test('sw.js の CACHE と js/version.js の VERSION がそろっている（上げ忘れると更新が届かない）', async () => {
  const sw = readFileSync(new URL('sw.js', root), 'utf8');
  const { VERSION } = await import('../js/version.js');
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
  assert.equal(/const CACHE = 'zkp-([^']+)'/.exec(sw)?.[1], VERSION);
});

test('更新確認: version.js の中身から版を取り出せる', async () => {
  const { latestVersionOf } = await import('../js/components/settings.js');
  assert.equal(latestVersionOf(readFileSync(new URL('js/version.js', root), 'utf8')), (await import('../js/version.js')).VERSION);
  assert.equal(latestVersionOf("export const VERSION = '1.2.3';"), '1.2.3');
  assert.equal(latestVersionOf('<html>404</html>'), null);
});

test('公開版はキャッシュ優先、更新確認の要求はキャッシュを通さない', () => {
  const sw = readFileSync(new URL('sw.js', root), 'utf8');
  assert.match(sw, /endsWith\('github\.io'\)/);
  assert.match(sw, /req\.cache === 'no-store'/);
});

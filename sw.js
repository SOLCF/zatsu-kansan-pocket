// オフライン用のキャッシュ。同一オリジンのみ扱う。
//
// 公開版（github.io）: キャッシュ優先。起動時に通信せず端末のファイルで表示し、通信量を最小にする。
//   新しい版は、ブラウザが sw.js の変化に気づいたとき（CACHE の番号を上げる）に裏で取り込み、次回の起動から使う。
//   すぐ更新したいときは設定画面の「更新」ボタン（js/components/settings.js）。
// 開発中（localhost など）: ネットワーク優先で、編集がすぐ反映される。
const CACHE = 'zkp-1.0.0'; // js/version.js の VERSION とそろえる
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/app.js', 'js/version.js', 'js/dom.js', 'js/calc.js', 'js/format.js', 'js/storage.js', 'js/theme.js', 'js/dates.js',
  'js/data/index.js', 'js/data/myvalues.js', 'js/data/items/kitchen.js', 'js/data/items/daily.js', 'js/data/items/housing.js', 'js/data/items/money.js', 'js/data/items/transport.js', 'js/data/items/hobby.js', 'js/data/items/camera.js', 'js/data/items/nature.js', 'js/data/items/date.js', 'js/data/items/claude.js',
  'js/components/home.js', 'js/components/fav.js', 'js/components/settings.js', 'js/components/calc-view.js',
  'js/components/table-view.js', 'js/components/guide-view.js',
  'icons/icon-192.png', 'icons/icon-512.png',
];
const DEV = !self.location.hostname.endsWith('github.io');

self.addEventListener('install', (e) => {
  // cache: 'reload' で端末のHTTPキャッシュ（Pagesは10分）を経由せず、新旧のファイルが混ざらないようにする
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

function fromNetwork(req) {
  return fetch(req).then((res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // 更新確認のように「サーバーに聞く」と明示した要求は、キャッシュを通さない
  if (req.cache === 'no-store' || req.cache === 'reload') return;
  if (DEV) {
    e.respondWith(fromNetwork(req).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fromNetwork(req).catch(() => caches.match('index.html'))),
  );
});

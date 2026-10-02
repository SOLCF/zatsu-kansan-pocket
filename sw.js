// 同一オリジンのみ扱う。外部通信はしない。
// キャッシュ優先で即表示し、裏で更新（stale-while-revalidate）。構成を変えたら CACHE を上げる。
const CACHE = 'zkp-v12';
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/app.js', 'js/dom.js', 'js/calc.js', 'js/format.js', 'js/storage.js',
  'js/data/index.js', 'js/data/myvalues.js', 'js/data/items/kitchen.js', 'js/data/items/daily.js', 'js/data/items/housing.js', 'js/data/items/money.js', 'js/data/items/transport.js', 'js/data/items/hobby.js', 'js/data/items/nature.js',
  'js/components/home.js', 'js/components/settings.js', 'js/components/calc-view.js',
  'js/components/table-view.js', 'js/components/guide-view.js',
  'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' で端末のHTTPキャッシュ（Pagesは10分）を経由せず、常に最新を取り込む
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(e.request, { ignoreSearch: true });
      const update = fetch(e.request, { cache: 'no-cache' }).then(async (res) => {
        if (res.ok) await cache.put(e.request, res.clone());
        return res;
      });
      // 画面を返したあとも、裏の更新が終わるまで Service Worker を止めさせない
      e.waitUntil(update.catch(() => {}));
      return hit ?? update.catch(() => cache.match('index.html'));
    }),
  );
});

// 蜷御ｸ繧ｪ繝ｪ繧ｸ繝ｳ縺ｮ縺ｿ謇ｱ縺・ょ､夜Κ騾壻ｿ｡縺ｯ縺励↑縺・・// 繧ｭ繝｣繝・す繝･蜆ｪ蜈医〒蜊ｳ陦ｨ遉ｺ縺励∬｣上〒譖ｴ譁ｰ・・tale-while-revalidate・峨よｧ区・繧貞､峨∴縺溘ｉ CACHE 繧剃ｸ翫￡繧九・const CACHE = 'zkp-v2';
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/app.js', 'js/dom.js', 'js/calc.js', 'js/format.js', 'js/storage.js',
  'js/data/index.js', 'js/data/myvalues.js', 'js/data/items/kitchen.js',
  'js/components/home.js', 'js/components/settings.js', 'js/components/calc-view.js',
  'js/components/table-view.js', 'js/components/guide-view.js',
  'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
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
      const net = fetch(e.request)
        .then((res) => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => hit ?? cache.match('index.html'));
      return hit ?? net;
    }),
  );
});

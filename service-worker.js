/* =========================================================
   小又爱学习 —— Service Worker
   ---------------------------------------------------------
   作用：
     · 首次访问时缓存游戏文件；
     · 之后断网也能打开游戏；
     · GitHub Pages 上满足 PWABuilder 对离线能力的要求。

   重要：以后更新游戏文件（HTML/CSS/JS/图片）后，
   请把下面的 CACHE_NAME 版本号 +1（例如 v1 → v2），
   否则浏览器可能一直使用旧缓存。
   ========================================================= */

const CACHE_NAME = 'xiaoyou-brick-v8';

const APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/words-data.js',
  './js/audio.js',
  './js/main.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './screenshot-wide.png',
  './screenshot-narrow.png'
];

/* 安装：把整个游戏缓存下来 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/* 激活：删除旧版本缓存，立即接管页面 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* 请求：页面走网络优先，离线时回退缓存；静态资源走缓存优先 */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() =>
          caches.match(event.request).then(
            (cached) => cached || caches.match('./index.html')
          )
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});

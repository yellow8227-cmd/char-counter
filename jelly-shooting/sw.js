// Jelly Shooting service worker — 오프라인 실행 + 자동 업데이트
// 게임을 크게 바꾸면 아래 버전을 올려주세요 (예: jelly-v2) → 방문자에게 새 버전이 반영돼요.
const CACHE = 'jelly-v11';
const ASSETS = [
  './', './index.html', './manifest.json',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png',
  './fonts/Griun_Donguri-Rg.ttf', './fonts/Griun_NoltoTAENGGU-Rg.ttf'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()).catch(()=>{}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // HTML(페이지)은 네트워크 우선 → 업데이트가 바로 반영, 오프라인이면 캐시 사용
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  // 그 외(폰트·아이콘 등)는 캐시 우선 → 빠름
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })));
});

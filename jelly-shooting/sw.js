// Jelly Shooting service worker — 오프라인 실행 + 자동 업데이트
// 게임을 크게 바꾸면 아래 버전을 올려주세요 (예: jelly-v2) → 방문자에게 새 버전이 반영돼요.
const CACHE = 'jelly-v79';
const ASSETS = [
  './', './index.html', './manifest.json',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png',
  './apple-touch-icon.png', './favicon-32.png', './og.png', './og.jpg', './og.jpg?v=3',
  './fonts/Griun_Donguri-Rg.ttf', './fonts/Griun_NoltoTAENGGU-Rg.ttf'
];

self.addEventListener('install', e => {
  // addAll은 하나만 404여도 전부 실패한다. 아이콘·폰트가 아직 없어서 지금까지
  // 사전 캐시가 항상 실패하고 있었고(.catch가 삼켰다) 오프라인 실행이 안 됐다.
  // 개별로 담아서 있는 파일만이라도 캐시한다.
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(
    ASSETS.map(u => fetch(u,{cache:'reload'}).then(r => r.ok ? c.put(u,r) : null).catch(()=>null))
  )).then(() => self.skipWaiting()).catch(()=>{}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // 우리 파일만 다룬다. supabase 같은 외부 GET까지 캐시 우선으로 잡으면
  // 랭킹·도전장이 첫 응답에 얼어붙어 새로고침이 아무 일도 하지 않는다.
  if (new URL(req.url).origin !== self.location.origin) return;
  // HTML(페이지)은 네트워크 우선 → 업데이트가 바로 반영, 오프라인이면 캐시 사용
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => { if(res&&res.ok){ const cp=res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  // 그 외(폰트·아이콘 등)는 캐시 우선 → 빠름
  // 실패한 응답까지 캐시하면 그 파일이 영원히 깨진 채로 남는다
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
    if(res&&res.ok){ const cp=res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; })));
});

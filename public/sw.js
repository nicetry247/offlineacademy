// OfflineAcademy Service Worker v3 — Minimal, Chrome-install-criteria focused
// Logs to console so you can verify it's controlling the page

const CACHE = "oa-v5"
const ASSETS = [
  '/',
  '/site.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
]

self.addEventListener('install', e => {
  console.log('[SW] Installing')
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  console.log('[SW] Activating')
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  console.log('[SW] Fetch:', url.pathname)

  // Navigation (main page) — network first, cache fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(networkFirst(e.request))
    return
  }

  // Static assets — cache first
  if (ASSETS.some(a => url.pathname === a || url.pathname.endsWith('.png') || url.pathname.endsWith('.svg'))) {
    e.respondWith(cacheFirst(e.request))
    return
  }

  // API — network first, allow offline failure
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(networkFirst(e.request).catch(() => new Response('{"offline":true}', {status:503, headers:{'Content-Type':'application/json'}})))
    return
  }

  // Default: network first
  e.respondWith(networkFirst(e.request))
})

async function cacheFirst(req) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(req)
  if (cached) return cached
  try {
    const res = await fetch(req)
    if (res.ok) cache.put(req, res.clone())
    return res
  } catch {
    return new Response('', {status:504})
  }
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE)
  try {
    const res = await fetch(req)
    if (res.ok) cache.put(req, res.clone())
    return res
  } catch {
    const cached = await cache.match(req)
    return cached || new Response('', {status:504})
  }
}

self.addEventListener('message', e => {
  if (e.data === 'get-diagnostic') {
    e.ports[0].postMessage({
      cache: CACHE,
      controlling: self.clients.claim,
      timestamp: Date.now()
    })
  }
})

console.log('[SW] Loaded - version 3')
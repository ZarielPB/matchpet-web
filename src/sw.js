/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

// Service Worker de MatchPet: caché de la app (HU-54), caché de datos (HU-55) y push (HU-56).
self.skipWaiting()
self.clients.claim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// La app es una SPA: toda navegación devuelve index.html (también sin conexión).
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/^\/__/] }))

// HU-55 CA#1: catálogo y detalle de mascotas (GET a Supabase) con "sirve lo guardado y actualiza".
// Solo datos del catálogo; nada de solicitudes, perfiles ni avisos del usuario.
// La paginación de PostgREST responde 206 (Range), que Cache API no acepta: se guarda como 200 y la clave incluye el rango.
const CATALOG_CACHE = 'matchpet-catalogo'
const CATALOG_MAX_ENTRIES = 150
const catalogKey = (request) => new Request(`${request.url}${request.url.includes('?') ? '&' : '?'}__range=${request.headers.get('range') || ''}`)

async function catalogHandler({ request, event }) {
  const cache = await caches.open(CATALOG_CACHE)
  const key = catalogKey(request)
  const cached = await cache.match(key, { ignoreVary: true })
  const network = fetch(request).then(async (res) => {
    if (res.ok) {
      await cache.put(key, new Response(await res.clone().blob(), { status: 200, headers: res.headers }))
      const keys = await cache.keys()
      for (const old of keys.slice(0, Math.max(0, keys.length - CATALOG_MAX_ENTRIES))) await cache.delete(old)
    }
    return res
  })
  if (cached) {
    event.waitUntil(network.catch(() => {})) // actualiza en segundo plano; sin red se queda lo guardado
    return cached
  }
  return network
}

registerRoute(
  ({ url, request }) => request.method === 'GET' && (/\/rest\/v1\/(pets|pet_images)$/.test(url.pathname) || (url.pathname.endsWith('/rest/v1/shelters') && url.searchParams.get('select') === 'city')),
  catalogHandler
)

// Fotos de mascotas (Storage público de Supabase): se sirven desde caché y se renuevan poco.
registerRoute(
  ({ url }) => url.pathname.includes('/storage/v1/object/public/'),
  new CacheFirst({
    cacheName: 'matchpet-imagenes',
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] }), new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 })]
  })
)

// Fuentes de Google (Material Symbols, Outfit, Plus Jakarta).
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new StaleWhileRevalidate({ cacheName: 'matchpet-fuentes', plugins: [new CacheableResponsePlugin({ statuses: [0, 200] }), new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 })] })
)

// HU-56 CA#4: la Edge Function envía { title, body, url, icon }.
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data?.text() } }
  event.waitUntil(
    self.registration.showNotification(data.title || 'MatchPet', {
      body: data.body || '',
      icon: data.icon || '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url: data.url || '/' }
    })
  )
})

// HU-56 CA#5: al tocar el aviso se abre (o se reutiliza) la PWA en la ruta indicada.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
      const existing = windows.find((w) => new URL(w.url).origin === self.location.origin)
      if (existing) {
        await existing.focus()
        return existing.navigate(target)
      }
      return self.clients.openWindow(target)
    })
  )
})

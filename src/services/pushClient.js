import { supabase } from './supabaseClient'

// HU-56: suscripción Web Push del dispositivo actual.
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true

// 'ok' | 'no-soportado' | 'ios-instalar' (iPhone solo permite push con la app instalada en la pantalla de inicio)
export function pushSupport() {
  if (!VAPID_PUBLIC_KEY) return 'no-soportado'
  if (isIOS() && !isStandalone()) return 'ios-instalar'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'no-soportado'
  return 'ok'
}

export function urlBase64ToUint8Array(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.ready
  return { reg, sub: await reg.pushManager.getSubscription() }
}

// ¿Este dispositivo tiene el permiso y una suscripción activa?
export async function isPushEnabled() {
  if (pushSupport() !== 'ok' || Notification.permission !== 'granted') return false
  return Boolean((await currentSubscription()).sub)
}

// Pide permiso (debe llamarse desde un clic), suscribe el dispositivo y guarda la suscripción en Supabase.
export async function enablePush(userId) {
  if (pushSupport() !== 'ok') return { success: false, error: 'Este dispositivo no admite notificaciones.' }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { success: false, error: 'Bloqueaste las notificaciones. Actívalas desde los permisos del navegador.' }
  }
  try {
    const { reg, sub: existing } = await currentSubscription()
    const sub = existing || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }))
    const json = sub.toJSON()
    const { error } = await supabase.from('push_subscriptions').upsert(
      { user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, user_agent: navigator.userAgent.slice(0, 200) },
      { onConflict: 'endpoint' }
    )
    if (error) throw error
    return { success: true }
  } catch (e) {
    console.error('[push] enable', e?.message)
    return { success: false, error: 'No se pudieron activar las notificaciones. Intenta de nuevo.' }
  }
}

export async function disablePush() {
  try {
    const { sub } = await currentSubscription()
    if (sub) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      await sub.unsubscribe()
    }
    return { success: true }
  } catch (e) {
    console.error('[push] disable', e?.message)
    return { success: false, error: 'No se pudieron desactivar las notificaciones.' }
  }
}

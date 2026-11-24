// HU-56: envía una notificación Web Push (VAPID) cuando se inserta una fila en public.notifications.
// Se invoca desde un Database Webhook (INSERT en notifications). Ver docs/DESPLIEGUE.md.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:soporte@matchpet.app',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
)

Deno.serve(async (req) => {
  // El webhook envía este secreto compartido; sin él cualquiera podría disparar avisos.
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('PUSH_WEBHOOK_SECRET')) {
    return new Response('No autorizado', { status: 401 })
  }

  const payload = await req.json().catch(() => null)
  const record = payload?.record
  if (payload?.type !== 'INSERT' || !record?.user_id) return new Response('Ignorado', { status: 200 })

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', record.user_id)
  if (error) return new Response(error.message, { status: 500 })

  const message = JSON.stringify({
    title: record.title,
    body: record.body,
    url: record.link || '/',
    icon: '/pwa-192x192.png'
  })

  let sent = 0
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, message)
        sent += 1
      } catch (e) {
        // 404/410: el dispositivo ya no existe (se desinstaló la app o se revocó el permiso).
        if (e?.statusCode === 404 || e?.statusCode === 410) await supabase.from('push_subscriptions').delete().eq('id', s.id)
        else console.error('push falló', e?.statusCode, e?.body)
      }
    })
  )
  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } })
})

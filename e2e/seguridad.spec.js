import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import creds from './credentials.json' with { type: 'json' }
import { api } from './helpers.js'

// Integración/seguridad: cada rol solo puede lo que le corresponde (RLS, RPC y almacenamiento), sin pasar por la interfaz.
const anon = () => createClient(creds.supabase.url, creds.supabase.anonKey, { auth: { persistSession: false } })
const rows = (r) => (r.error ? 'ERROR' : r.data.length)

test.describe('seguridad por rol (API)', () => {
  test('sin sesión: el catálogo es público y lo demás está bloqueado', async () => {
    const c = anon()
    for (const t of ['pets', 'pet_images', 'shelters']) expect((await c.from(t).select('*').limit(1)).error).toBeNull()
    for (const t of ['profiles', 'adopter_profiles', 'favorites', 'adoption_applications', 'notifications', 'vaccination_records', 'follow_up_notes', 'post_adoption_reports', 'adoption_deliveries', 'compatibility_profiles']) {
      const r = await c.from(t).select('*').limit(1)
      expect(r.error || r.data.length === 0, `anon no debe leer ${t}`).toBeTruthy()
    }
    expect((await c.from('pets').insert({ name: 'x' })).error).not.toBeNull()
    expect((await c.rpc('shelter_dashboard_stats')).error).not.toBeNull()
    expect((await c.rpc('match_recommendations')).error).not.toBeNull()
  })

  test('adoptante: solo ve lo suyo y no puede usar funciones del refugio', async () => {
    const me = await api('adoptante'); const { data: { user } } = await me.auth.getUser()
    expect(rows(await me.from('profiles').select('id'))).toBe(1)
    const apps = await me.from('adoption_applications').select('user_id')
    expect(apps.data.every((a) => a.user_id === user.id)).toBe(true)
    expect(rows(await me.from('notifications').select('id').neq('user_id', user.id))).toBe(0)
    expect(rows(await me.from('adopter_profiles').select('user_id').neq('user_id', user.id))).toBe(0)
    expect(rows(await me.from('compatibility_profiles').select('user_id').neq('user_id', user.id))).toBe(0)
    for (const [fn, args] of [['shelter_dashboard_stats', {}], ['shelter_compatibility_metrics', {}], ['shelter_adoption_charts', { p_from: '2026-01-01', p_to: '2026-12-31' }],
      ['add_follow_up_note', { p_application_id: '00000000-0000-0000-0000-000000000000', p_type: 'llamada', p_noted_at: null, p_notes: 'hack' }],
      ['resolve_adoption_application', { p_id: '00000000-0000-0000-0000-000000000000', p_decision: 'aprobada', p_comments: null }]]) {
      expect((await me.rpc(fn, args)).error, `adoptante no debe ejecutar ${fn}`).not.toBeNull()
    }
    // no puede crear ni modificar mascotas ni refugios
    expect((await me.from('pets').insert({ name: 'hack', species: 'perro', size: 'pequeño', health_status: 'x', shelter_id: '00000000-0000-0000-0000-000000000000' })).error).not.toBeNull()
    const upd = await me.from('pets').update({ name: 'hack' }).eq('name', 'Benito').select()
    expect(upd.data ?? []).toHaveLength(0)
    const updS = await me.from('shelters').update({ phone: '1' }).eq('shelter_name', 'CanguritoFeliz').select()
    expect(updS.data ?? []).toHaveLength(0)
  })

  test('adoptante: no puede crearse solicitudes a nombre de otro, ni aprobadas, ni sobre mascotas no disponibles', async () => {
    const me = await api('adoptante')
    const { data: pets } = await me.from('pets').select('id, status').limit(80)
    const free = pets.find((p) => p.status === 'disponible'); const taken = pets.find((p) => p.status === 'adoptada')
    const other = (await api('refugio')); const { data: { user: otherUser } } = await other.auth.getUser()
    expect((await me.from('adoption_applications').insert({ pet_id: free.id, user_id: otherUser.id, message: 'Solicitud a nombre de otro usuario.' })).error).not.toBeNull()
    expect((await me.from('adoption_applications').insert({ pet_id: taken.id, user_id: (await me.auth.getUser()).data.user.id, message: 'Solicitud sobre mascota ya adoptada.' })).error).not.toBeNull()
    expect((await me.from('adoption_applications').insert({ pet_id: free.id, user_id: (await me.auth.getUser()).data.user.id, message: 'Autoaprobada desde el cliente.', status: 'aprobada' })).error).not.toBeNull()
    expect((await me.from('adoption_applications').insert({ pet_id: free.id, user_id: (await me.auth.getUser()).data.user.id, message: 'corta' })).error).not.toBeNull()
  })

  test('refugio: solo ve a sus solicitantes y no puede operar sobre otro refugio', async () => {
    const a = await api('refugio'); const b = await api('refugio2')
    const profilesA = (await a.from('profiles').select('email')).data.map((p) => p.email)
    const profilesB = (await b.from('profiles').select('email')).data.map((p) => p.email)
    expect(profilesA).not.toContain(creds.refugio2.email)
    expect(profilesB).not.toContain(creds.refugio.email)
    const { data: appsA } = await a.from('adoption_applications').select('id, pets!inner(shelter_id)')
    const { data: shelterA } = await a.from('shelters').select('id').eq('user_id', (await a.auth.getUser()).data.user.id).single()
    expect(appsA.every((x) => x.pets.shelter_id === shelterA.id)).toBe(true)
    // el refugio B no puede resolver, anotar ni editar nada de A
    const target = appsA.find((x) => x)
    expect((await b.rpc('resolve_adoption_application', { p_id: target.id, p_decision: 'rechazada', p_comments: 'No corresponde a este refugio.' })).error).not.toBeNull()
    expect((await b.rpc('add_follow_up_note', { p_application_id: target.id, p_type: 'llamada', p_noted_at: null, p_notes: 'intruso' })).error).not.toBeNull()
    expect((await b.rpc('add_health_record', { p_application_id: target.id, p_kind: 'vacuna', p_name: 'Intruso', p_due: '2027-01-01' })).error).not.toBeNull()
    expect(rows(await b.from('follow_up_notes').select('id').eq('shelter_id', shelterA.id))).toBe(0)
    expect(rows(await b.from('post_adoption_reports').select('id').eq('shelter_id', shelterA.id))).toBe(0)
    const stolen = await b.from('pets').update({ name: 'hack' }).eq('shelter_id', shelterA.id).select()
    expect(stolen.data ?? []).toHaveLength(0)
  })

  test('almacenamiento: nadie sube a la carpeta de otro y los adjuntos privados no son públicos', async () => {
    const me = await api('adoptante'); const other = await api('refugio')
    const otherId = (await other.auth.getUser()).data.user.id; const meId = (await me.auth.getUser()).data.user.id
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
    expect((await me.storage.from('health-proofs').upload(`${otherId}/x.png`, png, { contentType: 'image/png' })).error).not.toBeNull()
    expect((await me.storage.from('report-attachments').upload(`${otherId}/x.png`, png, { contentType: 'image/png' })).error).not.toBeNull()
    expect((await me.storage.from('pet-images').upload(`${meId}/x.png`, png, { contentType: 'image/png' })).error).not.toBeNull() // un adoptante no sube fotos de mascotas
    const own = await me.storage.from('health-proofs').upload(`${meId}/e2e-${Date.now()}.png`, png, { contentType: 'image/png' })
    expect(own.error).toBeNull()
    const pub = await fetch(`${creds.supabase.url}/storage/v1/object/public/health-proofs/${own.data.path}`)
    expect(pub.status).toBeGreaterThanOrEqual(400) // el bucket es privado
    await me.storage.from('health-proofs').remove([own.data.path])
  })
})

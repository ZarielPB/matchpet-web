import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// Supabase falso: registra las llamadas y devuelve lo configurado en `db`.
const db = { rpc: {}, tables: {}, calls: [] }
vi.mock('../src/services/supabaseClient', () => {
  const chain = (table) => {
    const q = { table, filters: [] }
    const self = new Proxy(q, {
      get(t, prop) {
        if (prop === 'then') return (res) => res(db.tables[table] ?? { data: [], error: null })
        if (prop === 'maybeSingle') return () => Promise.resolve(db.tables[`${table}:single`] ?? { data: null, error: null })
        return (...args) => { db.calls.push({ table, op: prop, args }); return self }
      }
    })
    return self
  }
  return {
    supabase: {
      from: (t) => chain(t),
      rpc: (fn, params) => { db.calls.push({ rpc: fn, params }); return Promise.resolve(db.rpc[fn] ?? { data: {}, error: null }) },
      storage: { from: (bucket) => ({
        upload: (path) => { db.calls.push({ bucket, upload: path }); return Promise.resolve({ error: db.uploadError ?? null }) },
        remove: (paths) => { db.calls.push({ bucket, remove: paths }); return Promise.resolve({ error: null }) },
        createSignedUrl: (path) => Promise.resolve({ data: { signedUrl: `https://signed/${path}` }, error: null })
      }) },
      auth: { getSession: () => Promise.resolve({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) }
    }
  }
})
vi.mock('vue-chartjs', () => ({ Bar: { props: ['data'], template: '<canvas data-chart="bar" />' }, Doughnut: { props: ['data'], template: '<canvas data-chart="donut" />' } }))
vi.mock('../src/components/layout/DashboardLayout.vue', () => ({ default: { template: '<div><slot /></div>' } }))

import { useAuthStore } from '../src/stores/authStore'
import { useFollowUpStore } from '../src/stores/followUpStore'
import FollowUpTimeline from '../src/components/ui/FollowUpTimeline.vue'
import FollowUpNoteModal from '../src/components/refugio/FollowUpNoteModal.vue'
import ReportModal from '../src/components/adoptante/ReportModal.vue'
import RespondReportModal from '../src/components/refugio/RespondReportModal.vue'
import AttachmentPreview from '../src/components/ui/AttachmentPreview.vue'
import { healthStatus, useHealthStore } from '../src/stores/healthStore'
import HealthRecordList from '../src/components/ui/HealthRecordList.vue'
import CompleteHealthModal from '../src/components/adoptante/CompleteHealthModal.vue'
import HealthRecordModal from '../src/components/refugio/HealthRecordModal.vue'
import HealthCalendarView from '../src/views/adoptante/HealthCalendarView.vue'
import DashboardStats from '../src/components/refugio/DashboardStats.vue'
import StatsView from '../src/views/refugio/StatsView.vue'
import MyAdoptionsView from '../src/views/adoptante/MyAdoptionsView.vue'

const rpcCalls = (fn) => db.calls.filter((c) => c.rpc === fn)
const transition = { global: { stubs: { Transition: false, RouterLink: true } } }

beforeEach(() => {
  setActivePinia(createPinia())
  db.rpc = {}; db.tables = {}; db.calls = []; db.uploadError = null
  useAuthStore().user = { id: 'u1' }
})

describe('HU-44 / HU-45 — notas de seguimiento', () => {
  it('la línea de tiempo vacía muestra el mensaje del CA#4 de HU-45', () => {
    const w = mount(FollowUpTimeline, { props: { notes: [] } })
    expect(w.text()).toContain('El refugio aún no ha registrado notas de seguimiento')
  })

  it('muestra tipo, fecha y observación; marca las futuras como Agendada', () => {
    const w = mount(FollowUpTimeline, { props: { notes: [
      { id: 1, type: 'llamada', noted_at: '2026-10-25', notes: 'Todo bien' },
      { id: 2, type: 'visita', noted_at: '2999-01-01', notes: 'Visita agendada' }
    ] } })
    expect(w.text()).toContain('Llamada')
    expect(w.text()).toContain('Todo bien')
    expect(w.findAll('li')).toHaveLength(2)
    expect(w.text().match(/Agendada/g)).toHaveLength(1) // solo la nota futura lleva el badge
  })

  it('el store rechaza observaciones vacías sin llamar a la BD', async () => {
    const r = await useFollowUpStore().addNote('a1', 'llamada', '2026-11-10', '  ')
    expect(r.success).toBe(false)
    expect(rpcCalls('add_follow_up_note')).toHaveLength(0)
  })

  it('el modal usa la fecha de hoy por defecto, valida y confirma con el mensaje del CA#4', async () => {
    const w = mount(FollowUpNoteModal, { props: { adoption: { id: 'a1', pets: { name: 'Coraje' }, profiles: { full_name: 'Ana' } } }, ...transition })
    const d = new Date()
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    expect(w.find('#note-date').element.value).toBe(today)
    const save = w.findAll('button').find((b) => b.text() === 'Guardar nota')
    expect(save.attributes('disabled')).toBeDefined()
    await w.find('#note-text').setValue('Se adaptó muy bien')
    await w.findAll('button').find((b) => b.text().includes('Visita')).trigger('click')
    expect(save.attributes('disabled')).toBeUndefined()
    await save.trigger('click'); await flushPromises()
    expect(rpcCalls('add_follow_up_note')[0].params).toEqual({ p_application_id: 'a1', p_type: 'visita', p_noted_at: today, p_notes: 'Se adaptó muy bien' })
    expect(w.emitted('done')[0][0]).toBe('Nota de seguimiento registrada')
  })

  it('el historial del adoptante llega ordenado de más reciente a más antiguo', async () => {
    db.tables.adoption_applications = { error: null, data: [{ id: 'a1', pets: { name: 'Coraje' }, follow_up_notes: [
      { id: 1, noted_at: '2026-10-01', created_at: '2026-10-01T10:00:00Z', type: 'llamada', notes: 'vieja' },
      { id: 2, noted_at: '2026-10-20', created_at: '2026-10-20T10:00:00Z', type: 'visita', notes: 'nueva' }
    ], post_adoption_reports: [] }] }
    const store = useFollowUpStore()
    await store.fetchMyAdoptions()
    expect(store.adoptions[0].follow_up_notes.map((n) => n.id)).toEqual([2, 1])
  })

  it('la vista del adoptante muestra el estado vacío cuando no hay adopciones', async () => {
    const w = mount(MyAdoptionsView, transition); await flushPromises()
    expect(w.text()).toContain('Aún no tienes mascotas adoptadas')
  })
})

describe('HU-47 / HU-48 — reportes post-adopción', () => {
  it('el formulario exige 10 caracteres y envía categoría + descripción', async () => {
    const w = mount(ReportModal, { props: { adoption: { id: 'a1', pets: { name: 'Coraje' } } }, ...transition })
    const send = w.findAll('button').find((b) => b.text() === 'Enviar reporte')
    await w.find('#report-desc').setValue('corto')
    expect(send.attributes('disabled')).toBeDefined()
    await w.find('#report-category').setValue('Salud')
    await w.find('#report-desc').setValue('Tiene tos desde ayer')
    await send.trigger('click'); await flushPromises()
    expect(rpcCalls('create_post_adoption_report')[0].params).toEqual({ p_application_id: 'a1', p_category: 'Salud', p_description: 'Tiene tos desde ayer', p_attachment_path: null })
    expect(w.emitted('done')).toBeTruthy()
  })

  it('muestra el mensaje en español que lanza la BD (22023)', async () => {
    db.rpc.create_post_adoption_report = { data: null, error: { code: '22023', message: 'Solo puedes reportar sobre una mascota ya adoptada' } }
    const w = mount(ReportModal, { props: { adoption: { id: 'a1', pets: { name: 'X' } } }, ...transition })
    await w.find('#report-desc').setValue('descripción suficiente')
    await w.findAll('button').find((b) => b.text() === 'Enviar reporte').trigger('click'); await flushPromises()
    expect(w.find('[role=alert]').text()).toContain('Solo puedes reportar sobre una mascota ya adoptada')
  })

  const photo = (over = {}) => ({ name: 'tos.jpg', type: 'image/jpeg', size: 1024, ...over })

  it('HU-47 CA#1: sube el adjunto a la carpeta del usuario y envía su ruta', async () => {
    const r = await useFollowUpStore().createReport('a1', 'Salud', 'Tiene tos desde ayer', photo())
    expect(r.success).toBe(true)
    const up = db.calls.find((c) => c.upload).upload
    expect(up).toMatch(/^u1\/[0-9a-f-]+\.jpg$/)
    expect(rpcCalls('create_post_adoption_report')[0].params.p_attachment_path).toBe(up)
  })

  it('rechaza adjuntos de tipo no permitido o mayores a 10 MB sin subir nada', async () => {
    const store = useFollowUpStore()
    expect((await store.createReport('a1', 'Salud', 'descripción válida', photo({ type: 'application/pdf', name: 'x.pdf' }))).success).toBe(false)
    expect((await store.createReport('a1', 'Salud', 'descripción válida', photo({ size: 11 * 1024 * 1024 }))).error).toContain('10 MB')
    expect(db.calls.filter((c) => c.upload || c.rpc)).toHaveLength(0)
  })

  it('si la BD rechaza el reporte, borra el adjunto subido (sin huérfanos)', async () => {
    db.rpc.create_post_adoption_report = { data: null, error: { code: '22023', message: 'Solo puedes reportar sobre una mascota ya adoptada' } }
    await useFollowUpStore().createReport('a1', 'Salud', 'descripción válida', photo())
    const up = db.calls.find((c) => c.upload).upload
    expect(db.calls.find((c) => c.remove).remove).toEqual([up])
  })

  it('la vista previa muestra imagen o video según la extensión', async () => {
    const img = mount(AttachmentPreview, { props: { path: 'u1/a.png' } }); await flushPromises()
    expect(img.find('img').attributes('src')).toBe('https://signed/u1/a.png')
    const vid = mount(AttachmentPreview, { props: { path: 'u1/a.mp4' } }); await flushPromises()
    expect(vid.find('video').exists()).toBe(true)
    expect(mount(AttachmentPreview, { props: { path: null } }).html()).toBe('<!--v-if-->')
  })

  it('responder con visita y cierre envía los 4 parámetros y notifica por el mensaje correcto', async () => {
    const w = mount(RespondReportModal, { props: { report: { id: 'r1', category: 'Salud', description: 'tos', pets: { name: 'Coraje' }, profiles: { full_name: 'Ana' } } }, ...transition })
    await w.find('#respond-text').setValue('Llévalo al veterinario')
    await w.find('#respond-visit').setValue('2999-01-01')
    await w.find('input[type=checkbox]').setValue(true)
    await w.findAll('button').find((b) => b.text() === 'Enviar respuesta').trigger('click'); await flushPromises()
    expect(rpcCalls('respond_post_adoption_report')[0].params).toEqual({ p_id: 'r1', p_response: 'Llévalo al veterinario', p_visit_date: '2999-01-01', p_close: true })
    expect(w.emitted('done')[0][0]).toContain('cerrado')
  })
})

describe('HU-49 — panel del refugio', () => {
  const stats = { pets_total: 12, pets_disponible: 10, pets_en_proceso: 1, pets_adoptada: 1, pending_applications: 3, adoptions_this_month: 2, applications_total: 8, success_rate: 25.0, open_reports: 1,
    recent_activity: [{ pet: 'Toby', status: 'cancelada', at: '2026-11-10T19:47:38+00:00' }] }

  it('muestra skeletons mientras carga', () => {
    db.rpc.shelter_dashboard_stats = new Promise(() => {}) // nunca resuelve
    const w = mount(DashboardStats)
    expect(w.findAll('.animate-pulse')).toHaveLength(4)
  })

  it('muestra los 4 KPIs, el desglose por estado y la actividad reciente', async () => {
    db.rpc.shelter_dashboard_stats = { data: stats, error: null }
    const w = mount(DashboardStats); await flushPromises()
    const t = w.text()
    expect(t).toContain('Total de mascotas'); expect(t).toContain('12')
    expect(t).toContain('Solicitudes pendientes'); expect(t).toContain('Adopciones del mes'); expect(t).toContain('25%')
    expect(t).toContain('Disponibles'); expect(t).toContain('En proceso'); expect(t).toContain('Adoptadas')
    expect(t).toContain('Toby'); expect(t).toContain('Cancelada')
  })
})

describe('HU-50 / HU-51 — gráficas y métricas', () => {
  const compat = { quiz_completed_total: 5, applicants_with_quiz: 4, adopters_with_quiz: 2, applications_with_quiz: 4, adoptions_with_quiz: 2, applications_without_quiz: 2, adoptions_without_quiz: 0, avg_score_adopted: 88.5 }
  const charts = { total: 3, by_month: [{ month: '2026-09', count: 1 }, { month: '2026-10', count: 2 }], by_species: [{ label: 'perro', count: 3 }], by_size: [{ label: 'mediano', count: 3 }] }

  it('con datos renderiza las dos gráficas y el rango por defecto es 6 meses', async () => {
    db.rpc.shelter_adoption_charts = { data: charts, error: null }
    db.rpc.shelter_compatibility_metrics = { data: compat, error: null }
    const w = mount(StatsView); await flushPromises()
    expect(w.find('[data-chart=bar]').exists()).toBe(true)
    expect(w.find('[data-chart=donut]').exists()).toBe(true)
    const call = rpcCalls('shelter_adoption_charts')[0].params
    expect(call.p_from < call.p_to).toBe(true)
  })

  it('sin adopciones en el rango muestra el empty state exacto de HU-50', async () => {
    db.rpc.shelter_adoption_charts = { data: { total: 0, by_month: [], by_species: [], by_size: [] }, error: null }
    db.rpc.shelter_compatibility_metrics = { data: compat, error: null }
    const w = mount(StatsView); await flushPromises()
    expect(w.text()).toContain('No hay registros de adopciones en este período')
    expect(w.find('[data-chart]').exists()).toBe(false)
  })

  it('cambiar de rango vuelve a consultar con fechas nuevas; "Año actual" arranca el 1 de enero', async () => {
    db.rpc.shelter_adoption_charts = { data: charts, error: null }
    db.rpc.shelter_compatibility_metrics = { data: compat, error: null }
    const w = mount(StatsView); await flushPromises()
    await w.findAll('button').find((b) => b.text() === 'Año actual').trigger('click'); await flushPromises()
    const calls = rpcCalls('shelter_adoption_charts')
    expect(calls).toHaveLength(2)
    expect(calls[1].params.p_from).toBe(`${new Date().getFullYear()}-01-01`)
  })

  it('métricas HU-51: embudo, promedio de score y comparación con/sin cuestionario', async () => {
    db.rpc.shelter_adoption_charts = { data: charts, error: null }
    db.rpc.shelter_compatibility_metrics = { data: compat, error: null }
    const w = mount(StatsView); await flushPromises()
    const t = w.text()
    expect(t).toContain('88.5%')
    expect(t).toContain('Embudo de conversión')
    // El embudo nunca puede crecer de un paso al siguiente (misma unidad: personas).
    expect(compat.quiz_completed_total >= compat.applicants_with_quiz && compat.applicants_with_quiz >= compat.adopters_with_quiz).toBe(true)
    expect(t).toContain('Con cuestionario'); expect(t).toContain('Sin cuestionario')
    expect(t).toContain('50%')  // 2 de 4
    expect(t).toContain('0%')   // 0 de 2
    expect(t).not.toMatch(/@|correo|email/i) // sin datos personales
  })
})

describe('HU-46 — calendario de salud y recordatorios', () => {
  const iso = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
  const rec = (over = {}) => ({ id: 'r1', kind: 'vacuna', vaccine_name: 'Antirrábica', due_date: iso(30), completed_at: null, proof_image_url: null, ...over })

  it('clasifica cada registro: completada, vencida, próxima (≤3 días) o pendiente', () => {
    expect(healthStatus(rec({ completed_at: '2026-01-01T00:00:00Z' }))).toBe('completada')
    expect(healthStatus(rec({ due_date: iso(-1) }))).toBe('vencida')
    expect(healthStatus(rec({ due_date: iso(0) }))).toBe('proxima')
    expect(healthStatus(rec({ due_date: iso(3) }))).toBe('proxima')
    expect(healthStatus(rec({ due_date: iso(4) }))).toBe('pendiente')
  })

  it('la lista muestra nombre, estado y las acciones que le pasa la vista', () => {
    const w = mount(HealthRecordList, { props: { records: [rec({ due_date: iso(-2) }), rec({ id: 'r2', vaccine_name: 'Desparasitación', completed_at: '2026-10-01T00:00:00Z' })] }, slots: { actions: '<button class="act">x</button>' } })
    expect(w.text()).toContain('Antirrábica'); expect(w.text()).toContain('Vencida'); expect(w.text()).toContain('Completada')
    expect(w.findAll('.act')).toHaveLength(2)
    expect(mount(HealthRecordList, { props: { records: [] } }).text()).toContain('Aún no hay registros')
  })

  it('CA#4: al abrir su calendario se disparan los recordatorios y se ordena por fecha', async () => {
    db.tables.adoption_applications = { error: null, data: [{ id: 'a1', pets: { name: 'Coraje' }, vaccination_records: [rec({ id: 'b', due_date: iso(90) }), rec({ id: 'a', due_date: iso(10) })] }] }
    const store = useHealthStore()
    await store.fetchMyCalendar()
    expect(rpcCalls('refresh_my_health_reminders')).toHaveLength(1)
    expect(store.adoptions[0].vaccination_records.map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('CA#5: completar con comprobante lo sube a la carpeta del usuario y envía la ruta', async () => {
    const file = { name: 'cert.png', type: 'image/png', size: 2048 }
    const r = await useHealthStore().completeRecord('r1', file)
    expect(r.success).toBe(true)
    const up = db.calls.find((c) => c.bucket === 'health-proofs' && c.upload).upload
    expect(up).toMatch(/^u1\/[0-9a-f-]+\.png$/)
    expect(rpcCalls('complete_health_record')[0].params).toEqual({ p_id: 'r1', p_proof_path: up })
  })

  it('completar sin comprobante es válido (CA#5 lo deja opcional)', async () => {
    await useHealthStore().completeRecord('r1')
    expect(rpcCalls('complete_health_record')[0].params.p_proof_path).toBeNull()
    expect(db.calls.some((c) => c.upload)).toBe(false)
  })

  it('rechaza comprobantes que no son foto o pesan más de 5 MB, y limpia el archivo si la BD falla', async () => {
    const store = useHealthStore()
    expect((await store.completeRecord('r1', { name: 'x.pdf', type: 'application/pdf', size: 1 })).success).toBe(false)
    expect((await store.completeRecord('r1', { name: 'x.jpg', type: 'image/jpeg', size: 6 * 1024 * 1024 })).error).toContain('5 MB')
    expect(db.calls.filter((c) => c.upload || c.rpc === 'complete_health_record')).toHaveLength(0)
    db.rpc.complete_health_record = { data: null, error: { code: '22023', message: 'Este registro ya está completado' } }
    const r = await store.completeRecord('r1', { name: 'x.jpg', type: 'image/jpeg', size: 10 })
    expect(r.error).toBe('Este registro ya está completado')
    expect(db.calls.find((c) => c.remove).remove).toHaveLength(1)
  })

  it('el modal del adoptante confirma y avisa', async () => {
    const w = mount(CompleteHealthModal, { props: { record: rec(), petName: 'Coraje' }, ...transition })
    await w.findAll('button').find((b) => b.text() === 'Confirmar').trigger('click'); await flushPromises()
    expect(w.emitted('done')[0][0]).toContain('completado')
  })

  it('refugio: valida nombre y fecha, y agrega o edita con la RPC correcta', async () => {
    const store = useHealthStore()
    expect((await store.addRecord('a1', 'vacuna', ' ', '2026-12-01')).success).toBe(false)
    expect((await store.addRecord('a1', 'vacuna', 'Rabia', '')).success).toBe(false)
    expect(db.calls.filter((c) => c.rpc)).toHaveLength(0)

    const reload = vi.fn()
    const w = mount(HealthRecordModal, { props: { target: { applicationId: 'a1', petName: 'Coraje' }, reload }, ...transition })
    const save = w.findAll('button').find((b) => b.text() === 'Guardar')
    expect(save.attributes('disabled')).toBeDefined()
    await w.find('#health-name').setValue('Vacuna múltiple')
    await w.find('#health-due').setValue('2026-12-01')
    await save.trigger('click'); await flushPromises()
    expect(rpcCalls('add_health_record')[0].params).toEqual({ p_application_id: 'a1', p_kind: 'vacuna', p_name: 'Vacuna múltiple', p_due: '2026-12-01' })
    expect(reload).toHaveBeenCalled()

    await w.setProps({ target: { applicationId: 'a1', petName: 'Coraje', record: rec({ id: 'r9' }) } })
    expect(w.find('#health-name').element.value).toBe('Antirrábica')
    await w.findAll('button').find((b) => b.text() === 'Guardar').trigger('click'); await flushPromises()
    expect(rpcCalls('update_health_record')[0].params.p_id).toBe('r9')
  })

  it('la vista del adoptante muestra el estado vacío', async () => {
    const w = mount(HealthCalendarView, transition); await flushPromises()
    expect(w.text()).toContain('Aún no tienes mascotas adoptadas con calendario de salud')
  })

  it('la vista ofrece "Marcar como completada" solo en los registros pendientes', async () => {
    db.tables.adoption_applications = { error: null, data: [{ id: 'a1', pets: { name: 'Coraje' }, vaccination_records: [rec({ id: 'a' }), rec({ id: 'b', completed_at: '2026-10-01T00:00:00Z' })] }] }
    const w = mount(HealthCalendarView, transition); await flushPromises()
    expect(w.findAll('button').filter((b) => b.text() === 'Marcar como completada')).toHaveLength(1)
    expect(w.text()).toContain('1 de 2 completados')
  })
})

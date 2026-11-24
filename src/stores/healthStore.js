import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabaseClient'
import { useAuthStore } from './authStore'
import { toUserError } from './petStore'

export const HEALTH_KINDS = [
  { value: 'vacuna', label: 'Vacuna', icon: 'vaccines' },
  { value: 'desparasitacion', label: 'Desparasitación', icon: 'pest_control' }
]
export const PROOF_MAX_MB = 5
export const PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const PROOF_BUCKET = 'health-proofs'
const RPC_MESSAGE_CODES = ['22023', '42501', 'P0002']

// Estado visual de un registro: completada, vencida (fecha pasada), próxima (≤3 días) o pendiente.
export function healthStatus(rec, today = new Date()) {
  if (rec.completed_at) return 'completada'
  const [y, m, d] = String(rec.due_date).split('-').map(Number)
  const days = Math.round((new Date(y, m - 1, d) - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000)
  if (days < 0) return 'vencida'
  return days <= 3 ? 'proxima' : 'pendiente'
}

// HU-46: calendario de salud (adoptante: ver y completar · refugio: editar).
export const useHealthStore = defineStore('health', () => {
  const adoptions = ref([])
  const loading = ref(false)
  const error = ref(null)

  function fail(e, scope) {
    console.error('[healthStore]', scope, e)
    error.value = RPC_MESSAGE_CODES.includes(e?.code) && e?.message ? e.message : toUserError(e)
    return { success: false, error: error.value }
  }
  const localError = (message) => { error.value = message; return { success: false, error: message } }

  // Adopciones del adoptante con su calendario. Antes dispara sus recordatorios pendientes (respaldo del cron).
  async function fetchMyCalendar() {
    loading.value = true
    error.value = null
    try {
      const userId = useAuthStore().user?.id
      if (!userId) throw Object.assign(new Error('Debes iniciar sesión para continuar.'), { isFormError: true })
      await supabase.rpc('refresh_my_health_reminders')
      const { data, error: queryError } = await supabase
        .from('adoption_applications')
        .select('id, pets(id, name, species, pet_images(image_url, is_primary)), vaccination_records(*)')
        .eq('user_id', userId)
        .eq('status', 'completada')
        .order('resolved_at', { ascending: false })
      if (queryError) throw queryError
      adoptions.value = (data || []).map((a) => ({ ...a, vaccination_records: [...(a.vaccination_records || [])].sort((x, y) => x.due_date.localeCompare(y.due_date)) }))
      return { success: true, data: adoptions.value }
    } catch (e) {
      return fail(e, 'fetchMyCalendar')
    } finally {
      loading.value = false
    }
  }

  // CA#4/#5: marca como completada; el comprobante es opcional.
  async function completeRecord(id, file = null) {
    error.value = null
    if (file && !PROOF_TYPES.includes(file.type)) return localError('El comprobante debe ser una foto (JPG, PNG o WebP).')
    if (file && file.size > PROOF_MAX_MB * 1024 * 1024) return localError(`El comprobante no puede superar los ${PROOF_MAX_MB} MB.`)
    let path = null
    try {
      if (file) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
        path = `${useAuthStore().user?.id}/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage.from(PROOF_BUCKET).upload(path, file, { upsert: false })
        if (uploadError) throw uploadError
      }
      const { data, error: rpcError } = await supabase.rpc('complete_health_record', { p_id: id, p_proof_path: path })
      if (rpcError) throw rpcError
      await fetchMyCalendar()
      return { success: true, data }
    } catch (e) {
      if (path) await supabase.storage.from(PROOF_BUCKET).remove([path])
      return fail(e, 'completeRecord')
    }
  }

  async function getProofUrl(path) {
    const { data, error: urlError } = await supabase.storage.from(PROOF_BUCKET).createSignedUrl(path, 3600)
    return urlError ? null : data.signedUrl
  }

  // Refugio: alta, edición y baja. Después recarga la vista que lo llamó (callback `reload`).
  async function rpcThenReload(scope, fn, params, reload) {
    error.value = null
    try {
      const { data, error: rpcError } = await supabase.rpc(fn, params)
      if (rpcError) throw rpcError
      if (reload) await reload()
      return { success: true, data }
    } catch (e) {
      return fail(e, scope)
    }
  }

  function addRecord(applicationId, kind, name, due, reload) {
    if (String(name || '').trim().length < 2) return Promise.resolve(localError('Escribe el nombre de la vacuna o tratamiento.'))
    if (!due) return Promise.resolve(localError('La fecha es obligatoria.'))
    return rpcThenReload('addRecord', 'add_health_record', { p_application_id: applicationId, p_kind: kind, p_name: name, p_due: due }, reload)
  }
  function updateRecord(id, kind, name, due, reload) {
    if (String(name || '').trim().length < 2) return Promise.resolve(localError('Escribe el nombre de la vacuna o tratamiento.'))
    if (!due) return Promise.resolve(localError('La fecha es obligatoria.'))
    return rpcThenReload('updateRecord', 'update_health_record', { p_id: id, p_kind: kind, p_name: name, p_due: due }, reload)
  }
  const deleteRecord = (id, reload) => rpcThenReload('deleteRecord', 'delete_health_record', { p_id: id }, reload)

  return { adoptions, loading, error, fetchMyCalendar, completeRecord, getProofUrl, addRecord, updateRecord, deleteRecord }
})

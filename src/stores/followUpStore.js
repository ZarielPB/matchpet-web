import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabaseClient'
import { useAuthStore } from './authStore'
import { toUserError } from './petStore'

export const FOLLOW_UP_TYPES = [
  { value: 'llamada', label: 'Llamada', icon: 'call' },
  { value: 'visita', label: 'Visita', icon: 'home' },
  { value: 'mensaje', label: 'Mensaje', icon: 'chat' }
]
export const REPORT_CATEGORIES = ['Comportamiento', 'Salud', 'Duda general', 'Otro']
export const REPORT_DESC_MIN = 10
export const ATTACHMENT_MAX_MB = 10
export const ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
const ATTACHMENT_BUCKET = 'report-attachments'

// Las RPC lanzan mensajes ya redactados en español: se muestran tal cual.
const RPC_MESSAGE_CODES = ['22023', '42501', 'P0002']

const PET_SELECT = 'id, name, species, pet_images(image_url, is_primary)'

// HU-44/45 (notas de seguimiento) y HU-47/48 (reportes post-adopción).
export const useFollowUpStore = defineStore('followUp', () => {
  const adoptions = ref([])
  const reports = ref([])
  const loading = ref(false)
  const error = ref(null)

  function fail(e, scope) {
    console.error('[followUpStore]', scope, e)
    error.value = RPC_MESSAGE_CODES.includes(e?.code) && e?.message ? e.message : toUserError(e)
    return { success: false, error: error.value }
  }

  function localError(message) {
    error.value = message
    return { success: false, error: message }
  }

  const byDateDesc = (a, b) => (b.noted_at || '').localeCompare(a.noted_at || '') || (b.created_at || '').localeCompare(a.created_at || '')

  function sortChildren(rows) {
    rows.forEach((r) => {
      r.follow_up_notes?.sort(byDateDesc)
      r.post_adoption_reports?.sort((a, b) => b.created_at.localeCompare(a.created_at))
    })
    return rows
  }

  // HU-45: adopciones del adoptante con su historial (RLS + filtro por user_id).
  async function fetchMyAdoptions() {
    loading.value = true
    error.value = null
    try {
      const userId = useAuthStore().user?.id
      if (!userId) throw Object.assign(new Error('Debes iniciar sesión para continuar.'), { isFormError: true })
      const { data, error: queryError } = await supabase
        .from('adoption_applications')
        .select(`id, resolved_at, pets(${PET_SELECT}, shelters(shelter_name, city)), adoption_deliveries(delivered_at), follow_up_notes(*), post_adoption_reports(*)`)
        .eq('user_id', userId)
        .eq('status', 'completada')
        .order('resolved_at', { ascending: false })
      if (queryError) throw queryError
      adoptions.value = sortChildren(data || [])
      return { success: true, data: adoptions.value }
    } catch (e) {
      return fail(e, 'fetchMyAdoptions')
    } finally {
      loading.value = false
    }
  }

  async function getMyShelterId() {
    const userId = useAuthStore().user?.id
    if (!userId) throw Object.assign(new Error('Debes iniciar sesión para continuar.'), { isFormError: true })
    const { data, error: shelterError } = await supabase.from('shelters').select('id').eq('user_id', userId).maybeSingle()
    if (shelterError) throw shelterError
    return data?.id || null
  }

  // HU-44: adopciones entregadas del refugio con su historial de notas.
  async function fetchShelterAdoptions() {
    loading.value = true
    error.value = null
    try {
      const shelterId = await getMyShelterId()
      if (!shelterId) {
        adoptions.value = []
        return { success: true, data: [] }
      }
      const { data, error: queryError } = await supabase
        .from('adoption_applications')
        .select(`id, resolved_at, pets!inner(${PET_SELECT}, shelter_id), profiles!user_id(full_name), adoption_deliveries(delivered_at), follow_up_notes(*), post_adoption_reports(id, status)`)
        .eq('pets.shelter_id', shelterId)
        .eq('status', 'completada')
        .order('resolved_at', { ascending: false })
      if (queryError) throw queryError
      adoptions.value = sortChildren(data || [])
      return { success: true, data: adoptions.value }
    } catch (e) {
      return fail(e, 'fetchShelterAdoptions')
    } finally {
      loading.value = false
    }
  }

  // HU-48: bandeja de reportes del refugio.
  async function fetchShelterReports() {
    loading.value = true
    error.value = null
    try {
      const shelterId = await getMyShelterId()
      if (!shelterId) {
        reports.value = []
        return { success: true, data: [] }
      }
      const { data, error: queryError } = await supabase
        .from('post_adoption_reports')
        .select(`*, pets(${PET_SELECT}), profiles!user_id(full_name)`)
        .eq('shelter_id', shelterId)
        .order('created_at', { ascending: false })
      if (queryError) throw queryError
      reports.value = data || []
      return { success: true, data: reports.value }
    } catch (e) {
      return fail(e, 'fetchShelterReports')
    } finally {
      loading.value = false
    }
  }

  async function addNote(applicationId, type, notedAt, notes) {
    error.value = null
    if (String(notes || '').trim().length < 3) return localError('Escribe las observaciones del seguimiento.')
    try {
      const { data, error: rpcError } = await supabase.rpc('add_follow_up_note', {
        p_application_id: applicationId,
        p_type: type,
        p_noted_at: notedAt || null,
        p_notes: notes
      })
      if (rpcError) throw rpcError
      await fetchShelterAdoptions()
      return { success: true, data }
    } catch (e) {
      return fail(e, 'addNote')
    }
  }

  // HU-47: adjunto opcional (foto/video) en bucket privado, carpeta del propio usuario.
  async function createReport(applicationId, category, description, file = null) {
    error.value = null
    if (String(description || '').trim().length < REPORT_DESC_MIN) {
      return localError(`Describe el problema con al menos ${REPORT_DESC_MIN} caracteres.`)
    }
    if (file && !ATTACHMENT_TYPES.includes(file.type)) return localError('El adjunto debe ser una foto (JPG, PNG, WebP) o un video (MP4, WebM).')
    if (file && file.size > ATTACHMENT_MAX_MB * 1024 * 1024) return localError(`El adjunto no puede superar los ${ATTACHMENT_MAX_MB} MB.`)

    let path = null
    try {
      if (file) {
        const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
        path = `${useAuthStore().user?.id}/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage.from(ATTACHMENT_BUCKET).upload(path, file, { upsert: false })
        if (uploadError) throw uploadError
      }
      const { data, error: rpcError } = await supabase.rpc('create_post_adoption_report', {
        p_application_id: applicationId,
        p_category: category,
        p_description: description,
        p_attachment_path: path
      })
      if (rpcError) throw rpcError
      await fetchMyAdoptions()
      return { success: true, data }
    } catch (e) {
      if (path) await supabase.storage.from(ATTACHMENT_BUCKET).remove([path]) // no dejar huérfanos
      return fail(e, 'createReport')
    }
  }

  // URL temporal para ver el adjunto (el bucket es privado).
  async function getAttachmentUrl(path) {
    const { data, error: urlError } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrl(path, 3600)
    return urlError ? null : data.signedUrl
  }

  async function respondReport(reportId, response, visitDate, close) {
    error.value = null
    if (String(response || '').trim().length < 5) return localError('Escribe una respuesta de orientación.')
    try {
      const { data, error: rpcError } = await supabase.rpc('respond_post_adoption_report', {
        p_id: reportId,
        p_response: response,
        p_visit_date: visitDate || null,
        p_close: !!close
      })
      if (rpcError) throw rpcError
      await fetchShelterReports()
      return { success: true, data }
    } catch (e) {
      return fail(e, 'respondReport')
    }
  }

  return { adoptions, reports, loading, error, fetchMyAdoptions, fetchShelterAdoptions, fetchShelterReports, addNote, createReport, getAttachmentUrl, respondReport }
})

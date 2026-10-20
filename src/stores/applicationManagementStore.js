import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '../services/supabaseClient'
import { useAuthStore } from './authStore'
import { toUserError } from './petStore'
import { APPLICATION_STATUS } from './applicationStore'

export const REJECT_REASON_MIN = 10

// pets!inner permite filtrar por shelter_id; adopter_profiles y
// compatibility_profiles cuelgan de profiles (1:1), no de la solicitud.
const RECEIVED_SELECT = `
  *,
  pets!inner(id, name, species, status, shelter_id, pet_images(image_url, is_primary)),
  profiles!user_id(id, full_name, email, adopter_profiles(*), compatibility_profiles(*)),
  adoption_deliveries(*)
`

const RECORD_SELECT = `
  *,
  pets(*, shelters(*)),
  profiles!user_id(id, full_name, email, adopter_profiles(*), compatibility_profiles(*)),
  adoption_deliveries(*)
`

// Las RPC lanzan mensajes ya redactados en español (22023 / 42501 / P0002):
// se muestran tal cual en vez del texto genérico de translateDbError.
const RPC_MESSAGE_CODES = ['22023', '42501', 'P0002']

// HU-38 (panel), HU-39 (aprobar), HU-40 (rechazar), HU-42 (entrega formal).
export const useApplicationManagementStore = defineStore('applicationManagement', () => {
  const receivedApplications = ref([])
  const loading = ref(false)
  const error = ref(null)
  const filter = ref('todas')

  const pendingCount = computed(
    () => receivedApplications.value.filter((a) => a.status === APPLICATION_STATUS.PENDIENTE).length
  )
  const filteredApplications = computed(() =>
    filter.value === 'todas'
      ? receivedApplications.value
      : receivedApplications.value.filter((a) => a.status === filter.value)
  )

  function fail(e, scope) {
    console.error('[applicationManagementStore]', scope, e)
    const friendly = RPC_MESSAGE_CODES.includes(e?.code) && e?.message ? e.message : null
    error.value = friendly || toUserError(e)
    return { success: false, error: error.value }
  }

  function localError(message) {
    error.value = message
    return { success: false, error: message }
  }

  async function fetchReceivedApplications() {
    loading.value = true
    error.value = null
    try {
      const userId = useAuthStore().user?.id
      if (!userId) throw Object.assign(new Error('Debes iniciar sesión para continuar.'), { isFormError: true })

      const { data: shelter, error: shelterError } = await supabase
        .from('shelters')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()
      if (shelterError) throw shelterError
      if (!shelter) {
        receivedApplications.value = []
        return { success: true, data: [] }
      }

      const { data, error: queryError } = await supabase
        .from('adoption_applications')
        .select(RECEIVED_SELECT)
        .eq('pets.shelter_id', shelter.id)
        .order('created_at', { ascending: false })
      if (queryError) throw queryError
      receivedApplications.value = data || []
      return { success: true, data: receivedApplications.value }
    } catch (e) {
      return fail(e, 'fetchReceivedApplications')
    } finally {
      loading.value = false
    }
  }

  // HU-43: datos consolidados de una adopción (RLS limita a las del refugio).
  async function fetchAdoptionRecord(applicationId) {
    error.value = null
    try {
      const { data, error: queryError } = await supabase
        .from('adoption_applications')
        .select(RECORD_SELECT)
        .eq('id', applicationId)
        .single()
      if (queryError) throw queryError
      return { success: true, data }
    } catch (e) {
      return fail(e, 'fetchAdoptionRecord')
    }
  }

  // Ejecuta la RPC y, si salió bien, recarga la lista.
  async function callRpc(scope, fn, params) {
    error.value = null
    try {
      const { data, error: rpcError } = await supabase.rpc(fn, params)
      if (rpcError) throw rpcError
      await fetchReceivedApplications()
      return { success: true, data }
    } catch (e) {
      return fail(e, scope)
    }
  }

  function approve(applicationId, comments) {
    return callRpc('approve', 'resolve_adoption_application', {
      p_id: applicationId,
      p_decision: 'aprobada',
      p_comments: comments || null
    })
  }

  function reject(applicationId, reason) {
    if (String(reason || '').trim().length < REJECT_REASON_MIN) {
      return localError(`El motivo del rechazo debe tener al menos ${REJECT_REASON_MIN} caracteres.`)
    }
    return callRpc('reject', 'resolve_adoption_application', {
      p_id: applicationId,
      p_decision: 'rechazada',
      p_comments: reason
    })
  }

  function registerDelivery(applicationId, deliveredAt, documents, observations) {
    if (!deliveredAt) return localError('La fecha de entrega es obligatoria.')
    return callRpc('registerDelivery', 'register_adoption_delivery', {
      p_id: applicationId,
      p_delivered_at: deliveredAt,
      p_documents: documents || [],
      p_observations: observations || null
    })
  }

  function setFilter(newFilter) {
    filter.value = newFilter
  }

  return {
    receivedApplications,
    loading,
    error,
    filter,
    pendingCount,
    filteredApplications,
    fetchReceivedApplications,
    fetchAdoptionRecord,
    approve,
    reject,
    registerDelivery,
    setFilter
  }
})

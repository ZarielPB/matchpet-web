import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabaseClient'
import { useAuthStore } from './authStore'
import { toUserError } from './petStore'

export const APPLICATION_STATUS = {
  PENDIENTE: 'pendiente',
  APROBADA: 'aprobada',
  RECHAZADA: 'rechazada',
  CANCELADA: 'cancelada',
  COMPLETADA: 'completada'
}

export const MESSAGE_MIN = 10
export const MESSAGE_MAX = 500

const APPLICATION_SELECT =
  '*, pets(id, name, species, status, pet_images(image_url, is_primary), shelters(shelter_name, city))'

// HU-35 (enviar), HU-36 (listar propias), HU-37 (cancelar).
export const useApplicationStore = defineStore('applications', () => {
  const applications = ref([])
  const loading = ref(false)
  const error = ref('')

  function currentUserId() {
    const id = useAuthStore().user?.id
    if (!id) throw new Error('Debes iniciar sesión para continuar.')
    return id
  }

  function fail(e, scope) {
    console.error(`[applicationStore:${scope}]`, e?.code, e?.message)
    error.value = e?.message === 'Debes iniciar sesión para continuar.' || e?.isFormError ? e.message : toUserError(e)
    return { success: false, error: error.value }
  }

  // HU-36 CA#5: filtro estricto por user_id (además de RLS).
  async function fetchMyApplications() {
    loading.value = true
    error.value = ''
    try {
      const { data, error: queryError } = await supabase
        .from('adoption_applications')
        .select(APPLICATION_SELECT)
        .eq('user_id', currentUserId())
        .order('created_at', { ascending: false })
      if (queryError) throw queryError
      applications.value = data || []
      return { success: true, data: applications.value }
    } catch (e) {
      return fail(e, 'fetchMyApplications')
    } finally {
      loading.value = false
    }
  }

  // Solicitud abierta (pendiente/aprobada) del usuario para una mascota, o null.
  async function getOpenApplication(petId) {
    try {
      const { data, error: queryError } = await supabase
        .from('adoption_applications')
        .select('id, status')
        .eq('user_id', currentUserId())
        .eq('pet_id', petId)
        .in('status', [APPLICATION_STATUS.PENDIENTE, APPLICATION_STATUS.APROBADA])
        .maybeSingle()
      if (queryError) throw queryError
      return { success: true, data }
    } catch (e) {
      return fail(e, 'getOpenApplication')
    }
  }

  // HU-35 CA#3/#4/#5. El duplicado lo frena el índice único parcial (23505).
  async function createApplication(petId, message) {
    loading.value = true
    error.value = ''
    try {
      const text = String(message || '').trim()
      if (text.length < MESSAGE_MIN || text.length > MESSAGE_MAX) {
        const err = new Error(`El mensaje debe tener entre ${MESSAGE_MIN} y ${MESSAGE_MAX} caracteres.`)
        err.isFormError = true
        throw err
      }
      const { data, error: queryError } = await supabase
        .from('adoption_applications')
        .insert({ pet_id: petId, user_id: currentUserId(), message: text })
        .select()
        .single()
      if (queryError) throw queryError
      return { success: true, data }
    } catch (e) {
      return fail(e, 'createApplication')
    } finally {
      loading.value = false
    }
  }

  // HU-37: solo 'pendiente' → 'cancelada'. Si RLS no deja actualizar, 0 filas.
  async function cancelApplication(id) {
    error.value = ''
    try {
      const { data, error: queryError } = await supabase
        .from('adoption_applications')
        .update({ status: APPLICATION_STATUS.CANCELADA })
        .eq('id', id)
        .eq('status', APPLICATION_STATUS.PENDIENTE)
        .select()
      if (queryError) throw queryError
      if (!data?.length) {
        const err = new Error('La solicitud ya no está pendiente y no se puede cancelar.')
        err.isFormError = true
        throw err
      }
      const row = applications.value.find((a) => a.id === id)
      if (row) {
        row.status = data[0].status
        row.resolved_at = data[0].resolved_at
      }
      return { success: true, data: data[0] }
    } catch (e) {
      return fail(e, 'cancelApplication')
    }
  }

  return { applications, loading, error, fetchMyApplications, getOpenApplication, createApplication, cancelApplication }
})

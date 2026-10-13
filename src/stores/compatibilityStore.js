import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../services/supabaseClient'
import { useAuthStore } from './authStore'
import { PET_SELECT, toUserError } from './petStore'

// Valores canónicos: coinciden con los CHECK de public.compatibility_profiles.
export const HOURS_AT_HOME = ['menos_de_4', '4_a_8', 'mas_de_8']
export const ACTIVITY_LEVELS = ['bajo', 'moderado', 'alto']
export const SPACE_TYPES = ['pequeño', 'amplio']

// HU-31: respuestas del cuestionario (compatibility_profiles) y HU-32/33:
// recomendaciones calculadas por la función SQL match_recommendations().
export const useCompatibilityStore = defineStore('compatibility', () => {
  const answers = ref(null)
  const recommendations = ref([])
  const loading = ref(false)
  const error = ref('')

  function currentUserId() {
    const id = useAuthStore().user?.id
    if (!id) throw new Error('Debes iniciar sesión para continuar.')
    return id
  }

  function fail(e, scope) {
    console.error(`[compatibilityStore:${scope}]`, e?.code, e?.message)
    error.value = e?.message === 'Debes iniciar sesión para continuar.' ? e.message : toUserError(e)
    return { success: false, error: error.value }
  }

  // Devuelve { success, data } con data = fila o null si aún no hay cuestionario.
  async function fetchAnswers() {
    loading.value = true
    error.value = ''
    try {
      const { data, error: queryError } = await supabase
        .from('compatibility_profiles')
        .select('*')
        .eq('user_id', currentUserId())
        .maybeSingle()
      if (queryError) throw queryError
      answers.value = data
      return { success: true, data }
    } catch (e) {
      return fail(e, 'fetchAnswers')
    } finally {
      loading.value = false
    }
  }

  // HU-31 CA#5: UPSERT por user_id (PK) → sin duplicados.
  async function saveAnswers({ hours_at_home, activity_level, space_type, preferred_size }) {
    loading.value = true
    error.value = ''
    try {
      const { data, error: queryError } = await supabase
        .from('compatibility_profiles')
        .upsert(
          {
            user_id: currentUserId(),
            hours_at_home,
            activity_level,
            space_type,
            preferred_size: preferred_size || null
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single()
      if (queryError) throw queryError
      answers.value = data
      return { success: true, data }
    } catch (e) {
      return fail(e, 'saveAnswers')
    } finally {
      loading.value = false
    }
  }

  // HU-33: { success, needsQuiz?, data: [{ ...pet, score, top_dimension, reason }] }
  async function fetchRecommendations() {
    loading.value = true
    error.value = ''
    recommendations.value = []
    try {
      // Caso borde #1 del algoritmo: sin cuestionario no se ejecuta el motor.
      const { data: mine, error: mineError } = await supabase
        .from('compatibility_profiles')
        .select('user_id')
        .eq('user_id', currentUserId())
        .maybeSingle()
      if (mineError) throw mineError
      if (!mine) return { success: true, needsQuiz: true, data: [] }

      const { data: scores, error: rpcError } = await supabase.rpc('match_recommendations')
      if (rpcError) throw rpcError
      if (!scores?.length) return { success: true, data: [] }

      const { data: pets, error: petsError } = await supabase
        .from('pets')
        .select(PET_SELECT)
        .in('id', scores.map((s) => s.pet_id))
      if (petsError) throw petsError

      const byId = new Map((pets || []).map((p) => [p.id, p]))
      recommendations.value = scores
        .filter((s) => byId.has(s.pet_id))
        .map((s) => ({ ...byId.get(s.pet_id), score: s.score, top_dimension: s.top_dimension, reason: s.reason }))
      return { success: true, data: recommendations.value }
    } catch (e) {
      return fail(e, 'fetchRecommendations')
    } finally {
      loading.value = false
    }
  }

  return { answers, recommendations, loading, error, fetchAnswers, saveAnswers, fetchRecommendations }
})

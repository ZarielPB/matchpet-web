import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../services/supabaseClient'
import { translateAuthError } from '../utils/errorMessages'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const profile = ref(null)
  const loading = ref(false)
  // `authLoading` cubre la restauración de sesión: mientras es `true` el guard
  // de rutas debe esperar en lugar de expulsar al usuario a /login (HU-09).
  const authLoading = ref(true)
  const profileError = ref('')
  const accessDeniedMsg = ref('')
  const errorMsg = ref('')

  const isAuthenticated = computed(() => !!user.value)
  const userRole = computed(() => profile.value?.role || 'guest')
  // `sessionRestored` ya no se expone: el guard usa `authLoading`.
  const isAuthReady = computed(() => !authLoading.value)

  function buildUserMetadata(role, fullName, extra = {}) {
    const metadata = {
      full_name: String(fullName || '').trim() || 'Usuario',
      role,
      ...extra
    }
    for (const key of Object.keys(metadata)) {
      const value = metadata[key]
      if (value === null || value === undefined || value === '') {
        delete metadata[key]
      }
    }
    return metadata
  }

  // HU-09 CA#1: restaurar la sesión antes de que los guards decidan.
  // Escuchar cambios de sesión (útil para PWA y recargas).
  supabase.auth.onAuthStateChange((event, session) => {
    user.value = session?.user || null
    if (session?.user) {
      fetchProfile(session.user.id)
    } else {
      profile.value = null
      profileError.value = ''
    }
  })

  // HU-09 CA#4 / HU-08 CA#2: el rol se lee de `profiles.role`.
  async function fetchProfile(userId) {
    try {
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (queryError) {
        // Si el SELECT falla (RLS o migración pendiente) el usuario queda sin
        // perfil (rol 'guest'). Se registra y se expone en `profileError` para
        // que el guard pueda avisar en vez de rebotar en silencio.
        console.error(
          '[authStore:fetchProfile]',
          'code:', queryError?.code,
          '| message:', queryError?.message,
          '| details:', queryError?.details
        )
        profile.value = null
        profileError.value = translateAuthError(queryError)
        return null
      }

      profileError.value = ''
      profile.value = data
      return data
    } catch (e) {
      console.error('[authStore:fetchProfile] excepción inesperada:', e?.message)
      profile.value = null
      profileError.value = 'No se pudo verificar tu perfil en la base de datos.'
      return null
    }
  }

  // Promesa compartida: varias navegaciones simultáneas (F5 + redirecciones)
  // esperan al MISMO getSession en vez de observar `user === null` a mitad.
  let sessionPromise = null

  // Red de seguridad (QA Bug 3): si `public.profiles` no tiene fila para el
  // usuario autenticado (el trigger `handle_new_user` no corrió o se anuló),
  // TODA tabla con FK a `profiles` revienta con 23503 (p.ej.
  // `favorites.user_id`). La repara en caliente antes de escribir.
  async function ensureProfile() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        return { success: false, error: 'Debes iniciar sesión para continuar.' }
      }

      const { data: existing, error: readError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authUser.id)
        .maybeSingle()
      if (readError) throw readError

      if (existing) {
        if (!profile.value) await fetchProfile(authUser.id)
        return { success: true, profile: profile.value }
      }

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || 'Usuario',
          role: authUser.user_metadata?.role || 'adoptante'
        })
      if (upsertError) throw upsertError

      await fetchProfile(authUser.id)
      return { success: true, profile: profile.value }
    } catch (e) {
      console.error(
        '[authStore:ensureProfile]',
        'code:', e?.code,
        '| message:', e?.message,
        '| details:', e?.details
      )
      return {
        success: false,
        error: 'No se pudo verificar tu perfil. Por favor, cierra sesión y vuelve a ingresar.'
      }
    }
  }

  async function getSession() {
    if (sessionPromise) return sessionPromise

    authLoading.value = true
    sessionPromise = (async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          console.error('[authStore:getSession]', 'code:', sessionError?.code, '| message:', sessionError?.message)
        }
        user.value = data?.session?.user || null
        if (user.value) {
          await fetchProfile(user.value.id)
        } else {
          profile.value = null
          profileError.value = ''
        }
        return user.value
      } catch (e) {
        console.error('[authStore:getSession] fallo restaurando la sesión:', e?.message)
        user.value = null
        profile.value = null
        return null
      } finally {
        authLoading.value = false
      }
    })()

    try {
      return await sessionPromise
    } finally {
      sessionPromise = null
    }
  }

  // HU-01: Registro de Adoptante
  async function registerAdoptante(email, password, fullName, phone) {
    loading.value = true
    errorMsg.value = ''
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: buildUserMetadata('adoptante', fullName, { phone })
        }
      })

      if (signUpError) throw signUpError

      return { success: true }
    } catch (error) {
      errorMsg.value = translateAuthError(error)
      return { success: false, error: errorMsg.value }
    } finally {
      loading.value = false
    }
  }

  // HU-03: Registro de Refugio
  // El trigger `handle_new_user` (HU-11) crea la fila en `profiles`; la ficha
  // organizacional se guarda en `shelters` desde HU-14 (`/refugio/perfil`).
  async function registerRefugio(email, password, fullName, phone, shelterName, city, address) {
    loading.value = true
    errorMsg.value = ''
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: buildUserMetadata('refugio', fullName, {
            phone,
            shelter_name: shelterName,
            city,
            address
          })
        }
      })

      if (signUpError) throw signUpError

      return { success: true }
    } catch (error) {
      errorMsg.value = translateAuthError(error)
      return { success: false, error: errorMsg.value }
    } finally {
      loading.value = false
    }
  }

  // HU-02: Login (carga el perfil al instante para que el guard de roles,
  // HU-08 CA#2, tenga el rol disponible en la primera navegación).
  async function login(email, password) {
    loading.value = true
    errorMsg.value = ''
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError

      if (data.user) {
        await fetchProfile(data.user.id)
      }

      return { success: true }
    } catch (error) {
      errorMsg.value = translateAuthError(error)
      return { success: false, error: errorMsg.value }
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    user.value = null
    profile.value = null
    profileError.value = ''
    accessDeniedMsg.value = ''
    authLoading.value = false
  }

  // Mensaje que el guard (HU-08 CA#4) muestra en el panel del usuario.
  function setAccessDenied(message) {
    accessDeniedMsg.value = message || ''
  }

  function clearAccessDenied() {
    accessDeniedMsg.value = ''
  }

  return {
    user, profile, loading, authLoading, profileError, accessDeniedMsg, errorMsg,
    isAuthenticated, userRole, isAuthReady,
    getSession, fetchProfile, ensureProfile,
    registerAdoptante, registerRefugio, login, logout,
    setAccessDenied, clearAccessDenied
  }
})

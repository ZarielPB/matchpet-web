import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../services/supabaseClient'
import { translateAuthError } from '../utils/errorMessages'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const profile = ref(null)
  const loading = ref(false)
  const errorMsg = ref('')
  const sessionRestored = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const userRole = computed(() => profile.value?.role || 'guest')

  // Escuchar cambios de sesión (útil para PWA y recargas)
  supabase.auth.onAuthStateChange((event, session) => {
    user.value = session?.user || null
    if (session?.user) {
      fetchProfile(session.user.id)
    } else {
      profile.value = null
    }
  })

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (!error) profile.value = data
  }

  // Restaura la sesión desde localStorage ANTES de validar rutas.
  // Evita que un recargado directo (F5) de una ruta protegida expulse
  // al usuario mientras onAuthStateChange todavía no ha sincronizado.
  async function getSession() {
    if (sessionRestored.value) return user.value
    sessionRestored.value = true

    const { data } = await supabase.auth.getSession()
    user.value = data.session?.user || null
    if (data.session?.user) {
      await fetchProfile(data.session.user.id)
    } else {
      profile.value = null
    }
    return user.value
  }

  // HU-01: Registro de Adoptante
  async function registerAdoptante(email, password, fullName, phone) {
    loading.value = true
    errorMsg.value = ''
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: { data: { full_name: fullName } } // Metadata
      })
      
      if (error) throw error

      // Crear perfil en la tabla pública
      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          role: 'adoptante',
          full_name: fullName,
          phone: phone
        })
      }
      return { success: true }
    } catch (error) {
      errorMsg.value = translateAuthError(error)
      return { success: false, error: errorMsg.value }
    } finally {
      loading.value = false
    }
  }

  // HU-03: Registro de Refugio
  async function registerRefugio(email, password, fullName, phone, shelterName, city, address) {
    loading.value = true
    errorMsg.value = ''
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password 
      })
      
      if (error) throw error

      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          role: 'refugio',
          full_name: fullName,
          phone: phone,
          shelter_name: shelterName,
          shelter_city: city,
          shelter_address: address
        })
      }
      return { success: true }
    } catch (error) {
      errorMsg.value = translateAuthError(error)
      return { success: false, error: errorMsg.value }
    } finally {
      loading.value = false
    }
  }

  // HU-02: Login (Modificado para cargar el perfil al instante)
  async function login(email, password) {
    loading.value = true
    errorMsg.value = ''
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      
      // Cargar perfil inmediatamente después del login exitoso
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
  }

  return { 
    user, profile, loading, errorMsg, sessionRestored, isAuthenticated, userRole,
    getSession, fetchProfile, registerAdoptante, registerRefugio, login, logout 
  }
})

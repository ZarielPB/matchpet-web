import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../services/supabaseClient'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const profile = ref(null)
  const loading = ref(false)
  const errorMsg = ref('')

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
      errorMsg.value = error.message
      return { success: false, error: error.message }
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
      errorMsg.value = error.message
      return { success: false, error: error.message }
    } finally {
      loading.value = false
    }
  }

  // HU-02: Login
  async function login(email, password) {
    loading.value = true
    errorMsg.value = ''
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return { success: true }
    } catch (error) {
      errorMsg.value = 'Credenciales incorrectas'
      return { success: false }
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
    user, profile, loading, errorMsg, isAuthenticated, userRole,
    registerAdoptante, registerRefugio, login, logout 
  }
})

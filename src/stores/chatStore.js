import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../services/supabaseClient'
import { sendChat, ChatError, isAiConfigured } from '../services/aiClient'
import { useCompatibilityStore } from './compatibilityStore'

// El servicio acepta hasta 20 mensajes de 1000 caracteres por petición.
export const MAX_HISTORY = 20
export const MAX_CHARS = 1000
// Pasado este tiempo sin respuesta se avisa que el servicio está despertando (Render gratuito).
export const WAKING_AFTER_MS = 6000

const newSessionId = () => `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

// HU-34: conversación con el asistente. El historial vive en esta sesión del navegador (sessionStorage).
export const useChatStore = defineStore('chat', () => {
  const messages = ref([]) // { role: 'user' | 'assistant', content, error? }
  const sending = ref(false)
  const waking = ref(false)
  const remaining = ref(null)
  const sessionId = ref(newSessionId())

  const available = computed(() => isAiConfigured())
  const limitReached = computed(() => remaining.value === 0)

  async function getToken() {
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token || ''
  }

  function questionnaire() {
    const a = useCompatibilityStore().answers
    if (!a) return undefined
    const q = {}
    for (const k of ['hours_at_home', 'activity_level', 'space_type', 'preferred_size']) if (a[k]) q[k] = a[k]
    return Object.keys(q).length ? q : undefined
  }

  async function send(text) {
    const content = String(text || '').trim().slice(0, MAX_CHARS)
    if (!content || sending.value || limitReached.value) return { success: false }
    messages.value.push({ role: 'user', content })
    sending.value = true
    waking.value = false
    const wakeTimer = setTimeout(() => { waking.value = true }, WAKING_AFTER_MS)
    try {
      const history = messages.value.filter((m) => !m.error).slice(-MAX_HISTORY).map(({ role, content: c }) => ({ role, content: c }))
      const out = await sendChat({ sessionId: sessionId.value, messages: history, questionnaire: questionnaire(), token: await getToken() })
      messages.value.push({ role: 'assistant', content: out.reply, ...(out.fallback ? { error: true } : {}) })
      if (typeof out.remaining === 'number') remaining.value = out.remaining
      return { success: true }
    } catch (e) {
      const msg = e instanceof ChatError ? e.message : 'El asistente tuvo un problema. Intenta de nuevo.'
      messages.value.push({ role: 'assistant', content: msg, error: true })
      return { success: false, error: msg }
    } finally {
      clearTimeout(wakeTimer)
      sending.value = false
      waking.value = false
    }
  }

  function reset() {
    messages.value = []
    remaining.value = null
    sessionId.value = newSessionId()
  }

  return { messages, sending, waking, remaining, available, limitReached, send, reset }
})

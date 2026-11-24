// Cliente del microservicio de IA (HU-34 / HU-66). La URL sale de VITE_AI_API_URL (nunca va la clave de Gemini aquí).
export const AI_API_URL = (import.meta.env.VITE_AI_API_URL || '').replace(/\/+$/, '')

// El plan gratuito de Render duerme el servicio y tarda cerca de 1 minuto en despertar.
export const CHAT_TIMEOUT_MS = 70_000

export class ChatError extends Error {
  constructor(kind, message) {
    super(message)
    this.kind = kind // 'config' | 'auth' | 'timeout' | 'network' | 'server'
  }
}

export const isAiConfigured = () => Boolean(AI_API_URL)

/**
 * Envía el historial al asistente. Devuelve { reply, fallback, remaining }.
 * Lanza ChatError con un mensaje ya listo para mostrar al usuario.
 */
export async function sendChat({ sessionId, messages, questionnaire, token, timeoutMs = CHAT_TIMEOUT_MS, fetchImpl = fetch }) {
  if (!AI_API_URL) throw new ChatError('config', 'El asistente no está disponible por ahora.')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetchImpl(`${AI_API_URL}/api/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ session_id: sessionId, messages, ...(questionnaire ? { questionnaire } : {}) }),
      signal: controller.signal
    })
    if (res.status === 401) throw new ChatError('auth', 'Tu sesión venció. Inicia sesión de nuevo para usar el asistente.')
    if (!res.ok) throw new ChatError('server', 'El asistente tuvo un problema. Intenta de nuevo en unos minutos.')
    const data = await res.json()
    return { reply: data.reply, fallback: Boolean(data.fallback), remaining: data.remaining_messages }
  } catch (e) {
    if (e instanceof ChatError) throw e
    if (e?.name === 'AbortError') throw new ChatError('timeout', 'El asistente está pensando demasiado, intenta de nuevo.')
    throw new ChatError('network', 'No pude conectarme con el asistente. Revisa tu conexión e intenta de nuevo.')
  } finally {
    clearTimeout(timer)
  }
}

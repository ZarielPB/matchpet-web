import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../src/services/supabaseClient', () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: { access_token: 'tok-123' } } }) } }
}))

const okResponse = (body, status = 200) => ({ ok: status < 400, status, json: () => Promise.resolve(body) })

async function loadClient(url = 'https://ai.test') {
  vi.resetModules()
  vi.stubEnv('VITE_AI_API_URL', url)
  return import('../src/services/aiClient')
}

afterEach(() => vi.unstubAllEnvs())

describe('HU-34 / HU-66 — cliente del asistente', () => {
  it('usa VITE_AI_API_URL (sin barra final) y envía el token de sesión', async () => {
    const { sendChat } = await loadClient('https://ai.test/')
    const fetchImpl = vi.fn().mockResolvedValue(okResponse({ reply: 'Hola', remaining_messages: 19 }))
    const out = await sendChat({ sessionId: 'sesion-1234', messages: [{ role: 'user', content: 'hola' }], token: 'abc', fetchImpl })
    expect(out).toEqual({ reply: 'Hola', fallback: false, remaining: 19 })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://ai.test/api/v1/chat')
    expect(init.headers.Authorization).toBe('Bearer abc')
    expect(JSON.parse(init.body).session_id).toBe('sesion-1234')
  })

  it('sin VITE_AI_API_URL no está configurado y no llama a la red', async () => {
    const { sendChat, isAiConfigured } = await loadClient('')
    const fetchImpl = vi.fn()
    expect(isAiConfigured()).toBe(false)
    await expect(sendChat({ sessionId: 'x', messages: [], fetchImpl })).rejects.toMatchObject({ kind: 'config' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('traduce 401, 5xx, red caída y timeout a mensajes amables en español', async () => {
    const { sendChat } = await loadClient()
    const args = { sessionId: 'sesion-1234', messages: [{ role: 'user', content: 'hola' }] }
    await expect(sendChat({ ...args, fetchImpl: vi.fn().mockResolvedValue(okResponse({}, 401)) })).rejects.toMatchObject({ kind: 'auth' })
    await expect(sendChat({ ...args, fetchImpl: vi.fn().mockResolvedValue(okResponse({}, 502)) })).rejects.toMatchObject({ kind: 'server' })
    await expect(sendChat({ ...args, fetchImpl: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) })).rejects.toMatchObject({ kind: 'network' })
    const abort = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }))
    await expect(sendChat({ ...args, fetchImpl: abort })).rejects.toThrow('pensando demasiado')
  })
})

describe('HU-34 — store del chat', () => {
  beforeEach(() => setActivePinia(createPinia()))

  async function setup(fetchImpl) {
    vi.resetModules()
    vi.stubEnv('VITE_AI_API_URL', 'https://ai.test')
    vi.stubGlobal('fetch', fetchImpl)
    const { createPinia: cp, setActivePinia: sp } = await import('pinia')
    sp(cp())
    const { useChatStore } = await import('../src/stores/chatStore')
    return useChatStore()
  }

  it('guarda el historial, manda el token y descuenta los mensajes restantes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ reply: 'Con gusto', remaining_messages: 18 }))
    const chat = await setup(fetchMock)
    await chat.send('  ¿Qué cuidados necesita un gato senior?  ')
    expect(chat.messages).toEqual([
      { role: 'user', content: '¿Qué cuidados necesita un gato senior?' },
      { role: 'assistant', content: 'Con gusto' }
    ])
    expect(chat.remaining).toBe(18)
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok-123')
  })

  it('ante un fallo muestra el mensaje amable y no lo reenvía como historial', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(okResponse({ reply: 'Listo', remaining_messages: 5 }))
    const chat = await setup(fetchMock)
    await chat.send('hola')
    expect(chat.messages.at(-1)).toMatchObject({ role: 'assistant', error: true })
    await chat.send('otra vez')
    const sent = JSON.parse(fetchMock.mock.calls[1][1].body).messages
    expect(sent.map((m) => m.content)).toEqual(['hola', 'otra vez'])
  })

  it('al llegar al límite bloquea nuevos envíos; ignora mensajes vacíos', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ reply: 'Límite', fallback: true, remaining_messages: 0 }))
    const chat = await setup(fetchMock)
    expect((await chat.send('   ')).success).toBe(false)
    await chat.send('hola')
    expect(chat.limitReached).toBe(true)
    await chat.send('más')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('reset limpia la conversación', async () => {
    const chat = await setup(vi.fn().mockResolvedValue(okResponse({ reply: 'x', remaining_messages: 3 })))
    await chat.send('hola')
    chat.reset()
    expect(chat.messages).toEqual([])
    expect(chat.remaining).toBeNull()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// Unitarias de utilidades y stores (sin red): la base se simula.
const calls = []
const channelHandlers = {}
vi.mock('../src/services/supabaseClient', () => {
  const chain = new Proxy({}, { get: (_t, prop) => (prop === 'then' ? (res) => res({ data: [], error: null }) : (...a) => { calls.push([prop, ...a]); return chain }) })
  return {
    supabase: {
      from: (t) => { calls.push(['from', t]); return chain },
      rpc: () => Promise.resolve({ data: null, error: null }),
      channel: () => ({ on: (_e, _f, cb) => { channelHandlers.insert = cb; return { subscribe: () => ({}) } } }),
      removeChannel: () => {},
      auth: { getSession: () => Promise.resolve({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) }
    }
  }
})

import { validateConfirm, validateEmail, validatePassword } from '../src/utils/validators'
import { translateAuthError, translateDbError } from '../src/utils/errorMessages'
import { PET_SELECT, usePetStore } from '../src/stores/petStore'
import { useNotificationStore } from '../src/stores/notificationStore'
import { useApplicationStore, MESSAGE_MIN, MESSAGE_MAX } from '../src/stores/applicationStore'
import { useAuthStore } from '../src/stores/authStore'

beforeEach(() => { setActivePinia(createPinia()); calls.length = 0 })

describe('validadores', () => {
  it('correo', () => {
    for (const ok of ['a@b.co', 'valentina.mamani@matchpet.test']) expect(validateEmail(ok)).toBe('')
    for (const bad of ['', 'sin-arroba', 'a@b', 'a b@c.com', null, undefined]) expect(validateEmail(bad)).not.toBe('')
  })
  it('contraseña: mínimo 8 caracteres', () => {
    expect(validatePassword('1234567')).not.toBe('')
    expect(validatePassword('12345678')).toBe('')
  })
  it('confirmación: coincide y no está vacía', () => {
    expect(validateConfirm('abc12345', 'abc12345')).toBe('')
    expect(validateConfirm('abc12345', 'otra')).not.toBe('')
    expect(validateConfirm('', '')).not.toBe('')
  })
})

describe('traducción de errores', () => {
  it('auth: credenciales inválidas en español', () => {
    expect(translateAuthError('Invalid login credentials')).toMatch(/correo|contraseña|credenciales/i)
    expect(translateAuthError({ message: 'Email not confirmed' })).toMatch(/confirm/i)
  })
  it('BD: uuid inválido, duplicados y permisos tienen mensaje propio (nunca el texto crudo)', () => {
    expect(translateDbError({ code: '22P02', message: 'invalid input syntax for type uuid: "undefined"' })).toMatch(/identificador/i)
    expect(translateDbError({ code: '23505', message: 'duplicate key value violates unique constraint "uq_applications_open"' })).toMatch(/solicitud abierta/i)
    expect(translateDbError({ message: 'new row violates row-level security policy for table "pets"' })).toMatch(/permisos/i)
  })
  it('un error desconocido no deja el mensaje vacío', () => {
    expect(translateDbError({ message: 'algo raro' }).length).toBeGreaterThan(10)
    expect(translateDbError(undefined).length).toBeGreaterThan(10)
  })
})

describe('petStore: galería de imágenes (regresión del error "uuid undefined")', () => {
  it('la consulta de mascotas trae el id de cada imagen (sin él, editar la portada enviaba "undefined")', () => {
    expect(PET_SELECT).toMatch(/pet_images\(id,/)
  })
  it('cambiar portada o borrar una imagen sin id se rechaza con un mensaje claro y sin tocar la BD', async () => {
    const store = usePetStore()
    for (const r of [await store.setPrimaryImage('pet-1', undefined), await store.deletePetImage('pet-1', undefined), await store.setPrimaryImage(undefined, 'img-1')]) {
      expect(r.success).toBe(false)
      expect(r.error).toMatch(/identificar la imagen/i)
    }
    expect(calls.filter((c) => c[0] === 'from')).toHaveLength(0)
  })
  it('con ids válidos sí consulta la base', async () => {
    await usePetStore().setPrimaryImage('pet-1', 'img-1')
    expect(calls.some((c) => c[0] === 'from' && c[1] === 'pet_images')).toBe(true)
  })
})

describe('notificationStore: contador de no leídas y tiempo real', () => {
  it('un aviso nuevo por Realtime sube el contador y queda primero en la lista', () => {
    useAuthStore().user = { id: 'u1' }
    const store = useNotificationStore()
    store.subscribeToRealtime()
    channelHandlers.insert({ new: { id: 'n1', title: 'Nueva solicitud de adopción', is_read: false } })
    channelHandlers.insert({ new: { id: 'n2', title: 'Otra', is_read: false } })
    expect(store.unreadCount).toBe(2)
    expect(store.hasUnread).toBe(true)
    expect(store.notifications[0].id).toBe('n2')
  })
  it('sin sesión no se suscribe y devuelve un error controlado', () => {
    useAuthStore().user = null
    expect(useNotificationStore().subscribeToRealtime().success).toBe(false)
  })
})

describe('applicationStore: validación del mensaje (HU-35 CA#3)', () => {
  it('rechaza mensajes fuera de rango sin llamar a la BD', async () => {
    useAuthStore().user = { id: 'u1' }
    const store = useApplicationStore()
    for (const msg of ['', 'x'.repeat(MESSAGE_MIN - 1), 'x'.repeat(MESSAGE_MAX + 1), '   ']) {
      const r = await store.createApplication('pet-1', msg)
      expect(r.success).toBe(false)
    }
    expect(calls.filter((c) => c[0] === 'from')).toHaveLength(0)
  })
})

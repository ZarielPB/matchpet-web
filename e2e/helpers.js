import creds from './credentials.json' with { type: 'json' }

// PNG de 1x1 píxel (válido) para las subidas de imágenes.
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
export const png = (name) => ({ name, mimeType: 'image/png', buffer: PNG_1PX })

export async function login(page, who) {
  await page.goto('/login')
  await page.locator('input[type=email]').fill(creds[who].email)
  await page.locator('input[type=password]').first().fill(creds[who].password)
  await page.locator('form button[type=submit]').click()
  await page.waitForURL(/dashboard|catalogo/, { timeout: 30_000 })
  // La bienvenida (modal) tapa la pantalla la primera vez.
  const welcome = page.getByRole('button', { name: /Empezar el día|Empezar a explorar|Comenzar/i }).first()
  await welcome.click({ timeout: 4000 }).catch(() => {}) // aparece con un pequeño retraso; si no sale, seguimos
}

// La ventana de bienvenida puede salir con retraso y tapa la pantalla: se cierra si aparece.
export const dismissWelcome = (page) => page.getByRole('button', { name: /Empezar el día|Empezar a explorar|Comenzar/i }).first().click({ timeout: 3000 }).catch(() => {})

export const nav = (page, path) => page.goto(path).then(() => page.waitForLoadState('networkidle').catch(() => {}))

// Acepta todos los window.confirm / alert (el sistema los usa para confirmar acciones).
export const acceptDialogs = (page) => page.on('dialog', (d) => d.accept())

// Cliente de Supabase con la sesión de un usuario de demostración (RLS real): para preparar y limpiar datos.
import { createClient } from '@supabase/supabase-js'
export async function api(who) {
  const c = createClient(creds.supabase.url, creds.supabase.anonKey, { auth: { persistSession: false } })
  const { error } = await c.auth.signInWithPassword(creds[who])
  if (error) throw error
  return c
}

export async function openBell(page) {
  await page.locator('button[aria-label^="Notificaciones"]:visible').first().click()
  return page.locator('[role=dialog][aria-label="Notificaciones"]')
}

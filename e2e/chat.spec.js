import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

// HU-34 / HU-66: el widget de chat. El servicio de IA se simula (no gasta cuota de Gemini); la prueba
// contra el servicio real desplegado se hace a mano (CP-IA-01) o con AI_E2E_REAL=1.
const chatRoute = '**/api/v1/chat'

test.describe('asistente de IA', () => {
  test('el adoptante conversa, ve el historial y el servicio recibe su sesión', async ({ page }) => {
    let auth = ''
    await page.route(chatRoute, async (route) => {
      auth = route.request().headers().authorization || ''
      const body = route.request().postDataJSON()
      await route.fulfill({ json: { reply: `Respuesta ${body.messages.length}`, fallback: false, remaining_messages: 19 }, headers: { 'access-control-allow-origin': '*' } })
    })
    await login(page, 'adoptante')
    await page.getByRole('button', { name: 'Abrir asistente de IA' }).click()
    await page.getByLabel('Escribe tu pregunta').fill('¿Qué cuidados necesita un gato senior?')
    await page.getByRole('button', { name: 'Enviar mensaje' }).click()
    await expect(page.getByText('Respuesta 1')).toBeVisible()
    await page.getByLabel('Escribe tu pregunta').fill('¿Y la comida?')
    await page.keyboard.press('Enter')
    await expect(page.getByText('Respuesta 3')).toBeVisible() // el historial viaja completo
    await expect(page.getByText('¿Qué cuidados necesita un gato senior?')).toBeVisible()
    expect(auth).toMatch(/^Bearer .{20,}/)
  })

  test('si el servicio falla muestra un mensaje amable (nunca un error técnico)', async ({ page }) => {
    await page.route(chatRoute, (route) => route.abort('failed'))
    await login(page, 'adoptante')
    await page.getByRole('button', { name: 'Abrir asistente de IA' }).click()
    await page.getByLabel('Escribe tu pregunta').fill('hola')
    await page.getByRole('button', { name: 'Enviar mensaje' }).click()
    await expect(page.getByText(/No pude conectarme con el asistente/)).toBeVisible()
    await expect(page.getByText(/TypeError|Failed to fetch/)).toHaveCount(0)
  })

  test('el refugio no ve el asistente', async ({ page }) => {
    await login(page, 'refugio')
    await expect(page.getByRole('button', { name: 'Abrir asistente de IA' })).toHaveCount(0)
  })
})

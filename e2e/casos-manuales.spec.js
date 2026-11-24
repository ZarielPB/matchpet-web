import { test, expect } from '@playwright/test'
import { api, login, nav } from './helpers.js'

// HU-59: casos que el documento marcaba como "solo manuales" y que se pueden ejecutar contra cualquier entorno (BASE_URL).
test.describe('casos antes manuales', () => {
  test('CP-MAS-02: el formulario de mascota no guarda vacío ni con valores inválidos', async ({ page }) => {
    await login(page, 'refugio')
    await nav(page, '/refugio/mascotas')
    await page.getByRole('button', { name: /Registrar mascota/ }).click()
    await page.locator('form button[type=submit]').click()
    await expect(page.getByText('Mascota registrada correctamente.')).toHaveCount(0)
    await expect(page.locator('#pet-name')).toBeVisible()
    await page.locator('#pet-name').fill('E2E Invalida')
    await page.locator('#pet-age').fill('-1')
    await page.locator('#pet-weight').fill('abc').catch(() => {}) // type=number no admite texto
    await page.locator('#pet-description').fill('x'.repeat(520))
    await page.locator('form button[type=submit]').click()
    await expect(page.getByText('Mascota registrada correctamente.')).toHaveCount(0)
    const pets = await (await api('refugio')).from('pets').select('id').ilike('name', 'E2E Invalida')
    expect(pets.data).toHaveLength(0)
  })

  test('CP-CAT-02: búsqueda sin resultados y favorito sin sesión', async ({ page }) => {
    await nav(page, '/catalogo')
    await page.getByPlaceholder('Buscar por nombre, raza...').fill('zzzzzz')
    await expect(page.locator('article')).toHaveCount(0)
    await page.getByLabel('Limpiar búsqueda').click()
    await expect(page.locator('article').first()).toBeVisible()
    await page.locator('article').first().getByRole('button', { name: /favorit/i }).click()
    await expect(page).toHaveURL(/login/)
  })

  test('CP-SEG-02: no se registra la entrega de una solicitud que no está aprobada', async () => {
    const shelter = await api('refugio')
    const { data: apps } = await shelter.from('adoption_applications').select('id,status').in('status', ['pendiente', 'rechazada', 'cancelada']).limit(1)
    test.skip(!apps?.length, 'no hay solicitud pendiente o rechazada para probar')
    const r = await shelter.rpc('register_adoption_delivery', { p_id: apps[0].id, p_delivered_at: '2026-01-01', p_documents: [], p_observations: null })
    expect(r.error).not.toBeNull()
  })

  test('CP-IA-02 (c): el servicio de IA exige iniciar sesión', async ({ request }) => {
    const r = await request.post('https://matchpet-ai.onrender.com/api/v1/chat', { data: { messages: [{ role: 'user', content: 'hola' }] }, timeout: 90_000 })
    expect(r.status()).toBe(401)
  })
})

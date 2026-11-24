import { test, expect } from '@playwright/test'
import { acceptDialogs, api, login, nav } from './helpers.js'

test.describe('adoptante', () => {
  test('catálogo: buscar, filtrar, ver detalle y gestionar favoritos', async ({ page }) => {
    await login(page, 'adoptante')
    await nav(page, '/catalogo')
    const cards = page.locator('article')
    await expect(cards.first()).toBeVisible()
    const total = await cards.count()

    await page.getByPlaceholder('Buscar por nombre, raza...').fill('Benito')
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toContainText('Benito')

    await page.getByLabel('Limpiar búsqueda').click()
    await page.getByLabel('Filtrar por especie').selectOption('gato')
    await expect(cards.filter({ hasText: /perro/i })).toHaveCount(0) // se reintenta hasta que el filtro actualiza la lista
    await expect(cards.first()).toBeVisible()
    await page.getByLabel('Filtrar por especie').selectOption('')
    expect(await cards.count()).toBeGreaterThanOrEqual(Math.min(total, 1))

    // Favorito: marcar, verlo en la lista y quitarlo
    await page.getByPlaceholder('Buscar por nombre, raza...').fill('Benito')
    await expect(cards).toHaveCount(1) // esperar a que termine de filtrar antes de hacer clic
    const card = cards.first()
    await card.getByRole('button', { name: /favoritos/ }).click()
    await expect(card.getByRole('button', { name: 'Quitar de favoritos' })).toBeVisible()
    await nav(page, '/favoritos')
    await expect(page.locator('article', { hasText: 'Benito' })).toBeVisible()
    await page.locator('article', { hasText: 'Benito' }).getByRole('button', { name: 'Quitar de favoritos' }).click()
    await expect(page.locator('article', { hasText: 'Benito' })).toHaveCount(0)

    // Detalle
    await nav(page, '/catalogo')
    await page.getByPlaceholder('Buscar por nombre, raza...').fill('Benito')
    await expect(page.locator('article')).toHaveCount(1)
    await page.locator('article', { hasText: 'Benito' }).first().click()
    await page.waitForURL(/\/mascota\//)
    await expect(page.getByRole('heading', { name: 'Benito' }).first()).toBeVisible()
    await expect(page.locator('body')).not.toContainText('undefined')
  })

  test('cuestionario y recomendaciones: editar, guardar y ver el ranking ordenado', async ({ page }) => {
    const me = await api('adoptante')
    const { data: { user } } = await me.auth.getUser()
    const { data: original } = await me.from('compatibility_profiles').select('*').eq('user_id', user.id).single()
    try {
      await login(page, 'adoptante')
      await nav(page, '/adoptante/cuestionario')
      await page.locator('label', { hasText: 'Amplio' }).first().click()
      await page.getByRole('button', { name: 'Siguiente' }).click()
      await page.getByRole('button', { name: /Guardar cambios|Finalizar/ }).click()
      await expect(page.getByText(/Cuestionario completado|guardad/i).first()).toBeVisible()
      await page.waitForURL(/recomendaciones/, { timeout: 15_000 }).catch(() => nav(page, '/adoptante/recomendaciones'))
      await expect(page.locator('article').first()).toBeVisible()
      const scores = (await page.locator('[aria-label^="Compatibilidad"]').evaluateAll((els) => els.map((e) => Number(e.getAttribute('aria-label').match(/(\d+)%/)[1]))))
      expect(scores.length).toBeGreaterThan(0)
      expect([...scores].sort((a, b) => b - a)).toEqual(scores) // orden descendente
    } finally {
      await me.from('compatibility_profiles').update({ space_type: original.space_type }).eq('user_id', user.id)
    }
  })

  test('solicitud: enviar, ver "pendiente" y cancelar; el refugio recibe ambos avisos', async ({ page }) => {
    acceptDialogs(page)
    const startedAt = new Date().toISOString() // los avisos de corridas anteriores no cuentan
    const shelter = await api('refugio')
    const { data: { user: shUser } } = await shelter.auth.getUser()
    const { data: sh } = await shelter.from('shelters').select('id').eq('user_id', shUser.id).single()
    const { data: pet } = await shelter.from('pets').insert({ shelter_id: sh.id, name: 'E2E Cancelar', species: 'perro', size: 'mediano', health_status: 'Saludable', description: 'Mascota temporal para probar cancelar una solicitud.', age_years: 2, status: 'disponible' }).select('id').single()
    try {
      await login(page, 'adoptante')
      await nav(page, `/mascota/${pet.id}`)
      await page.getByRole('button', { name: /Solicitar Adopción/ }).first().click()
      await page.locator('#adoption-message').fill('1234') // demasiado corto
      await page.getByRole('button', { name: 'Enviar solicitud' }).click()
      await expect(page).toHaveURL(/mascota/)                   // no avanza
      await page.locator('#adoption-message').fill('Mensaje válido para enviar la solicitud de adopción.')
      await page.getByRole('button', { name: 'Enviar solicitud' }).click()
      await page.waitForURL(/solicitudes/)
      const li = page.locator('li', { hasText: 'E2E Cancelar' })
      await expect(li).toContainText('Pendiente')
      await li.getByRole('button', { name: 'Cancelar solicitud' }).click()
      await page.getByRole('button', { name: 'Sí, cancelar' }).click()
      await expect(li).toContainText('Cancelada')

      const { data: notifs } = await shelter.from('notifications').select('title, body').eq('user_id', shUser.id).ilike('body', '%E2E Cancelar%').gte('created_at', startedAt)
      expect(notifs.map((n) => n.title).sort()).toEqual(['Nueva solicitud de adopción', 'Solicitud cancelada'])
    } finally {
      await shelter.from('notifications').delete().ilike('body', '%E2E Cancelar%')
      await shelter.from('pets').delete().eq('id', pet.id)
    }
  })

  test('perfil: editar datos y guardarlos', async ({ page }) => {
    const me = await api('adoptante')
    const { data: { user } } = await me.auth.getUser()
    const { data: original } = await me.from('adopter_profiles').select('city').eq('user_id', user.id).single()
    try {
      await login(page, 'adoptante')
      await nav(page, '/adoptante/perfil')
      await page.locator('#city').fill('La Paz E2E')
      await page.getByRole('button', { name: 'Guardar Cambios' }).click()
      await expect(page.getByText(/actualiz|guardad|éxito/i).first()).toBeVisible()
      const { data: after } = await me.from('adopter_profiles').select('city').eq('user_id', user.id).single()
      expect(after.city).toBe('La Paz E2E')
    } finally {
      await me.from('adopter_profiles').update({ city: original.city }).eq('user_id', user.id)
    }
  })
})

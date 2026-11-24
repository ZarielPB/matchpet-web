import { test, expect } from '@playwright/test'
import { login, nav } from './helpers.js'

// HU-55: sin conexión se ve el aviso y las acciones (favoritos) esperan en cola hasta volver la red.
test('sin conexión: aviso, catálogo desde caché y favorito en cola que se envía al reconectar', async ({ page, context }) => {
  await login(page, 'adoptante')
  await nav(page, '/catalogo')
  const cards = page.locator('article')
  await expect(cards.first()).toBeVisible()
  const name = (await cards.first().locator('h2, h3').first().innerText()).trim()

  await context.setOffline(true)
  await expect(page.getByText('Estás navegando sin conexión')).toBeVisible()

  const card = cards.filter({ hasText: name }).first()
  const wasFavorite = (await card.getByRole('button', { name: 'Quitar de favoritos' }).count()) > 0
  await card.getByRole('button', { name: wasFavorite ? 'Quitar de favoritos' : /favoritos/ }).click()
  await expect(card.getByRole('button', { name: wasFavorite ? /Agregar a favoritos|favoritos/ : 'Quitar de favoritos' })).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('matchpet:offline-queue') || '[]').length)).toBe(1)

  await context.setOffline(false)
  await expect(page.getByText(/Conexión recuperada/)).toBeVisible({ timeout: 20_000 })
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('matchpet:offline-queue') || '[]').length)).toBe(0)

  // Limpieza: deja el favorito como estaba.
  await nav(page, '/catalogo')
  const again = page.locator('article').filter({ hasText: name }).first()
  const isFav = (await again.getByRole('button', { name: 'Quitar de favoritos' }).count()) > 0
  if (isFav !== wasFavorite) await again.getByRole('button', { name: isFav ? 'Quitar de favoritos' : /favoritos/ }).click()
})

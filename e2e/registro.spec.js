import { test, expect } from '@playwright/test'
import { acceptDialogs, nav, png } from './helpers.js'

// Sistema: recorrido de personas nuevas (registro real). Las cuentas e2e.*@matchpet.test se borran con
// DELETE FROM auth.users WHERE email LIKE 'e2e.%@matchpet.test'; (cascada a perfiles, refugios y mascotas).
const stamp = Date.now()
const PASS = 'Clave-E2E-2026!'

test('adoptante nuevo: registro -> perfil obligatorio para solicitar -> cuestionario -> recomendaciones', async ({ page }) => {
  const email = `e2e.adoptante.${stamp}@matchpet.test`
  await page.goto('/registro')
  await page.locator('#nombre').fill('Persona E2E Adoptante')
  await page.locator('#celular').fill('71234567')
  await page.locator('#correo').fill(email)
  await page.locator('input[type=password]').nth(0).fill(PASS)
  await page.locator('input[type=password]').nth(1).fill(PASS)
  await page.locator('input[type=checkbox]').first().check()
  await page.locator('form button[type=submit]').click()
  await page.waitForURL(/dashboard|catalogo|login|perfil/, { timeout: 30_000 })
  if (/login/.test(page.url())) { // si el registro devuelve al login, entrar con la cuenta nueva
    await page.locator('input[type=email]').fill(email); await page.locator('input[type=password]').first().fill(PASS)
    await page.locator('form button[type=submit]').click(); await page.waitForURL(/dashboard|catalogo/)
  }
  await page.getByRole('button', { name: /Empezar/i }).click({ timeout: 4000 }).catch(() => {})

  // Sin perfil de adoptante no se puede solicitar (HU-35 CA#1)
  await nav(page, '/catalogo')
  await page.getByPlaceholder('Buscar por nombre, raza...').fill('Benito')
  await expect(page.locator('article')).toHaveCount(1)
  await page.locator('article').first().click()
  await expect(page.getByText(/Completa tu perfil para solicitar/)).toBeVisible()

  // Completar perfil
  await nav(page, '/adoptante/perfil')
  await page.locator('#city').fill('La Paz')
  await page.locator('#housing-type').selectOption('casa')
  for (const name of ['has_yard', 'has_kids', 'has_other_pets']) await page.locator(`input[type=radio][value="false"]`).nth(['has_yard', 'has_kids', 'has_other_pets'].indexOf(name)).check()
  await page.locator('#experience-years').fill('2')
  await page.getByRole('button', { name: 'Guardar Cambios' }).click()
  await expect(page.getByText(/actualiz|guardad|éxito|completad/i).first()).toBeVisible()

  // Sin cuestionario no hay recomendaciones: invita a responderlo
  await nav(page, '/adoptante/recomendaciones')
  await expect(page.getByText(/cuestionario/i).first()).toBeVisible()
  await nav(page, '/adoptante/cuestionario')
  await page.locator('input[name=space][value="amplio"], input[type=radio][value="amplio"]').first().check({ force: true })
  await page.locator('input[name=preferred]').first().check({ force: true })
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await page.locator('input[name=hours][value="4_a_8"]').check({ force: true })
  await page.locator('input[name=activity][value="moderado"]').check({ force: true })
  await page.getByRole('button', { name: /Finalizar|Guardar cambios/ }).click()
  await page.waitForURL(/recomendaciones/, { timeout: 20_000 })
  await expect(page.locator('[aria-label^="Compatibilidad"]').first()).toBeVisible()

  // Con perfil completo ya puede solicitar
  await nav(page, '/catalogo')
  await page.getByPlaceholder('Buscar por nombre, raza...').fill('Benito')
  await expect(page.locator('article')).toHaveCount(1)
  await page.locator('article').first().click()
  await expect(page.getByRole('button', { name: /Solicitar Adopción/ }).first()).toBeVisible()
})

test('refugio nuevo: registro -> bloqueo sin perfil -> perfil -> primera mascota visible en el catálogo público', async ({ page, browser }) => {
  acceptDialogs(page)
  const email = `e2e.refugio.${stamp}@matchpet.test`
  await page.goto('/registro-refugio')
  await page.locator('#resp_name').fill('Responsable E2E')
  await page.locator('#resp_phone').fill('72345678')
  await page.locator('#shelter_name').fill('Refugio E2E Nuevo')
  await page.locator('#shelter_city').selectOption({ index: 1 })
  await page.locator('#shelter_address').fill('Calle Falsa 123')
  await page.locator('#shelter_email').fill(email)
  await page.locator('input[type=password]').nth(0).fill(PASS)
  await page.locator('input[type=password]').nth(1).fill(PASS)
  await page.locator('#accept-ethics').check()
  await page.locator('form button[type=submit]').click()
  await page.waitForURL(/dashboard|login/, { timeout: 30_000 })
  if (/login/.test(page.url())) {
    await page.locator('input[type=email]').fill(email); await page.locator('input[type=password]').first().fill(PASS)
    await page.locator('form button[type=submit]').click(); await page.waitForURL(/dashboard/)
  }
  await page.getByRole('button', { name: /Empezar/i }).click({ timeout: 4000 }).catch(() => {})

  // Las estadísticas de un refugio sin datos no deben romperse (estado vacío)
  await nav(page, '/refugio/estadisticas')
  await expect(page.locator('body')).not.toContainText('undefined')
  await expect(page.getByText(/No hay registros de adopciones/)).toBeVisible()
  await nav(page, '/refugio/dashboard')
  await expect(page.locator('body')).not.toContainText('NaN')

  // Mascotas: si no tiene ficha, se lo pide; si la registro la creó, permite registrar
  await nav(page, '/refugio/mascotas')
  const needsProfile = await page.getByText('Primero completa tu perfil de refugio').isVisible().catch(() => false)
  if (needsProfile) {
    await nav(page, '/refugio/perfil')
    await page.locator('#shelter-name').fill('Refugio E2E Nuevo')
    await page.locator('#shelter-description').fill('Refugio de prueba automática que rescata y da en adopción a perros y gatos.')
    await page.locator('#shelter-city').fill('La Paz')
    await page.getByRole('button', { name: 'Guardar Cambios' }).click()
    await expect(page.getByText(/actualiz|guardad|éxito|creado/i).first()).toBeVisible()
    await nav(page, '/refugio/mascotas')
  }
  await page.getByRole('button', { name: /Registrar mascota/ }).click()
  await page.locator('#pet-name').fill('E2E Primera')
  await page.locator('#pet-species').selectOption('gato')
  await page.locator('#pet-size').selectOption('pequeño')
  await page.locator('#pet-age').fill('1')
  await page.locator('#pet-health').fill('Saludable')
  await page.locator('#pet-description').fill('Primera mascota registrada por un refugio nuevo en la prueba.')
  await page.locator('#pet-image').setInputFiles([png('p.png')])
  await page.locator('form button[type=submit]').click()
  await expect(page.getByText('Mascota registrada correctamente.')).toBeVisible()

  // Aparece en el catálogo público (sin sesión)
  const anon = await browser.newContext(); const pub = await anon.newPage()
  await pub.goto('/catalogo'); await pub.getByPlaceholder('Buscar por nombre, raza...').fill('E2E Primera')
  await expect(pub.locator('article', { hasText: 'E2E Primera' })).toBeVisible()
  await anon.close()
})

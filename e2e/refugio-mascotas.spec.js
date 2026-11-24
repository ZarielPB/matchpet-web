import { test, expect } from '@playwright/test'
import { acceptDialogs, login, nav, png } from './helpers.js'

// Sistema: ciclo de vida de una mascota como refugio (alta, edición, portada, galería, estado, baja).
test('refugio: registrar, editar, cambiar portada, borrar imagen, cambiar estado y eliminar mascota', async ({ page }) => {
  acceptDialogs(page)
  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  await login(page, 'refugio')
  await nav(page, '/refugio/mascotas')

  // Alta con dos imágenes
  await page.getByRole('button', { name: /Registrar mascota/ }).click()
  await page.locator('#pet-name').fill('E2E Rayo')
  await page.locator('#pet-species').selectOption('perro')
  await page.locator('#pet-breed').fill('Mestizo')
  await page.locator('#pet-size').selectOption('mediano')
  await page.locator('#pet-age').fill('2')
  await page.locator('#pet-weight').fill('12.5')
  await page.locator('#pet-health').fill('Saludable y vacunado')
  await page.locator('#pet-description').fill('Mascota creada por la prueba automática de extremo a extremo.')
  await page.locator('#pet-image').setInputFiles([png('a.png'), png('b.png')])
  await page.locator('form button[type=submit]').click()
  await expect(page.getByText('Mascota registrada correctamente.')).toBeVisible()

  // Edición: abrir la tarjeta
  const card = page.locator('article', { hasText: 'E2E Rayo' })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Editar' }).click()
  await expect(page.getByText('Imágenes actuales')).toBeVisible()
  await expect(page.locator('ul li img[alt^="Imagen"]')).toHaveCount(2)

  // REGRESIÓN: cambiar la portada no debe fallar con "uuid undefined"
  await page.getByRole('button', { name: 'Marcar como principal' }).first().click()
  await expect(page.getByText('Foto principal actualizada.')).toBeVisible()
  await expect(page.locator('body')).not.toContainText('undefined')
  await expect(page.locator('body')).not.toContainText('El identificador ingresado no es válido')

  // Borrar una imagen
  await page.getByRole('button', { name: /^Eliminar imagen/ }).first().click()
  await expect(page.getByText('Imagen eliminada correctamente.')).toBeVisible()
  await expect(page.locator('ul li img[alt^="Imagen"]')).toHaveCount(1)

  // Editar datos
  await page.locator('#pet-description').fill('Descripción actualizada por la prueba automática, ya con más detalle.')
  await page.locator('form button[type=submit]').click()
  await expect(page.getByText('Información actualizada correctamente.')).toBeVisible()

  // Cambiar estado y volver a disponible
  const card2 = page.locator('article', { hasText: 'E2E Rayo' })
  await card2.locator('select').selectOption('en_proceso')
  await expect(page.getByText(/actualizado a "en_proceso"|actualizado a/)).toBeVisible()
  await card2.locator('select').selectOption('disponible')

  // Eliminar la mascota (limpieza)
  await page.locator('article', { hasText: 'E2E Rayo' }).getByRole('button', { name: 'Eliminar' }).click()
  await expect(page.getByText(/E2E Rayo fue eliminada del catálogo/)).toBeVisible()
  await expect(page.locator('article', { hasText: 'E2E Rayo' })).toHaveCount(0)

  expect(consoleErrors.filter((e) => !/favicon|placehold/.test(e))).toEqual([])
})

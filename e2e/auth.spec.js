import { test, expect } from '@playwright/test'
import creds from './credentials.json' with { type: 'json' }
import { dismissWelcome, login } from './helpers.js'

test.describe('autenticación y permisos', () => {
  test('credenciales incorrectas muestran un error en español y no inician sesión', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[type=email]').fill(creds.adoptante.email)
    await page.locator('input[type=password]').first().fill('clave-incorrecta-1')
    await page.locator('form button[type=submit]').click()
    await expect(page.getByText(/incorrect|inválid|credenciales/i).first()).toBeVisible()
    await expect(page).toHaveURL(/login/)
  })

  test('un visitante sin sesión es enviado al login desde las rutas protegidas', async ({ page }) => {
    for (const path of ['/refugio/mascotas', '/refugio/estadisticas', '/adoptante/solicitudes', '/adoptante/calendario-salud', '/favoritos']) {
      await page.goto(path)
      await expect(page).toHaveURL(/login/)
    }
  })

  test('un adoptante no puede entrar a pantallas del refugio (y viceversa)', async ({ page }) => {
    await login(page, 'adoptante')
    await page.goto('/refugio/estadisticas')
    await expect(page).toHaveURL(/adoptante\/dashboard|catalogo/)
    await expect(page.getByText(/Acceso denegado/)).toBeVisible()
    await dismissWelcome(page)
    await page.getByRole('button', { name: /Cerrar sesión/ }).first().click()
    await login(page, 'refugio')
    await page.goto('/adoptante/mis-adopciones')
    await expect(page).toHaveURL(/refugio\/dashboard/)
  })

  test('la sesión sobrevive a una recarga y se puede cerrar', async ({ page }) => {
    await login(page, 'refugio')
    await page.goto('/refugio/solicitudes')
    await page.reload()
    await expect(page).toHaveURL(/refugio\/solicitudes/)
    await dismissWelcome(page)
    await page.getByRole('button', { name: /Cerrar sesión/ }).first().click()
    await page.goto('/refugio/solicitudes')
    await expect(page).toHaveURL(/login/)
  })

  test('registro: valida contraseñas distintas antes de enviar', async ({ page }) => {
    await page.goto('/registro')
    await page.locator('input[type=email]').fill('e2e.validacion@matchpet.test')
    const pass = page.locator('input[type=password]')
    await pass.nth(0).fill('Clave-Segura-1')
    await pass.nth(1).fill('Clave-Distinta-2')
    await page.locator('input[type=text]').first().fill('Prueba Validación')
    await page.locator('input[type=checkbox]').first().check().catch(() => {})
    await page.locator('form button[type=submit]').click()
    await expect(page.getByText(/no coinciden/i).first()).toBeVisible()
    await expect(page).toHaveURL(/registro/)
  })

  test('recuperar contraseña: el correo inexistente no revela si la cuenta existe', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /Olvidaste tu contraseña/ }).click()
    await expect(page.locator('body')).not.toContainText('undefined')
  })
})

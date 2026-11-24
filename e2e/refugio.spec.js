import { test, expect } from '@playwright/test'
import { acceptDialogs, api, login, nav, openBell } from './helpers.js'

test.describe('refugio', () => {
  test('rechazar una solicitud: exige motivo, notifica a la adoptante y la mascota sigue disponible', async ({ page }) => {
    acceptDialogs(page)
    const shelter = await api('refugio'); const adopter = await api('adoptante')
    const { data: { user: shUser } } = await shelter.auth.getUser(); const { data: { user: adUser } } = await adopter.auth.getUser()
    const { data: sh } = await shelter.from('shelters').select('id').eq('user_id', shUser.id).single()
    const { data: pet } = await shelter.from('pets').insert({ shelter_id: sh.id, name: 'E2E Rechazo', species: 'gato', size: 'pequeño', health_status: 'Saludable', description: 'Mascota temporal para probar el rechazo de una solicitud.', age_years: 3, status: 'disponible' }).select('id').single()
    try {
      const { error } = await adopter.from('adoption_applications').insert({ pet_id: pet.id, user_id: adUser.id, message: 'Solicitud creada por la prueba de rechazo.' })
      expect(error).toBeNull()
      await login(page, 'refugio'); await nav(page, '/refugio/solicitudes')
      const row = page.locator('li', { hasText: 'E2E Rechazo' })
      await expect(row).toContainText('Pendiente')
      await row.getByRole('button', { name: 'Rechazar' }).click()
      const confirm = page.getByRole('button', { name: 'Confirmar Rechazo' })
      await expect(confirm).toBeDisabled()                         // sin motivo no se puede rechazar
      await page.getByRole('button', { name: 'No compatible con el estilo de vida' }).click()
      await confirm.click()
      await expect(row).toContainText('Rechazada')
      const { data: p } = await shelter.from('pets').select('status').eq('id', pet.id).single()
      expect(p.status).toBe('disponible')
      const { data: n } = await adopter.from('notifications').select('title, body').ilike('body', '%E2E Rechazo%')
      expect(n.some((x) => /Actualización de tu solicitud/.test(x.title))).toBe(true)
    } finally {
      await shelter.from('pets').delete().eq('id', pet.id)
      await adopter.from('notifications').delete().ilike('body', '%E2E Rechazo%')
    }
  })

  test('filtros del panel de solicitudes: "Pendientes" solo muestra pendientes', async ({ page }) => {
    await login(page, 'refugio'); await nav(page, '/refugio/solicitudes')
    const items = page.locator('ul > li')
    await expect(items.first()).toBeVisible()
    await page.getByRole('button', { name: 'Pendientes', exact: true }).click()
    await expect(items.filter({ hasNotText: 'Pendiente' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Completadas', exact: true }).click()
    await expect(items.filter({ hasNotText: 'Completada' })).toHaveCount(0)
  })

  test('calendario de salud: agregar un registro, editarlo y quitarlo', async ({ page }) => {
    acceptDialogs(page)
    await login(page, 'refugio'); await nav(page, '/refugio/seguimiento')
    const card = page.locator('ul > li', { hasText: 'Adoptante:' }).first()
    await expect(card).toBeVisible()
    await card.getByRole('button', { name: '+ Agregar' }).click()
    await page.locator('#health-name').fill('Vacuna E2E')
    await page.locator('#health-due').fill('2027-03-15')
    await page.getByRole('button', { name: 'Guardar', exact: true }).click()
    await expect(page.getByText('Registro agregado al calendario')).toBeVisible()
    const rec = card.locator('li', { hasText: 'Vacuna E2E' })
    await expect(rec).toBeVisible()
    await rec.getByRole('button', { name: 'Editar' }).click()
    await page.locator('#health-name').fill('Vacuna E2E editada')
    await page.getByRole('button', { name: 'Guardar', exact: true }).click()
    await expect(card.locator('li', { hasText: 'Vacuna E2E editada' })).toBeVisible()
    await card.locator('li', { hasText: 'Vacuna E2E editada' }).getByRole('button', { name: 'Quitar' }).click()
    await expect(page.getByText('Registro eliminado')).toBeVisible()
    await expect(card.locator('li', { hasText: 'Vacuna E2E' })).toHaveCount(0)
  })

  test('perfil del refugio: editar el teléfono y guardarlo', async ({ page }) => {
    const me = await api('refugio'); const { data: { user } } = await me.auth.getUser()
    const { data: original } = await me.from('shelters').select('phone').eq('user_id', user.id).single()
    try {
      await login(page, 'refugio'); await nav(page, '/refugio/perfil')
      await page.locator('#shelter-phone').fill('70000001')
      await page.getByRole('button', { name: 'Guardar Cambios' }).click()
      await expect(page.getByText(/actualiz|guardad|éxito/i).first()).toBeVisible()
      const { data: after } = await me.from('shelters').select('phone').eq('user_id', user.id).single()
      expect(after.phone).toBe('70000001')
    } finally {
      await me.from('shelters').update({ phone: original.phone }).eq('user_id', user.id)
    }
  })

  test('panel y estadísticas: los números de la pantalla coinciden con la base', async ({ page }) => {
    const me = await api('refugio')
    const { data: stats } = await me.rpc('shelter_dashboard_stats')
    await login(page, 'refugio'); await nav(page, '/refugio/dashboard')
    await expect(page.getByText('Total de mascotas')).toBeVisible()
    await expect(page.locator('article', { hasText: 'Total de mascotas' })).toContainText(String(stats.pets_total))
    await expect(page.locator('article', { hasText: 'Tasa de éxito' })).toContainText(`${stats.success_rate}%`)

    await nav(page, '/refugio/estadisticas')
    await expect(page.locator('canvas').first()).toBeVisible()
    await page.getByRole('button', { name: 'Últimos 30 días' }).click()
    await expect(page.locator('canvas').first().or(page.getByText('No hay registros de adopciones en este período'))).toBeVisible()
    await page.getByRole('button', { name: 'Rango personalizado' }).click()
    await page.locator('#from').fill('2030-01-01'); await page.locator('#to').fill('2030-02-01')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('No hay registros de adopciones en este período')).toBeVisible()
  })

  test('campana: marcar todas como leídas deja la insignia en cero', async ({ page }) => {
    const me = await api('refugio'); const { data: { user } } = await me.auth.getUser()
    await login(page, 'refugio'); await nav(page, '/refugio/dashboard')
    const panel = await openBell(page)
    await expect(panel).toBeVisible()
    const markAll = panel.getByRole('button', { name: 'Marcar todas como leídas' })
    if (await markAll.isVisible().catch(() => false)) {
      await markAll.click()
      await expect(page.locator('button[aria-label^="Notificaciones ("]')).toHaveCount(0)
      const { count } = await me.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false)
      expect(count).toBe(0)
    }
  })
})

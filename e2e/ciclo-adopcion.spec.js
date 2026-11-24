import { test, expect } from '@playwright/test'
import { acceptDialogs, api, login, nav, openBell } from './helpers.js'

// Sistema: ciclo completo entre dos usuarios (adoptante y refugio) con avisos en la campana (Realtime).
test('ciclo: solicitud -> aviso al refugio -> aprobación -> entrega -> seguimiento -> reporte -> calendario de salud', async ({ browser }) => {
  test.setTimeout(240_000)
  const shelterApi = await api('refugio')
  const { data: { user } } = await shelterApi.auth.getUser()
  const { data: shelter } = await shelterApi.from('shelters').select('id').eq('user_id', user.id).single()
  const { data: pet, error } = await shelterApi.from('pets').insert({
    shelter_id: shelter.id, name: 'E2E Ciclo', species: 'gato', size: 'pequeño', health_status: 'Saludable',
    description: 'Mascota creada por la prueba del ciclo completo de adopción.', age_years: 1, status: 'disponible'
  }).select('id').single()
  expect(error).toBeNull()

  const refCtx = await browser.newContext(); const adoCtx = await browser.newContext()
  const ref = await refCtx.newPage(); const ado = await adoCtx.newPage()
  acceptDialogs(ref); acceptDialogs(ado)
  const errors = []
  for (const [who, p] of [['refugio', ref], ['adoptante', ado]]) {
    p.on('pageerror', (e) => errors.push(`${who} pageerror: ${e}`))
    p.on('console', (m) => { if (m.type() === 'error' && !/placehold|favicon/.test(m.text())) errors.push(`${who} console: ${m.text().slice(0, 200)}`) })
  }

  try {
    // El refugio ya está dentro (con su campana escuchando en tiempo real) cuando llega la solicitud.
    await login(ref, 'refugio'); await nav(ref, '/refugio/dashboard')
    await login(ado, 'adoptante')

    // 1) La adoptante envía la solicitud
    await nav(ado, `/mascota/${pet.id}`)
    await ado.getByRole('button', { name: /Solicitar Adopción/ }).first().click()
    await ado.locator('#adoption-message').fill('Hola, quiero adoptar a esta gatita. Tengo tiempo, espacio y experiencia.')
    await ado.getByRole('button', { name: 'Enviar solicitud' }).click()
    await ado.waitForURL(/solicitudes/)
    await expect(ado.locator('li', { hasText: 'E2E Ciclo' })).toContainText('Pendiente')

    // 2) REGRESIÓN: el refugio recibe el aviso en la campana, en tiempo real
    await expect(ref.locator('button[aria-label^="Notificaciones ("]:visible').first()).toBeVisible({ timeout: 20_000 })
    const panel = await openBell(ref)
    await expect(panel).toContainText('Nueva solicitud de adopción')
    await expect(panel).toContainText('E2E Ciclo')
    await panel.getByRole('button', { name: /Nueva solicitud de adopción/ }).first().click()
    await ref.waitForURL(/\/refugio\/solicitudes/)

    // 3) Aprueba -> aviso a la adoptante
    const row = ref.locator('li', { hasText: 'E2E Ciclo' })
    await row.getByRole('button', { name: 'Aprobar' }).click()
    await ref.getByRole('button', { name: 'Confirmar Aprobación' }).click()
    await expect(ref.getByText(/Solicitud aprobada/i).first()).toBeVisible()
    await expect(ado.locator('button[aria-label^="Notificaciones ("]:visible').first()).toBeVisible({ timeout: 20_000 })
    const adoPanel = await openBell(ado)
    await expect(adoPanel).toContainText('aprobó tu solicitud')

    // 4) Entrega formal -> expediente
    await row.getByRole('button', { name: 'Registrar Entrega' }).click()
    await ref.getByRole('button', { name: 'Registrar entrega', exact: true }).click()
    await ref.waitForURL(/expediente/)
    await expect(ref.getByText('Expediente de adopción').first()).toBeVisible()

    // 5) Seguimiento: nota del refugio visible para la adoptante
    await nav(ref, '/refugio/seguimiento')
    const adopt = ref.locator('li', { hasText: 'E2E Ciclo' })
    await adopt.getByRole('button', { name: 'Registrar nota de seguimiento' }).click()
    await ref.locator('#note-text').fill('Llamada de control: la gatita se adaptó muy bien.')
    await ref.getByRole('button', { name: 'Guardar nota' }).click()
    await expect(ref.getByText('Nota de seguimiento registrada')).toBeVisible()
    await nav(ado, '/adoptante/mis-adopciones')
    await expect(ado.locator('li', { hasText: 'E2E Ciclo' })).toContainText('la gatita se adaptó muy bien')

    // 6) Reporte de la adoptante -> aviso y respuesta del refugio
    await ado.locator('li', { hasText: 'E2E Ciclo' }).getByRole('button', { name: 'Reportar problema' }).first().click()
    await ado.locator('#report-desc').fill('Estornuda desde ayer y está decaída, ¿qué hago?')
    await ado.getByRole('button', { name: 'Enviar reporte' }).click()
    await expect(ado.getByText(/Reporte enviado/)).toBeVisible()
    await expect(ref.locator('button[aria-label^="Notificaciones ("]:visible').first()).toBeVisible({ timeout: 20_000 })
    await nav(ref, '/refugio/reportes')
    const rep = ref.locator('li', { hasText: 'E2E Ciclo' })
    await rep.getByRole('button', { name: 'Responder' }).click()
    await ref.locator('#respond-text').fill('Llévala al veterinario hoy mismo; te esperamos para una visita.')
    await ref.getByRole('button', { name: 'Enviar respuesta' }).click()
    await expect(ref.getByText(/Respuesta enviada/)).toBeVisible()
    await nav(ado, '/adoptante/mis-adopciones')
    await expect(ado.locator('li', { hasText: 'E2E Ciclo' })).toContainText('Llévala al veterinario')

    // 7) Calendario de salud generado por la entrega: la adoptante marca un registro
    await nav(ado, '/adoptante/calendario-salud')
    const card = ado.locator('li', { hasText: 'E2E Ciclo' })
    await expect(card).toContainText('Desparasitación')
    await card.getByRole('button', { name: 'Marcar como completada' }).first().click()
    await ado.getByRole('button', { name: 'Confirmar' }).click()
    await expect(ado.getByText('Registro marcado como completado')).toBeVisible()

    expect(errors).toEqual([])
  } finally {
    await shelterApi.from('pets').delete().eq('id', pet.id) // cascada: solicitud, entrega, notas, reportes, calendario
    // Los avisos no cuelgan de la mascota: cada usuario borra los suyos.
    await shelterApi.from('notifications').delete().ilike('body', '%E2E Ciclo%')
    await (await api('adoptante')).from('notifications').delete().ilike('body', '%E2E Ciclo%')
    await refCtx.close(); await adoCtx.close()
  }
})

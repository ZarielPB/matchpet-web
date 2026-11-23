import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { login, nav } from './helpers.js'

// Accesibilidad (WCAG 2 A/AA): no debe haber violaciones graves o críticas en las pantallas principales.
const PAGES = {
  anon: ['/', '/login', '/registro', '/registro-refugio', '/catalogo'],
  adoptante: ['/adoptante/dashboard', '/adoptante/perfil', '/adoptante/cuestionario', '/adoptante/recomendaciones', '/adoptante/solicitudes', '/adoptante/mis-adopciones', '/adoptante/calendario-salud', '/favoritos'],
  refugio: ['/refugio/dashboard', '/refugio/perfil', '/refugio/mascotas', '/refugio/solicitudes', '/refugio/seguimiento', '/refugio/reportes', '/refugio/estadisticas']
}
// `label-content-name-mismatch` se excluye: los íconos Material Symbols son texto (ligaduras) y marcan falsos positivos en todos los botones con ícono.
// `color-contrast`: pendiente de decisión de diseño (botones blancos sobre el tono arena #BA8C71, ratio ~3:1). Se incluye con A11Y_CONTRAST=1.
const IGNORED = ['label-content-name-mismatch', ...(process.env.A11Y_CONTRAST === '1' ? [] : ['color-contrast'])]
const STRICT = process.env.A11Y_ALL === '1' ? ['minor', 'moderate', 'serious', 'critical'] : ['serious', 'critical']

for (const [role, paths] of Object.entries(PAGES)) {
  test(`accesibilidad: ${role}`, async ({ page }) => {
    if (role !== 'anon') await login(page, role)
    const report = []
    for (const path of paths) {
      await nav(page, path); await page.waitForTimeout(700)
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
      for (const v of violations.filter((x) => STRICT.includes(x.impact) && !IGNORED.includes(x.id))) report.push(`[${path}] ${v.impact} ${v.id}: ${v.help} (${v.nodes.length}) ej: ${v.nodes[0].target.join(' ').slice(0, 80)}`)
    }
    console.log(`\n== ${role}: ${report.length} violación(es)\n${report.join('\n')}`)
    expect(report).toEqual([])
  })
}

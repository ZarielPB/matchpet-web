import { test } from '@playwright/test'
import fs from 'node:fs'
import creds from './credentials.json' with { type: 'json' }

// Recorrido exploratorio: visita cada ruta de cada rol y reporta errores de consola, de página y respuestas 4xx/5xx.
const MOBILE = process.env.EXPLORE_MOBILE === '1'
const OUT = process.env.EXPLORE_OUT || `e2e/.artifacts/explore${MOBILE ? '-mobile' : ''}`
if (MOBILE) test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true })
fs.mkdirSync(OUT, { recursive: true })

const ROUTES = {
  anon: ['/', '/login', '/registro', '/registro-refugio', '/reset-password', '/catalogo'],
  adoptante: ['/adoptante/dashboard', '/adoptante/perfil', '/adoptante/cuestionario', '/adoptante/recomendaciones', '/adoptante/solicitudes', '/adoptante/mis-adopciones', '/adoptante/calendario-salud', '/favoritos', '/catalogo'],
  refugio: ['/refugio/dashboard', '/refugio/perfil', '/refugio/mascotas', '/refugio/solicitudes', '/refugio/seguimiento', '/refugio/reportes', '/refugio/estadisticas']
}

async function login(page, who) {
  await page.goto('/login')
  await page.locator('input[type=email]').fill(creds[who].email)
  await page.locator('input[type=password]').first().fill(creds[who].password)
  await page.locator('form button[type=submit]').click()
  await page.waitForURL(/dashboard|catalogo/, { timeout: 30_000 })
}

for (const role of ['anon', 'adoptante', 'refugio']) {
  test(`explorar rutas: ${role}`, async ({ page }) => {
    const findings = []
    let current = ''
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) findings.push(`[${current}] console.${m.type()}: ${m.text().slice(0, 300)}`) })
    page.on('pageerror', (e) => findings.push(`[${current}] pageerror: ${String(e).slice(0, 300)}`))
    page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('placehold.co')) findings.push(`[${current}] HTTP ${r.status()} ${r.request().method()} ${r.url().replace(/^https:\/\/[^/]+/, '').slice(0, 160)}`) })
    if (role !== 'anon') await login(page, role)
    for (const route of ROUTES[role]) {
      current = route
      await page.goto(route)
      await page.waitForLoadState('networkidle').catch(() => {})
      await page.waitForTimeout(800)
      await page.screenshot({ path: `${OUT}/${role}${route.replace(/\//g, '_')}.png`, fullPage: true })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      if (overflow) findings.push(`[${route}] scroll horizontal`)
      if (MOBILE) {
        const small = await page.evaluate(() => [...document.querySelectorAll('a[href],button,select,input:not([type=hidden]),textarea,[role=button]')]
          .filter((el) => { const r = el.getBoundingClientRect(); const st = getComputedStyle(el); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && (r.height < 40 || r.width < 40) })
          .slice(0, 6).map((el) => `${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().slice(0, 28)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`))
        if (small.length) findings.push(`[${route}] objetivos táctiles <40px: ${small.join(' | ')}`)
        const wide = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 2 && getComputedStyle(el).position !== 'fixed').slice(0, 3).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`))
        if (wide.length) findings.push(`[${route}] elementos fuera de pantalla: ${wide.join(' | ')}`)
      }
      const txt = await page.locator('body').innerText()
      if (/dev:|undefined|\[object Object\]|NaN/.test(txt)) findings.push(`[${route}] texto sospechoso: ${(txt.match(/.{0,40}(dev:|undefined|\[object Object\]|NaN).{0,40}/) || [''])[0].replace(/\n/g, ' ')}`)
    }
    fs.writeFileSync(`${OUT}/${role}.findings.txt`, findings.join('\n') || '(sin hallazgos)')
    console.log(`\n=== ${role}: ${findings.length} hallazgo(s)\n${findings.join('\n')}`)
  })
}

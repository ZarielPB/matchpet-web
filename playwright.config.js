import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'

// Si no hay navegadores de Playwright instalados para esta versión, usa el Chromium ya descargado
// (o el que indique PLAYWRIGHT_CHROMIUM_PATH).
const cached = `${homedir()}/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome`
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || (existsSync(cached) ? cached : undefined)

export default defineConfig({
  testDir: 'e2e',
  testIgnore: process.env.EXPLORE ? [] : /explore\.spec/, // el recorrido exploratorio solo corre con EXPLORE=1
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1, // las pruebas comparten datos reales de demostración
  reporter: [['list']],
  outputDir: 'e2e/.artifacts',
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1280, height: 800 },
    launchOptions: executablePath ? { executablePath, args: ['--no-sandbox'] } : {},
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  webServer: { command: 'pnpm dev --port 5173 --strictPort', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 60_000 }
})

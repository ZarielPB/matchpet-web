# Pruebas de MatchPet

| Nivel | Qué cubre | Herramienta | Cómo se ejecuta |
|---|---|---|---|
| Análisis estático | Errores de código y de plantillas Vue | ESLint | `pnpm lint` |
| Unitarias | Validadores, traducción de errores, stores (mascotas, notificaciones, solicitudes) y componentes | Vitest | `pnpm test` |
| Servicio de IA | Endpoints, validación, límites de uso, CORS y respaldo ante fallos de Gemini | pytest | `cd ai-service && .venv/bin/python -m pytest -q` |
| Integración / seguridad (API) | Qué puede leer y hacer cada rol (RLS, funciones, almacenamiento) | Playwright (sin navegador) | `pnpm test:e2e e2e/seguridad.spec.js` |
| Sistema (extremo a extremo) | Flujos reales en el navegador: autenticación, adoptante, refugio, ciclo completo de adopción con avisos en tiempo real, registro de personas nuevas | Playwright + Chromium | `pnpm test:e2e` |
| Accesibilidad | Reglas WCAG 2 A/AA en las pantallas principales de cada rol | axe-core | `pnpm test:e2e e2e/accesibilidad.spec.js` |
| Asistente de IA y modo offline | Chat con el servicio simulado, mensajes de error amables, aviso sin conexión y cola de favoritos | Playwright | `pnpm test:e2e e2e/chat.spec.js e2e/offline.spec.js` |
| Exploratorio | Recorre todas las rutas y reporta errores de consola, HTTP y desbordes (opción móvil) | Playwright | `EXPLORE=1 pnpm test:e2e e2e/explore.spec.js` · `EXPLORE_MOBILE=1` para celular |

## Preparación de las pruebas E2E
1. Copiar las credenciales de las cuentas de demostración en `e2e/credentials.json` (archivo ignorado por Git): claves `refugio`, `refugio2`, `adoptante` (correo y contraseña) y `supabase` (`url` y `anonKey`).
2. Tener un Chromium para Playwright: `npx playwright install chromium`, o apuntar `PLAYWRIGHT_CHROMIUM_PATH` a uno existente.
3. `pnpm test:e2e` levanta solo el servidor de desarrollo.
4. Para probar el **sitio publicado** en lugar del servidor local: `BASE_URL=https://matchpet-univalle.web.app pnpm test:e2e e2e/auth.spec.js e2e/adoptante.spec.js e2e/refugio.spec.js e2e/ciclo-adopcion.spec.js e2e/seguridad.spec.js` (usa la misma base de Supabase; las pruebas borran lo que crean).

## Datos que crean las pruebas
Todo lo que crean lo borran al terminar (mascotas, solicitudes y avisos "E2E …"). Las pruebas de **registro** crean cuentas `e2e.*@matchpet.test`; se eliminan con:

```sql
DELETE FROM auth.users WHERE email LIKE 'e2e.%@matchpet.test';
DELETE FROM public.notifications WHERE body LIKE '%E2E%';
```

## Pendientes conocidos
- **Contraste de color**: los botones con texto blanco sobre el tono arena `#BA8C71` tienen un contraste cercano a 3:1 (WCAG AA pide 4,5:1). Es una decisión de paleta. Para verlo: `A11Y_CONTRAST=1 pnpm test:e2e e2e/accesibilidad.spec.js`.
- **Etiquetas de íconos**: se excluye la regla `label-content-name-mismatch` porque los íconos Material Symbols son texto (ligaduras) y marcan falsos positivos.
- **Objetivos táctiles**: quedan casillas y enlaces dentro de texto por debajo de 44 px.

- **Push en un navegador sin interfaz:** Chromium en modo headless no puede registrarse en el servicio de notificaciones de Google, así que la activación del push solo se verifica en un dispositivo real (ver `docs/DESPLIEGUE.md`).

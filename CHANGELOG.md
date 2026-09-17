# Changelog

Todas las modificaciones relevantes sobre el proyecto **MatchPet (matchpet-web)**.

## [1.0.0] - 2026-09-15

### Fix: Restauración de sesión en recargado directo (F5)

- **`src/stores/authStore.js`** (modificado)
  - Se agregó el estado `sessionRestored` y la acción `getSession()`, que restaura la sesión desde `localStorage` vía `supabase.auth.getSession()` de forma explícita.
  - El `catch` de `login()` ahora retorna `{ success: false, error }` de forma consistente con los registros.
  - Todos los `catch` ahora llaman a `translateAuthError(error)` pasando el objeto de error completo en lugar de `error.code || error.message`.

- **`src/router/index.js`** (modificado)
  - El guard `router.beforeEach` ahora es `async` y espera a `authStore.getSession()` antes de evaluar `isAuthenticated`.
  - Se agregó la ruta pública `/reset-password`.

### Fix: Flujo de recuperación de contraseña

- **`src/views/ResetPasswordView.vue`** (creado)
  - Nuevo formulario para establecer una nueva contraseña.
  - Extrae `access_token` y `refresh_token` de la URL (hash o query params), restaura la sesión de recuperación con `setSession`, actualiza la contraseña con `supabase.auth.updateUser({ password })` y limpia los tokens de la barra de direcciones.

- **`src/router/index.js`** (modificado, véase arriba)
  - Registro de la ruta `/reset-password`.

- **`src/views/LoginView.vue`** (modificado)
  - El error de envío del correo ahora se traduce a español con `translateAuthError()`.

### Fix: Estandarización de errores y validaciones

- **`src/utils/errorMessages.js`** (modificado)
  - `translateAuthError()` ahora acepta el objeto de error completo o un string, y traduce por código **y** por mensaje crudo en inglés (ej.: "Invalid login credentials") antes de caer en el mensaje genérico.

- **`src/views/RegisterAdoptanteView.vue`** (modificado)
  - Nuevo campo "Confirmar contraseña" y validación JS (coincidencia y longitud mínima) en el submit.

- **`src/views/RegisterRefugioView.vue`** (modificado)
  - Nuevo campo "Confirmar contraseña" y validación JS (coincidencia y longitud mínima) en el submit.

### Fix: Assets de PWA y limpieza de código muerto

- **`index.html`** (modificado)
  - El favicon ahora apunta a `/favicon.svg` (archivo existente) en lugar de `/favicon.ico` (inexistente).

- **`vite.config.js`** (modificado)
  - `includeAssets` ahora referencia solo archivos existentes: `favicon.svg`, `pwa-192x192.png`, `pwa-512x512.png`.

- **Eliminados** (código muerto de la plantilla de Vite que no estaba referenciado):
  - `src/components/HelloWorld.vue`
  - `src/style.css`
  - `src/assets/hero.png`, `src/assets/vite.svg`, `src/assets/vue.svg`
  - `public/icons.svg`

- **`.gitignore`** (modificado)
  - Se agregó `dev-dist/` (salida temporal del plugin PWA en desarrollo).

### DevOps: Cron Job de mantenimiento de Supabase

- **`.github/workflows/supabase-keep-alive.yml`** (creado)
  - Workflow de GitHub Actions con cron `0 0 * * 1` (lunes 00:00 UTC) y disparo manual.
  - Hace un `GET` ligero a `<SUPABASE_URL>/rest/v1/` usando la `anon_key` (nunca `service_role_key`) para evitar que la BD del plan gratuito se pause por inactividad.

### Documentación

- **`QA_AND_DEVOPS_FIXES.md`** (creado)
  - Documento técnico con detalles de cada corrección, configuración de Secrets y guías de prueba.

---

### Estado pendiente (no modificado en este cambio)

- El esquema de la tabla `profiles` y las reglas RLS viven en Supabase (fuera del repositorio).
- `dev-dist/`, `public/pwa-192x192.png` y `public/pwa-512x512.png` siguen sin versionar; añadirlos al próximo commit (los PNG del manifest deben estar versionados).
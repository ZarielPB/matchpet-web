# QA & DevOps Fixes — MatchPet (matchpet-web)

Este documento resume las correcciones de calidad de código (QA) y DevOps aplicadas al proyecto, explica **por qué** se hicieron y **cómo** verificar cada una. Fue generado junto con `CHANGELOG.md`.

---

## 1. Archivos modificados, creados y eliminados

### Modificados

| Archivo | Cambio |
|---|---|
| `src/stores/authStore.js` | Sesión restaurada explícitamente (`getSession`), retorno de error consistente en `login`, errores traducidos con el objeto completo. |
| `src/router/index.js` | Guard asíncrono + `await getSession()`; nueva ruta pública `/reset-password`. |
| `src/utils/errorMessages.js` | Traduccción robusta: por código y por mensaje crudo en inglés. |
| `src/views/LoginView.vue` | Error de "recuperar contraseña" traducido a español. |
| `src/views/RegisterAdoptanteView.vue` | Campo y validación "Confirmar contraseña". |
| `src/views/RegisterRefugioView.vue` | Campo y validación "Confirmar contraseña". |
| `index.html` | Favicon real (`/favicon.svg`) en lugar de `/favicon.ico` (inexistente). |
| `vite.config.js` | `includeAssets` solo con archivos existentes. |
| `.gitignore` | Se excluye `dev-dist/`. |

### Creados

| Archivo | Propósito |
|---|---|
| `src/views/ResetPasswordView.vue` | Página de nueva contraseña (antes el flujo estaba roto: `/reset-password` no existía). |
| `.github/workflows/supabase-keep-alive.yml` | Cron job que mantiene activa la BD de Supabase. |
| `CHANGELOG.md` | Registro de cambios del proyecto. |
| `QA_AND_DEVOPS_FIXES.md` | Este documento. |

### Eliminados (código muerto de la plantilla de Vite)

`src/components/HelloWorld.vue`, `src/style.css`, `src/assets/hero.png`, `src/assets/vite.svg`, `src/assets/vue.svg`, `public/icons.svg`.

Ninguno de estos archivos era referenciado por la aplicación luego de eliminar `HelloWorld.vue`.

---

## 2. Explicación técnica: fix del Router Guard (F5 en rutas protegidas)

### Problema original

El guard `router.beforeEach` era **síncrono**:

```js
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'Login' })
  }
  next()
})
```

`isAuthenticated` depende de `user`, que Supabase restaura de forma **asíncrona** desde `localStorage` (evento `onAuthStateChange`). Al recargar directamente `/adoptante/dashboard`:

1. Se crea el store (`user = null`).
2. El guard se ejecuta de inmediato → `isAuthenticated === false` → redirige a `/login`.
3. Después (demasiado tarde) `onAuthStateChange` restaura la sesión.

Resultado: el usuario logueado era expulsado al recargar.

### Solución aplicada

1. En el store se agregó `getSession()` que llama explícitamente a `supabase.auth.getSession()` antes de cualquier validación, actualiza `user`/`profile` y comparte una **promesa única** para que navegaciones simultáneas esperen al mismo resultado en lugar de observar `user === null` a mitad:

```js
let sessionPromise = null

async function getSession() {
  if (sessionPromise) return sessionPromise
  authLoading.value = true
  sessionPromise = (async () => {
    try {
      const { data } = await supabase.auth.getSession()
      user.value = data?.session?.user || null
      if (user.value) {
        await fetchProfile(user.value.id)
      } else {
        profile.value = null
      }
      return user.value
    } finally {
      authLoading.value = false
    }
  })()
  try {
    return await sessionPromise
  } finally {
    sessionPromise = null
  }
}
```

2. El guard ahora es `async` y espera la restauración antes de decidir:

```js
router.beforeEach(async (to, from, next) => {
  await authStore.getSession()
  if (to.meta.requiresAuth) { /* ... */ }
  next()
})
```

### Cómo probarlo

1. Inicia sesión como adoptante o refugio.
2. Estando en `/adoptante/dashboard` (o `/refugio/dashboard`), presiona **F5** (recargar).
3. Verifica que aparece brevemente el splash "Cargando MatchPet…" y que **permaneces** en el dashboard, sin ir a `/login`.
4. Como adoptante, navega a `/refugio/mascotas`: el guard debe redirigirte a tu panel con el aviso "Acceso denegado: no tienes permiso para ver esa página." (HU-08 CA#4).

---

## 3. Configuración de Secrets en GitHub para el Cron Job de Supabase

El workflow `.github/workflows/supabase-keep-alive.yml` se ejecuta cada lunes a las 00:00 UTC (y manualmente desde la pestaña **Actions**) para evitar que la base de datos del plan gratuito de Supabase entre en pausa por inactividad.

### Pasos (una sola vez, por el líder del equipo)

1. En GitHub, abre tu repositorio **MatchPet**.
2. Ve a **Settings** → **Secrets and variables** → **Actions**.
3. Haz clic en **New repository secret** y crea dos secrets:
   - `VITE_SUPABASE_URL` → el mismo valor que está en tu archivo local `.env` (la URL pública del proyecto, p. ej. `https://<project-ref>.supabase.co`).
   - `VITE_SUPABASE_ANON_KEY` → el mismo valor que está en tu archivo local `.env` (la "anon key" pública).
4. Guarda ambos.

### Por qué la anon key y no la service_role key

- La `anon_key` es **pública por diseño** (viaja en el frontend) y solo puede leer/escribir lo que las reglas **RLS** permitan. Es segura para este job.
- La `service_role_key` tiene permisos de **administrador** y debe permanecer únicamente dentro del panel de Supabase. **Nunca** debe configurarse como secret de GitHub ni usarse en el frontend.

### Cómo verificar

1. Ve a la pestaña **Actions** del repositorio.
2. Ejecuta el workflow manualmente con **Run workflow**.
3. Debería completarse con un log similar a: `Supabase respondió con HTTP 200`.

---

## 4. Cómo probar el flujo de recuperación de contraseña

### Prerrequisito

Supabase debe permitir el envío de correos de recuperación (opción por defecto en Auth → Providers → Email).

### Pasos

1. Inicia la app: `pnpm dev` y abre `http://localhost:5173`.
2. Ve a `/login` y haz clic en **"¿Olvidaste tu contraseña?"**.
3. Ingresa un correo registrado y pulsa **Enviar enlace**.
   - Debería aparecer: *"¡Correo enviado! Revisa tu bandeja de entrada (y spam)."*
4. Abre el correo que envió Supabase y haz clic en el enlace.
   - Te llevará a `http://localhost:5173/reset-password#access_token=...&refresh_token=...`.
5. Ingresa una **nueva contraseña** y su **confirmación** (deben coincidir, mínimo 8 caracteres).
6. Pulsa **Guardar nueva contraseña**.
   - Debería mostrar: *"¡Contraseña actualizada! Serás redirigido al inicio de sesión."*
7. Inicia sesión con la nueva contraseña. ✅

### Casos de error que también deben probarse

- **Contraseñas que no coinciden** → debe mostrarse *"Las contraseñas no coinciden."* sin llamar a la API.
- **Contraseña menor a 8 caracteres** → mensaje de longitud mínima.
- **Enlace expirado / tokens inválidos** → debe mostrarse *"El enlace de recuperación es inválido o ha expirado."*

> Nota: los tokens de recuperación quedan fuera de la barra de direcciones después de cargar la página (`history.replaceState`), como medida de higiene/seguridad.

---

## 5. Notas adicionales

- **Ninguna credencial real fue modificada o expuesta.** El archivo `.env` permanece en `.gitignore` y el workflow solo referencia los *nombres* `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` como secrets de GitHub.
- Los iconos PWA (`public/pwa-192x192.png`, `public/pwa-512x512.png`) y el favicon `public/favicon.svg` deben quedar versionados para que el manifest funcione en producción.
- `dev-dist/` queda fuera del control de versiones; es regenerado por Vite en cada ejecución de desarrollo.
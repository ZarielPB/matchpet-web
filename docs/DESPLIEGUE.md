# Despliegue de MatchPet (Sprint 6)

| Pieza | Dónde vive | Quién la configura |
|---|---|---|
| PWA (frontend) | Firebase Hosting, proyecto `matchpet-univalle` (`https://matchpet-univalle.web.app`) | Jeysi |
| Servicio de IA | Render, plan gratuito, Docker, región Virginia | Rassiel |
| Base de datos, Auth, Storage | Supabase | ya existente |
| Notificaciones push | Edge Function `send-push` en Supabase | Rassiel |
| Pipeline | GitHub Actions (`.github/workflows`) | ya en el repositorio |

## 1. Servicio de IA en Render (HU-66)

1. Crear cuenta en https://render.com con **Sign in with GitHub** (la cuenta debe tener acceso al repositorio `ZarielPB/matchpet-web`).
2. **New + → Blueprint**, elegir el repositorio y la rama principal. Render lee `render.yaml` (Docker, región Virginia, plan gratuito, salud en `/api/v1/health`).
3. Render pide **tres valores secretos**; se pegan en el panel de Render, nunca en el chat ni en Git (`ALLOWED_ORIGINS` ya viene en `render.yaml`):

| Variable | Valor |
|---|---|
| `GEMINI_API_KEY` | la clave de Gemini de `ai-service/.env` |
| `SUPABASE_URL` | el valor de `VITE_SUPABASE_URL` del `.env` de la raíz |
| `SUPABASE_ANON_KEY` | el valor de `VITE_SUPABASE_ANON_KEY` del `.env` de la raíz |

   Sin `SUPABASE_URL` y `SUPABASE_ANON_KEY` el chat queda abierto a cualquiera y se gasta la cuota de Gemini.
4. Al terminar la construcción, abrir `https://TU-SERVICIO.onrender.com/api/v1/health`: debe responder `Service is running`.
5. Pasar la URL del servicio al equipo del frontend (se usa como `VITE_AI_API_URL`, sin `/api/v1`).

El plan gratuito duerme el servicio tras 15 min sin uso y tarda cerca de 1 minuto en despertar. El chat lo avisa ("Despertando al asistente") y el workflow `ai-keep-alive.yml` lo mantiene despierto (ver secretos). Si el repositorio es privado, ese ping cada 10 min consume minutos de Actions; si se acaban, usar un monitor externo gratuito (UptimeRobot) sobre la misma URL.

## 2. Frontend en Firebase Hosting (HU-60)

El despliegue lo hace GitHub Actions en cada push a la rama principal, solo si lint, pruebas y build pasan.

1. Crear una cuenta de servicio y su secreto con el CLI (lo ejecuta quien administra el proyecto de Firebase):
   ```bash
   pnpm exec firebase login
   pnpm exec firebase init hosting:github
   ```
   Este comando crea el secreto `FIREBASE_SERVICE_ACCOUNT_MATCHPET_UNIVALLE` en el repositorio. **Responder que no** a "Set up the workflow to run a build script" y a los despliegues de PR, porque el workflow ya existe. `ci.yml` ya usa ese nombre.
2. Primer despliegue manual, solo para comprobar:
   ```bash
   pnpm build && pnpm exec firebase deploy --only hosting
   ```

### Secretos del repositorio (GitHub → Settings → Secrets and variables → Actions)

| Secreto | Para qué | Obligatorio |
|---|---|---|
| `VITE_SUPABASE_URL` | build (ya existe) | sí |
| `VITE_SUPABASE_ANON_KEY` | build (ya existe) | sí |
| `VITE_AI_API_URL` | build: URL de Render, sin barra final | sí (sin él el chat no aparece) |
| `VITE_VAPID_PUBLIC_KEY` | build: clave pública VAPID de push | sí (sin él no hay push) |
| `FIREBASE_SERVICE_ACCOUNT_MATCHPET_UNIVALLE` | despliegue a Firebase (lo crea `firebase init hosting:github`) | sí |
| `AI_HEALTH_URL` | ping a `https://TU-SERVICIO.onrender.com/api/v1/health` | recomendado |
| `DISCORD_WEBHOOK_URL` | aviso de fallos a Discord | opcional (el correo de GitHub ya avisa) |

## 3. Notificaciones push (HU-56)

1. **Tabla.** Ejecutar en el SQL Editor de Supabase el archivo `supabase/migrations/20240000000012_sprint6_push_subscriptions.sql`.
2. **Secretos de la función.** `supabase/functions/.env` (ignorado por Git) contiene las claves VAPID y el secreto del webhook:
   ```bash
   supabase login && supabase link --project-ref <ref-del-proyecto>
   supabase secrets set --env-file supabase/functions/.env
   supabase functions deploy send-push --no-verify-jwt
   ```
   La clave **pública** VAPID es la misma que `VITE_VAPID_PUBLIC_KEY`. Si se generan claves nuevas (`pnpm dlx web-push generate-vapid-keys`), actualizar ambas y pedir a los usuarios que reactiven las notificaciones.
3. **Webhook.** Supabase → Database → Webhooks → *Create*: tabla `public.notifications`, evento **Insert**, tipo *Supabase Edge Functions* → `send-push`, y un encabezado HTTP `x-webhook-secret` con el valor de `PUSH_WEBHOOK_SECRET` de `supabase/functions/.env`.
4. **Probar.** Activar el interruptor en el perfil, enviar una solicitud de adopción y comprobar que llega el aviso con la app cerrada. Al tocarlo se abre la ruta del aviso (`/adoptante/solicitudes`, `/refugio/solicitudes`…).

Limitación en iPhone: las notificaciones push solo funcionan con la app instalada desde Safari (Compartir → Agregar a pantalla de inicio) y iOS 16.4 o superior. La pantalla de perfil lo explica al usuario.

## 4. Prueba de punta a punta (HU-66 CA#5)

Con todo desplegado: abrir `https://matchpet-univalle.web.app` en el celular, instalar la PWA, iniciar sesión como adoptante, abrir el chat y preguntar algo. La primera respuesta puede tardar hasta 1 minuto si el servicio dormía.

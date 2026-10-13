# SPRINT 3 — CHANGELOG (Compatibilidad, Matching y Solicitudes)

Estado: implementado y verificado a nivel BD (RLS por rol, motor, build). **No probado en navegador** (ver "No verificado").

## Base de datos (migración `20240000000002_sprint3_matching_adoption.sql`, aplicada)
- Aditiva e idempotente. Filas previas intactas (profiles 5, shelters 2, pets 7, pet_images 8, adopter_profiles 1, favorites 3).
- Nuevo: enums `application_status`, `energy_level`; columnas `pets.energy_level/good_with_kids/good_with_other_pets`; tablas `compatibility_profiles`, `adoption_applications`; índice único parcial `uq_applications_open`; triggers de `updated_at`/`resolved_at`; función `match_recommendations()` (SECURITY INVOKER).
- Seguridad de las tablas nuevas: sin acceso `anon`, sin DELETE, `UPDATE` solo sobre `status` (columna), políticas `cp_*` y `aa_*`.
- Respaldo previo: `supabase/backups/` (ignorado por git, contiene correos reales).

## Criterios de aceptación Sprint 3
| HU | CA | Estado |
|---|---|---|
| HU-30 | 1 Pasos ("Tu hogar", "Tu rutina") | ✅ (2 pasos; la experiencia sale del perfil de adoptante, HU-12) |
| | 2 Opciones claras | ✅ opciones tipo tarjeta; ❌ no hay *sliders* (se usaron 3 niveles) |
| | 3 Todo obligatorio | ✅ (validación por paso + CHECK/NOT NULL en BD) |
| | 4 Barra de progreso | ✅ |
| | 5 Íconos de Alexis | ⚠️ emojis; no se integraron los assets |
| HU-31 | 1 Guardar (tabla `compatibility_profiles`) | ✅ (la HU dice `compatibility_answers`) |
| | 2 Mensaje literal | ✅ |
| | 3 Acceso "Editar mi cuestionario" | ✅ tarjeta en el dashboard y enlace en recomendaciones |
| | 4 Precarga | ✅ |
| | 5 UPSERT sin duplicados | ✅ PK `user_id` |
| HU-32 | 1 ≥4 dimensiones | ✅ D1–D4 |
| | 2 Pesos / eliminatoria de tamaño | ✅ 25/30/20/25, D1 eliminatoria |
| | 3 0–100 % | ✅ (ejemplos C=44 y B=excluida verificados en BD) |
| | 4 Solo `disponible` | ✅ |
| | 5 Sin resultados → lista vacía | ✅ estado vacío en la vista |
| HU-33 | 1 Orden descendente | ✅ |
| | 2 Score visible | ✅ círculo con % |
| | 3 Frase dinámica | ✅ (desde `top_dimension`; ligera variación de texto si la energía no es idéntica) |
| | 4 Mismo diseño de tarjeta | ✅ reutiliza `PetCard` |
| | 5 Sin cuestionario → HU-30 con mensaje | ✅ |
| HU-35 | 1 Solo adoptante con perfil completado | ✅ UI + RLS |
| | 2 Mascota disponible | ✅ UI + RLS |
| | 3 Mensaje 10–500 | ✅ UI, store y CHECK en BD |
| | 4 Registro `pendiente` | ✅ |
| | 5 Sin duplicados | ✅ índice único parcial |
| | 6 Confirmación y redirección a "Mis Solicitudes" | ✅ |
| HU-36 | 1 Foto, mascota, refugio, fecha, estado | ✅ |
| | 2 Badges de color | ✅ |
| | 3 Comentarios del refugio | ✅ se muestran si existen (el refugio aún no puede escribirlos: Sprint 4) |
| | 4 Estado vacío | ✅ |
| | 5 Filtro por `user_id` | ✅ |
| HU-37 | 1 Solo si `pendiente` | ✅ |
| | 2 Modal de confirmación | ✅ |
| | 3 Estado `cancelada` | ✅ |
| | 4 UI reactiva | ✅ |
| | 5 Liberar mascota | ✅ el índice parcial permite volver a solicitar |

## Verificaciones realizadas
- Rutas/guards: `/adoptante/cuestionario|recomendaciones|solicitudes` con `requiresAuth` y rol `adoptante`.
- RLS simulado con usuarios reales (`set role` + claims, todo revertido): adoptante solo ve lo suyo; otro adoptante ve 0 filas ajenas y no puede cancelar solicitudes ajenas; refugio dueño ve la solicitud de su mascota y otro refugio no; `anon` bloqueado en ambas tablas y en la RPC; duplicado (23505), mensaje corto (23514), mascota `en_proceso`, `UPDATE message` y `DELETE` bloqueados; cancelar fija `resolved_at`.
- `pnpm build` OK.

## Pendientes / no verificado
- **No se probó en navegador** (cuestionario, recomendaciones, modal, cancelación): solo build y pruebas SQL.
- `energy_level/good_with_*` de las 7 mascotas existentes quedan en los defaults (`media`, `false`): los refugios deben editarlas para que el matching sea fino.
- Seguridad **no tocada** (pospuesta a propósito, cambio aditivo aparte): `anon` con ALL en tablas de Sprint 1-2, `profiles` legible por anon (el frontend solo consulta `profiles` por el propio `id`, así que restringirlo parece seguro pero requiere prueba), políticas duplicadas/laxas de `pets`/`pet_images`/`adopter_profiles`, falta política UPDATE en `pet_images` (rompe "marcar principal"), `handle_new_user` ejecutable por RPC y sin `search_path`, bucket `pet-images` sin límite de tamaño, protección de contraseñas filtradas.
- Sprint 1/2 cosmético pospuesto (mensajes literales, redirecciones de registro/logout, swipe, botón instalar PWA, filtro de ciudad, favoritos en detalle, estado de sesión entre usuarios).
- Notificaciones, aprobar/rechazar (Sprint 4); asistente IA (HU-34).

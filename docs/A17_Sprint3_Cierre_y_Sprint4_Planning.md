# A17. Sprint Planning: Sprint 4 y Cierre de Sprint 3

**Proyecto:** MatchPet Web — Plataforma PWA de adopción responsable de mascotas
**Asignatura:** Proyecto III — Univalle
**Metodología:** Scrum (sprints de 2 semanas)
**Referencias:** `docs/PLANIFICACION_SPRINTS.md`, `docs/HISTORIAS_USUARIO.md`, `docs/ModeloBD.sql`, `docs/SPRINT3_CHANGELOG.md`

> **Nota de conciliación de documentos.** `PLANIFICACION_SPRINTS.md` consigna a Jeysi como Scrum Master de los Sprints 3 y 4. Para esta entrega se respeta la asignación indicada por el equipo: **Rassiel** fue Scrum Master del Sprint 3 y el Scrum Master del Sprint 4 queda por definir por rotación. Se recomienda actualizar `PLANIFICACION_SPRINTS.md` una vez confirmado.

---

## 1. CIERRE DEL SPRINT 3

| Rol | Responsable |
|---|---|
| **Scrum Master (Sprint 3)** | Rassiel |
| **Product Owner** | Alexis |
| **Desarrollo Frontend** | Jeysi (y Alexis en lógica/vistas básicas) |
| **Desarrollo Backend / Lógica** | Rassiel |
| **Diagramación (BD y Casos de Uso)** | Frank (nuevo integrante) |

**Objetivo del Sprint 3 (según planificación):** implementar el algoritmo de matching inteligente para recomendar mascotas y permitir que los adoptantes envíen y gestionen sus solicitudes de adopción.

**Daily Scrum (hasta el 12 de octubre):**

| Fecha | Enlace |
|---|---|
| *[Insertar fecha]* | *[INSERTAR ENLACE REAL AL DAILY SCRUM]* |
| *[Insertar fecha]* | *[INSERTAR ENLACE REAL AL DAILY SCRUM]* |
| *[Insertar fecha]* | *[INSERTAR ENLACE REAL AL DAILY SCRUM]* |

---

### 1.1 Tablas de la Base de Datos para el Sprint 3

> ## ⚠️ NOTA PARA FRANK (diagramación ER)
> Por favor, diagrama las entidades y relaciones descritas a continuación. La fuente de verdad es `docs/ModeloBD.sql` (secciones D y E) y la migración `supabase/migrations/20240000000002_sprint3_matching_adoption.sql`, ya aplicada en la base de datos. Las tablas del Sprint 1–2 (`profiles`, `shelters`, `pets`, `pet_images`, `adopter_profiles`, `favorites`) se incluyen solo como contexto de las relaciones.

#### Tablas nuevas

**a) `compatibility_profiles`** — respuestas del cuestionario de estilo de vida (HU-30, HU-31)

| Campo | Tipo | Restricción |
|---|---|---|
| `user_id` | UUID | **PK** y **FK → `profiles.id`** (ON DELETE CASCADE) |
| `hours_at_home` | TEXT | NOT NULL; valores: `menos_de_4`, `4_a_8`, `mas_de_8` |
| `activity_level` | TEXT | NOT NULL; valores: `bajo`, `moderado`, `alto` |
| `space_type` | TEXT | NOT NULL; valores: `pequeño`, `amplio` |
| `preferred_size` | ENUM `pet_size` | Nulo = sin preferencia |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL, por defecto `NOW()` |

- **Cardinalidad:** `profiles` 1 — 0..1 `compatibility_profiles` (relación 1:1 opcional; la PK es también la FK, lo que garantiza una sola fila por usuario).
- **Nota de nomenclatura:** HU-31 menciona `compatibility_answers`; el nombre implementado y canónico es `compatibility_profiles`.

**b) `adoption_applications`** — solicitudes de adopción (HU-35, HU-36, HU-37)

| Campo | Tipo | Restricción |
|---|---|---|
| `id` | UUID | **PK** |
| `pet_id` | UUID | **FK → `pets.id`** (ON DELETE CASCADE), NOT NULL |
| `user_id` | UUID | **FK → `profiles.id`** (ON DELETE CASCADE), NOT NULL |
| `message` | TEXT | NOT NULL; longitud entre 10 y 500 caracteres |
| `status` | ENUM `application_status` | NOT NULL, por defecto `pendiente` |
| `shelter_comments` | TEXT | Nulo; lo completará el refugio en el Sprint 4 |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL |
| `resolved_at` | TIMESTAMPTZ | Nulo; lo asigna un trigger cuando el estado sale de `pendiente` |

- **Cardinalidad:** `profiles` 1 — N `adoption_applications`; `pets` 1 — N `adoption_applications`. Es la tabla asociativa entre adoptante y mascota.
- **Regla de unicidad:** índice único parcial `uq_applications_open` sobre (`user_id`, `pet_id`) para estados abiertos (`pendiente`, `aprobada`); impide solicitudes duplicadas, pero permite volver a solicitar tras cancelar o ser rechazado.

#### Tablas modificadas

**c) `pets`** — tres columnas nuevas para el motor de matching (HU-32)

| Campo nuevo | Tipo | Restricción |
|---|---|---|
| `energy_level` | ENUM `energy_level` (`baja`, `media`, `alta`) | NOT NULL, por defecto `media` |
| `good_with_kids` | BOOLEAN | NOT NULL, por defecto `false` |
| `good_with_other_pets` | BOOLEAN | NOT NULL, por defecto `false` |

#### Tipos enumerados nuevos
- `application_status`: `pendiente`, `aprobada`, `rechazada`, `cancelada`, `completada`.
- `energy_level`: `baja`, `media`, `alta`.

#### Función de base de datos
- `match_recommendations()` — función SQL (`SECURITY INVOKER`) que calcula el score de compatibilidad del usuario autenticado contra las mascotas con estado `disponible`. Devuelve `pet_id`, `score` (0–100), `top_dimension` y `reason`. Pesos: D1 Espacio/tamaño 25 %, D2 Energía 30 %, D3 Tiempo en casa 20 %, D4 Convivencia 25 %; D1 es eliminatoria. Solo ejecutable por usuarios autenticados.

#### Resumen de relaciones para el diagrama ER

```
profiles (id PK)
  ├── 1:1  → compatibility_profiles (user_id PK/FK)
  └── 1:N  → adoption_applications (user_id FK)

shelters (id PK) ── 1:N → pets (shelter_id FK)

pets (id PK)
  └── 1:N  → adoption_applications (pet_id FK)
```

#### Seguridad (Row Level Security) — para anotar en el diagrama si se desea
- `compatibility_profiles`: cada usuario solo lee, inserta y modifica su propia fila; el rol `anon` no tiene acceso.
- `adoption_applications`: el adoptante ve y crea sus solicitudes y solo puede cambiar el campo `status` (cancelar); el refugio solo ve las solicitudes de sus propias mascotas; no existe `DELETE`.

---

### 1.2 Casos de Uso del Sprint 3

> ## ⚠️ NOTA PARA FRANK
> **Diagrama en proceso de elaboración.** Insumos para el diagrama de casos de uso del Sprint 3:
>
> - **Actor principal:** Adoptante (usuario autenticado con rol `adoptante`).
> - **Actor secundario:** Sistema (motor de compatibilidad).
> - **Casos de uso:** Completar cuestionario de estilo de vida (HU-30); Guardar/editar respuestas (HU-31); Calcular compatibilidad (HU-32, ejecutado por el sistema); Ver recomendaciones de mascotas (HU-33); Enviar solicitud de adopción (HU-35); Ver estado de solicitudes (HU-36); Cancelar solicitud (HU-37).
> - **Relaciones sugeridas:** «include» de *Ver recomendaciones* hacia *Calcular compatibilidad*; «include» de *Ver recomendaciones* hacia *Completar cuestionario* cuando el adoptante aún no lo ha respondido; *Enviar solicitud* requiere perfil de adoptante completado.
>
> **[INSERTAR DIAGRAMA DE CASOS DE USO DEL SPRINT 3 AQUÍ]**

---

### 1.3 Incremento al Software (Sprint Planning Table)

Las fechas se completan con el calendario real del equipo; no se registran aquí fechas que no consten en los documentos del proyecto.

| HU | Descripción Breve | Responsable Principal | Fecha Proyectada | Fecha de Cumplimiento | Estado |
|---|---|---|---|---|---|
| HU-30 | Cuestionario de estilo de vida en dos pasos ("Tu hogar", "Tu rutina") con barra de progreso | Jeysi / Alexis | *[completar]* | *[completar]* | Completada con observaciones¹ |
| HU-31 | Guardar, precargar y editar respuestas del cuestionario (UPSERT sin duplicados) | Rassiel / Jeysi | *[completar]* | *[completar]* | Completada |
| HU-32 | Algoritmo de compatibilidad `match_recommendations()` con 4 dimensiones ponderadas | Rassiel | *[completar]* | *[completar]* | Completada |
| HU-33 | Vista de recomendaciones ordenadas por score, con frase dinámica del match | Jeysi | *[completar]* | *[completar]* | Completada |
| HU-35 | Enviar solicitud de adopción con mensaje (10–500 caracteres) y sin duplicados | Jeysi / Rassiel | *[completar]* | *[completar]* | Completada |
| HU-36 | "Mis Solicitudes": estado con badges de color, estado vacío | Jeysi | *[completar]* | *[completar]* | Completada² |
| HU-37 | Cancelar solicitud pendiente con modal de confirmación | Jeysi | *[completar]* | *[completar]* | Completada |

**[INSERTAR CAPTURA DE PANTALLA DEL TABLERO JIRA AQUÍ]**

**Observaciones:**
1. **HU-30:** el criterio 2 pide "opciones claras y sliders"; se implementaron tarjetas de selección en tres niveles (sin sliders). El criterio 5 (íconos de Alexis) se resolvió con íconos Material Symbols, coherentes con el diseño de Jeysi, en lugar de los activos gráficos específicos.
2. **HU-36:** los comentarios del refugio se muestran cuando existen, pero el refugio aún no puede redactarlos (HU-39/HU-40, Sprint 4).
3. La estimación original de cada historia se mantiene según `PLANIFICACION_SPRINTS.md` (HU-32 = L; HU-30, HU-33 y HU-35 = M; HU-31 y HU-36 = S; HU-37 = XS).

**Definición de Terminado (DoD) del Sprint 3 — verificación:**

| Criterio del DoD | Resultado |
|---|---|
| Cuestionario implementado y respuestas persistidas en BD | Cumplido |
| Algoritmo de scoring devolviendo un % de compatibilidad | Cumplido |
| Vista de recomendaciones con explicación dinámica del match | Cumplido |
| Flujo de solicitud completo desde el adoptante (enviar, ver estado, cancelar) | Cumplido |

El detalle criterio por criterio se encuentra en `docs/SPRINT3_CHANGELOG.md`.

---

### 1.4 Sprint Review: Pruebas Realizadas

Durante la revisión del Sprint 3 se ejecutaron las siguientes pruebas. Se indica explícitamente el tipo de evidencia de cada una.

**a) Pruebas de integración del frontend (merge con la rama de Jeysi).**
Se integró la rama `feature/sprint1-sprint2-frontend` con el trabajo del Sprint 3. Se presentaron conflictos de contenido en tres archivos (`PetForm.vue`, `AdoptanteDashboard.vue` y `PetDetailView.vue`) que se resolvieron priorizando la lógica de negocio (stores, validaciones y contratos de datos) y reaplicando sobre ella el diseño visual de Jeysi. Tras la integración, las tres vistas nuevas del Sprint 3 (cuestionario, recomendaciones y solicitudes) se rediseñaron con la paleta, tipografía y animaciones del sistema de diseño. La compilación de producción (`pnpm build`) finalizó sin errores.

**b) Verificación del motor de recomendaciones (`match_recommendations`).**
Se verificó la función con datos reales de la base de datos. Se validaron los ejemplos de cálculo del documento `DECISIONES_ALGORITMO_MATCHING.md` (una mascota con puntaje 44 y otra excluida por la regla eliminatoria de tamaño) y se comprobó que solo se recomiendan mascotas en estado `disponible` (una mascota "en proceso" fue excluida correctamente). Posteriormente se amplió el catálogo de prueba a 13 mascotas con valores variados de nivel de energía, aptitud con niños y con otras mascotas (3 de energía alta, 5 media y 5 baja) para comprobar que el ranking diferencia perfiles.

**c) Pruebas de Row Level Security (RLS) por rol, mediante el MCP de Supabase.**
Con usuarios reales y simulando cada rol dentro de transacciones revertidas (sin dejar datos residuales), se comprobó que:
- el adoptante solo ve y modifica sus propios registros; otro adoptante no ve ni puede cancelar solicitudes ajenas;
- un refugio solo ve las solicitudes de sus propias mascotas, y ningún refugio puede leer cuestionarios;
- el rol `anon` queda bloqueado en ambas tablas nuevas y en la función de recomendación;
- se rechazan correctamente: solicitud duplicada, mensaje menor a 10 caracteres, solicitud sobre una mascota que no está disponible, edición del mensaje y borrado de solicitudes;
- cancelar una solicitud funciona y registra `resolved_at`.

**d) Pruebas del flujo completo: Cuestionario → Recomendaciones → Solicitud → Cancelación.**
- *A nivel de base de datos:* cada etapa se verificó (guardado del cuestionario, ranking, creación de solicitud con estado `pendiente`, bloqueo de duplicados y cancelación).
- *A nivel de interfaz:* el equipo comprobó manualmente el cuestionario, las tarjetas de recomendación con su porcentaje y la carga de mascotas desde el rol de refugio y de adoptante. **Queda pendiente un recorrido manual de regresión sobre la versión integrada (post-merge)** que incluya el modal de solicitud y la cancelación desde la interfaz.

**Respaldo previo.** Antes de aplicar la migración se generó un respaldo de los datos y del estado de políticas (`supabase/backups/`, excluido del control de versiones por contener correos reales). Los conteos de filas de las tablas existentes no cambiaron tras la migración.

---

### 1.5 Informe de Sprint Retrospective

#### Qué salió bien
- **Migración segura de la base de datos:** se realizó un respaldo previo y la migración fue aditiva e idempotente (sin eliminar ni renombrar nada en uso); no se perdieron datos.
- **Verificación de seguridad por rol:** el uso del MCP de Supabase permitió probar RLS con usuarios reales de forma repetible y sin ensuciar la base de datos.
- **Motor de matching documentado y verificable:** las decisiones del algoritmo quedaron registradas en `DECISIONES_ALGORITMO_MATCHING.md` y sus ejemplos se reprodujeron en la base de datos.
- **Integración del frontend:** los conflictos de merge se resolvieron priorizando la lógica de negocio y luego se unificó el diseño visual de las vistas nuevas con el de Jeysi.
- **Trazabilidad:** cada criterio de aceptación del Sprint 3 quedó contrastado en un changelog honesto, con excepciones declaradas.

#### Qué podemos mejorar
- **Alinear antes los contratos de datos entre frontend y backend.** El diseño visual de Sprint 1–2 se desarrolló sin conocer los campos y vistas del Sprint 3, lo que obligó a resolver conflictos y a rediseñar vistas (retrabajo evitable).
- **Mantener la documentación sincronizada:** hubo discrepancias entre documentos (nombre de la tabla de cuestionario, Scrum Master por sprint, documentos .docx guardados con extensión .md).
- **Pruebas de interfaz:** la verificación de la UI fue mayormente manual; falta un recorrido de regresión sistemático tras cada integración.
- **Deuda de seguridad y calidad de Sprint 1–2 pospuesta:** privilegios amplios para `anon` en tablas antiguas, políticas duplicadas, falta de política UPDATE en `pet_images`, funciones sin `search_path`, protección de contraseñas filtradas desactivada y algunos detalles cosméticos de HU previas.
- **Datos de prueba:** las mascotas originales tenían los valores por defecto del matching hasta que se cargaron datos variados.

#### Plan de acción

| Acción | Responsable | Momento |
|---|---|---|
| Definir Scrum Master del Sprint 4 por rotación y actualizar `PLANIFICACION_SPRINTS.md` | Equipo / Alexis (PO) | Inicio del Sprint 4 |
| Acordar el contrato de datos (tablas, columnas, estados) de cada HU antes de iniciar el desarrollo visual | Rassiel / Alexis / Jeysi | Planning del Sprint 4 |
| Frank se integra al flujo de diagramación: ER del Sprint 3 (sección 1.1) y casos de uso (sección 1.2) | Frank | Inmediato |
| Recorrido manual de regresión de la versión integrada (modal de solicitud, cancelación, logout, registros) | Jeysi / Rassiel | Primeros días del Sprint 4 |
| Planificar una migración correctiva de seguridad de Sprint 1–2 (con respaldo y pruebas por rol) | Alexis (BD) / Rassiel | Durante el Sprint 4 |
| Sustituir los datos de prueba con imágenes de ejemplo por fotografías reales de mascotas para la demostración | Alexis | Antes de la demostración |

---

## 2. PLANIFICACIÓN DEL SPRINT 4

| Rol | Responsable |
|---|---|
| **Scrum Master** | **[Definir por rotación — ej.: Jeysi / Frank]** |
| **Product Owner** | Alexis |
| **Responsable de Base de Datos** | Alexis |
| **Diagramación (BD y Casos de Uso)** | Frank |

**Duración:** 2 semanas.
**Módulos involucrados:** Módulo 6 (Proceso de Adopción — lado refugio) y Módulo 7 (Seguimiento Post-Adopción — inicio).

---

### 2.1 Sprint Planning (basado en `/docs/`)

Las historias corresponden estrictamente a las asignadas al Sprint 4 en `PLANIFICACION_SPRINTS.md` (HU-38 a HU-43). La estimación original está expresada en tallas (XS/S/M/L); la columna de puntos es una **conversión propuesta** para el planning (XS = 1, S = 2, M = 3, L = 5) que el equipo debe confirmar.

| HU | Descripción | Puntos de Historia (Estimado) | Responsable (Dev) | Dependencias |
|---|---|---|---|---|
| **HU-38** | Panel de solicitudes recibidas (refugio): listado filtrable por estado, datos del adoptante, perfil y respuestas del cuestionario, pendientes destacadas | M (3) | Frontend: Jeysi · Lógica: Rassiel · **BD: Alexis** (política `SELECT` del refugio sobre los perfiles de adoptante y cuestionarios de sus solicitantes) | Tabla `adoption_applications` (Sprint 3); `adopter_profiles` y `compatibility_profiles` |
| **HU-39** | Aprobar solicitud con comentarios/condiciones; la mascota pasa a `en_proceso` de forma atómica y se valida concurrencia | S (2) | Frontend: Jeysi · Lógica: Rassiel · **BD: Alexis** (política `UPDATE` del refugio y función/transacción atómica) | HU-38; HU-41 (dispara la notificación) |
| **HU-40** | Rechazar solicitud con motivo obligatorio (mínimo 10 caracteres); la mascota permanece o vuelve a `disponible` | XS (1) | Frontend: Jeysi · Lógica: Rassiel · **BD: Alexis** (mismo mecanismo de actualización que HU-39) | HU-38; HU-41 |
| **HU-41** | Notificación de respuesta al adoptante: in-app (tabla `notifications` con badge) y correo simulado en desarrollo | M (3) | Lógica: Rassiel · **BD: Alexis** (RLS de `notifications`) · Frontend: Jeysi (badge y lista) | HU-39 y HU-40; tabla `notifications` ya definida en `ModeloBD.sql` pero pendiente de aplicar |
| **HU-42** | Registrar entrega formal de la mascota (fecha, documentos, observaciones); mascota → `adoptada`, solicitud → `completada` en una sola transacción | S (2) | Frontend: Jeysi · Lógica: Rassiel · **BD: Alexis** (almacenamiento de los datos de la entrega y transacción) | HU-39 (solo solicitudes `aprobada`) |
| **HU-43** | Generar expediente de adopción en PDF, con previsualización, logo del refugio y de MatchPet | M (3) | Frontend: Jeysi / Alexis · Lógica: Rassiel | HU-42 (datos de la entrega); HU-38 (datos del adoptante y cuestionario) |
| **Diagramación** | Diagrama ER actualizado (Sprint 3 y Sprint 4) y diagrama de casos de uso del Sprint 3 y del Sprint 4 | — (tarea de documentación) | **Frank** | Secciones 1.1 y 1.2 de este documento; definición de la tabla de entrega de HU-42 por parte de Alexis |

**Total estimado de historias:** 14 puntos propuestos (3 + 2 + 1 + 3 + 2 + 3), equivalentes a 2 historias M, 2 S, 1 XS y 1 M según la talla original.

**Notas de planificación:**
- **Base de datos (Alexis):** tareas previas a las historias de frontend — (1) políticas RLS del refugio para leer y resolver solicitudes; (2) función o transacción atómica para aprobar/rechazar/entregar (recomendada en las observaciones de HU-39 y HU-42); (3) aplicar y proteger la tabla `notifications`; (4) definir dónde se guardan los datos de la entrega formal de HU-42, ya que `ModeloBD.sql` no contiene una tabla específica para ello. Se recomienda aplicar cada cambio como migración aditiva, con respaldo previo y pruebas por rol, como se hizo en el Sprint 3.
- **Diagramación (Frank):** el diagrama ER del Sprint 4 debe esperar la decisión de Alexis sobre la tabla de entrega; mientras tanto puede avanzar con el ER del Sprint 3 y los casos de uso.
- **Riesgo identificado:** HU-41 está catalogada como de riesgo ALTO en `HISTORIAS_USUARIO.md`; se prioriza la notificación in-app (MVP para la demostración) y el correo queda simulado.
- **Condición previa heredada del Sprint 3:** el rol de refugio hoy no puede modificar solicitudes (`UPDATE`), por diseño; esa capacidad se habilita en HU-39 y HU-40.

---

### 2.2 Objetivos del Sprint 4

1. **Habilitar la gestión de solicitudes por parte del refugio.** Entregar un panel donde el refugio visualice las solicitudes recibidas junto con el perfil y el cuestionario del adoptante, y pueda aprobarlas o rechazarlas con comentarios, garantizando que el cambio de estado de la solicitud y de la mascota sea consistente (HU-38, HU-39, HU-40).
2. **Cerrar el ciclo de comunicación con el adoptante.** Notificar dentro de la aplicación (y de forma simulada por correo) la respuesta del refugio, de modo que el adoptante vea el resultado y el comentario en "Mis Solicitudes" (HU-41).
3. **Formalizar el cierre de la adopción.** Permitir registrar la entrega de la mascota, actualizar los estados finales (`adoptada` / `completada`) y generar el expediente de adopción en PDF (HU-42, HU-43), dejando al equipo de diagramación con el modelo de datos y los casos de uso documentados.

---

*Pendientes para completar este documento antes de la entrega:* enlaces a los Daily Scrum, captura del tablero Jira, fechas proyectadas y de cumplimiento, diagramas de Frank (ER y casos de uso) y definición del Scrum Master del Sprint 4.

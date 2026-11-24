# Casos de prueba de MatchPet (HU-58)

Documento formal de casos de prueba de los flujos críticos. La ejecución y el registro de resultados corresponden a HU-59.

- **Versión:** 1.0 (Sprint 6)
- **Estado de aprobación:** pendiente de revisión por el Product Owner / docente (HU-58 CA#5)
- **Fuente de verdad:** `docs/HISTORIAS_USUARIO.md` (criterios de aceptación, "CA#")
- **Entorno:** aplicación desplegada o `pnpm dev`, con las cuentas de demostración (ver `docs/PRUEBAS.md`)

## Formato de cada caso

| Campo | Significado |
|---|---|
| **ID** | `CP-<flujo>-<n>`. |
| **Tipo** | `Feliz` (camino feliz) o `Error` (camino alternativo o de error). |
| **HU / CA** | Historia de usuario y criterio de aceptación que verifica (trazabilidad, ver matriz final). |
| **Precondiciones** | Estado requerido antes de empezar. |
| **Pasos** | Acciones del tester. |
| **Datos de prueba** | Valores a ingresar. |
| **Resultado esperado** | Comportamiento correcto. |
| **Auto.** | Prueba automatizada que ya cubre el caso (`—` si es solo manual). |
| **Resultado / Bug** | Se completa en HU-59 (`Exitoso` / `Fallido` + enlace al issue). |

Severidad de defectos (HU-59): **Alta** (bloquea un flujo crítico o expone datos), **Media** (funciona con un error visible o un rodeo), **Baja** (cosmético).

---

## 1. Registro e inicio de sesión (HU-01, 02, 03, 04, 05, 07, 08, 09, 10)

### CP-AUT-01 · Feliz · Registro de adoptante (HU-01 CA#1-4, 6)
- **Precondiciones:** sin sesión; correo no registrado.
- **Pasos:** 1) Ir a `/registro`. 2) Llenar el formulario. 3) Enviar.
- **Datos:** correo `nuevo.adoptante@prueba.com`, contraseña `Prueba1234`, confirmación igual.
- **Resultado esperado:** se crea la cuenta con perfil de rol `adoptante` (trigger) y se redirige a completar el perfil.
- **Auto.:** `e2e/registro.spec.js`

### CP-AUT-02 · Error · Registro con datos inválidos (HU-01 CA#1-3, 7; HU-10)
- **Precondiciones:** sin sesión; existe la cuenta `adoptante` de demostración.
- **Pasos:** 1) Ir a `/registro`. 2) Probar tres variantes. 3) Enviar cada una.
- **Datos:** (a) contraseña `1234567` (7 caracteres); (b) contraseñas distintas; (c) un correo ya registrado.
- **Resultado esperado:** no se envía el formulario en (a) y (b) y se muestra el error junto al campo; en (c) aparece un mensaje claro de correo ya registrado. No se crea ninguna cuenta.
- **Auto.:** `tests/unit.test.js` (validadores), `e2e/auth.spec.js`

### CP-AUT-03 · Feliz · Registro de refugio (HU-02)
- **Precondiciones:** sin sesión.
- **Pasos:** 1) Ir a `/registro-refugio`. 2) Completar datos del refugio. 3) Enviar.
- **Datos:** correo nuevo del refugio, contraseña válida.
- **Resultado esperado:** cuenta con rol `refugio`; sin perfil completo, las funciones del refugio quedan bloqueadas hasta completarlo (HU-14).
- **Auto.:** `e2e/registro.spec.js`

### CP-AUT-04 · Feliz · Inicio de sesión y redirección por rol (HU-03 CA#2, 4-7)
- **Precondiciones:** cuentas de demostración `adoptante` y `refugio`.
- **Pasos:** 1) Ir a `/login`. 2) Ingresar credenciales. 3) Enviar.
- **Datos:** credenciales de cada cuenta de demostración.
- **Resultado esperado:** indicador de carga; el adoptante llega al catálogo o a su panel y el refugio a su panel de gestión; la sesión persiste.
- **Auto.:** `e2e/auth.spec.js`

### CP-AUT-05 · Error · Credenciales incorrectas (HU-03 CA#1, 3)
- **Precondiciones:** sin sesión.
- **Pasos:** 1) Ir a `/login`. 2) Enviar vacío. 3) Enviar con contraseña errónea.
- **Datos:** correo válido con contraseña `incorrecta123`.
- **Resultado esperado:** campos vacíos se validan antes de enviar; con contraseña errónea se ve el mensaje genérico de credenciales incorrectas en español (sin indicar cuál campo falló) y no se inicia sesión.
- **Auto.:** `e2e/auth.spec.js`

### CP-AUT-06 · Feliz · Persistencia de sesión y cierre (HU-04, HU-09)
- **Precondiciones:** sesión iniciada.
- **Pasos:** 1) Recargar la página (F5). 2) Cerrar sesión.
- **Resultado esperado:** tras recargar sigue autenticado sin rebotes al login; al cerrar sesión vuelve al inicio y las rutas protegidas dejan de ser accesibles.
- **Auto.:** `e2e/auth.spec.js`

### CP-AUT-07 · Error · Guards de autenticación y de rol (HU-07, HU-08)
- **Precondiciones:** (a) sin sesión; (b) sesión de adoptante.
- **Pasos:** (a) abrir `/refugio/dashboard`; (b) abrir `/refugio/mascotas`; luego con el refugio abrir `/adoptante/dashboard`.
- **Resultado esperado:** (a) redirige a `/login` y, tras iniciar sesión, vuelve a la ruta original; (b) bloquea el acceso y envía al panel propio con mensaje claro.
- **Auto.:** `e2e/auth.spec.js`

### CP-AUT-08 · Error · Recuperación de contraseña (HU-05)
- **Precondiciones:** sin sesión.
- **Pasos:** 1) Ir a `/reset-password`. 2) Ingresar un correo que no existe. 3) Enviar.
- **Datos:** `no.existe@prueba.com`.
- **Resultado esperado:** mensaje neutro que no revela si la cuenta existe.
- **Auto.:** `e2e/auth.spec.js`

---

## 2. Gestión de mascotas (HU-16 a HU-21)

### CP-MAS-01 · Feliz · Registrar mascota (HU-16 CA#4-5, HU-17)
- **Precondiciones:** sesión de refugio con perfil completo.
- **Pasos:** 1) `/refugio/mascotas` → "Nueva mascota". 2) Llenar campos obligatorios y subir una foto. 3) Guardar.
- **Datos:** nombre `Firulais`, especie perro, edad 2, tamaño mediano, estado de salud sano, una imagen JPG.
- **Resultado esperado:** mensaje "Mascota registrada correctamente"; aparece en el listado con estado `disponible`, vinculada al refugio, y se ve en el catálogo público.
- **Auto.:** `e2e/refugio-mascotas.spec.js`

### CP-MAS-02 · Error · Validación del formulario de mascota (HU-16 CA#1-3)
- **Precondiciones:** sesión de refugio.
- **Pasos:** 1) Abrir el formulario. 2) Guardar vacío. 3) Probar valores inválidos.
- **Datos:** edad `-1`, peso `abc`, descripción de más de 500 caracteres.
- **Resultado esperado:** no se guarda; cada campo inválido muestra su error y no se crea la mascota.
- **Auto.:** — (manual)

### CP-MAS-03 · Feliz · Editar, portada, borrar imagen y cambiar estado (HU-18, 19, 20)
- **Precondiciones:** mascota propia con 2 o más imágenes.
- **Pasos:** 1) Editar el nombre. 2) Cambiar la portada. 3) Borrar una imagen. 4) Cambiar el estado a `adoptada`.
- **Resultado esperado:** los cambios se reflejan al instante; la nueva portada se ve en las tarjetas; con estado `adoptada` desaparece el botón "Enviar solicitud" en el detalle público.
- **Auto.:** `e2e/refugio-mascotas.spec.js`, `tests/unit.test.js` (galería)

### CP-MAS-04 · Error · Operar sobre mascota de otro refugio (HU-18, seguridad RLS)
- **Precondiciones:** dos refugios de demostración.
- **Pasos:** el refugio B intenta editar o eliminar una mascota del refugio A (por la API/consola).
- **Resultado esperado:** la operación es rechazada por permisos y la mascota no cambia.
- **Auto.:** `e2e/seguridad.spec.js`

---

## 3. Catálogo y búsqueda (HU-22 a HU-29)

### CP-CAT-01 · Feliz · Buscar, filtrar y ver detalle (HU-23, 24, 25, 26)
- **Precondiciones:** hay mascotas disponibles; con o sin sesión.
- **Pasos:** 1) Abrir `/catalogo`. 2) Buscar por nombre. 3) Filtrar por especie y tamaño. 4) Abrir una tarjeta.
- **Resultado esperado:** solo mascotas `disponible`; las tarjetas muestran foto, nombre, especie, edad, tamaño y ciudad; los filtros y la búsqueda reducen la lista; el detalle muestra la galería.
- **Auto.:** `e2e/adoptante.spec.js`

### CP-CAT-02 · Error · Búsqueda sin resultados y favorito sin sesión (HU-23 CA#4, HU-28 CA#4)
- **Precondiciones:** sin sesión.
- **Pasos:** 1) Buscar un texto inexistente. 2) Pulsar el corazón de una tarjeta.
- **Datos:** `zzzzzz`.
- **Resultado esperado:** estado vacío amable; el corazón redirige a `/login`.
- **Auto.:** — (manual)

### CP-CAT-03 · Feliz · Favoritos (HU-28, 29)
- **Precondiciones:** sesión de adoptante.
- **Pasos:** 1) Pulsar el corazón de una mascota. 2) Abrir `/favoritos`. 3) Quitarla.
- **Resultado esperado:** el ícono cambia al instante sin recargar; la mascota aparece y desaparece en `/favoritos`.
- **Auto.:** `e2e/adoptante.spec.js`

---

## 4. Cuestionario y matching (HU-30 a HU-33)

### CP-MAT-01 · Feliz · Cuestionario y recomendaciones (HU-30, 31, 32, 33)
- **Precondiciones:** adoptante con perfil completo y mascotas disponibles.
- **Pasos:** 1) `/adoptante/cuestionario`: responder todo y guardar. 2) Abrir `/adoptante/recomendaciones`.
- **Resultado esperado:** las mascotas aparecen ordenadas por porcentaje de compatibilidad (0 a 100 %), con tamaño como filtro eliminatorio; solo se incluyen mascotas `disponible`.
- **Auto.:** `e2e/adoptante.spec.js`

### CP-MAT-02 · Error · Sin cuestionario o sin coincidencias (HU-32 CA#5, HU-33)
- **Precondiciones:** (a) adoptante sin cuestionario; (b) respuestas que no coinciden con ninguna mascota.
- **Pasos:** abrir `/adoptante/recomendaciones` en cada caso.
- **Resultado esperado:** (a) invita a completar el cuestionario; (b) mensaje controlado o lista vacía, sin errores ni valores `NaN`.
- **Auto.:** — (manual; el flujo de adoptante nuevo en `e2e/ciclo-adopcion.spec.js` cubre solo el camino feliz)

---

## 5. Solicitudes de adopción (HU-35 a HU-41)

### CP-SOL-01 · Feliz · Enviar solicitud y verla pendiente (HU-35, 36)
- **Precondiciones:** adoptante con perfil completo; mascota `disponible`.
- **Pasos:** 1) En el detalle, "Enviar solicitud". 2) Escribir el mensaje. 3) Enviar. 4) Abrir "Mis solicitudes".
- **Datos:** mensaje de 10 a 500 caracteres.
- **Resultado esperado:** confirmación y redirección a "Mis solicitudes" con estado `pendiente`; el refugio recibe un aviso.
- **Auto.:** `e2e/adoptante.spec.js`, `e2e/ciclo-adopcion.spec.js`

### CP-SOL-02 · Error · Solicitud inválida o duplicada (HU-35 CA#1-3, 5)
- **Precondiciones:** (a) adoptante con solicitud ya enviada a la mascota; (b) mascota `adoptada`; (c) adoptante con perfil incompleto.
- **Pasos:** intentar enviar solicitud en cada caso; en (a) probar además un mensaje de 5 y de 501 caracteres.
- **Resultado esperado:** mensaje fuera de rango se rechaza sin llamar a la BD; en (a) no se permite la segunda solicitud (unicidad); en (b) el botón no está disponible; en (c) se pide completar el perfil.
- **Auto.:** `tests/unit.test.js`, `e2e/seguridad.spec.js`

### CP-SOL-03 · Feliz · Cancelar solicitud pendiente (HU-37)
- **Precondiciones:** solicitud en estado `pendiente`.
- **Pasos:** 1) "Cancelar solicitud". 2) Confirmar en el modal.
- **Resultado esperado:** estado `cancelada` sin recargar; el refugio recibe el aviso.
- **Auto.:** `e2e/adoptante.spec.js`

### CP-SOL-04 · Feliz · Aprobar solicitud (HU-38, 39, 41)
- **Precondiciones:** refugio con una solicitud `pendiente`.
- **Pasos:** 1) `/refugio/solicitudes`. 2) "Aprobar". 3) Agregar comentarios. 4) Confirmar.
- **Resultado esperado:** solicitud `aprobada`, mascota en `en_proceso` y aviso al adoptante.
- **Auto.:** `e2e/ciclo-adopcion.spec.js`

### CP-SOL-05 · Error · Rechazar sin motivo suficiente (HU-40)
- **Precondiciones:** refugio con una solicitud `pendiente`.
- **Pasos:** 1) "Rechazar". 2) Dejar el motivo vacío y luego con menos de 10 caracteres. 3) Confirmar. 4) Repetir con un motivo válido.
- **Datos:** motivo `corto`, luego `La vivienda no es adecuada`.
- **Resultado esperado:** con motivo inválido no se rechaza; con motivo válido la solicitud queda `rechazada`, la mascota sigue `disponible` y el adoptante recibe el aviso con el motivo.
- **Auto.:** `e2e/refugio.spec.js`

---

## 6. Seguimiento post-adopción (HU-42 a HU-48)

### CP-SEG-01 · Feliz · Entrega formal y expediente (HU-42, 43)
- **Precondiciones:** solicitud `aprobada`.
- **Pasos:** 1) Registrar la entrega con fecha y documentos. 2) Abrir el expediente.
- **Resultado esperado:** mensaje "¡Entrega registrada! La mascota ya tiene un hogar"; mascota `adoptada` y solicitud `completada`.
- **Auto.:** `e2e/ciclo-adopcion.spec.js`

### CP-SEG-02 · Error · Entrega sobre solicitud no aprobada (HU-42 CA#5)
- **Precondiciones:** solicitud `pendiente` o `rechazada`.
- **Pasos:** intentar registrar la entrega (UI o API).
- **Resultado esperado:** la acción no está disponible o es rechazada; el estado de la mascota no cambia.
- **Auto.:** — (manual)

### CP-SEG-03 · Feliz · Notas, reportes y calendario de salud (HU-44 a HU-48)
- **Precondiciones:** adopción entregada.
- **Pasos:** 1) El refugio agrega una nota de seguimiento. 2) El adoptante la ve en su historial. 3) El adoptante envía un reporte. 4) El refugio lo responde. 5) Se agrega un registro de salud y se marca como completado.
- **Resultado esperado:** cada paso se refleja en la vista de la otra parte y genera su aviso.
- **Auto.:** `e2e/ciclo-adopcion.spec.js`, `tests/sprint5.test.js`

### CP-SEG-04 · Error · Reporte y adjuntos inválidos (HU-47)
- **Precondiciones:** adoptante con adopción activa.
- **Pasos:** 1) Enviar un reporte de menos de 10 caracteres. 2) Adjuntar un archivo `.exe` y otro de más de 10 MB.
- **Resultado esperado:** el reporte no se envía y los adjuntos no válidos se rechazan sin subirse.
- **Auto.:** `tests/sprint5.test.js`

---

## 7. Panel y estadísticas del refugio (HU-49 a HU-51)

### CP-EST-01 · Feliz · Panel y gráficas (HU-49, 50, 51)
- **Precondiciones:** refugio con adopciones registradas.
- **Pasos:** 1) Abrir `/refugio/dashboard`. 2) Abrir `/refugio/estadisticas` y cambiar el rango.
- **Resultado esperado:** los 4 KPIs coinciden con la base de datos y las gráficas se actualizan con el rango.
- **Auto.:** `e2e/refugio.spec.js`, `tests/sprint5.test.js`

### CP-EST-02 · Error · Refugio nuevo sin datos (HU-50 CA#4)
- **Precondiciones:** refugio recién registrado sin adopciones.
- **Pasos:** abrir `/refugio/estadisticas`.
- **Resultado esperado:** estado vacío con el mensaje definido, sin errores ni valores `NaN`.
- **Auto.:** `e2e/ciclo-adopcion.spec.js` (refugio nuevo)

---

## 8. Asistente de IA (HU-34, 63 a 66) — se ejecuta al terminar la Etapa 2

### CP-IA-01 · Feliz · Conversar con el asistente (HU-34 CA#2-4)
- **Precondiciones:** sesión de adoptante; servicio de IA desplegado y `VITE_AI_API_URL` configurada.
- **Pasos:** 1) Abrir el chat flotante. 2) Preguntar `¿Qué cuidados necesita un gato senior?`. 3) Hacer una segunda pregunta.
- **Resultado esperado:** respuesta empática en español; el historial de la conversación se conserva en pantalla. Con el servicio dormido se muestra un aviso de "despertando asistente".
- **Auto.:** `e2e/chat.spec.js` (con el servicio simulado), `tests/sprint6.test.js`, `ai-service/tests`. La prueba contra el servicio real desplegado es manual.

### CP-IA-02 · Error · Límite de mensajes y fallos del servicio (HU-34 CA#5-6, HU-64)
- **Precondiciones:** (a) sesión en el límite de mensajes; (b) servicio de IA apagado; (c) sin sesión.
- **Pasos:** enviar un mensaje en cada caso.
- **Resultado esperado:** (a) mensaje de límite alcanzado; (b) mensaje amable sin texto técnico; (c) el servicio exige iniciar sesión (401).
- **Auto.:** `e2e/chat.spec.js` (fallo del servicio), `tests/sprint6.test.js`, `ai-service/tests`

---

## 9. PWA y experiencia móvil (HU-52 a HU-57) — se completa con las Etapas 1 y 3

### CP-PWA-01 · Feliz · Vistas sin desbordes en móvil (HU-57 CA#2-4)
- **Precondiciones:** pantalla de 375 px de ancho (celular o emulador).
- **Pasos:** recorrer todas las rutas de cada rol.
- **Resultado esperado:** sin scroll horizontal; los botones y enlaces tienen un área de toque de al menos 44 px; las tablas se desplazan dentro de su contenedor.
- **Auto.:** `EXPLORE=1 EXPLORE_MOBILE=1 pnpm test:e2e e2e/explore.spec.js`

### CP-PWA-02 · Error · Navegación sin conexión (HU-55 CA#1-3)
- **Precondiciones:** PWA con el catálogo ya cargado una vez.
- **Pasos:** 1) Desconectar la red. 2) Recargar `/catalogo`. 3) Marcar un favorito. 4) Reconectar.
- **Resultado esperado:** se muestra el catálogo guardado con el aviso "Estás navegando sin conexión"; el favorito queda en cola y se envía al recuperar la conexión.
- **Auto.:** `e2e/offline.spec.js` (aviso y cola de favoritos), `tests/sprint6.test.js`. El catálogo desde la caché del Service Worker se prueba en la compilación (`pnpm build && pnpm preview`).

### CP-PWA-03 · Feliz · Activar notificaciones push (HU-56 CA#1, 2, 4, 5)
- **Precondiciones:** PWA servida por HTTPS (o `localhost`) e instalada; sesión de adoptante; migración `20240000000012` aplicada, función `send-push` y webhook desplegados.
- **Pasos:** 1) En "Mi perfil" activar "Notificaciones push" y aceptar el permiso. 2) Con la app cerrada, hacer que el refugio apruebe o rechace una solicitud. 3) Tocar el aviso.
- **Resultado esperado:** llega una notificación con título, cuerpo e ícono; al tocarla se abre la PWA en `/adoptante/solicitudes`. En "Mi perfil" el interruptor queda activo y existe una fila en `push_subscriptions`.
- **Auto.:** — (manual, requiere dispositivo y permiso del navegador)

### CP-PWA-04 · Error · Permiso denegado y desactivación (HU-56 CA#1, 2)
- **Precondiciones:** sesión de adoptante.
- **Pasos:** 1) Activar el interruptor y **bloquear** el permiso. 2) Permitirlo, activar y volver a desactivar. 3) En iPhone, abrir la web sin instalar.
- **Resultado esperado:** con el permiso bloqueado se explica cómo habilitarlo y el interruptor no cambia; al desactivar se borra la suscripción y ya no llegan avisos; en iPhone sin instalar el interruptor está deshabilitado con la instrucción de instalar la app.
- **Auto.:** — (manual)

---

## Matriz de trazabilidad (HU → casos)

| HU | Casos |
|---|---|
| HU-01, 10 | CP-AUT-01, CP-AUT-02 |
| HU-02 | CP-AUT-03 |
| HU-03 | CP-AUT-04, CP-AUT-05 |
| HU-04, 09 | CP-AUT-06 |
| HU-05 | CP-AUT-08 |
| HU-07, 08 | CP-AUT-07 |
| HU-16, 17 | CP-MAS-01, CP-MAS-02 |
| HU-18, 19, 20 | CP-MAS-03, CP-MAS-04 |
| HU-23 a 26 | CP-CAT-01, CP-CAT-02 |
| HU-28, 29 | CP-CAT-02, CP-CAT-03 |
| HU-30 a 33 | CP-MAT-01, CP-MAT-02 |
| HU-35, 36 | CP-SOL-01, CP-SOL-02 |
| HU-37 | CP-SOL-03 |
| HU-38, 39, 41 | CP-SOL-04 |
| HU-40 | CP-SOL-05 |
| HU-42, 43 | CP-SEG-01, CP-SEG-02 |
| HU-44 a 48 | CP-SEG-03, CP-SEG-04 |
| HU-49 a 51 | CP-EST-01, CP-EST-02 |
| HU-34, 63 a 66 | CP-IA-01, CP-IA-02 |
| HU-55, 57 | CP-PWA-01, CP-PWA-02 |
| HU-56 | CP-PWA-03, CP-PWA-04 |

## Registro de ejecución (HU-59)

Ejecución del 2026-11-24 contra el sitio publicado (`https://matchpet-univalle.web.app`): 36 pruebas e2e en verde, 48 pruebas unitarias en verde (el servicio de IA se probó antes con 22 pruebas propias; no se repitieron hoy). Los casos "Pendiente" los debe ejecutar una persona con dispositivo real. **Defectos encontrados en esta ejecución: ninguno abierto.**

| Caso | Ejecutor | Fecha | Resultado | Bug / evidencia |
|---|---|---|---|---|
| CP-AUT-01 | Claude (automatizado) | 2026-11-24 | Exitoso | `e2e/registro.spec.js` |
| CP-AUT-02 | Claude (automatizado) | 2026-11-24 | Exitoso | `tests/unit.test.js` (validadores), `e2e/auth.spec.js` |
| CP-AUT-03 | Claude (automatizado) | 2026-11-24 | Exitoso | `e2e/registro.spec.js` |
| CP-AUT-04 | Claude (automatizado) | 2026-11-24 | Exitoso | `e2e/auth.spec.js` |
| CP-AUT-05 | Claude (automatizado) | 2026-11-24 | Exitoso | `e2e/auth.spec.js` |
| CP-AUT-06 | Claude (automatizado) | 2026-11-24 | Exitoso | `e2e/auth.spec.js` |
| CP-AUT-07 | Claude (automatizado) | 2026-11-24 | Exitoso | `e2e/auth.spec.js` |
| CP-AUT-08 | Claude (automatizado) | 2026-11-24 | Exitoso | `e2e/auth.spec.js` |
| CP-MAS-01 | Claude (automatizado) | 2026-11-24 | Exitoso | `e2e/refugio-mascotas.spec.js` |
| CP-MAS-02 | Claude (automatizado) | 2026-11-24 | Exitoso | e2e/casos-manuales.spec.js contra el sitio publicado; no se crea la mascota. |
| CP-MAS-03 | Claude (automatizado) | 2026-11-24 | Exitoso | `e2e/refugio-mascotas.spec.js`, `tests/unit.test.js` (galería) |
| CP-MAS-04 | Claude (automatizado) | 2026-11-24 | Exitoso | `e2e/seguridad.spec.js` |
| CP-CAT-01 | Claude (automatizado) | 2026-11-24 | Exitoso | `e2e/adoptante.spec.js` |
| CP-CAT-02 | Claude (automatizado) | 2026-11-24 | Exitoso | e2e/casos-manuales.spec.js contra el sitio publicado. |
| CP-CAT-03 | Claude (automatizado) | 2026-11-24 | Exitoso | `e2e/adoptante.spec.js` |
| CP-MAT-01 | Claude (automatizado) | 2026-11-24 | Exitoso | `e2e/adoptante.spec.js` |
| CP-MAT-02 | Claude (automatizado) | 2026-11-24 | Exitoso (parcial) | Camino sin cuestionario cubierto por e2e/ciclo-adopcion (adoptante nuevo); sin coincidencias sin ejecutar a mano. |
| CP-SOL-01 | Claude (automatizado) | 2026-11-24 | Exitoso | `e2e/adoptante.spec.js`, `e2e/ciclo-adopcion.spec.js` |
| CP-SOL-02 | Claude (automatizado) | 2026-11-24 | Exitoso | `tests/unit.test.js`, `e2e/seguridad.spec.js` |
| CP-SOL-03 | Claude (automatizado) | 2026-11-24 | Exitoso | `e2e/adoptante.spec.js` |
| CP-SOL-04 | Claude (automatizado) | 2026-11-24 | Exitoso | `e2e/ciclo-adopcion.spec.js` |
| CP-SOL-05 | Claude (automatizado) | 2026-11-24 | Exitoso | `e2e/refugio.spec.js` |
| CP-SEG-01 | Claude (automatizado) | 2026-11-24 | Exitoso | `e2e/ciclo-adopcion.spec.js` |
| CP-SEG-02 | Claude (automatizado) | 2026-11-24 | Exitoso | e2e/casos-manuales.spec.js: la entrega sobre solicitud no aprobada es rechazada. |
| CP-SEG-03 | Claude (automatizado) | 2026-11-24 | Exitoso | `e2e/ciclo-adopcion.spec.js`, `tests/sprint5.test.js` |
| CP-SEG-04 | Claude (automatizado) | 2026-11-24 | Exitoso | `tests/sprint5.test.js` |
| CP-EST-01 | Claude (automatizado) | 2026-11-24 | Exitoso | `e2e/refugio.spec.js`, `tests/sprint5.test.js` |
| CP-EST-02 | Claude (automatizado) | 2026-11-24 | Exitoso | `e2e/ciclo-adopcion.spec.js` (refugio nuevo) |
| CP-IA-01 | Claude (automatizado) | 2026-11-24 | Exitoso | Chat real contra Render con sesión de adoptante: respuesta 200 en español. Prueba simulada en e2e/chat.spec.js. |
| CP-IA-02 | Claude (automatizado) | 2026-11-24 | Exitoso (parcial) | (b) servicio caído y (c) sin sesión → 401 verificados; el límite de mensajes (a) solo en pruebas del servicio (pytest). |
| CP-PWA-01 | Claude (automatizado) | 2026-11-24 | Exitoso (parcial) | Exploración móvil 375 px y auditoría de accesibilidad automatizadas; falta recorrido en celular real. |
| CP-PWA-02 | Claude (automatizado) | 2026-11-24 | Exitoso (parcial) | Aviso sin conexión y cola de favoritos verificados contra el sitio publicado; caché de catálogo sin probar en dispositivo. |
| CP-PWA-03 | Claude (automatizado) | 2026-11-24 | Pendiente (dispositivo real) | Servidor verificado: trigger, secreto, función y 0 suscripciones. Falta activar el interruptor en un celular. |
| CP-PWA-04 | Claude (automatizado) | 2026-11-24 | Pendiente (dispositivo real) | Requiere bloquear el permiso y probar en iPhone. |

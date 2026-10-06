PRODUCT BACKLOG

MÓDULO 1: Autenticación y Seguridad
ID	Módulo	Tarea	Descripción	Priorización	Estimación (T-Shirt)
PB-01	Autenticación y Seguridad	Registro de adoptante	Formulario de registro (nombre, correo, contraseña). Nota: La confirmación por correo de Supabase está desactivada para el entorno de pruebas (correos temporales); el usuario queda activo inmediatamente. Creación automática de perfil vía trigger. Rol adoptante.	Alta	S
PB-02	Autenticación y Seguridad	Registro de refugio	Formulario de registro (nombre responsable, correo, contraseña, datos iniciales del refugio). Mismo criterio de confirmación desactivada que en PB-01. Rol refugio.	Alta	S
PB-03	Autenticación y Seguridad	Inicio de sesión	Formulario de login con correo y contraseña. Autenticación contra Supabase Auth. Redirección automática por rol (adoptante → catálogo, refugio → panel).	Alta	S
PB-04	Autenticación y Seguridad	Cierre de sesión	Botón de logout que invalida la sesión en Supabase Auth y redirige a la landing page. Limpieza de estado local (Pinia).	Alta	XS
PB-05	Autenticación y Seguridad	Solicitud de recuperación de contraseña	Formulario donde el usuario ingresa su correo. Supabase Auth envía un enlace de recuperación. (Nota para pruebas: requerirá un correo real o mockear el servicio de emails).	Media	XS
PB-06	Autenticación y Seguridad	Vista de reseteo de contraseña	Página /reset-password que captura el token del enlace de correo, permite ingresar y confirmar nueva contraseña. (Deuda técnica del Sprint 1)	Alta	S
PB-07	Autenticación y Seguridad	Guards de autenticación	Middleware en Vue Router que protege rutas: redirige a login si no hay sesión activa.	Alta	XS
PB-08	Autenticación y Seguridad	Guards de roles	Extensión del guard que verifica el rol del usuario (adoptante, refugio, admin) y bloquea el acceso a rutas no autorizadas.	Alta	XS
PB-09	Autenticación y Seguridad	Persistencia de sesión ante recarga	Manejo correcto de onAuthStateChange para que al hacer F5 en una ruta protegida, el guard espere la restauración de sesión antes de redirigir. (Deuda técnica del Sprint 1)	Alta	S
PB-10	Autenticación y Seguridad	Validación de formularios de registro	Validaciones frontend: campos obligatorios, formato de correo, contraseña mínima, campo "confirmar contraseña" coincidente. (Deuda técnica del Sprint 1)	Alta	XS

MÓDULO 2: Perfiles de Usuario
ID	Módulo	Tarea	Descripción	Priorización	Estimación (T-Shirt)
PB-11	Perfiles de Usuario	Trigger de creación automática de perfil	Trigger PostgreSQL en Supabase que, al insertarse un usuario en auth.users, crea automáticamente un registro en profiles con el rol correspondiente.	Alta	XS
PB-12	Perfiles de Usuario	Completar perfil de adoptante	Formulario extendido: tipo de vivienda, espacio, niños, otras mascotas, experiencia, ciudad. Tabla adopter_profiles.	Alta	S
PB-13	Perfiles de Usuario	Ver y editar perfil de adoptante	Vista donde el adoptante puede consultar y modificar sus datos de perfil extendido.	Media	XS
PB-14	Perfiles de Usuario	Completar perfil de refugio	Formulario con datos organizacionales: nombre, ciudad, dirección, descripción, teléfono, fotos de portada. Tabla shelters.	Alta	S
PB-15	Perfiles de Usuario	Ver y editar perfil de refugio	Vista donde el refugio puede consultar y modificar sus datos organizacionales.	Media	XS

MÓDULO 3: Gestión de Mascotas (Refugio)
ID	Módulo	Tarea	Descripción	Priorización	Estimación (T-Shirt)
PB-16	Gestión de Mascotas	Registrar nueva mascota	Formulario completo: nombre, especie, raza, edad, tamaño, peso, temperamento, salud, descripción, requisitos. Tabla pets.	Alta	M
PB-17	Gestión de Mascotas	Subir imágenes de mascota	Componente de carga múltiple. Subida al bucket pet-images de Supabase Storage con política RLS. Registro en tabla pet_images.	Alta	M
PB-18	Gestión de Mascotas	Editar información de mascota	Formulario precargado con los datos actuales. Permite modificar cualquier campo y guardar cambios.	Alta	S
PB-19	Gestión de Mascotas	Eliminar imagen de mascota	Funcionalidad en la UI para eliminar una foto específica de la galería, borrándola de la tabla pet_images y del Storage. (Deuda técnica)	Media	S
PB-20	Gestión de Mascotas	Cambiar estado de mascota	Acción para transicionar el estado entre: disponible, en_proceso, adoptada. Actualiza el campo status.	Alta	XS
PB-21	Gestión de Mascotas	Listar mascotas del refugio	Vista interna del refugio con tabla/lista de todas sus mascotas, con estado, fecha y acciones rápidas (editar, cambiar estado).	Alta	S

MÓDULO 4: Catálogo y Búsqueda
ID	Módulo	Tarea	Descripción	Priorización	Estimación (T-Shirt)
PB-22	Catálogo y Búsqueda	Landing page pública	Página de inicio accesible sin autenticación. Presentación del proyecto, propuesta de valor, llamada a la acción.	Alta	S
PB-23	Catálogo y Búsqueda	Ver catálogo de mascotas disponibles	Grid/lista de mascotas con estado disponible. Muestra foto, nombre, especie, edad, tamaño y ciudad. Paginación o scroll infinito.	Alta	M
PB-24	Catálogo y Búsqueda	Filtrar mascotas	Filtros combinados: especie, ciudad, tamaño, rango de edad. Aplicados en tiempo real sobre el catálogo.	Alta	S
PB-25	Catálogo y Búsqueda	Buscar mascotas por texto	Barra de búsqueda que filtra por nombre de mascota, raza o descripción.	Media	XS
PB-26	Catálogo y Búsqueda	Ver detalle de mascota	Vista completa: galería de fotos, historia, vacunas, temperamento, requisitos, información del refugio.	Alta	S
PB-27	Catálogo y Búsqueda	Galería de fotos de mascota	Carrusel o grid de imágenes en la vista de detalle. Imagen principal destacada.	Media	XS
PB-28	Catálogo y Búsqueda	Agregar/quitar favoritos	Botón de corazón en tarjetas y en vista de detalle. Solo para usuarios autenticados. Tabla favorites.	Alta	S
PB-29	Catálogo y Búsqueda	Ver lista de favoritos	Vista dedicada donde el adoptante ve todas las mascotas que marcó como favoritas, con acceso rápido al detalle.	Media	XS

MÓDULO 5: Compatibilidad y Matching
ID	Módulo	Tarea	Descripción	Priorización	Estimación (T-Shirt)
PB-30	Compatibilidad y Matching	Cuestionario de estilo de vida	Formulario de preguntas estructuradas: horas en casa, actividad, espacio, experiencia, preferencias. Tabla compatibility_answers.	Alta	M
PB-31	Compatibilidad y Matching	Guardar respuestas del cuestionario	Persistencia de las respuestas en la base de datos, vinculadas al perfil. Permitir re-editar respuestas.	Alta	S
PB-32	Compatibilidad y Matching	Algoritmo de compatibilidad	Lógica de scoring que cruza respuestas del cuestionario con atributos de las mascotas. Genera un porcentaje de compatibilidad.	Alta	L
PB-33	Compatibilidad y Matching	Mostrar recomendaciones de mascotas	Vista de resultados ordenados por porcentaje de compatibilidad. Muestra el score y explica brevemente el match.	Alta	M
PB-34	Compatibilidad y Matching	Asistente IA de compatibilidad	Chatbot integrado que usa Google Gemini API para responder dudas sobre compatibilidad y explicar resultados del matching.	Media	L

MÓDULO 6: Proceso de Adopción
ID	Módulo	Tarea	Descripción	Priorización	Estimación (T-Shirt)
PB-35	Proceso de Adopción	Enviar solicitud de adopción	Formulario desde el detalle de mascota: mensaje, confirmación de datos. Crea registro en adoption_applications con estado pendiente.	Alta	M
PB-36	Proceso de Adopción	Ver estado de solicitud (adoptante)	Vista donde el adoptante ve sus solicitudes con estado actual (pendiente, aprobada, rechazada, cancelada). Incluye comentarios.	Alta	S
PB-37	Proceso de Adopción	Cancelar solicitud de adopción	Acción disponible para el adoptante mientras la solicitud esté pendiente. Cambia el estado a cancelada.	Media	XS
PB-38	Proceso de Adopción	Panel de solicitudes recibidas (refugio)	Vista del refugio con lista de solicitudes entrantes: datos del adoptante, mascota, fecha, estado. Filtros por estado.	Alta	M
PB-39	Proceso de Adopción	Aprobar solicitud	Acción del refugio: aprueba, agrega comentarios/condiciones, cambia estado a aprobada. La mascota pasa a en_proceso.	Alta	S
PB-40	Proceso de Adopción	Rechazar solicitud	Acción del refugio: rechaza con un comentario explicativo obligatorio. Cambia estado a rechazada.	Alta	XS
PB-41	Proceso de Adopción	Notificación de respuesta al adoptante	Notificación por correo (Supabase) y notificación in-app cuando el refugio responde una solicitud.	Media	M

MÓDULO 7: Seguimiento Post-Adopción
ID	Módulo	Tarea	Descripción	Priorización	Estimación (T-Shirt)
PB-42	Seguimiento Post-Adopción	Registrar entrega formal de mascota	Formulario del refugio: fecha, documentos, observaciones. Cambia estado de mascota a adoptada y solicitud a completada.	Alta	S
PB-43	Seguimiento Post-Adopción	Generar expediente de adopción	Vista consolidada con toda la info del proceso. Exportable a PDF.	Media	M
PB-44	Seguimiento Post-Adopción	Registrar notas de seguimiento	Formulario del refugio para agregar notas periódicas: tipo, fecha, observaciones sobre la adaptación.	Media	S
PB-45	Seguimiento Post-Adopción	Ver historial de seguimiento (adoptante)	Vista donde el adoptante puede ver las notas de seguimiento registradas por el refugio.	Media	XS
PB-46	Seguimiento Post-Adopción	Recordatorios de vacunas y desparasitación	Sistema de recordatorios automáticos: el refugio registra el calendario y el sistema envía notificaciones push/correo en las fechas.	Media	L
PB-47	Seguimiento Post-Adopción	Reportar problema o duda (adoptante)	Formulario donde el adoptante reporta un problema de comportamiento, salud o duda. Se notifica al refugio.	Baja	S
PB-48	Seguimiento Post-Adopción	Responder reporte (refugio)	Vista del refugio para ver reportes de adoptantes y responder con orientación o agendar visita.	Baja	S

MÓDULO 8: Estadísticas y Dashboard
ID	Módulo	Tarea	Descripción	Priorización	Estimación (T-Shirt)
PB-49	Estadísticas y Dashboard	Dashboard del refugio	Panel principal con métricas clave: total de mascotas (por estado), solicitudes pendientes, adopciones del mes, tasa de éxito.	Alta	M
PB-50	Estadísticas y Dashboard	Gráficas de adopciones por período	Gráficos interactivos (Chart.js): adopciones por mes, especie, tamaño. Filtro por rango de fechas.	Media	M
PB-51	Estadísticas y Dashboard	Métricas de compatibilidad	Estadísticas sobre el uso del cuestionario: usuarios que lo completaron, tasa de match, conversión a adopción.	Baja	M

MÓDULO 9: PWA y Experiencia Móvil
ID	Módulo	Tarea	Descripción	Priorización	Estimación (T-Shirt)
PB-52	PWA y Experiencia Móvil	Configuración PWA base	Configuración de vite-plugin-pwa: manifest.json, iconos, colores, display: standalone, registro del service worker.	Alta	S
PB-53	PWA y Experiencia Móvil	Instalación de PWA	Botón/banner de instalación usando el evento beforeinstallprompt del navegador.	Alta	XS
PB-54	PWA y Experiencia Móvil	Caché de assets estáticos (offline básico)	Estrategia de caché con Workbox: precache de HTML, CSS, JS, iconos. La app carga la shell sin conexión.	Alta	S
PB-55	PWA y Experiencia Móvil	Caché de datos (offline funcional)	Estrategia de caché para datos de la API (catálogo, perfiles). Sincronización en segundo plano al recuperar conexión.	Media	L
PB-56	PWA y Experiencia Móvil	Notificaciones push	Integración con Web Push API / Supabase Edge Functions para enviar notificaciones push al adoptante.	Media	M
PB-57	PWA y Experiencia Móvil	Diseño responsive mobile-first	Asegurar que todas las vistas funcionen en móvil, tablet y escritorio. TailwindCSS breakpoints. Validación Lighthouse.	Alta	M

MÓDULO 10: Calidad, CI/CD y Documentación
ID	Módulo	Tarea	Descripción	Priorización	Estimación (T-Shirt)
PB-58	Calidad, CI/CD y Documentación	Diseñar casos de prueba	Documento formal de casos de prueba para funcionalidades críticas. Formato: ID, preconditiones, pasos, resultado esperado.	Alta	M
PB-59	Calidad, CI/CD y Documentación	Ejecutar pruebas funcionales	Ejecución manual de los casos de prueba. Registro de resultados, bugs encontrados y correcciones.	Alta	M
PB-60	Calidad, CI/CD y Documentación	Configuración de CI/CD (GitHub Actions)	Workflow de GitHub Actions: lint, build, y despliegue automático a Firebase Hosting en push a main. Keep-alive de Supabase.	Alta	M
PB-61	Calidad, CI/CD y Documentación	Manual de usuario	Documento final con capturas y descripción paso a paso de todas las funcionalidades (adoptante y refugio).	Alta	M
PB-62	Calidad, CI/CD y Documentación	Manual técnico	Documento con arquitectura, modelo de datos, APIs, configuración de Supabase, despliegue y decisiones técnicas.	Alta	M

MÓDULO 11: Tecnologías Emergentes (IA, Docker, AR)
ID	Módulo	Tarea	Descripción	Priorización	Estimación (T-Shirt)
PB-63	Tecnologías Emergentes	Microservicio de IA con FastAPI	API REST en Python con FastAPI que expone endpoints para el asistente de compatibilidad y FAQ.	Media	M
PB-64	Tecnologías Emergentes	Integración con Google Gemini API	Conexión del microservicio con la API de Gemini para generar respuestas contextuales sobre compatibilidad.	Media	M
PB-65	Tecnologías Emergentes	Contenedorización con Docker	Dockerfile para el microservicio de IA. docker-compose.yml para orquestación local. Documentación de uso.	Media	S
PB-66	Tecnologías Emergentes	Despliegue del microservicio	Despliegue del contenedor Docker en un servicio cloud (Railway, Render). Integración con el frontend.	Media	M
PB-67	Tecnologías Emergentes	Vista AR del tamaño de mascota	Módulo opcional de Realidad Aumentada (WebXR / Model Viewer) para visualizar el tamaño de la mascota en el entorno.	Baja	XL

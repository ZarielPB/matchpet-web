# SPRINT 2 — Changelog

Sprint: Catálogo de mascotas, gestión de refugios y perfil del adoptante
Proyecto: **MatchPet Web** (Vue 3 + Pinia + Supabase)

> Numeración de historias según la fuente oficial del proyecto:
> `docs/PLANIFICACION_SPRINTS.md` y `docs/HISTORIAS_USUARIO.md`.
> El esquema de referencia es `docs/ModeloBD.sql`.

---

## Resumen

| HU | Historia | Dónde vive |
|---|---|---|
| HU-11 | Creación automática de perfil al registrarse | Trigger `handle_new_user` (BD) |
| HU-12 | Completar perfil de adoptante | `AdopterProfileView.vue` |
| HU-13 | Ver y editar perfil de adoptante | `AdopterProfileView.vue` |
| HU-14 | Completar perfil de refugio | `ShelterProfileView.vue` |
| HU-15 | Ver y editar perfil de refugio | `ShelterProfileView.vue` |
| HU-16 | Registrar nueva mascota | `PetForm.vue` + `petStore.addPet` |
| HU-17 | Subir imágenes de mascota | `PetForm.vue` + `petStore.addPetImages` |
| HU-18 | Editar información de mascota | `petStore.updatePet` |
| HU-19 | Eliminar imagen de mascota | `petStore.deletePetImage` |
| HU-20 | Cambiar estado de mascota | `petStore.updatePetStatus` |
| HU-21 | Listar / eliminar mascotas del refugio | `PetManagementView.vue` |
| HU-22 | Landing page de acceso público | `HomeView.vue` |
| HU-23 | Ver catálogo de mascotas disponibles | `CatalogView.vue` |
| HU-24 | Filtrar mascotas | `CatalogView.vue` |
| HU-25 | Buscar mascotas por texto | `CatalogView.vue` |
| HU-26 | Ver detalle de mascota | `PetDetailView.vue` |
| HU-27 | Galería de fotos de mascota | `PetDetailView.vue` |
| HU-28 | Agregar/quitar favoritos | `petStore.toggleFavorite` |
| HU-29 | Ver lista de favoritos | `FavoritesView.vue` |

---

## 1. Base de Datos y Storage

La base de datos ya está alineada con `docs/ModeloBD.sql`. **No hay scripts SQL
sueltos que ejecutar**: el esquema de referencia vive en
`supabase/migrations/20240000000000_align_schema.sql` y el bucket de refugios en
`supabase/migrations/20240000000001_shelter_images_bucket.sql`.

Tablas usadas por el sprint:

| Tabla | Propósito |
|---|---|
| `pets` | Mascotas registradas por refugios (HU-16 a HU-21). |
| `pet_images` | Galería por mascota: `storage_path`, `image_url`, `is_primary` (HU-17/19/27). |
| `adopter_profiles` | Perfil extendido del adoptante, separado de `profiles` para no llenarla de nulos (HU-12/13). |
| `favorites` | Mascotas favoritas por adoptante (HU-28/29). |

RLS: lectura pública en `pets`/`pet_images`; escritura solo del refugio dueño
dentro de su carpeta `<user_id>/...`. `adopter_profiles` y `favorites` son
exclusivos de cada usuario.

---

## 2. Archivos creados

| Archivo | Descripción |
|---|---|
| `src/stores/petStore.js` | Store Pinia. Estados separados `catalogPets` / `myPets` / `favoritePets`. API: `fetchPets`, `fetchPetById`, `fetchMyPets`, `addPet`, `updatePet`, `addPetImages`, `deletePetImage`, `setPrimaryImage`, `updatePetStatus`, `deletePet`, `loadFavorites`, `toggleFavorite`, `fetchFavoritePets`, `getMyShelter`, `fetchShelterCities`. |
| `src/components/pets/PetCard.vue` | Tarjeta reutilizable. En modo refugio muestra selector de estado (solo transiciones válidas), Editar y Eliminar. |
| `src/components/pets/PetForm.vue` | Formulario de alta/edición con validación JS, carga de hasta 8 imágenes y elección de foto principal. |
| `src/views/refugio/PetManagementView.vue` | Panel del refugio: listado, filtro por estado, alta, edición, galería, cambio de estado y eliminación. |
| `src/views/adoptante/AdopterProfileView.vue` | Perfil del adoptante con `upsert` en `adopter_profiles`, incluido `housing_type`. |
| `src/views/CatalogView.vue` | Catálogo público con filtros, búsqueda con debounce, paginación y favoritos. |
| `src/views/PetDetailView.vue` | Detalle con galería, datos del refugio y solicitud de adopción bloqueada por rol/estado. |
| `src/views/FavoritesView.vue` | Lista de favoritos del adoptante (HU-29). |

## 3. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/utils/errorMessages.js` | `translateDbError()` cubre `42703`, `PGRST200/202/204/205`, `P0001`, `23503`, `23505` y demás SQLSTATE frecuentes, detecta ENUM/Storage/RLS/red y anexa la traza cruda en desarrollo. |
| `src/stores/authStore.js` | Restauración de sesión con promesa compartida (elimina la carrera entre navigaciones), `authLoading`, `profileError` con logging y `accessDeniedMsg`. |
| `src/router/index.js` | Guard global que espera `getSession()`, mensaje de acceso denegado por rol y redirección al panel correspondiente. |
| `src/views/PetDetailView.vue` | Bloquea "Solicitar Adopción" para roles refugio y para mascotas no disponibles. |
| `src/views/refugio/ShelterProfileView.vue` | Descripción obligatoria (mín. 20 caracteres) y uso de `petStore.invalidateShelter()`. |
| `src/views/AdoptanteDashboard.vue` / `RefugioDashboard.vue` | Banner de acceso denegado y aviso de perfil de refugio. |
| `index.html` / `src/App.vue` | Splash estático mientras se restaura la sesión (evita pantalla en blanco). |
| `vite.config.js` | `devOptions.enabled: false` para que el service worker no sirva bundles viejos en desarrollo. |

## 4. Archivos eliminados

| Archivo | Motivo |
|---|---|
| `migration_sprint2.sql` | Esquema ya alineado; la fuente canónica es `docs/ModeloBD.sql`. |
| `migration_sprint2_fixes.sql` | Parche duplicado y obsoleto. |
| `SPRINT2_DB_ANALYSIS.md` | Análisis de un estado de base de datos que ya no existe. |

---

## 5. Requisitos de QA

- **Validaciones**: `PetForm.vue` valida en JS (nombre, especie, edad, meses 0-11, peso, tamaño, salud, descripción ≥ 20 caracteres, al menos una imagen al crear). `ShelterProfileView.vue` exige descripción ≥ 20 caracteres. `AdopterProfileView.vue` exige ciudad y `housing_type`.
- **Manejo de errores**: todos los `catch` registran `code`, `message`, `details` y `hint` con `console.error('[petStore:<scope>]')` y muestran un mensaje en español vía `translateDbError()`.
- **Rollback**: si falla la creación de la mascota o de sus imágenes, `rollbackPet()` borra las filas de BD y los objetos huérfanos de Storage, registrando cualquier fallo del cleanup.
- **Transiciones de estado** (HU-20 CA#3): `checkStatusTransition()` bloquea transiciones inválidas y exige confirmación explícita antes de reabrir una mascota adoptada.
- **Estados de carga**: `petStore.loading` controla skeletons, botones deshabilitados y el splash inicial.
- **Responsive**: grilla 1/2/3 columnas, filtros en sidebar de escritorio y modal en móvil.
- **Fugas de memoria**: se elimina el listener de `matchMedia` y se revocan los `URL.createObjectURL`.
- **Paginación**: `offset`/`limit` se aplican con `!= null` para que la primera página (`offset: 0`) no se descarte como valor falsy.

---

## 6. Cómo probar

1. **Refugio**: inicia sesión → `/refugio/mascotas` → registrar una mascota con varias imágenes → elegir la principal → editar → cambiar estado → eliminar una imagen → eliminar la mascota.
2. **Catálogo**: en `/catalogo` filtra por especie, ciudad, tamaño y edad; busca por texto; recorre la paginación. Como invitado no hay corazón; como adoptante puedes marcar favoritos.
3. **Detalle**: `/mascota/:id` muestra la galería. Sin sesión el botón está bloqueado; con rol refugio indica que es exclusivo de adoptantes; en `en_proceso` o `adoptada` indica que ya no admite solicitudes.
4. **Favoritos**: `/favoritos` lista las mascotas guardadas y permite quitarlas.
5. **Perfil adoptante**: `/adoptante/perfil` guarda vivienda (incluido `housing_type`), hijos, otras mascotas y experiencia.

---

## 7. Pendiente / deuda técnica

- El flujo completo de **solicitudes de adopción** queda para el **Sprint 3**; en el detalle hay un placeholder informativo.
- No se implementa envío de correo de confirmación ni notificaciones de estado.
- La ficha organizacional del refugio se guarda en `shelters`; el trigger `handle_new_user` solo crea la fila en `profiles`.

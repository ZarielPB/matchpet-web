import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../services/supabaseClient'
import { useAuthStore } from './authStore'
import { translateDbError } from '../utils/errorMessages'

// ---------------------------------------------------------------------------
// Enums canónicos: deben coincidir EXACTAMENTE con docs/ModeloBD.sql
//   public.pet_status  = ('disponible', 'en_proceso', 'adoptada')
//   public.pet_species = ('perro', 'gato', 'otro')
//   public.pet_size    = ('pequeño', 'mediano', 'grande')
// ---------------------------------------------------------------------------
export const PET_STATUS = {
  DISPONIBLE: 'disponible',
  EN_PROCESO: 'en_proceso',
  ADOPTADA: 'adoptada'
}

export const PET_SPECIES = ['perro', 'gato', 'otro']
export const PET_SIZES = ['pequeño', 'mediano', 'grande']

const ALLOWED_STATUS = Object.values(PET_STATUS)

// Límites de imagen (HU-14 CA#3 y HU-17 CA#2: 2 MB por imagen).
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
export const MAX_IMAGES_PER_PET = 8

// Selector base: mascota + ficha del refugio (HU-14/15) + galería (HU-17/27).
const PET_SELECT = '*, shelters(shelter_name, city, address, phone, cover_image_url), pet_images(image_url, is_primary)'

// Únicos campos escribibles en `pets`. Evita que un payload con una clave
// inexistente provoque PGRST204 (bug que tumbó todo el Sprint 2) y aplica
// HU-18 CA#3: `id` y `shelter_id` quedan protegidos, no son escribibles.
const PET_WRITABLE_FIELDS = [
  'name', 'species', 'breed', 'age_years', 'age_months',
  'size', 'weight_kg', 'temperament', 'health_status',
  'description', 'requirements'
]

// ---------------------------------------------------------------------------
// HU-20 CA#3: matriz de transiciones lógicas de estado.
//   - inválida  -> se bloquea (adoptada no vuelve a 'en_proceso')
//   - requiere confirmación -> se permite pero se avisa antes de guardar
// ---------------------------------------------------------------------------
const ALLOWED_TRANSITIONS = {
  [PET_STATUS.DISPONIBLE]: [PET_STATUS.DISPONIBLE, PET_STATUS.EN_PROCESO, PET_STATUS.ADOPTADA],
  [PET_STATUS.EN_PROCESO]: [PET_STATUS.EN_PROCESO, PET_STATUS.DISPONIBLE, PET_STATUS.ADOPTADA],
  [PET_STATUS.ADOPTADA]: [PET_STATUS.ADOPTADA, PET_STATUS.DISPONIBLE]
}

const TRANSITIONS_NEEDING_CONFIRMATION = {
  [PET_STATUS.ADOPTADA]: [PET_STATUS.DISPONIBLE]
}

export const STATUS_LABEL = {
  [PET_STATUS.DISPONIBLE]: 'Disponible',
  [PET_STATUS.EN_PROCESO]: 'En proceso',
  [PET_STATUS.ADOPTADA]: 'Adoptada'
}

// Devuelve { valid, requiresConfirm, message } para una transición de estado.
export function checkStatusTransition(from, to) {
  if (!ALLOWED_STATUS.includes(to)) {
    return { valid: false, requiresConfirm: false, message: 'Estado no válido.' }
  }
  if (from === to) {
    return { valid: true, requiresConfirm: false, message: '' }
  }
  const allowed = ALLOWED_TRANSITIONS[from] || []
  if (!allowed.includes(to)) {
    return {
      valid: false,
      requiresConfirm: false,
      message: `No se puede pasar de "${STATUS_LABEL[from] || from}" a "${STATUS_LABEL[to] || to}".`
    }
  }
  const needsConfirm = (TRANSITIONS_NEEDING_CONFIRMATION[from] || []).includes(to)
  if (needsConfirm) {
    return {
      valid: true,
      requiresConfirm: true,
      message: `Esta mascota figura como "${STATUS_LABEL[from]}". Al volver a "${STATUS_LABEL[to]}" volverá a aparecer en el catálogo público. ¿Confirmas el cambio?`
    }
  }
  return { valid: true, requiresConfirm: false, message: '' }
}

function formError(message) {
  const err = new Error(message)
  err.isFormError = true
  return err
}

// Traza uniforme de errores de Supabase. Antes los `catch` silenciosos
// escondieron que `pet_images.is_primary` no existía en la base de datos.
function logDbError(scope, e) {
  console.error(
    `[petStore:${scope}]`,
    'code:', e?.code,
    '| message:', e?.message,
    '| details:', e?.details,
    '| hint:', e?.hint
  )
}

function toUserError(e) {
  if (e?.isFormError) return e.message
  return translateDbError(e)
}

function pickPetFields(petData = {}) {
  const payload = {}
  for (const key of PET_WRITABLE_FIELDS) {
    if (petData[key] !== undefined) payload[key] = petData[key]
  }
  return payload
}

// Escapa los caracteres especiales de la gramática de PostgREST (`.or()`):
// coma, paréntesis y %, _ .
function escapeLike(value) {
  return String(value)
    .replace(/[\\%_,()]/g, (ch) => `\\${ch}`)
    .trim()
}

export const usePetStore = defineStore('pets', () => {
  // Listas separadas: el catálogo, el panel del refugio y los favoritos son
  // vistas distintas. Antes compartían `pets` y se pisaban entre sí.
  const catalogPets = ref([])
  const myPets = ref([])
  const favoritePets = ref([])
  const pet = ref(null)
  const favoriteIds = ref([])
  const shelterCities = ref([])
  const myShelter = ref(null)
  const shelterError = ref('')
  const total = ref(0)
  const loading = ref(false)
  const error = ref('')

  const isFavorite = (petId) => favoriteIds.value.includes(petId)
  const hasPets = computed(() => catalogPets.value.length > 0)

  // -------------------------------------------------------------------------
  // HU-23 / HU-24 / HU-25: catálogo público con filtros, búsqueda y paginación.
  // -------------------------------------------------------------------------
  async function fetchPets(filters = {}) {
    loading.value = true
    error.value = ''
    try {
      let query = supabase
        .from('pets')
        .select(PET_SELECT, { count: 'exact' })
        .order('created_at', { ascending: false })

      if (filters.shelterId) query = query.eq('shelter_id', filters.shelterId)
      if (filters.species) query = query.eq('species', filters.species)
      if (filters.size) query = query.eq('size', filters.size)
      if (filters.status) query = query.eq('status', filters.status)
      if (filters.city) query = query.eq('shelters.city', filters.city)
      if (filters.ageMin != null) query = query.gte('age_years', filters.ageMin)
      if (filters.ageMax != null) query = query.lte('age_years', filters.ageMax)
      // HU-25 CA#1: coincidencias parciales y case-insensitive sobre nombre,
      // raza o descripción.
      if (filters.search) {
        const term = escapeLike(filters.search)
        if (term) {
          query = query.or(
            `name.ilike.%${term}%,breed.ilike.%${term}%,description.ilike.%${term}%`
          )
        }
      }

      // HU-23: paginación real. `!= null` porque `offset: 0` es falsy.
      const limit = filters.limit ?? null
      const offset = filters.offset ?? null
      if (limit != null && offset != null) {
        query = query.range(offset, offset + limit - 1)
      } else if (limit != null) {
        query = query.limit(limit)
      }

      const { data, error: queryError, count } = await query
      if (queryError) throw queryError
      catalogPets.value = data || []
      total.value = count ?? catalogPets.value.length
      return { success: true, data: catalogPets.value, count: total.value }
    } catch (e) {
      logDbError('fetchPets', e)
      catalogPets.value = []
      total.value = 0
      error.value = toUserError(e)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // -------------------------------------------------------------------------
  // HU-26: detalle de una mascota. HU-27: galería ordenada con la principal 1º.
  // -------------------------------------------------------------------------
  async function fetchPetById(id) {
    loading.value = true
    error.value = ''
    pet.value = null
    try {
      const { data, error: queryError } = await supabase
        .from('pets')
        .select(PET_SELECT)
        .eq('id', id)
        .single()
      if (queryError) throw queryError

      const images = (data?.pet_images || [])
        .slice()
        .sort((a, b) => (a.is_primary === b.is_primary ? 0 : a.is_primary ? -1 : 1))
        .map((img) => img.image_url)

      pet.value = data ? { ...data, images } : null
      return { success: true, data: pet.value }
    } catch (e) {
      logDbError('fetchPetById', e)
      error.value = toUserError(e)
      return { success: false, error: error.value, notFound: e?.code === 'PGRST116' }
    } finally {
      loading.value = false
    }
  }

  // -------------------------------------------------------------------------
  // HU-17: subida de imágenes al bucket `pet-images` (policies: solo el refugio
  // dueño, dentro de su carpeta <auth.uid()>/...).
  // -------------------------------------------------------------------------
  function normalizeFiles(input) {
    if (!input) return []
    const list = Array.isArray(input) ? input : [input]
    return list.filter(Boolean)
  }

  function validateImageFile(file) {
    if (!file.type?.startsWith('image/')) {
      throw formError('El archivo debe ser una imagen (JPG, PNG o WEBP).')
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw formError('La imagen no debe superar los 2 MB.')
    }
  }

  async function uploadImages(files, ownerId) {
    const list = normalizeFiles(files)
    if (list.length === 0) return []
    if (list.length > MAX_IMAGES_PER_PET) {
      throw formError(`Puedes subir hasta ${MAX_IMAGES_PER_PET} imágenes por mascota.`)
    }
    for (const file of list) validateImageFile(file)

    const uploaded = []
    for (const file of list) {
      const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const storagePath = `${ownerId}/${crypto.randomUUID()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('pet-images')
        .upload(storagePath, file, { upsert: false })
      if (uploadError) {
        // Reintentamos una sola vez tras limpiar lo ya subido.
        await removeStorageObjects(uploaded.map((u) => u.storagePath))
        throw uploadError
      }
      const { data: publicUrlData } = supabase.storage
        .from('pet-images')
        .getPublicUrl(storagePath)
      uploaded.push({ storagePath, imageUrl: publicUrlData.publicUrl })
    }
    return uploaded
  }

  async function removeStorageObjects(paths) {
    const list = (paths || []).filter(Boolean)
    if (list.length === 0) return
    try {
      const { error: removeError } = await supabase.storage
        .from('pet-images')
        .remove(list)
      if (removeError) {
        console.error('[petStore:storage.remove] code:', removeError.code, '| message:', removeError.message)
      }
    } catch (e) {
      // Nunca debe tumbar el flujo principal: solo deja basura huérfana.
      console.error('[petStore:storage.remove] falló la limpieza de Storage:', e?.message)
    }
  }

  // -------------------------------------------------------------------------
  // HU-16 + HU-17 CA#1: registrar mascota con N imágenes en una sola operación.
  // -------------------------------------------------------------------------
  async function addPet(petData, imageFiles) {
    loading.value = true
    error.value = ''
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw formError('Debes iniciar sesión como refugio.')

      const shelter = await getMyShelter()
      if (!shelter) throw formError('Completa primero tu perfil de refugio para poder registrar mascotas.')

      const uploaded = await uploadImages(imageFiles, user.id)

      let createdPet = null
      try {
        const { data, error: insertError } = await supabase
          .from('pets')
          .insert({ ...pickPetFields(petData), shelter_id: shelter.id })
          .select()
          .single()
        if (insertError) throw insertError
        createdPet = data

        if (uploaded.length > 0) {
          const { error: imgError } = await supabase
            .from('pet_images')
            .insert(uploaded.map((u, index) => ({
              pet_id: data.id,
              storage_path: u.storagePath,
              image_url: u.imageUrl,
              // HU-17 CA#6: la primera imagen cargada es la foto principal.
              is_primary: index === 0
            })))
          if (imgError) throw imgError
        }

        return { success: true, data }
      } catch (err) {
        logDbError('addPet.rollback', err)
        await rollbackPet(createdPet?.id, uploaded.map((u) => u.storagePath))
        throw err
      }
    } catch (e) {
      logDbError('addPet', e)
      error.value = toUserError(e)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // Deshace una creación fallida: filas de BD + objetos de Storage.
  // Cada paso registra su fallo en vez de propagarlo en silencio.
  async function rollbackPet(petId, storagePaths) {
    if (petId) {
      const { error: imgDelError } = await supabase
        .from('pet_images')
        .delete()
        .eq('pet_id', petId)
      if (imgDelError) {
        console.error('[petStore:rollback] no se pudo borrar pet_images:', imgDelError.code, imgDelError.message)
      }
      const { error: petDelError } = await supabase
        .from('pets')
        .delete()
        .eq('id', petId)
      if (petDelError) {
        console.error('[petStore:rollback] no se pudo borrar pets:', petDelError.code, petDelError.message)
      }
    }
    await removeStorageObjects(storagePaths)
  }

  // -------------------------------------------------------------------------
  // HU-18: editar datos. `id` y `shelter_id` están protegidos (CA#3).
  // -------------------------------------------------------------------------
  async function updatePet(id, petData) {
    loading.value = true
    error.value = ''
    try {
      const { data, error: updateError } = await supabase
        .from('pets')
        .update(pickPetFields(petData))
        .eq('id', id)
        .select()
        .single()
      if (updateError) throw updateError
      return { success: true, data }
    } catch (e) {
      logDbError('updatePet', e)
      error.value = toUserError(e)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // -------------------------------------------------------------------------
  // HU-17: añadir imágenes a la galería de una mascota existente.
  // -------------------------------------------------------------------------
  async function addPetImages(petId, imageFiles) {
    loading.value = true
    error.value = ''
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw formError('Debes iniciar sesión como refugio.')

      // HU-17 CA#2: el límite de MAX_IMAGES_PER_PET aplica a la galería
      // COMPLETA (ya guardadas + las de esta llamada), no solo a lo que se
      // sube ahora. Se cuenta ANTES de subir para no dejar huérfanos.
      const files = normalizeFiles(imageFiles)
      const { count: storedCount, error: countError } = await supabase
        .from('pet_images')
        .select('id', { count: 'exact', head: true })
        .eq('pet_id', petId)
      if (countError) throw countError

      const alreadyStored = storedCount ?? 0
      if (files.length > 0 && alreadyStored + files.length > MAX_IMAGES_PER_PET) {
        throw formError(
          `Esta mascota ya tiene ${alreadyStored} imagen(es): el máximo es de ` +
          `${MAX_IMAGES_PER_PET} por mascota.`
        )
      }

      const uploaded = await uploadImages(files, user.id)
      if (uploaded.length === 0) return { success: true, data: [] }

      try {
        const { data, error: imgError } = await supabase
          .from('pet_images')
          .insert(uploaded.map((u, index) => ({
            pet_id: petId,
            storage_path: u.storagePath,
            image_url: u.imageUrl,
            is_primary: alreadyStored === 0 && index === 0
          })))
          .select()
        if (imgError) throw imgError
        return { success: true, data }
      } catch (err) {
        logDbError('addPetImages.rollback', err)
        await removeStorageObjects(uploaded.map((u) => u.storagePath))
        throw err
      }
    } catch (e) {
      logDbError('addPetImages', e)
      error.value = toUserError(e)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // -------------------------------------------------------------------------
  // HU-19 CA#3: eliminar una imagen (fila de BD + objeto físico del bucket).
  // Observación HU-19: si era la principal, se reasigna otra automáticamente.
  // -------------------------------------------------------------------------
  async function deletePetImage(petId, imageId) {
    loading.value = true
    error.value = ''
    try {
      const { data: image, error: readError } = await supabase
        .from('pet_images')
        .select('id, storage_path, is_primary')
        .eq('id', imageId)
        .maybeSingle()
      if (readError) throw readError
      if (!image) throw formError('La imagen ya no existe.')

      const { error: delError } = await supabase
        .from('pet_images')
        .delete()
        .eq('id', imageId)
      if (delError) throw delError

      await removeStorageObjects([image.storage_path])

      if (image.is_primary) {
        const { data: remaining, error: restError } = await supabase
          .from('pet_images')
          .select('id')
          .eq('pet_id', petId)
          .order('created_at', { ascending: true })
          .limit(1)
        if (restError) {
          console.error('[petStore:deletePetImage] no se pudo leer la galería:', restError.code, restError.message)
        } else if (remaining?.[0]) {
          const { error: primaryError } = await supabase
            .from('pet_images')
            .update({ is_primary: true })
            .eq('id', remaining[0].id)
          if (primaryError) {
            console.error('[petStore:deletePetImage] no se pudo reasignar la foto principal:', primaryError.code, primaryError.message)
          }
        }
      }

      return { success: true }
    } catch (e) {
      logDbError('deletePetImage', e)
      error.value = toUserError(e)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // -------------------------------------------------------------------------
  // HU-17 CA#6: designar una imagen como foto principal.
  // -------------------------------------------------------------------------
  async function setPrimaryImage(petId, imageId) {
    loading.value = true
    error.value = ''
    try {
      const { data, error: clearError } = await supabase
        .from('pet_images')
        .update({ is_primary: false })
        .eq('pet_id', petId)
      if (clearError) throw clearError

      const { error: setError } = await supabase
        .from('pet_images')
        .update({ is_primary: true })
        .eq('id', imageId)
      if (setError) throw setError

      return { success: true, data }
    } catch (e) {
      logDbError('setPrimaryImage', e)
      error.value = toUserError(e)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // -------------------------------------------------------------------------
  // HU-20: cambiar estado con validación de transiciones (CA#3).
  // -------------------------------------------------------------------------
  async function updatePetStatus(id, newStatus, options = {}) {
    const current = findPetById(id)
    const check = checkStatusTransition(current?.status, newStatus)

    if (!check.valid) {
      error.value = check.message
      return { success: false, error: check.message, transition: check }
    }
    if (check.requiresConfirm && !options.confirm) {
      return { success: false, needsConfirm: true, error: check.message, transition: check }
    }

    loading.value = true
    error.value = ''
    try {
      const { data, error: updateError } = await supabase
        .from('pets')
        .update({ status: newStatus })
        .eq('id', id)
        .select('id, status')
        .single()
      if (updateError) throw updateError

      const localPet = findPetById(id)
      if (localPet) localPet.status = data.status
      return { success: true, data }
    } catch (e) {
      logDbError('updatePetStatus', e)
      error.value = toUserError(e)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  function findPetById(id) {
    return myPets.value.find((p) => p.id === id)
      || catalogPets.value.find((p) => p.id === id)
      || favoritePets.value.find((p) => p.id === id)
      || null
  }

  // -------------------------------------------------------------------------
  // HU-21: listar las mascotas del refugio autenticado.
  // CA#2: el filtro por `shelter_id` viene de la ficha del refugio autenticado
  //        y además está garantizado por RLS (política pets_select_refugio).
  // CA#4: filtro opcional por estado.
  // -------------------------------------------------------------------------
  async function fetchMyPets({ status } = {}) {
    loading.value = true
    error.value = ''
    try {
      const shelter = await getMyShelter()
      if (!shelter) {
        myPets.value = []
        throw formError('Completa primero tu perfil de refugio para gestionar mascotas.')
      }

      let query = supabase
        .from('pets')
        .select(PET_SELECT, { count: 'exact' })
        .eq('shelter_id', shelter.id)
        .order('created_at', { ascending: false })
      if (status) query = query.eq('status', status)

      const { data, error: queryError, count } = await query
      if (queryError) throw queryError
      myPets.value = data || []
      total.value = count ?? myPets.value.length
      return { success: true, data: myPets.value, count: total.value }
    } catch (e) {
      logDbError('fetchMyPets', e)
      myPets.value = []
      error.value = toUserError(e)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // -------------------------------------------------------------------------
  // HU-21 CA#3: eliminar una mascota (filas de imágenes + objetos + la mascota).
  // -------------------------------------------------------------------------
  async function deletePet(id) {
    loading.value = true
    error.value = ''
    try {
      const { data: images, error: readError } = await supabase
        .from('pet_images')
        .select('storage_path')
        .eq('pet_id', id)
      if (readError) throw readError

      const { error: imgDelError } = await supabase
        .from('pet_images')
        .delete()
        .eq('pet_id', id)
      if (imgDelError) throw imgDelError

      await removeStorageObjects((images || []).map((i) => i.storage_path))

      const { error: delError } = await supabase
        .from('pets')
        .delete()
        .eq('id', id)
      if (delError) throw delError

      myPets.value = myPets.value.filter((p) => p.id !== id)
      catalogPets.value = catalogPets.value.filter((p) => p.id !== id)
      favoritePets.value = favoritePets.value.filter((p) => p.id !== id)
      favoriteIds.value = favoriteIds.value.filter((favId) => favId !== id)
      return { success: true }
    } catch (e) {
      logDbError('deletePet', e)
      error.value = toUserError(e)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // -------------------------------------------------------------------------
  // HU-28: favoritos.
  // -------------------------------------------------------------------------
  async function loadFavorites() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      favoriteIds.value = []
      return []
    }
    try {
      const { data, error: queryError } = await supabase
        .from('favorites')
        .select('pet_id')
        .eq('user_id', user.id)
      if (queryError) throw queryError
      favoriteIds.value = (data || []).map((f) => f.pet_id)
      return favoriteIds.value
    } catch (e) {
      logDbError('loadFavorites', e)
      error.value = toUserError(e)
      return []
    }
  }

  async function toggleFavorite(petId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      error.value = 'Debes iniciar sesión para guardar favoritos.'
      return { success: false, error: error.value }
    }
    try {
      // QA Bug 3: sin fila en `public.profiles`, el INSERT en `favorites`
      // revienta con 23503 (`favorites_user_id_fkey`). La reparamos antes.
      const ensured = await useAuthStore().ensureProfile()
      if (!ensured.success) {
        error.value = ensured.error
        return { success: false, error: error.value }
      }

      if (favoriteIds.value.includes(petId)) {
        const { error: delError } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('pet_id', petId)
        if (delError) throw delError
        favoriteIds.value = favoriteIds.value.filter((id) => id !== petId)
      } else {
        const { error: insertError } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, pet_id: petId })
        if (insertError) throw insertError
        favoriteIds.value = [...favoriteIds.value, petId]
      }
      return { success: true }
    } catch (e) {
      logDbError('toggleFavorite', e)
      error.value = toUserError(e)
      return { success: false, error: error.value }
    }
  }

  // -------------------------------------------------------------------------
  // HU-29: lista de favoritos del adoptante.
  // -------------------------------------------------------------------------
  async function fetchFavoritePets() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      favoriteIds.value = []
      favoritePets.value = []
      return { success: true, data: [] }
    }
    loading.value = true
    error.value = ''
    try {
      const { data: favRows, error: favError } = await supabase
        .from('favorites')
        .select('pet_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (favError) throw favError

      favoriteIds.value = (favRows || []).map((f) => f.pet_id)
      if (favoriteIds.value.length === 0) {
        favoritePets.value = []
        return { success: true, data: [] }
      }

      const { data, error: petsError } = await supabase
        .from('pets')
        .select(PET_SELECT)
        .in('id', favoriteIds.value)
      if (petsError) throw petsError

      const order = new Map(favoriteIds.value.map((id, index) => [id, index]))
      favoritePets.value = (data || []).sort((a, b) => (order.get(a.id) - order.get(b.id)))
      return { success: true, data: favoritePets.value }
    } catch (e) {
      logDbError('fetchFavoritePets', e)
      error.value = toUserError(e)
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // -------------------------------------------------------------------------
  // HU-14 / HU-15: ficha del refugio autenticado (necesaria para pets.shelter_id).
  // -------------------------------------------------------------------------
  let shelterPromise = null

  async function getMyShelter({ force = false } = {}) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      myShelter.value = null
      shelterError.value = ''
      return null
    }
    if (myShelter.value && !force) return myShelter.value
    if (shelterPromise) return shelterPromise

    shelterPromise = (async () => {
      const { data, error: queryError } = await supabase
        .from('shelters')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (queryError) {
        // No tragar el error: distingue "no tengo perfil" de "falló la lectura".
        logDbError('getMyShelter', queryError)
        myShelter.value = null
        shelterError.value = toUserError(queryError)
        return null
      }
      shelterError.value = ''
      myShelter.value = data || null
      return myShelter.value
    })()

    try {
      return await shelterPromise
    } finally {
      shelterPromise = null
    }
  }

  function invalidateShelter() {
    myShelter.value = null
    shelterError.value = ''
  }

  // Ciudades de refugios para el filtro del catálogo (HU-24 CA#1).
  async function fetchShelterCities() {
    try {
      const { data, error: queryError } = await supabase
        .from('shelters')
        .select('city')
        .not('city', 'is', null)
      if (queryError) throw queryError
      const unique = [...new Set((data || []).map((s) => s.city).filter(Boolean))].sort()
      shelterCities.value = unique
      return unique
    } catch (e) {
      logDbError('fetchShelterCities', e)
      error.value = toUserError(e)
      return []
    }
  }

  return {
    // estado
    catalogPets, myPets, favoritePets, pet, favoriteIds, shelterCities, myShelter,
    shelterError, total, loading, error, isFavorite, hasPets,
    // HU-23/24/25/26 catálogo y detalle
    fetchPets, fetchPetById,
    // HU-16/17/18/19/20/21 gestión de mascotas
    addPet, updatePet, addPetImages, deletePetImage, setPrimaryImage,
    updatePetStatus, fetchMyPets, deletePet,
    // HU-28/29 favoritos
    loadFavorites, toggleFavorite, fetchFavoritePets,
    // HU-14/15 perfil de refugio
    getMyShelter, invalidateShelter, fetchShelterCities
  }
})

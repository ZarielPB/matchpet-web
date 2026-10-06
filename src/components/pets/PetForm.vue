<template>
  <form class="space-y-5" novalidate @submit.prevent="onSubmit">
    <!-- Datos básicos -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label for="pet-name" class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
        <input
          id="pet-name"
          v-model="form.name"
          type="text"
          required
          class="form-input"
          :class="{ 'border-red-400': errors.name }"
          placeholder="Ej. Firulais"
        />
        <p v-if="errors.name" class="text-xs text-red-500 mt-1">{{ errors.name }}</p>
      </div>

      <div>
        <label for="pet-species" class="block text-sm font-medium text-gray-700 mb-1">Especie *</label>
        <select
          id="pet-species"
          v-model="form.species"
          required
          class="form-input"
          :class="{ 'border-red-400': errors.species }"
        >
          <option value="" disabled>Selecciona una especie</option>
          <option value="perro">Perro</option>
          <option value="gato">Gato</option>
          <option value="otro">Otro</option>
        </select>
        <p v-if="errors.species" class="text-xs text-red-500 mt-1">{{ errors.species }}</p>
      </div>

      <div>
        <label for="pet-breed" class="block text-sm font-medium text-gray-700 mb-1">Raza</label>
        <input
          id="pet-breed"
          v-model="form.breed"
          type="text"
          class="form-input"
          placeholder="Ej. Labrador (opcional)"
        />
      </div>

      <div>
        <label for="pet-age" class="block text-sm font-medium text-gray-700 mb-1">Edad (años) *</label>
        <input
          id="pet-age"
          v-model.number="form.age_years"
          type="number"
          min="0"
          step="1"
          required
          class="form-input"
          :class="{ 'border-red-400': errors.age_years }"
          placeholder="Ej. 2"
        />
        <p v-if="errors.age_years" class="text-xs text-red-500 mt-1">{{ errors.age_years }}</p>
      </div>

      <div>
        <label for="pet-age-months" class="block text-sm font-medium text-gray-700 mb-1">Meses (0-11)</label>
        <input
          id="pet-age-months"
          v-model.number="form.age_months"
          type="number"
          min="0"
          max="11"
          step="1"
          class="form-input"
          :class="{ 'border-red-400': errors.age_months }"
          placeholder="Ej. 6"
        />
        <p v-if="errors.age_months" class="text-xs text-red-500 mt-1">{{ errors.age_months }}</p>
      </div>

      <div>
        <label for="pet-weight" class="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
        <input
          id="pet-weight"
          v-model.number="form.weight_kg"
          type="number"
          min="0"
          step="0.1"
          class="form-input"
          :class="{ 'border-red-400': errors.weight_kg }"
          placeholder="Ej. 12.5"
        />
        <p v-if="errors.weight_kg" class="text-xs text-red-500 mt-1">{{ errors.weight_kg }}</p>
      </div>

      <div>
        <label for="pet-size" class="block text-sm font-medium text-gray-700 mb-1">Tamaño *</label>
        <select
          id="pet-size"
          v-model="form.size"
          required
          class="form-input"
          :class="{ 'border-red-400': errors.size }"
        >
          <option value="" disabled>Selecciona un tamaño</option>
          <option value="pequeño">Pequeño</option>
          <option value="mediano">Mediano</option>
          <option value="grande">Grande</option>
        </select>
        <p v-if="errors.size" class="text-xs text-red-500 mt-1">{{ errors.size }}</p>
      </div>

      <div>
        <label for="pet-health" class="block text-sm font-medium text-gray-700 mb-1">Estado de salud *</label>
        <input
          id="pet-health"
          v-model="form.health_status"
          type="text"
          required
          class="form-input"
          :class="{ 'border-red-400': errors.health_status }"
          placeholder="Ej. Vacunado, desparasitado"
        />
        <p v-if="errors.health_status" class="text-xs text-red-500 mt-1">{{ errors.health_status }}</p>
      </div>
    </div>

    <div>
      <label for="pet-temperament" class="block text-sm font-medium text-gray-700 mb-1">Temperamento</label>
      <textarea
        id="pet-temperament"
        v-model="form.temperament"
        rows="2"
        class="form-input resize-none"
        placeholder="Ej. Juguetón, cariñoso, buen con niños"
      ></textarea>
    </div>

    <div>
      <label for="pet-description" class="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
      <textarea
        id="pet-description"
        v-model="form.description"
        rows="3"
        required
        class="form-input resize-none"
        :class="{ 'border-red-400': errors.description }"
        placeholder="Cuéntanos la historia y características de la mascota"
      ></textarea>
      <p v-if="errors.description" class="text-xs text-red-500 mt-1">{{ errors.description }}</p>
    </div>

    <div>
      <label for="pet-requirements" class="block text-sm font-medium text-gray-700 mb-1">Requisitos</label>
      <textarea
        id="pet-requirements"
        v-model="form.requirements"
        rows="2"
        class="form-input resize-none"
        placeholder="Ej. Requiere espacio amplio, ideal con experiencia"
      ></textarea>
    </div>

    <!-- HU-17: galería de imágenes (admite varias y elegir la principal) -->
    <div>
      <label for="pet-image" class="block text-sm font-medium text-gray-700 mb-1">
        {{ isEdit ? 'Agregar imágenes (opcional)' : 'Imágenes *' }}
      </label>
      <input
        id="pet-image"
        type="file"
        accept="image/*"
        multiple
        class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
        @change="onFilesChange"
      />
      <p class="text-xs text-gray-500 mt-1">
        Puedes subir hasta {{ MAX_IMAGES_PER_PET }} imágenes de 2 MB cada una.
      </p>
      <p v-if="errors.images" class="text-xs text-red-500 mt-1">{{ errors.images }}</p>

      <!-- Selección de la foto principal -->
      <ul v-if="selected.length" class="mt-3 flex flex-wrap gap-3">
        <li v-for="(item, index) in selected" :key="item.url" class="relative">
          <img
            :src="item.url"
            alt="Vista previa de la imagen"
            class="w-24 h-24 object-cover rounded-lg border-2"
            :class="item.primary ? 'border-indigo-500' : 'border-gray-200'"
          />
          <span
            v-if="item.primary"
            class="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-semibold"
          >
            Principal
          </span>
          <div class="absolute bottom-1 inset-x-1 flex gap-1">
            <button
              v-if="!item.primary"
              type="button"
              class="flex-1 rounded bg-white/90 text-[10px] font-semibold text-indigo-700 py-0.5 hover:bg-white"
              @click="setPrimary(index)"
            >
              Principal
            </button>
            <button
              type="button"
              class="rounded bg-white/90 text-[10px] font-semibold text-red-600 px-1.5 py-0.5 hover:bg-white"
              :aria-label="`Quitar imagen ${index + 1}`"
              @click="removeFile(index)"
            >
              ✕
            </button>
          </div>
        </li>
      </ul>

      <!-- Galería actual en modo edición (HU-19) -->
      <div v-if="isEdit" class="mt-4">
        <p class="text-xs text-gray-500 mb-1">Imágenes actuales:</p>
        <ul v-if="existingImages.length" class="flex flex-wrap gap-2">
          <li
            v-for="img in existingImages"
            :key="img.id"
            class="relative w-20 h-20"
          >
            <img
              :src="img.image_url"
              :alt="`Imagen ${img.id} de la mascota`"
              class="w-full h-full object-cover rounded-lg border border-gray-200"
              :class="{ 'ring-2 ring-indigo-500': img.is_primary }"
            />
            <span
              v-if="img.is_primary"
              class="absolute top-0 left-0 px-1 bg-indigo-600 text-white text-[10px] font-semibold rounded"
            >
              Princ.
            </span>
            <button
              v-if="!img.is_primary"
              type="button"
              class="absolute top-0 right-0 rounded bg-white/90 px-1 text-[10px] font-semibold text-indigo-700"
              @click="$emit('set-primary', props.initialData.id, img.id)"
            >
              ★
            </button>
            <button
              type="button"
              class="absolute bottom-0 right-0 rounded bg-white/90 px-1 text-[10px] font-semibold text-red-600"
              :aria-label="`Eliminar imagen ${img.id}`"
              @click="$emit('delete-image', props.initialData.id, img.id)"
            >
              ✕
            </button>
          </li>
        </ul>
        <p v-else class="text-xs text-gray-400">Esta mascota aún no tiene imágenes.</p>
      </div>
    </div>

    <!-- Errores generales -->
    <p v-if="serverError" class="text-red-500 text-sm text-center">{{ serverError }}</p>

    <div class="flex flex-col sm:flex-row gap-3 pt-2">
      <button
        type="submit"
        :disabled="loading"
        class="flex-1 py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {{ loading ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Registrar mascota') }}
      </button>
      <button
        v-if="showCancel"
        type="button"
        class="flex-1 py-2.5 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        @click="$emit('cancel')"
      >
        Cancelar
      </button>
    </div>
  </form>
</template>

<script setup>
import { ref, reactive, computed, onBeforeUnmount, watch } from 'vue'
import { MAX_IMAGES_PER_PET } from '../../stores/petStore'

const props = defineProps({
  initialData: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  serverError: { type: String, default: '' },
  showCancel: { type: Boolean, default: true }
})
const emit = defineEmits(['submit', 'cancel', 'delete-image', 'set-primary'])

const form = reactive({
  name: '',
  species: 'perro',
  breed: '',
  age_years: 0,
  age_months: 0,
  weight_kg: null,
  size: 'mediano',
  health_status: 'Saludable',
  temperament: '',
  description: '',
  requirements: ''
})

// Lista de imágenes por subir: { file, url, primary }. La marcada como
// `primary` se envía primera y el store la guarda con is_primary = true.
const selected = ref([])
const errors = ref({})

const isEdit = computed(() => Boolean(props.initialData))

const existingImages = computed(() => {
  const images = props.initialData?.pet_images || []
  return images.slice().sort((a, b) => (a.is_primary === b.is_primary ? 0 : a.is_primary ? -1 : 1))
})

// Precarga los datos cuando se recibe una mascota para editar.
// Si no hay datos (nuevo registro), restaura los valores por defecto.
watch(
  () => props.initialData,
  (data) => {
    if (!data) {
      reset()
      return
    }
    form.name = data.name || ''
    form.species = data.species || ''
    form.breed = data.breed || ''
    form.age_years = data.age_years != null ? data.age_years : 0
    form.age_months = data.age_months != null ? data.age_months : 0
    form.weight_kg = data.weight_kg != null ? data.weight_kg : null
    form.size = data.size || ''
    form.health_status = data.health_status || ''
    form.temperament = data.temperament || ''
    form.description = data.description || ''
    form.requirements = data.requirements || ''
    clearFiles()
    errors.value = {}
  },
  { immediate: true }
)

function reset() {
  form.name = ''
  form.species = 'perro'
  form.breed = ''
  form.age_years = 0
  form.age_months = 0
  form.weight_kg = null
  form.size = 'mediano'
  form.health_status = 'Saludable'
  form.temperament = ''
  form.description = ''
  form.requirements = ''
  clearFiles()
  errors.value = {}
}

function onFilesChange(event) {
  const files = Array.from(event.target.files || [])
  if (files.length === 0) return

  const invalid = files.find((f) => !f.type?.startsWith('image/'))
  if (invalid) {
    setError('images', 'Todos los archivos deben ser imágenes.')
    event.target.value = ''
    return
  }
  const tooBig = files.find((f) => f.size > 2 * 1024 * 1024)
  if (tooBig) {
    setError('images', `"${tooBig.name}" supera el límite de 2 MB.`)
    event.target.value = ''
    return
  }
  if (selected.value.length + files.length > MAX_IMAGES_PER_PET) {
    setError('images', `Puedes subir hasta ${MAX_IMAGES_PER_PET} imágenes por mascota.`)
    event.target.value = ''
    return
  }

  const currentPrimaryExists = selected.value.some((s) => s.primary)
  files.forEach((file, index) => {
    selected.value.push({
      file,
      url: URL.createObjectURL(file),
      primary: !currentPrimaryExists && index === 0
    })
  })
  event.target.value = ''
  setError('images', '')
}

// HU-17 CA#6: marca una imagen como foto principal.
function setPrimary(index) {
  selected.value.forEach((item, i) => { item.primary = i === index })
}

function removeFile(index) {
  const [removed] = selected.value.splice(index, 1)
  if (removed) URL.revokeObjectURL(removed.url)
  // Si se quitó la principal, la primera que quede pasa a serlo.
  if (removed?.primary && selected.value.length && !selected.value.some((s) => s.primary)) {
    selected.value[0].primary = true
  }
}

function clearFiles() {
  for (const item of selected.value) URL.revokeObjectURL(item.url)
  selected.value = []
}

// Limpiar los object URLs para no generar fugas de memoria.
onBeforeUnmount(clearFiles)

function setError(key, message) {
  const next = { ...errors.value }
  if (message) next[key] = message
  else delete next[key]
  errors.value = next
}

function validate() {
  const e = {}
  if (!form.name.trim()) e.name = 'El nombre es obligatorio.'
  if (!form.species) e.species = 'Selecciona una especie.'
  if (form.age_years == null || form.age_years < 0 || Number.isNaN(Number(form.age_years))) {
    e.age_years = 'Ingresa una edad válida (en años).'
  }
  if (form.age_months != null && (form.age_months < 0 || form.age_months > 11 || Number.isNaN(Number(form.age_months)))) {
    e.age_months = 'Los meses deben ir de 0 a 11.'
  }
  if (form.weight_kg != null && (form.weight_kg < 0 || Number.isNaN(Number(form.weight_kg)))) {
    e.weight_kg = 'Ingresa un peso válido.'
  }
  if (!form.size) e.size = 'Selecciona un tamaño.'
  if (!form.health_status.trim()) e.health_status = 'El estado de salud es obligatorio.'
  if (form.description.trim().length < 20) {
    e.description = 'La descripción debe tener al menos 20 caracteres.'
  }
  if (!isEdit.value && selected.value.length === 0) e.images = 'Debes cargar al menos una imagen.'
  errors.value = e
  return Object.keys(e).length === 0
}

function onSubmit() {
  if (!validate()) return
  // La principal va primero: el store la marca con is_primary = true.
  const ordered = selected.value
    .slice()
    .sort((a, b) => (a.primary === b.primary ? 0 : a.primary ? -1 : 1))
    .map((s) => s.file)

  emit(
    'submit',
    {
      ...form,
      name: form.name.trim(),
      breed: form.breed.trim() || null,
      temperament: form.temperament.trim() || null,
      health_status: form.health_status.trim(),
      description: form.description.trim(),
      requirements: form.requirements.trim() || null,
      age_years: Number(form.age_years),
      age_months: form.age_months ? Number(form.age_months) : 0,
      weight_kg: form.weight_kg != null ? Number(form.weight_kg) : null
    },
    ordered
  )
}
</script>

<style scoped>
.form-input {
  @apply appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white;
}
</style>
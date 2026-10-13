<template>
  <form class="space-y-6" novalidate @submit.prevent="onSubmit">
    <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <!-- Columna izquierda: datos de la mascota -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label for="pet-name" class="form-label">Nombre *</label>
          <input
            id="pet-name"
            v-model="form.name"
            type="text"
            required
            class="form-input"
            :class="{ '!border-alert': errors.name }"
            placeholder="Ej. Firulais"
          />
          <p v-if="errors.name" class="mt-1 text-xs text-alert">{{ errors.name }}</p>
        </div>

        <div>
          <label for="pet-species" class="form-label">Especie *</label>
          <select
            id="pet-species"
            v-model="form.species"
            required
            class="form-input"
            :class="{ '!border-alert': errors.species }"
          >
            <option value="" disabled>Selecciona una especie</option>
            <option value="perro">Perro</option>
            <option value="gato">Gato</option>
            <option value="otro">Otro</option>
          </select>
          <p v-if="errors.species" class="mt-1 text-xs text-alert">{{ errors.species }}</p>
        </div>

        <div>
          <label for="pet-breed" class="form-label">Raza</label>
          <input
            id="pet-breed"
            v-model="form.breed"
            type="text"
            class="form-input"
            placeholder="Ej. Labrador (opcional)"
          />
        </div>

        <div>
          <label for="pet-size" class="form-label">Tamaño *</label>
          <select
            id="pet-size"
            v-model="form.size"
            required
            class="form-input"
            :class="{ '!border-alert': errors.size }"
          >
            <option value="" disabled>Selecciona un tamaño</option>
            <option value="pequeño">Pequeño</option>
            <option value="mediano">Mediano</option>
            <option value="grande">Grande</option>
          </select>
          <p v-if="errors.size" class="mt-1 text-xs text-alert">{{ errors.size }}</p>
        </div>

        <div>
          <label for="pet-age" class="form-label">Edad (años) *</label>
          <input
            id="pet-age"
            v-model.number="form.age_years"
            type="number"
            min="0"
            step="1"
            required
            class="form-input"
            :class="{ '!border-alert': errors.age_years }"
            placeholder="Ej. 2"
          />
          <p v-if="errors.age_years" class="mt-1 text-xs text-alert">{{ errors.age_years }}</p>
        </div>

        <div>
          <label for="pet-age-months" class="form-label">Meses (0-11)</label>
          <input
            id="pet-age-months"
            v-model.number="form.age_months"
            type="number"
            min="0"
            max="11"
            step="1"
            class="form-input"
            :class="{ '!border-alert': errors.age_months }"
            placeholder="Ej. 6"
          />
          <p v-if="errors.age_months" class="mt-1 text-xs text-alert">{{ errors.age_months }}</p>
        </div>

        <div>
          <label for="pet-weight" class="form-label">Peso (kg)</label>
          <input
            id="pet-weight"
            v-model.number="form.weight_kg"
            type="number"
            min="0"
            step="0.1"
            class="form-input"
            :class="{ '!border-alert': errors.weight_kg }"
            placeholder="Ej. 12.5"
          />
          <p v-if="errors.weight_kg" class="mt-1 text-xs text-alert">{{ errors.weight_kg }}</p>
        </div>

        <div>
          <label for="pet-health" class="form-label">Estado de salud *</label>
          <input
            id="pet-health"
            v-model="form.health_status"
            type="text"
            required
            class="form-input"
            :class="{ '!border-alert': errors.health_status }"
            placeholder="Ej. Vacunado, desparasitado"
          />
          <p v-if="errors.health_status" class="mt-1 text-xs text-alert">{{ errors.health_status }}</p>
        </div>

        <div class="sm:col-span-2">
          <label for="pet-temperament" class="form-label">Temperamento</label>
          <textarea
            id="pet-temperament"
            v-model="form.temperament"
            rows="2"
            class="form-input resize-none"
            placeholder="Ej. Juguetón, cariñoso, buen con niños"
          ></textarea>
        </div>

        <div class="sm:col-span-2">
          <label for="pet-description" class="form-label">Descripción *</label>
          <textarea
            id="pet-description"
            v-model="form.description"
            rows="3"
            required
            class="form-input resize-none"
            :class="{ '!border-alert': errors.description }"
            placeholder="Cuéntanos la historia y características de la mascota"
          ></textarea>
          <p v-if="errors.description" class="mt-1 text-xs text-alert">{{ errors.description }}</p>
        </div>

        <!-- Sprint 3 (HU-32): datos estructurados para el matching -->
        <div>
          <label for="pet-energy" class="form-label">Nivel de energía</label>
          <select id="pet-energy" v-model="form.energy_level" class="form-input">
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
        </div>
        <label class="flex items-center gap-2 text-sm text-[#040404] sm:pt-7">
          <input v-model="form.good_with_kids" type="checkbox" class="accent-[#BA8C71]" />
          Apta para niños
        </label>
        <label class="flex items-center gap-2 text-sm text-[#040404] sm:col-span-2">
          <input v-model="form.good_with_other_pets" type="checkbox" class="accent-[#BA8C71]" />
          Se lleva bien con otras mascotas
        </label>

        <div class="sm:col-span-2">
          <label for="pet-requirements" class="form-label">Requisitos del hogar</label>
          <textarea
            id="pet-requirements"
            v-model="form.requirements"
            rows="2"
            class="form-input resize-none"
            placeholder="Ej. Requiere espacio amplio, ideal con experiencia"
          ></textarea>
        </div>
      </div>

      <!-- Columna derecha: imágenes (HU-17) + envío -->
      <div class="space-y-5">
        <div>
          <label for="pet-image" class="form-label">
            {{ isEdit ? 'Agregar imágenes (opcional)' : 'Imágenes *' }}
          </label>

          <!-- Zona de arrastrar y soltar -->
          <label
            for="pet-image"
            class="mt-1 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors duration-200"
            :class="isDragging
              ? 'border-[#BA8C71] bg-[#FCD8B8]/30'
              : 'border-[#A3AEB9]/50 bg-[#FCD8B8]/10 hover:border-[#BA8C71] hover:bg-[#FCD8B8]/30'"
            @dragover.prevent="isDragging = true"
            @dragenter.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onDrop"
          >
            <input
              id="pet-image"
              type="file"
              accept="image/*"
              multiple
              class="sr-only"
              @change="onFilesChange"
            />
            <span class="material-symbols-outlined text-[40px] text-[#BA8C71]" aria-hidden="true">
              add_photo_alternate
            </span>
            <span class="text-sm font-semibold text-[#040404]">
              Arrastra tus imágenes aquí o
              <span class="text-[#BA8C71] underline">haz clic para elegir</span>
            </span>
            <span class="text-xs text-[#A3AEB9]">
              Hasta {{ MAX_IMAGES_PER_PET }} imágenes · máx. 2 MB cada una
            </span>
          </label>
          <p v-if="errors.images" class="mt-2 text-xs text-alert">{{ errors.images }}</p>

          <!-- Previsualización de las imágenes seleccionadas -->
          <ul v-if="selected.length" class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <li v-for="(item, index) in selected" :key="item.url" class="group relative">
              <img
                :src="item.url"
                alt="Vista previa de la imagen"
                class="aspect-square w-full rounded-lg border-2 object-cover"
                :class="item.primary ? 'border-[#E1A16C]' : 'border-transparent'"
              />
              <span
                v-if="item.primary"
                class="absolute left-1 top-1 rounded bg-[#E1A16C] px-1.5 py-0.5 text-[10px] font-bold text-[#040404]"
              >
                Principal
              </span>
              <div class="absolute inset-x-1 bottom-1 flex gap-1">
                <button
                  v-if="!item.primary"
                  type="button"
                  class="flex-1 rounded bg-white/90 py-0.5 text-[10px] font-semibold text-[#040404] hover:bg-white"
                  @click="setPrimary(index)"
                >
                  Principal
                </button>
                <button
                  type="button"
                  class="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-[#040404] hover:bg-white"
                  :aria-label="`Quitar imagen ${index + 1}`"
                  @click="removeFile(index)"
                >
                  ✕
                </button>
              </div>
            </li>
          </ul>

          <!-- Galería actual en modo edición (HU-19) -->
          <div v-if="isEdit" class="mt-5">
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Imágenes actuales</p>
            <ul v-if="existingImages.length" class="grid grid-cols-3 gap-3 sm:grid-cols-4">
              <li v-for="img in existingImages" :key="img.id" class="relative aspect-square">
                <img
                  :src="img.image_url"
                  :alt="`Imagen ${img.id} de la mascota`"
                  class="h-full w-full rounded-lg border border-[#A3AEB9]/30 object-cover"
                  :class="{ 'ring-2 ring-[#E1A16C]': img.is_primary }"
                />
                <span
                  v-if="img.is_primary"
                  class="absolute left-1 top-1 rounded bg-[#E1A16C] px-1 text-[10px] font-bold text-[#040404]"
                >
                  Princ.
                </span>
                <button
                  v-if="!img.is_primary"
                  type="button"
                  class="absolute right-1 top-1 rounded bg-white/90 px-1 text-[10px] font-bold text-[#040404] hover:bg-white"
                  aria-label="Marcar como principal"
                  @click="$emit('set-primary', props.initialData.id, img.id)"
                >
                  ★
                </button>
                <button
                  type="button"
                  class="absolute bottom-1 right-1 rounded bg-white/90 px-1 text-[10px] font-bold text-[#040404] hover:bg-white"
                  :aria-label="`Eliminar imagen ${img.id}`"
                  @click="$emit('delete-image', props.initialData.id, img.id)"
                >
                  ✕
                </button>
              </li>
            </ul>
            <p v-else class="text-xs text-ink-soft">Esta mascota aún no tiene imágenes.</p>
          </div>
        </div>

        <!-- Errores generales -->
        <p v-if="serverError" class="text-center text-sm text-alert">{{ serverError }}</p>

        <!-- Botón de envío -->
        <div class="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
          <button
            v-if="showCancel"
            type="button"
            class="w-full rounded-xl border border-[#A3AEB9]/40 px-5 py-2.5 text-sm font-semibold text-[#040404] transition-colors hover:bg-[#FCD8B8]/30 sm:w-auto"
            @click="$emit('cancel')"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#BA8C71] px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#E1A16C] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <span
              class="material-symbols-outlined text-[20px]"
              style="font-variation-settings: 'FILL' 1"
              aria-hidden="true"
            >
              pets
            </span>
            {{ loading ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Registrar Mascota') }}
          </button>
        </div>
      </div>
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
  requirements: '',
  // Sprint 3 (HU-32): alimentan el matching (D2 y D4).
  energy_level: 'media',
  good_with_kids: false,
  good_with_other_pets: false
})

// Lista de imágenes por subir: { file, url, primary }. La marcada como
// `primary` se envía primera y el store la guarda con is_primary = true.
const selected = ref([])
const errors = ref({})
const isDragging = ref(false)

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
    form.energy_level = data.energy_level || 'media'
    form.good_with_kids = !!data.good_with_kids
    form.good_with_other_pets = !!data.good_with_other_pets
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
  form.energy_level = 'media'
  form.good_with_kids = false
  form.good_with_other_pets = false
  clearFiles()
  errors.value = {}
}

function onFilesChange(event) {
  addFiles(event.target.files)
  event.target.value = ''
}

function onDrop(event) {
  isDragging.value = false
  addFiles(event.dataTransfer?.files)
}

function addFiles(fileList) {
  const files = Array.from(fileList || [])
  if (files.length === 0) return

  const invalid = files.find((f) => !f.type?.startsWith('image/'))
  if (invalid) {
    setError('images', 'Todos los archivos deben ser imágenes.')
    return
  }
  const tooBig = files.find((f) => f.size > 2 * 1024 * 1024)
  if (tooBig) {
    setError('images', `"${tooBig.name}" supera el límite de 2 MB.`)
    return
  }
  if (selected.value.length + files.length > MAX_IMAGES_PER_PET) {
    setError('images', `Puedes subir hasta ${MAX_IMAGES_PER_PET} imágenes por mascota.`)
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
  @apply block w-full appearance-none rounded-xl border border-[#A3AEB9]/40 bg-white px-3.5 py-2.5 text-sm text-[#040404] placeholder-[#A3AEB9] shadow-sm transition focus:border-[#BA8C71] focus:outline-none focus:ring-2 focus:ring-[#BA8C71]/20;
}
.form-label {
  @apply mb-1.5 block text-sm font-semibold text-[#040404];
}
</style>

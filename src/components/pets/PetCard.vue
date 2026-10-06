<template>
  <article
    class="bg-white rounded-xl shadow-sm hover:shadow-lg transition overflow-hidden flex flex-col cursor-pointer border border-gray-100"
    @click="onOpen"
  >
    <!-- Imagen -->
    <div class="relative aspect-[4/3] w-full bg-gray-200">
      <img
        v-if="primaryImage"
        :src="primaryImage"
        :alt="`Foto de ${pet.name}`"
        class="w-full h-full object-cover"
        loading="lazy"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-gray-400 text-4xl">🐾</div>

      <!-- Estado (visible para el panel del refugio) -->
      <span
        v-if="showStatus"
        :class="statusBadgeClass"
        class="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold"
      >
        {{ statusLabel }}
      </span>

      <!-- Botón favorito -->
      <button
        v-if="favoriteEnabled"
        type="button"
        :aria-label="isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'"
        :title="isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'"
        class="absolute top-2 right-2 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center hover:scale-110 transition"
        @click.stop="onToggleFavorite"
      >
        <svg
          :class="isFavorite ? 'fill-red-500 text-red-500' : 'fill-transparent text-gray-400'"
          class="w-5 h-5"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>
    </div>

    <!-- Contenido -->
    <div class="p-4 flex-1 flex flex-col">
      <div class="flex items-start justify-between gap-2">
        <h3 class="font-bold text-gray-900 truncate">{{ pet.name }}</h3>
        <span class="text-xs text-gray-500 whitespace-nowrap">{{ speciesLabel }}</span>
      </div>
      <p class="text-sm text-gray-500 mt-1 line-clamp-2 min-h-[2.5rem]">{{ pet.description || 'Sin descripción.' }}</p>

      <div class="mt-3 flex flex-wrap gap-2 text-xs">
        <span class="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full">{{ sizeLabel }}</span>
        <span class="px-2 py-1 bg-gray-100 text-gray-600 rounded-full">{{ ageLabel }}</span>
        <span v-if="pet.shelters?.city" class="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full">
          📍 {{ pet.shelters.city }}
        </span>
      </div>

      <!-- Acciones diferenciadas según contexto -->
      <div v-if="showStatus" class="mt-4 pt-3 border-t border-gray-100">
        <div class="flex items-center justify-between gap-2">
          <!-- @click.stop: sin él, el clic en la etiqueta burbujea a <article>
               y navega al detalle en lugar de abrir el select. -->
          <label class="text-xs text-gray-500 flex items-center gap-1" @click.stop>
            Estado:
            <select
              :value="pet.status"
              class="text-xs border border-gray-300 rounded px-2 min-h-[44px] bg-white"
              @click.stop
              @change.stop="onChangeStatus"
            >
              <!-- HU-20 CA#3: se ocultan las transiciones lógicamente inválidas. -->
              <option
                v-for="opt in availableStatuses"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </label>
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="text-xs px-2.5 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              @click.stop="onEdit"
            >
              Editar
            </button>
            <button
              type="button"
              class="text-xs px-2.5 py-1.5 border border-red-200 text-red-600 rounded-md hover:bg-red-50"
              @click.stop="onDelete"
            >
              Eliminar
            </button>
          </div>
        </div>

        <!-- HU-21: fecha de alta en el catálogo -->
        <p class="text-[11px] text-gray-400 mt-2">
          Registrada el {{ registeredAt }}
        </p>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { checkStatusTransition, STATUS_LABEL } from '../../stores/petStore'

const props = defineProps({
  pet: { type: Object, required: true },
  isFavorite: { type: Boolean, default: false },
  showStatus: { type: Boolean, default: false },
  favoriteEnabled: { type: Boolean, default: true }
})
const emit = defineEmits(['open', 'toggle-favorite', 'edit', 'change-status', 'delete'])

const speciesLabel = computed(() => {
  const map = { perro: '🐶 Perro', gato: '🐱 Gato', otro: '🐾 Otro' }
  return map[props.pet.species] || '🐾 Mascota'
})

const sizeLabel = computed(() => {
  const map = { 'pequeño': 'Pequeño', mediano: 'Mediano', grande: 'Grande' }
  return map[props.pet.size] || props.pet.size
})

const ageLabel = computed(() => {
  const years = Number(props.pet.age_years)
  if (Number.isFinite(years) && years > 0) return years < 1 ? 'Menor de 1 año' : `${years} año(s)`
  const months = Number(props.pet.age_months)
  if (Number.isFinite(months) && months > 0) {
    if (months < 12) return `${months} mes(es)`
    return `${Math.floor(months / 12)} año(s)`
  }
  return 'Edad no especificada'
})

const statusLabel = computed(() => STATUS_LABEL[props.pet.status] || props.pet.status)

// HU-20 CA#3: solo se ofrecen los estados alcanzables desde el actual.
const availableStatuses = computed(() =>
  Object.keys(STATUS_LABEL)
    .map((key) => ({ value: key, label: STATUS_LABEL[key] }))
    .filter(({ value }) => checkStatusTransition(props.pet.status, value).valid)
)

const registeredAt = computed(() => {
  const raw = props.pet?.created_at
  if (!raw) return 'fecha no registrada'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return 'fecha no registrada'
  return date.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
})

const statusBadgeClass = computed(() => {
  const map = {
    disponible: 'bg-emerald-100 text-emerald-700',
    en_proceso: 'bg-amber-100 text-amber-700',
    adoptada: 'bg-gray-200 text-gray-600'
  }
  return map[props.pet.status] || 'bg-gray-100 text-gray-600'
})

const primaryImage = computed(() => {
  const images = props.pet?.pet_images || []
  return (images.find((img) => img.is_primary) || images[0])?.image_url || null
})

function onOpen() {
  emit('open', props.pet)
}

function onToggleFavorite() {
  emit('toggle-favorite', props.pet)
}

function onEdit() {
  emit('edit', props.pet)
}

function onChangeStatus(event) {
  emit('change-status', props.pet, event.target.value)
}

function onDelete() {
  emit('delete', props.pet)
}
</script>
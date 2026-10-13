<template>
  <article
    class="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#A3AEB9]/20 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    @click="onOpen"
  >
    <!-- Imagen -->
    <div class="relative aspect-[4/3] w-full overflow-hidden rounded-t-2xl bg-[#FCD8B8]/30">
      <img
        v-if="primaryImage"
        :src="primaryImage"
        :alt="`Foto de ${pet.name}`"
        class="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        loading="lazy"
      />
      <div v-else class="flex h-full w-full items-center justify-center text-4xl text-[#A3AEB9]">🐾</div>

      <!-- Estado (visible para el panel del refugio) -->
      <span
        v-if="showStatus"
        :class="statusBadgeClass"
        class="absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm"
      >
        {{ statusLabel }}
      </span>

      <!-- Botón favorito -->
      <button
        v-if="favoriteEnabled"
        type="button"
        :aria-label="isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'"
        :title="isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'"
        class="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-110 hover:bg-white"
        @click.stop="onToggleFavorite"
      >
        <svg
          :class="isFavorite ? 'fill-[#E1A16C] text-[#E1A16C]' : 'fill-transparent text-[#A3AEB9] group-hover:text-[#E1A16C]'"
          class="h-5 w-5 transition-colors"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>
    </div>

    <!-- Contenido -->
    <div class="flex flex-1 flex-col p-4">
      <div class="flex items-start justify-between gap-2">
        <h3 class="truncate font-display text-lg font-bold text-[#040404]">{{ pet.name }}</h3>
        <span class="whitespace-nowrap text-xs font-medium text-[#A3AEB9]">{{ speciesLabel }}</span>
      </div>

      <p class="mt-1 text-sm text-[#A3AEB9]">{{ subtitle }}</p>

      <p class="mt-2 line-clamp-2 text-sm text-[#A3AEB9]">{{ pet.description || 'Sin descripción.' }}</p>

      <div class="mt-3 flex flex-wrap gap-2 text-xs">
        <span class="rounded-full bg-[#FCD8B8] px-2.5 py-1 font-semibold text-[#BA8C71]">{{ sizeLabel }}</span>
        <span v-if="pet.shelters?.city" class="rounded-full bg-[#FCD8B8] px-2.5 py-1 font-semibold text-[#BA8C71]">
          📍 {{ pet.shelters.city }}
        </span>
      </div>

      <!-- Acciones diferenciadas según contexto -->
      <div v-if="showStatus" class="mt-4 border-t border-[#A3AEB9]/20 pt-3" @click.stop>
        <div class="flex items-center justify-between gap-2">
          <!-- @click.stop: sin él, el clic en la etiqueta burbujea a <article>
               y navega al detalle en lugar de abrir el select. -->
          <label class="flex items-center gap-1 text-xs text-[#A3AEB9]">
            Estado:
            <select
              :value="pet.status"
              class="min-h-[44px] rounded-xl border border-[#A3AEB9]/40 bg-white px-2 text-xs text-[#040404] transition focus:border-[#BA8C71] focus:outline-none focus:ring-2 focus:ring-[#BA8C71]/20"
              @change="onChangeStatus"
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
              class="rounded-lg border border-[#A3AEB9]/40 px-2.5 py-1.5 text-xs font-semibold text-[#040404] transition hover:bg-[#FCD8B8]/40"
              @click="onEdit"
            >
              Editar
            </button>
            <button
              type="button"
              class="rounded-lg border border-[#BA8C71]/40 px-2.5 py-1.5 text-xs font-semibold text-[#BA8C71] transition hover:bg-[#FCD8B8]/40"
              @click="onDelete"
            >
              Eliminar
            </button>
          </div>
        </div>

        <!-- HU-21: fecha de alta en el catálogo -->
        <p class="mt-2 text-[11px] text-[#A3AEB9]">
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

const subtitle = computed(() => {
  const breed = props.pet.breed?.trim()
  return [breed, ageLabel.value].filter(Boolean).join(' · ')
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
    disponible: 'bg-[#E1A16C] text-[#040404]',
    en_proceso: 'bg-[#FCD8B8] text-[#040404]',
    adoptada: 'bg-[#A3AEB9] text-[#040404]'
  }
  return map[props.pet.status] || 'bg-[#FCD8B8] text-[#040404]'
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

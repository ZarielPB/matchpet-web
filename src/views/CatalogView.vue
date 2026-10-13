<template>
  <component :is="shell" :role="shellRole" title="Explorar Mascotas">
    <div class="mx-auto w-full max-w-7xl">
      <!-- Barra de búsqueda (HU-25) -->
      <div class="relative mb-4">
        <span
          class="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[22px] text-[#A3AEB9]"
          aria-hidden="true"
        >
          search
        </span>
        <input
          v-model="searchTerm"
          type="search"
          class="w-full rounded-2xl border border-[#A3AEB9]/40 bg-white py-3.5 pl-12 pr-12 text-sm text-[#040404] placeholder-[#A3AEB9] shadow-sm transition focus:border-[#BA8C71] focus:outline-none focus:ring-2 focus:ring-[#BA8C71]/20"
          placeholder="Buscar por nombre, raza..."
        />
        <button
          v-if="searchTerm"
          type="button"
          class="absolute right-4 top-1/2 -translate-y-1/2 text-[#A3AEB9] transition hover:text-[#040404]"
          aria-label="Limpiar búsqueda"
          @click="searchTerm = ''"
        >
          <span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
        </button>
      </div>

      <!-- Filtros (HU-24) -->
      <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <select
          v-model="filters.species"
          class="filter-input w-full sm:w-auto sm:min-w-[10rem]"
          aria-label="Filtrar por especie"
          @change="applyFilters"
        >
          <option value="">Todas las especies</option>
          <option value="perro">Perro</option>
          <option value="gato">Gato</option>
          <option value="otro">Otro</option>
        </select>

        <select
          v-model="filters.size"
          class="filter-input w-full sm:w-auto sm:min-w-[10rem]"
          aria-label="Filtrar por tamaño"
          @change="applyFilters"
        >
          <option value="">Cualquier tamaño</option>
          <option value="pequeño">Pequeño</option>
          <option value="mediano">Mediano</option>
          <option value="grande">Grande</option>
        </select>

        <select
          v-model="filters.city"
          class="filter-input w-full sm:w-auto sm:min-w-[10rem]"
          aria-label="Filtrar por ciudad"
          @change="applyFilters"
        >
          <option value="">Todas las ciudades</option>
          <option v-for="city in petStore.shelterCities" :key="city" :value="city">{{ city }}</option>
        </select>

        <select
          v-model="filters.ageRange"
          class="filter-input w-full sm:w-auto sm:min-w-[10rem]"
          aria-label="Filtrar por edad"
          @change="applyFilters"
        >
          <option value="">Cualquier edad</option>
          <option value="menor_1">Menos de 1 año</option>
          <option value="1_a_3">Entre 1 y 3 años</option>
          <option value="mayor_3">Más de 3 años</option>
        </select>

        <button
          type="button"
          class="w-full rounded-xl border border-[#A3AEB9]/40 bg-white px-4 py-2.5 text-sm font-semibold text-[#040404] shadow-sm transition hover:bg-[#FCD8B8]/40 sm:w-auto"
          @click="clearFilters"
        >
          Limpiar
        </button>
      </div>

      <!-- Contador de resultados -->
      <p v-if="!petStore.loading" class="mb-4 text-sm text-[#A3AEB9]">
        <template v-if="petStore.catalogPets.length === 0">No se encontraron mascotas.</template>
        <template v-else>
          Mostrando {{ petStore.catalogPets.length }} de {{ petStore.total }}
          {{ petStore.total === 1 ? 'mascota' : 'mascotas' }}.
        </template>
      </p>

      <!-- Error general -->
      <div v-if="petStore.error" class="mb-6 rounded-xl border border-[#B3261E]/30 bg-[#B3261E]/10 px-4 py-3 text-sm text-alert">
        {{ petStore.error }}
      </div>

      <!-- Skeleton de carga -->
      <div
        v-if="petStore.loading && petStore.catalogPets.length === 0"
        class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <div
          v-for="i in 8"
          :key="i"
          class="animate-pulse overflow-hidden rounded-2xl border border-[#A3AEB9]/20 bg-white shadow-sm"
        >
          <div class="aspect-[4/3] bg-[#A3AEB9]/20"></div>
          <div class="space-y-2 p-4">
            <div class="h-4 w-2/3 rounded bg-[#A3AEB9]/20"></div>
            <div class="h-3 w-1/2 rounded bg-[#A3AEB9]/20"></div>
            <div class="h-3 w-full rounded bg-[#A3AEB9]/20"></div>
          </div>
        </div>
      </div>

      <!-- Estado vacío -->
      <div
        v-else-if="petStore.catalogPets.length === 0"
        class="rounded-2xl border border-[#A3AEB9]/20 bg-white py-20 text-center shadow-sm"
      >
        <span
          class="material-symbols-outlined text-[64px] text-[#A3AEB9]"
          style="font-variation-settings: 'FILL' 1"
          aria-hidden="true"
        >
          pets
        </span>
        <p class="mt-4 font-medium text-[#040404]">No encontramos mascotas con esos criterios</p>
        <p class="mt-1 text-sm text-[#A3AEB9]">Prueba con otros filtros o vuelve más tarde.</p>
      </div>

      <!-- Grilla -->
      <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <PetCard
          v-for="pet in petStore.catalogPets"
          :key="pet.id"
          :pet="pet"
          :is-favorite="petStore.isFavorite(pet.id)"
          @open="goToDetail"
          @toggle-favorite="handleToggleFavorite"
        />
      </div>

      <!-- HU-23 CA#3: paginación del catálogo -->
      <nav
        v-if="totalPages > 1"
        class="mt-8 flex items-center justify-center gap-3"
        aria-label="Paginación del catálogo"
      >
        <button
          type="button"
          class="rounded-xl border border-[#A3AEB9]/40 bg-white px-3.5 py-2 text-sm font-semibold text-[#040404] transition hover:bg-[#FCD8B8]/40 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="page === 1 || petStore.loading"
          @click="goToPage(page - 1)"
        >
          Anterior
        </button>
        <span class="text-sm text-[#A3AEB9]">Página {{ page }} de {{ totalPages }}</span>
        <button
          type="button"
          class="rounded-xl border border-[#A3AEB9]/40 bg-white px-3.5 py-2 text-sm font-semibold text-[#040404] transition hover:bg-[#FCD8B8]/40 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="page === totalPages || petStore.loading"
          @click="goToPage(page + 1)"
        >
          Siguiente
        </button>
      </nav>
    </div>
  </component>
</template>

<script setup>
import { ref, h, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { usePetStore } from '../stores/petStore'
import PetCard from '../components/pets/PetCard.vue'
import DashboardLayout from '../components/layout/DashboardLayout.vue'

const router = useRouter()
const authStore = useAuthStore()
const petStore = usePetStore()

const searchTerm = ref('')
let searchTimer = null

// Layout: sidebar de dashboard si hay sesión, header simple si es invitado.
const shell = computed(() => (authStore.isAuthenticated ? DashboardLayout : PublicShell))
const shellRole = computed(() => (authStore.isAuthenticated ? authStore.userRole : 'adoptante'))

const filters = reactive({
  species: '',
  city: '',
  size: '',
  ageRange: ''
})

const AGE_RANGES = {
  menor_1: { ageMin: 0, ageMax: 0 },
  '1_a_3': { ageMin: 1, ageMax: 3 },
  mayor_3: { ageMin: 4, ageMax: null }
}

// HU-23 CA#3: paginación (9 por página) reutilizando el `count` de Supabase.
const PAGE_SIZE = 9
const page = ref(1)
const totalPages = computed(() =>
  Math.max(1, Math.ceil((petStore.total || 0) / PAGE_SIZE))
)

function buildQuery() {
  const range = AGE_RANGES[filters.ageRange] || null
  return {
    species: filters.species || undefined,
    city: filters.city || undefined,
    size: filters.size || undefined,
    status: 'disponible',
    search: searchTerm.value.trim() || undefined,
    ageMin: range?.ageMin,
    ageMax: range?.ageMax,
    limit: PAGE_SIZE,
    offset: (page.value - 1) * PAGE_SIZE
  }
}

async function refreshList() {
  await petStore.fetchPets(buildQuery())
}

async function applyFilters() {
  page.value = 1
  await refreshList()
}

function goToPage(next) {
  page.value = Math.min(Math.max(1, next), totalPages.value)
  refreshList()
}

function watchSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    refreshList()
  }, 300)
}

watch(searchTerm, watchSearch)

function clearFilters() {
  filters.species = ''
  filters.city = ''
  filters.size = ''
  filters.ageRange = ''
  applyFilters()
}

function goToDetail(pet) {
  router.push(`/mascota/${pet.id}`)
}

async function handleToggleFavorite(pet) {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  await petStore.toggleFavorite(pet.id)
}

// Header público para visitantes sin sesión (HU-23 es una ruta pública).
const PublicShell = {
  props: {
    role: { type: String, default: '' },
    title: { type: String, default: '' }
  },
  setup(props, { slots }) {
    return () =>
      h('div', { class: 'min-h-screen bg-[#FCD8B8]/20' }, [
        h(
          'header',
          { class: 'sticky top-0 z-30 border-b border-[#A3AEB9]/20 bg-white/90 backdrop-blur-md' },
          h('div', { class: 'mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5' }, [
            h(RouterLink, { to: '/', class: 'flex items-center gap-2.5' }, () => [
              h('span', { class: 'flex h-9 w-9 items-center justify-center rounded-xl bg-[#BA8C71] text-white' }, [
                h(
                  'span',
                  { class: 'material-symbols-outlined text-[20px]', style: "font-variation-settings: 'FILL' 1" },
                  'pets'
                )
              ]),
              h('span', { class: 'font-display text-lg font-black tracking-tight text-[#040404]' }, [
                'Match',
                h('span', { class: 'text-[#BA8C71]' }, 'Pet')
              ])
            ]),
            h('div', { class: 'flex items-center gap-2' }, [
              h(
                RouterLink,
                {
                  to: '/login',
                  class: 'rounded-xl px-4 py-2 text-sm font-semibold text-[#040404] transition hover:bg-[#FCD8B8]/50'
                },
                () => 'Iniciar sesión'
              ),
              h(
                RouterLink,
                {
                  to: '/registro',
                  class: 'rounded-xl bg-[#BA8C71] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#E1A16C]'
                },
                () => 'Registrarse'
              )
            ])
          ])
        ),
        h('div', { class: 'mx-auto max-w-7xl px-4 py-8' }, [
          h(
            'h1',
            { class: 'mb-6 font-display text-2xl font-black tracking-tight text-[#040404] sm:text-3xl' },
            props.title
          ),
          slots.default?.()
        ])
      ])
  }
}

onMounted(async () => {
  await petStore.fetchShelterCities()
  await refreshList()
  if (authStore.isAuthenticated) {
    await petStore.loadFavorites()
  }
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
})
</script>

<style scoped>
.filter-input {
  @apply block appearance-none rounded-xl border border-[#A3AEB9]/40 bg-white px-3.5 py-2.5 text-sm text-[#040404] shadow-sm transition focus:border-[#BA8C71] focus:outline-none focus:ring-2 focus:ring-[#BA8C71]/20;
}
</style>

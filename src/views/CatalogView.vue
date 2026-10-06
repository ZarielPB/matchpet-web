<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Encabezado -->
      <div class="flex items-center justify-between gap-4 mb-6">
        <div>
          <button
            type="button"
            class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-1"
            @click="router.push('/')"
          >
            ← Inicio
          </button>
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Catálogo de mascotas 🐾</h1>
        </div>
        <button
          type="button"
          class="lg:hidden px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          @click="mobileFiltersOpen = true"
        >
          Filtros
        </button>
      </div>

      <!-- Barra de búsqueda -->
      <div class="relative mb-4">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
          </svg>
        </span>
        <input
          v-model="searchTerm"
          type="search"
          class="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          placeholder="Buscar por nombre, raza o descripción..."
        />
        <button
          v-if="searchTerm"
          type="button"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label="Limpiar búsqueda"
          @click="searchTerm = ''"
        >
          ✕
        </button>
      </div>

      <!-- Contador de resultados -->
      <p v-if="!petStore.loading" class="text-sm text-gray-500 mb-4">
        <template v-if="petStore.catalogPets.length === 0">No se encontraron mascotas.</template>
        <template v-else>
          Mostrando {{ petStore.catalogPets.length }} de {{ petStore.total }}
          {{ petStore.total === 1 ? 'mascota' : 'mascotas' }}.
        </template>
      </p>

      <!-- Error general -->
      <div v-if="petStore.error" class="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
        {{ petStore.error }}
      </div>

      <div class="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
        <!-- ===== Filtros (sidebar / modal móvil) ===== -->
        <aside
          v-if="mobileFiltersOpen || isDesktop"
          class="fixed inset-0 z-40 lg:static lg:z-auto"
          :class="mobileFiltersOpen ? 'block' : 'hidden lg:block'"
        >
          <!-- Fondo oscuro en móvil -->
          <div
            class="absolute inset-0 bg-black/40 lg:hidden"
            @click="mobileFiltersOpen = false"
          ></div>

          <div class="relative bg-white h-full w-80 max-w-[85vw] lg:w-auto p-6 overflow-y-auto lg:rounded-xl lg:shadow-sm">
            <div class="flex items-center justify-between mb-6">
              <h2 class="font-bold text-gray-900">Filtros</h2>
              <button
                type="button"
                class="lg:hidden text-gray-500 hover:text-gray-700"
                aria-label="Cerrar filtros"
                @click="mobileFiltersOpen = false"
              >
                ✕
              </button>
            </div>

            <form class="space-y-5" @submit.prevent="applyFilters">
              <div>
                <label for="f-species" class="block text-sm font-medium text-gray-700 mb-1">Especie</label>
                <select id="f-species" v-model="filters.species" class="filter-input">
                  <option value="">Todas</option>
                  <option value="perro">Perro</option>
                  <option value="gato">Gato</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label for="f-city" class="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                <select id="f-city" v-model="filters.city" class="filter-input">
                  <option value="">Todas</option>
                  <option v-for="city in petStore.shelterCities" :key="city" :value="city">{{ city }}</option>
                </select>
              </div>

              <div>
                <label for="f-size" class="block text-sm font-medium text-gray-700 mb-1">Tamaño</label>
                <select id="f-size" v-model="filters.size" class="filter-input">
                  <option value="">Todos</option>
                  <option value="pequeño">Pequeño</option>
                  <option value="mediano">Mediano</option>
                  <option value="grande">Grande</option>
                </select>
              </div>

              <div>
                <label for="f-age" class="block text-sm font-medium text-gray-700 mb-1">Edad</label>
                <select id="f-age" v-model="filters.ageRange" class="filter-input">
                  <option value="">Cualquiera</option>
                  <option value="menor_1">Menos de 1 año</option>
                  <option value="1_a_3">Entre 1 y 3 años</option>
                  <option value="mayor_3">Más de 3 años</option>
                </select>
              </div>

              <div class="pt-2 space-y-2">
                <button
                  type="submit"
                  :disabled="petStore.loading"
                  class="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {{ petStore.loading ? 'Buscando...' : 'Aplicar filtros' }}
                </button>
                <button
                  type="button"
                  class="w-full py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                  @click="clearFilters"
                >
                  Limpiar filtros
                </button>
              </div>
            </form>
          </div>
        </aside>

        <!-- ===== Grilla de mascotas ===== -->
        <main>
          <!-- Skeleton de carga -->
          <div v-if="petStore.loading && petStore.catalogPets.length === 0" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            <div v-for="i in 6" :key="i" class="bg-white rounded-xl shadow-sm p-4 animate-pulse">
              <div class="aspect-[4/3] bg-gray-200 rounded-lg mb-4"></div>
              <div class="h-4 bg-gray-200 rounded mb-2 w-2/3"></div>
              <div class="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          </div>

          <!-- Vacío -->
          <div v-else-if="petStore.catalogPets.length === 0" class="text-center py-20 bg-white rounded-xl shadow-sm">
            <div class="text-6xl mb-4">🐾</div>
            <p class="text-gray-600 font-medium">No encontramos mascotas con esos filtros.</p>
            <p class="text-sm text-gray-400 mt-1">Prueba con otros filtros o vuelve más tarde.</p>
          </div>

          <!-- Grilla -->
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
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
              class="px-3.5 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="page === 1 || petStore.loading"
              @click="goToPage(page - 1)"
            >
              Anterior
            </button>
            <span class="text-sm text-gray-500">
              Página {{ page }} de {{ totalPages }}
            </span>
            <button
              type="button"
              class="px-3.5 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="page === totalPages || petStore.loading"
              @click="goToPage(page + 1)"
            >
              Siguiente
            </button>
          </nav>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { usePetStore } from '../stores/petStore'
import PetCard from '../components/pets/PetCard.vue'

const router = useRouter()
const authStore = useAuthStore()
const petStore = usePetStore()

const mobileFiltersOpen = ref(false)
const isDesktop = ref(false)
const searchTerm = ref('')
let mediaQuery = null
let searchTimer = null

// Detecta si el viewport es de escritorio para mostrar la sidebar fija.
function updateIsDesktop() {
  isDesktop.value = mediaQuery.matches
  if (mediaQuery.matches) mobileFiltersOpen.value = false
}

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
  mobileFiltersOpen.value = false
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

onMounted(async () => {
  mediaQuery = window.matchMedia('(min-width: 1024px)')
  updateIsDesktop()
  mediaQuery.addEventListener('change', updateIsDesktop)

  await petStore.fetchShelterCities()
  await refreshList()
  if (authStore.isAuthenticated) {
    await petStore.loadFavorites()
  }
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  if (mediaQuery) mediaQuery.removeEventListener('change', updateIsDesktop)
})
</script>

<style scoped>
.filter-input {
  @apply appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white;
}
</style>
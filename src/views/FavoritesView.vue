<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 py-8">
      <button
        type="button"
        class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        @click="router.push('/adoptante/dashboard')"
      >
        ← Volver al panel
      </button>

      <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Mis favoritos ❤️</h1>
      <p class="text-sm text-gray-500 mb-6">Las mascotas que guardaste para adoptar luego.</p>

      <div v-if="petStore.error" class="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
        {{ petStore.error }}
      </div>

      <div v-if="petStore.loading && petStore.favoritePets.length === 0" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        <div v-for="i in 6" :key="i" class="bg-white rounded-xl shadow-sm p-4 animate-pulse">
          <div class="aspect-[4/3] bg-gray-200 rounded-lg mb-4"></div>
          <div class="h-4 bg-gray-200 rounded mb-2 w-2/3"></div>
          <div class="h-3 bg-gray-200 rounded w-full"></div>
        </div>
      </div>

      <div v-else-if="petStore.favoritePets.length === 0" class="text-center py-20 bg-white rounded-xl shadow-sm">
        <div class="text-6xl mb-4">💔</div>
        <p class="text-gray-600 font-medium">Aún no tienes mascotas favoritas.</p>
        <p class="text-sm text-gray-400 mt-1">Explora el catálogo y guarda las que te enamoren.</p>
        <router-link
          to="/catalogo"
          class="inline-block mt-6 px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          Explorar catálogo
        </router-link>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        <PetCard
          v-for="pet in petStore.favoritePets"
          :key="pet.id"
          :pet="pet"
          :is-favorite="true"
          @open="goToDetail"
          @toggle-favorite="handleRemoveFavorite"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePetStore } from '../stores/petStore'
import PetCard from '../components/pets/PetCard.vue'

const router = useRouter()
const petStore = usePetStore()

onMounted(() => {
  petStore.fetchFavoritePets()
})

function goToDetail(pet) {
  router.push(`/mascota/${pet.id}`)
}

async function handleRemoveFavorite(pet) {
  const result = await petStore.toggleFavorite(pet.id)
  if (result.success) {
    petStore.favoritePets = petStore.favoritePets.filter((p) => p.id !== pet.id)
  }
}
</script>
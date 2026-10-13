<template>
  <DashboardLayout role="adoptante" title="Mis Favoritos">
    <p class="mb-6 text-sm text-ink-soft">Las mascotas que guardaste para adoptar luego.</p>

    <!-- Error -->
    <div
      v-if="petStore.error"
      class="mb-6 rounded-xl border border-[#B3261E]/30 bg-[#B3261E]/10 p-4 text-sm text-alert"
      role="alert"
    >
      {{ petStore.error }}
    </div>

    <!-- Cargando (skeletons) -->
    <div
      v-if="petStore.loading && petStore.favoritePets.length === 0"
      class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <div
        v-for="i in 8"
        :key="i"
        class="animate-pulse overflow-hidden rounded-2xl border border-[#A3AEB9]/20 bg-white shadow-sm"
      >
        <div class="aspect-[4/3] w-full bg-[#A3AEB9]/20"></div>
        <div class="space-y-3 p-4">
          <div class="flex items-center justify-between gap-3">
            <div class="h-4 w-2/3 rounded bg-[#A3AEB9]/20"></div>
            <div class="h-3 w-12 rounded bg-[#A3AEB9]/20"></div>
          </div>
          <div class="h-3 w-1/2 rounded bg-[#A3AEB9]/20"></div>
          <div class="h-3 w-full rounded bg-[#A3AEB9]/20"></div>
          <div class="h-3 w-4/5 rounded bg-[#A3AEB9]/20"></div>
          <div class="flex gap-2 pt-1">
            <div class="h-6 w-16 rounded-full bg-[#A3AEB9]/20"></div>
            <div class="h-6 w-20 rounded-full bg-[#A3AEB9]/20"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Estado vacío -->
    <div
      v-else-if="petStore.favoritePets.length === 0"
      class="rounded-2xl border border-[#A3AEB9]/20 bg-white px-6 py-20 text-center shadow-sm"
    >
      <span
        class="material-symbols-outlined text-[80px] text-[#A3AEB9]"
        style="font-variation-settings: 'FILL' 1"
        aria-hidden="true"
      >
        favorite
      </span>
      <h2 class="mt-4 text-xl font-bold text-[#040404]">Aún no tienes mascotas favoritas</h2>
      <p class="mx-auto mt-2 max-w-md text-sm text-[#A3AEB9]">
        Explora el catálogo y guarda los perfiles de los animalitos que más te gusten.
      </p>
      <router-link
        to="/catalogo"
        class="mx-auto mt-6 inline-flex items-center gap-2 rounded-xl bg-[#BA8C71] px-6 py-3 text-sm font-bold text-white shadow-sm transition-all duration-300 hover:bg-[#E1A16C]"
      >
        <span class="material-symbols-outlined text-[20px]" aria-hidden="true">search</span>
        Ir al Catálogo
      </router-link>
    </div>

    <!-- Grilla de favoritos -->
    <div
      v-else
      class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <PetCard
        v-for="pet in petStore.favoritePets"
        :key="pet.id"
        :pet="pet"
        :is-favorite="true"
        :favorite-enabled="true"
        :show-status="false"
        @open="goToDetail"
        @toggle-favorite="handleRemoveFavorite"
      />
    </div>
  </DashboardLayout>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePetStore } from '../stores/petStore'
import PetCard from '../components/pets/PetCard.vue'
import DashboardLayout from '../components/layout/DashboardLayout.vue'

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

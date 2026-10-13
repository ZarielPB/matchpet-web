<template>
  <DashboardLayout role="refugio" :title="pageTitle">
    <!-- Encabezado / acciones -->
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-ink-soft">Registra, edita y actualiza el estado de tus mascotas.</p>
      <button
        v-if="hasShelter && mode === 'list'"
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-xl bg-[#BA8C71] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#E1A16C]"
        @click="startCreate"
      >
        <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">add</span>
        Registrar mascota
      </button>
    </div>

    <!-- Aviso del perfil de refugio (HU-21): no bloquea, orienta -->
    <div
      v-if="petStore.shelterError"
      class="mx-auto mb-6 max-w-2xl rounded-xl border border-[#B3261E]/30 bg-[#B3261E]/10 px-4 py-3 text-sm text-alert"
    >
      ⚠️ {{ petStore.shelterError }}
    </div>

    <!-- Bloqueo: el refugio aún no tiene perfil (shelters) completado -->
    <div
      v-if="!hasShelter && !petStore.shelterError"
      class="mx-auto mt-8 max-w-2xl rounded-2xl border border-[#E1A16C]/40 bg-[#FCD8B8]/30 px-4 py-8 text-center"
    >
      <div class="mb-3 text-5xl">🏠</div>
      <h2 class="mb-1 font-display text-lg font-bold text-[#040404]">Primero completa tu perfil de refugio</h2>
      <p class="mx-auto max-w-md text-sm text-ink-soft">
        Para registrar mascotas en el catálogo necesitas una ficha de refugio activa
        (nombre y ciudad, como mínimo). Tómate un minuto para llenarla.
      </p>
      <router-link
        to="/refugio/perfil"
        class="mt-4 inline-block rounded-xl bg-[#BA8C71] px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#E1A16C]"
      >
        Completar mi perfil
      </router-link>
    </div>

    <template v-else>
      <!-- Mensajes -->
      <div v-if="successMsg" class="mb-6 rounded-xl border border-[#E1A16C]/40 bg-[#E1A16C]/20 px-4 py-3 text-sm text-[#040404]">
        ✅ {{ successMsg }}
      </div>
      <div v-if="petStore.error" class="mb-6 rounded-xl border border-[#B3261E]/30 bg-[#B3261E]/10 px-4 py-3 text-sm text-alert">
        {{ petStore.error }}
      </div>

      <!-- Formulario (crear/editar) -->
      <div v-if="mode !== 'list'" class="mx-auto max-w-5xl rounded-2xl border border-[#A3AEB9]/20 bg-white p-6 shadow-sm sm:p-8">
        <button
          type="button"
          class="mb-5 inline-flex items-center gap-1 text-sm text-[#A3AEB9] transition-colors hover:text-[#040404]"
          @click="cancelForm"
        >
          ← Volver al listado
        </button>
        <h2 class="mb-1 font-display text-lg font-bold text-[#040404]">
          {{ mode === 'edit' ? 'Editar mascota' : 'Nueva mascota' }}
        </h2>
        <p class="mb-6 text-sm text-ink-soft">
          {{ mode === 'edit' ? 'Modifica los datos y guarda los cambios.' : 'Completa los datos y agrega una fotografía.' }}
        </p>
        <PetForm
          :initial-data="mode === 'edit' ? editingPet : null"
          :loading="petStore.loading"
          :server-error="formError"
          :show-cancel="true"
          @submit="handleSave"
          @cancel="cancelForm"
          @delete-image="handleDeleteImage"
          @set-primary="handleSetPrimary"
        />
      </div>

      <!-- Listado -->
      <div v-else>
        <!-- HU-21 CA#4: filtro por estado -->
        <div class="mb-5 flex items-center gap-2">
          <label for="f-status" class="text-sm font-semibold text-[#040404]">Estado:</label>
          <select id="f-status" v-model="statusFilter" class="form-select" @change="loadPets">
            <option value="">Todas</option>
            <option value="disponible">Disponible</option>
            <option value="en_proceso">En proceso</option>
            <option value="adoptada">Adoptada</option>
          </select>
        </div>

        <div v-if="petStore.loading && petStore.myPets.length === 0" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="i in 6" :key="i" class="animate-pulse rounded-2xl border border-[#A3AEB9]/20 bg-white p-4 shadow-sm">
            <div class="mb-4 aspect-[4/3] rounded-lg bg-[#A3AEB9]/20"></div>
            <div class="mb-2 h-4 w-2/3 rounded bg-[#A3AEB9]/20"></div>
            <div class="mb-1 h-3 w-full rounded bg-[#A3AEB9]/20"></div>
            <div class="h-3 w-1/2 rounded bg-[#A3AEB9]/20"></div>
          </div>
        </div>

        <div v-else-if="petStore.myPets.length === 0" class="rounded-2xl border border-[#A3AEB9]/20 bg-white py-16 text-center shadow-sm">
          <div class="mb-3 text-5xl">🐾</div>
          <p class="font-medium text-[#040404]">
            {{ statusFilter ? 'No tienes mascotas en ese estado.' : 'Aún no tienes mascotas registradas.' }}
          </p>
          <p class="mt-1 text-sm text-ink-soft">Usa el botón "Registrar mascota" para empezar.</p>
        </div>

        <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <PetCard
            v-for="pet in petStore.myPets"
            :key="pet.id"
            :pet="pet"
            show-status
            :favorite-enabled="false"
            @open="goToDetail"
            @edit="startEdit"
            @change-status="handleStatusChange"
            @delete="handleDelete"
          />
        </div>
      </div>
    </template>
  </DashboardLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePetStore } from '../../stores/petStore'
import PetCard from '../../components/pets/PetCard.vue'
import PetForm from '../../components/pets/PetForm.vue'
import DashboardLayout from '../../components/layout/DashboardLayout.vue'

const router = useRouter()
const petStore = usePetStore()

const mode = ref('list') // 'list' | 'new' | 'edit'
const editingPet = ref(null)
const successMsg = ref('')
const formError = ref('')
const shelter = ref(null)
const hasShelter = ref(false)
const statusFilter = ref('')

const pageTitle = computed(() => {
  if (mode.value === 'edit') return 'Editar Mascota'
  if (mode.value === 'new') return 'Registrar Nueva Mascota'
  return 'Gestión de Mascotas'
})

async function loadPets() {
  await petStore.fetchMyPets({ status: statusFilter.value || undefined })
}

// `loadPets()` reemplaza los objetos de `myPets`; `editingPet` queda apuntando a
// una copia vieja y la galería de `PetForm` no se refresca. Reapuntamos.
function refreshEditingPet() {
  if (mode.value !== 'edit' || !editingPet.value) return
  const fresh = petStore.myPets.find((p) => p.id === editingPet.value.id)
  if (fresh) editingPet.value = fresh
}

onMounted(async () => {
  shelter.value = await petStore.getMyShelter()
  hasShelter.value = !!shelter.value
  if (hasShelter.value) await loadPets()
})

function startCreate() {
  formError.value = ''
  editingPet.value = null
  mode.value = 'new'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function startEdit(pet) {
  formError.value = ''
  editingPet.value = pet
  mode.value = 'edit'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelForm() {
  mode.value = 'list'
  editingPet.value = null
}

async function handleSave(payload, imageFiles) {
  formError.value = ''
  successMsg.value = ''
  let result

  if (mode.value === 'edit') {
    result = await petStore.updatePet(editingPet.value.id, payload)
    if (result.success && imageFiles?.length) {
      const imgResult = await petStore.addPetImages(editingPet.value.id, imageFiles)
      if (!imgResult.success) formError.value = imgResult.error
      else successMsg.value = 'Información actualizada correctamente.'
    } else if (result.success) {
      successMsg.value = 'Información actualizada correctamente.'
    }
  } else {
    result = await petStore.addPet(payload, imageFiles)
    if (result.success) successMsg.value = 'Mascota registrada correctamente.'
  }

  if (!result.success) {
    formError.value = result.error
    return
  }
  if (formError.value) {
    // Los datos se guardaron pero la galería falló: lo decimos en vez de
    // mandar al listado y esconder el problema.
    return
  }
  mode.value = 'list'
  editingPet.value = null
  await loadPets()
}

// HU-20 CA#3: valida la transición y pide confirmación si reaparece en catálogo.
async function handleStatusChange(pet, newStatus) {
  successMsg.value = ''
  if (pet.status === newStatus) return

  let result = await petStore.updatePetStatus(pet.id, newStatus)
  if (result.needsConfirm) {
    if (!window.confirm(result.error)) return
    result = await petStore.updatePetStatus(pet.id, newStatus, { confirm: true })
  }
  if (result.success) {
    formError.value = ''
    const label = result.data?.status || newStatus
    successMsg.value = `Estado de ${pet.name} actualizado a "${label}".`
  } else {
    formError.value = result.error
    await loadPets()
  }
}

// HU-19 CA#3: eliminar una imagen con confirmación.
async function handleDeleteImage(petId, imageId) {
  successMsg.value = ''
  formError.value = ''
  if (!window.confirm('¿Eliminar esta imagen de la galería de la mascota?')) return
  const result = await petStore.deletePetImage(petId, imageId)
  if (result.success) {
    successMsg.value = 'Imagen eliminada correctamente.'
  } else {
    formError.value = result.error
  }
  await loadPets()
  refreshEditingPet()
}

// HU-17 CA#6: cambiar la foto principal.
async function handleSetPrimary(petId, imageId) {
  successMsg.value = ''
  formError.value = ''
  const result = await petStore.setPrimaryImage(petId, imageId)
  if (result.success) successMsg.value = 'Foto principal actualizada.'
  else formError.value = result.error
  await loadPets()
  refreshEditingPet()
}

// HU-21 CA#3: eliminar la mascota de la BD y de la lista del refugio.
async function handleDelete(pet) {
  successMsg.value = ''
  formError.value = ''
  const confirmed = window.confirm(
    `¿Eliminar a ${pet.name}?\n\n` +
    'Se quitará del catálogo y se borrarán sus imágenes de forma permanente. ' +
    'Esta acción no se puede deshacer.'
  )
  if (!confirmed) return

  const result = await petStore.deletePet(pet.id)
  if (result.success) {
    successMsg.value = `${pet.name} fue eliminada del catálogo.`
  } else {
    formError.value = result.error
  }
  await loadPets()
}

function goToDetail(pet) {
  router.push(`/mascota/${pet.id}`)
}
</script>

<style scoped>
.form-select {
  @apply block appearance-none rounded-xl border border-[#A3AEB9]/40 bg-white px-3 py-2 text-sm text-[#040404] shadow-sm transition focus:border-[#BA8C71] focus:outline-none focus:ring-2 focus:ring-[#BA8C71]/20;
}
</style>

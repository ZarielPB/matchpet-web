<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-6xl mx-auto px-4 py-8">
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <button
            type="button"
            class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
            @click="router.push('/refugio/dashboard')"
          >
            ← Volver al panel
          </button>
          <h1 class="text-2xl font-bold text-emerald-600">Gestión de Mascotas 🏠</h1>
          <p class="text-sm text-gray-500">Registra, edita y actualiza el estado de tus mascotas.</p>
        </div>
        <button
          v-if="hasShelter && mode === 'list'"
          type="button"
          class="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium"
          @click="startCreate"
        >
          + Registrar mascota
        </button>
      </div>

      <!-- Aviso del perfil de refugio (HU-21): no bloquea, orienta -->
      <div
        v-if="petStore.shelterError"
        class="max-w-2xl mx-auto mb-6 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg"
      >
        ⚠️ {{ petStore.shelterError }}
      </div>

      <!-- Bloqueo: el refugio aún no tiene perfil (shelters) completado -->
      <div
        v-if="!hasShelter && !petStore.shelterError"
        class="max-w-2xl mx-auto mt-8 px-4 py-6 bg-amber-50 border border-amber-200 rounded-xl text-center"
      >
        <div class="text-5xl mb-3">🏠</div>
        <h2 class="text-lg font-bold text-gray-900 mb-1">Primero completa tu perfil de refugio</h2>
        <p class="text-sm text-gray-600 max-w-md mx-auto">
          Para registrar mascotas en el catálogo necesitas una ficha de refugio activa
          (nombre y ciudad, como mínimo). Tómate un minuto para llenarla.
        </p>
        <router-link
          to="/refugio/perfil"
          class="inline-block mt-4 px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
        >
          Completar mi perfil
        </router-link>
      </div>

      <template v-else>
      <!-- Mensajes -->
      <div v-if="successMsg" class="mb-6 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg">
        ✅ {{ successMsg }}
      </div>
      <div v-if="petStore.error" class="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
        {{ petStore.error }}
      </div>

      <!-- Formulario (crear/editar) -->
      <div v-if="mode !== 'list'" class="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-md">
        <h2 class="text-lg font-bold text-gray-900 mb-1">
          {{ mode === 'edit' ? 'Editar mascota' : 'Nueva mascota' }}
        </h2>
        <p class="text-sm text-gray-500 mb-6">
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
        <div class="flex items-center gap-2 mb-5">
          <label for="f-status" class="text-sm text-gray-600">Estado:</label>
          <select id="f-status" v-model="statusFilter" class="form-select" @change="loadPets">
            <option value="">Todas</option>
            <option value="disponible">Disponible</option>
            <option value="en_proceso">En proceso</option>
            <option value="adoptada">Adoptada</option>
          </select>
        </div>

        <div v-if="petStore.loading && petStore.myPets.length === 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 6" :key="i" class="bg-white rounded-xl shadow-sm p-4 animate-pulse">
            <div class="aspect-[4/3] bg-gray-200 rounded-lg mb-4"></div>
            <div class="h-4 bg-gray-200 rounded mb-2 w-2/3"></div>
            <div class="h-3 bg-gray-200 rounded w-full mb-1"></div>
            <div class="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>

        <div v-else-if="petStore.myPets.length === 0" class="text-center py-16 bg-white rounded-xl shadow-sm">
          <div class="text-5xl mb-3">🐾</div>
          <p class="text-gray-600 font-medium">
            {{ statusFilter ? 'No tienes mascotas en ese estado.' : 'Aún no tienes mascotas registradas.' }}
          </p>
          <p class="text-sm text-gray-400 mt-1">Usa el botón "+ Registrar mascota" para empezar.</p>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePetStore } from '../../stores/petStore'
import PetCard from '../../components/pets/PetCard.vue'
import PetForm from '../../components/pets/PetForm.vue'

const router = useRouter()
const petStore = usePetStore()

const mode = ref('list') // 'list' | 'new' | 'edit'
const editingPet = ref(null)
const successMsg = ref('')
const formError = ref('')
const shelter = ref(null)
const hasShelter = ref(false)
const statusFilter = ref('')

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
      else successMsg.value = 'Mascota actualizada correctamente.'
    } else if (result.success) {
      successMsg.value = 'Mascota actualizada correctamente.'
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
  @apply appearance-none block px-3 py-2 border border-gray-300 text-gray-900 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500;
}
</style>
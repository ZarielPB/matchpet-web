<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-2xl mx-auto px-4 py-8">
      <button
        type="button"
        class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        @click="router.push('/refugio/dashboard')"
      >
        ← Volver al panel
      </button>

      <div class="bg-white p-6 sm:p-8 rounded-xl shadow-md">
        <h1 class="text-2xl font-bold text-emerald-600">Perfil del Refugio 🏠</h1>
        <p class="text-sm text-gray-500 mt-1">
          La información que publiques aquí aparecerá junto a tus mascotas en el catálogo.
        </p>

        <form class="mt-8 space-y-5" novalidate @submit.prevent="handleSave">
          <div>
            <label for="shelter-name" class="block text-sm font-medium text-gray-700 mb-1">
              Nombre del refugio *
            </label>
            <input
              id="shelter-name"
              v-model="form.shelter_name"
              type="text"
              required
              class="input"
              :class="{ 'border-red-400': errors.shelter_name }"
              placeholder="Ej. Fundación Patitas"
            />
            <p v-if="errors.shelter_name" class="text-xs text-red-500 mt-1">{{ errors.shelter_name }}</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label for="shelter-city" class="block text-sm font-medium text-gray-700 mb-1">Ciudad *</label>
              <input
                id="shelter-city"
                v-model="form.city"
                type="text"
                required
                class="input"
                :class="{ 'border-red-400': errors.city }"
                placeholder="Ej. La Paz"
              />
              <p v-if="errors.city" class="text-xs text-red-500 mt-1">{{ errors.city }}</p>
            </div>

            <div>
              <label for="shelter-phone" class="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                id="shelter-phone"
                v-model="form.phone"
                type="tel"
                class="input"
                placeholder="Ej. 70000000"
              />
            </div>
          </div>

          <div>
            <label for="shelter-address" class="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input
              id="shelter-address"
              v-model="form.address"
              type="text"
              class="input"
              placeholder="Ej. Av. Costanera #123"
            />
          </div>

          <div>
            <label for="shelter-description" class="block text-sm font-medium text-gray-700 mb-1">
              Descripción <span class="text-red-500">*</span>
            </label>
            <textarea
              id="shelter-description"
              v-model="form.description"
              rows="3"
              required
              class="input resize-none"
              :class="{ 'border-red-400': errors.description }"
              placeholder="Cuéntanos sobre tu organización y su misión (mínimo 20 caracteres)"
            ></textarea>
            <p v-if="errors.description" class="text-xs text-red-500 mt-1">{{ errors.description }}</p>
          </div>

          <div>
            <label for="shelter-cover" class="block text-sm font-medium text-gray-700 mb-1">
              Foto de portada (opcional, máx. 2 MB)
            </label>
            <input
              id="shelter-cover"
              type="file"
              accept="image/*"
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              @change="onCoverChange"
            />
            <p v-if="errors.cover" class="text-xs text-red-500 mt-1">{{ errors.cover }}</p>

            <img
              v-if="coverPreview"
              :src="coverPreview"
              alt="Vista previa de la portada"
              class="mt-3 w-full max-h-60 object-cover rounded-lg border border-gray-200"
            />
            <div v-else-if="currentCover" class="mt-3 flex items-center gap-3">
              <img
                :src="currentCover"
                alt="Portada actual del refugio"
                class="w-40 h-28 object-cover rounded-lg border border-gray-200"
              />
              <button
                type="button"
                class="text-xs text-red-500 hover:underline"
                @click="clearCover"
              >
                Quitar imagen
              </button>
            </div>
          </div>

          <p v-if="storeError" class="text-red-500 text-sm text-center">{{ storeError }}</p>
          <p v-if="successMsg" class="text-emerald-600 text-sm text-center">{{ successMsg }}</p>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            {{ loading ? 'Guardando...' : 'Guardar perfil del refugio' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'
import { usePetStore } from '../../stores/petStore'
import { supabase } from '../../services/supabaseClient'
import { translateDbError } from '../../utils/errorMessages'

const router = useRouter()
const authStore = useAuthStore()
const petStore = usePetStore()

const form = reactive({
  shelter_name: '',
  city: '',
  address: '',
  description: '',
  phone: ''
})
const errors = ref({})
const loading = ref(false)
const storeError = ref('')
const successMsg = ref('')
const savedCoverUrl = ref('')
const coverFile = ref(null)
const coverPreview = ref('')

const currentCover = computed(() => coverPreview.value || savedCoverUrl.value || null)

function userId() {
  return authStore.user?.id
}

function applyDefaults(data) {
  const meta = authStore.user?.user_metadata || {}
  form.shelter_name = data?.shelter_name || meta.shelter_name || ''
  form.city = data?.city || meta.city || ''
  form.address = data?.address || meta.address || ''
  form.description = data?.description || ''
  form.phone = data?.phone || meta.phone || ''
  savedCoverUrl.value = data?.cover_image_url || ''
}

async function loadShelter() {
  const { data, error } = await supabase
    .from('shelters')
    .select('*')
    .eq('user_id', userId())
    .maybeSingle()

  if (error) {
    storeError.value = translateDbError(error)
    return
  }
  applyDefaults(data || null)
}

onMounted(async () => {
  await authStore.getSession()
  await loadShelter()
})

function onCoverChange(event) {
  const selected = event.target.files?.[0] || null
  if (!selected) return

  if (!selected.type?.startsWith('image/')) {
    errors.value = { ...errors.value, cover: 'El archivo debe ser una imagen.' }
    event.target.value = ''
    return
  }
  if (selected.size > 2 * 1024 * 1024) {
    errors.value = { ...errors.value, cover: 'La imagen no debe superar los 2 MB.' }
    event.target.value = ''
    return
  }

  revokePreview()
  coverFile.value = selected
  coverPreview.value = URL.createObjectURL(selected)
  const { cover, ...rest } = errors.value
  errors.value = rest
}

function clearCover() {
  revokePreview()
  coverFile.value = null
  coverPreview.value = ''
  savedCoverUrl.value = ''
}

function revokePreview() {
  if (coverPreview.value) URL.revokeObjectURL(coverPreview.value)
}

onBeforeUnmount(revokePreview)

async function uploadCover() {
  if (!coverFile.value) return savedCoverUrl.value

  const fileExt = coverFile.value.name.split('.').pop() || 'jpg'
  const storagePath = `${userId()}/cover_${crypto.randomUUID()}.${fileExt}`
  const { error: uploadError } = await supabase.storage
    .from('shelter-images')
    .upload(storagePath, coverFile.value, { upsert: false })
  if (uploadError) throw uploadError

  const { data } = supabase.storage
    .from('shelter-images')
    .getPublicUrl(storagePath)
  return data.publicUrl
}

function validate() {
  const e = {}
  if (!form.shelter_name.trim()) e.shelter_name = 'Indica el nombre del refugio.'
  if (!form.city.trim()) e.city = 'Indica la ciudad.'
  // HU-14: la descripción es obligatoria y mínima (>= 20 caracteres).
  if (form.description.trim().length < 20) {
    e.description = 'Describe el refugio con al menos 20 caracteres.'
  }
  errors.value = e
  return Object.keys(e).length === 0
}

async function handleSave() {
  successMsg.value = ''
  storeError.value = ''
  if (!validate()) return
  loading.value = true
  try {
    const coverUrl = await uploadCover()

    const { error } = await supabase
      .from('shelters')
      .upsert({
        user_id: userId(),
        shelter_name: form.shelter_name.trim(),
        city: form.city.trim(),
        address: form.address.trim() || null,
        description: form.description.trim() || null,
        phone: form.phone.trim() || null,
        cover_image_url: coverUrl || null
      }, { onConflict: 'user_id' })
    if (error) throw error

    saveCoverUrlState(coverUrl)
    petStore.invalidateShelter()
    successMsg.value = '¡Perfil del refugio guardado correctamente!'
  } catch (e) {
    storeError.value = translateDbError(e)
  } finally {
    loading.value = false
  }
}

function saveCoverUrlState(coverUrl) {
  savedCoverUrl.value = coverUrl || savedCoverUrl.value
  coverFile.value = null
  coverPreview.value = ''
}
</script>

<style scoped>
.input {
  @apply appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white;
}
</style>
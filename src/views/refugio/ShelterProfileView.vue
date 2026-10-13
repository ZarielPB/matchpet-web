<template>
  <DashboardLayout role="refugio" title="Perfil del Refugio">
    <div class="mx-auto max-w-3xl">
      <div class="overflow-hidden rounded-2xl border border-[#A3AEB9]/20 bg-white shadow-sm">
        <!-- Cabecera: portada -->
        <div class="relative h-48 w-full overflow-hidden bg-[#A3AEB9]/20 sm:h-64">
          <img
            v-if="currentCover"
            :src="currentCover"
            alt="Portada del refugio"
            class="absolute inset-0 h-full w-full object-cover"
          />
          <div v-else class="absolute inset-0 bg-gradient-to-br from-[#FCD8B8] to-[#E1A16C]/50">
            <span
              class="material-symbols-outlined absolute right-6 top-6 select-none text-[72px] leading-none text-white/50"
              style="font-variation-settings: 'FILL' 1"
              aria-hidden="true"
            >
              home_work
            </span>
          </div>
          <div class="absolute inset-0 bg-gradient-to-t from-[#040404]/50 to-transparent"></div>

          <!-- Botón superpuesto: cambiar portada -->
          <label
            for="shelter-cover"
            class="absolute bottom-4 right-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#040404]/70 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors duration-300 hover:bg-[#BA8C71]"
          >
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">photo_camera</span>
            Cambiar portada
          </label>
          <input
            id="shelter-cover"
            type="file"
            accept="image/*"
            class="sr-only"
            @change="onCoverChange"
          />

          <button
            v-if="currentCover"
            type="button"
            class="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-xl bg-[#040404]/60 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-colors duration-300 hover:bg-[#B3261E]"
            @click="clearCover"
          >
            <span class="material-symbols-outlined text-[16px]" aria-hidden="true">delete</span>
            Quitar
          </button>
        </div>

        <!-- Cuerpo -->
        <div class="relative px-6 pb-8 pt-16 sm:px-8 sm:pt-20">
          <!-- Avatar superpuesto -->
          <div
            class="absolute -top-12 left-6 flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-[#FCD8B8] text-3xl font-black text-[#BA8C71] shadow-md sm:-top-16 sm:left-8 sm:h-32 sm:w-32 sm:text-4xl"
          >
            {{ shelterInitial }}
          </div>

          <h1 class="text-2xl font-black text-[#040404]">
            {{ form.shelter_name || 'Perfil del Refugio' }}
          </h1>
          <p class="mt-1 text-sm text-ink-soft">
            La información que publiques aquí aparecerá junto a tus mascotas en el catálogo.
          </p>
          <p v-if="errors.cover" class="mt-2 text-xs text-alert">{{ errors.cover }}</p>

          <form class="mt-8 space-y-8" novalidate @submit.prevent="handleSave">
            <!-- Información Básica -->
            <section>
              <h2 class="mb-3 text-sm font-bold uppercase tracking-wide text-[#BA8C71]">Información Básica</h2>
              <div class="space-y-5">
                <div>
                  <label for="shelter-name" class="form-label">Nombre del refugio *</label>
                  <input
                    id="shelter-name"
                    v-model="form.shelter_name"
                    type="text"
                    required
                    class="form-input"
                    :class="{ '!border-alert': errors.shelter_name }"
                    placeholder="Ej. Fundación Patitas"
                  />
                  <p v-if="errors.shelter_name" class="mt-1 text-xs text-alert">{{ errors.shelter_name }}</p>
                </div>

                <div>
                  <label for="shelter-description" class="form-label">
                    Descripción <span class="text-[#BA8C71]">*</span>
                  </label>
                  <textarea
                    id="shelter-description"
                    v-model="form.description"
                    rows="3"
                    required
                    class="form-input resize-none"
                    :class="{ '!border-alert': errors.description }"
                    placeholder="Cuéntanos sobre tu organización y su misión (mínimo 20 caracteres)"
                  ></textarea>
                  <p v-if="errors.description" class="mt-1 text-xs text-alert">{{ errors.description }}</p>
                </div>
              </div>
            </section>

            <!-- Ubicación y Contacto -->
            <section>
              <h2 class="mb-3 text-sm font-bold uppercase tracking-wide text-[#BA8C71]">Ubicación y Contacto</h2>
              <div class="space-y-5">
                <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label for="shelter-city" class="form-label">Ciudad *</label>
                    <input
                      id="shelter-city"
                      v-model="form.city"
                      type="text"
                      required
                      class="form-input"
                      :class="{ '!border-alert': errors.city }"
                      placeholder="Ej. La Paz"
                    />
                    <p v-if="errors.city" class="mt-1 text-xs text-alert">{{ errors.city }}</p>
                  </div>

                  <div>
                    <label for="shelter-phone" class="form-label">Teléfono</label>
                    <input
                      id="shelter-phone"
                      v-model="form.phone"
                      type="tel"
                      class="form-input"
                      placeholder="Ej. 70000000"
                    />
                  </div>
                </div>

                <div>
                  <label for="shelter-address" class="form-label">Dirección</label>
                  <input
                    id="shelter-address"
                    v-model="form.address"
                    type="text"
                    class="form-input"
                    placeholder="Ej. Av. Costanera #123"
                  />
                </div>
              </div>
            </section>

            <!-- Feedback -->
            <p
              v-if="storeError"
              class="rounded-xl border border-[#B3261E]/30 bg-[#B3261E]/10 p-4 text-sm text-alert"
            >
              {{ storeError }}
            </p>
            <div
              v-if="successMsg"
              class="rounded-xl border border-[#E1A16C]/30 bg-[#E1A16C]/10 p-4 text-sm text-[#040404]"
            >
              {{ successMsg }}
            </div>

            <!-- Acciones -->
            <div class="flex flex-col gap-3 border-t border-[#A3AEB9]/20 pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                class="w-full rounded-xl border border-[#A3AEB9]/40 px-6 py-3 font-semibold text-[#040404] transition-all duration-300 hover:bg-[#FCD8B8]/40 sm:w-auto"
                @click="router.push('/refugio/dashboard')"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="loading"
                class="w-full rounded-xl bg-[#BA8C71] px-6 py-3 font-bold text-white shadow-sm transition-all duration-300 hover:bg-[#E1A16C] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {{ loading ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'
import { usePetStore } from '../../stores/petStore'
import { supabase } from '../../services/supabaseClient'
import { translateDbError } from '../../utils/errorMessages'
import DashboardLayout from '../../components/layout/DashboardLayout.vue'

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
const shelterInitial = computed(() => {
  const name = form.shelter_name.trim()
  return name ? name.charAt(0).toUpperCase() : '🏠'
})

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
.form-input {
  @apply block w-full appearance-none rounded-xl border border-[#A3AEB9]/40 bg-white px-3.5 py-2.5 text-sm text-[#040404] placeholder-[#A3AEB9] shadow-sm transition focus:border-[#BA8C71] focus:outline-none focus:ring-2 focus:ring-[#BA8C71]/20;
}
.form-label {
  @apply mb-1.5 block text-sm font-semibold text-[#040404];
}
</style>

<template>
  <DashboardLayout role="adoptante" title="Mi Perfil">
    <div class="mx-auto max-w-3xl">
      <div class="overflow-hidden rounded-2xl border border-[#A3AEB9]/20 bg-white shadow-sm">
        <!-- Cabecera: portada decorativa -->
        <div class="relative h-48 w-full overflow-hidden bg-gradient-to-br from-[#FCD8B8] to-[#E1A16C]/50 sm:h-64">
          <span
            class="material-symbols-outlined absolute -right-4 -top-4 select-none text-[140px] leading-none text-white/40"
            style="font-variation-settings: 'FILL' 1"
            aria-hidden="true"
          >
            pets
          </span>
          <div class="absolute inset-0 bg-gradient-to-t from-[#040404]/25 to-transparent"></div>
        </div>

        <!-- Cuerpo -->
        <div class="relative px-6 pb-8 pt-16 sm:px-8 sm:pt-20">
          <!-- Avatar superpuesto -->
          <div
            class="absolute -top-12 left-6 flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-[#FCD8B8] text-3xl font-black text-[#BA8C71] shadow-md sm:-top-16 sm:left-8 sm:h-32 sm:w-32 sm:text-4xl"
          >
            {{ initials }}
          </div>

          <h1 class="text-2xl font-black text-[#040404]">
            {{ fullName || 'Mi Perfil de Adoptante' }}
          </h1>
          <p class="mt-1 text-sm text-ink-soft">
            Cuéntanos sobre tu hogar para encontrar a la mascota ideal para ti.
          </p>

          <form class="mt-8 space-y-8" novalidate @submit.prevent="handleSave">
            <!-- Información Básica -->
            <section>
              <h2 class="mb-3 text-sm font-bold uppercase tracking-wide text-[#BA8C71]">Información Básica</h2>
              <div class="space-y-5">
                <div>
                  <label for="full-name" class="form-label">Nombre completo *</label>
                  <input
                    id="full-name"
                    v-model="fullName"
                    type="text"
                    required
                    class="form-input"
                    placeholder="Tu nombre"
                  />
                </div>

                <div>
                  <label for="experience-years" class="form-label">Años de experiencia con mascotas *</label>
                  <input
                    id="experience-years"
                    v-model.number="form.experience_years"
                    type="number"
                    min="0"
                    required
                    class="form-input"
                    :class="{ '!border-alert': errors.experience_years }"
                    placeholder="Ej. 5"
                  />
                  <p v-if="errors.experience_years" class="mt-1 text-xs text-alert">{{ errors.experience_years }}</p>
                </div>
              </div>
            </section>

            <!-- Ubicación y Contacto -->
            <section>
              <h2 class="mb-3 text-sm font-bold uppercase tracking-wide text-[#BA8C71]">Ubicación y Contacto</h2>
              <div>
                <label for="city" class="form-label">Ciudad *</label>
                <input
                  id="city"
                  v-model="form.city"
                  type="text"
                  class="form-input"
                  :class="{ '!border-alert': errors.city }"
                  placeholder="Ej. La Paz"
                />
                <p v-if="errors.city" class="mt-1 text-xs text-alert">{{ errors.city }}</p>
              </div>
            </section>

            <!-- Vivienda y Convivencia -->
            <section>
              <h2 class="mb-3 text-sm font-bold uppercase tracking-wide text-[#BA8C71]">Vivienda y Convivencia</h2>
              <div class="space-y-5">
                <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label for="housing-type" class="form-label">Tipo de vivienda *</label>
                    <select
                      id="housing-type"
                      v-model="form.housing_type"
                      required
                      class="form-input"
                      :class="{ '!border-alert': errors.housing_type }"
                    >
                      <option value="" disabled>Selecciona una opción</option>
                      <option value="casa">Casa</option>
                      <option value="departamento">Apartamento</option>
                    </select>
                    <p v-if="errors.housing_type" class="mt-1 text-xs text-alert">{{ errors.housing_type }}</p>
                  </div>

                  <div>
                    <label class="form-label">¿Tienes patio/jardín?</label>
                    <div class="flex gap-6 pt-2">
                      <label class="inline-flex items-center gap-2 text-sm text-[#040404]">
                        <input v-model="form.has_yard" type="radio" value="true" class="accent-[#BA8C71]" />
                        Sí
                      </label>
                      <label class="inline-flex items-center gap-2 text-sm text-[#040404]">
                        <input v-model="form.has_yard" type="radio" value="false" class="accent-[#BA8C71]" />
                        No
                      </label>
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label class="form-label">¿Tienes hijos?</label>
                    <div class="flex gap-6 pt-2">
                      <label class="inline-flex items-center gap-2 text-sm text-[#040404]">
                        <input v-model="form.has_kids" type="radio" value="true" class="accent-[#BA8C71]" />
                        Sí
                      </label>
                      <label class="inline-flex items-center gap-2 text-sm text-[#040404]">
                        <input v-model="form.has_kids" type="radio" value="false" class="accent-[#BA8C71]" />
                        No
                      </label>
                    </div>
                  </div>

                  <div>
                    <label class="form-label">¿Tienes otras mascotas?</label>
                    <div class="flex gap-6 pt-2">
                      <label class="inline-flex items-center gap-2 text-sm text-[#040404]">
                        <input v-model="form.has_other_pets" type="radio" value="true" class="accent-[#BA8C71]" />
                        Sí
                      </label>
                      <label class="inline-flex items-center gap-2 text-sm text-[#040404]">
                        <input v-model="form.has_other_pets" type="radio" value="false" class="accent-[#BA8C71]" />
                        No
                      </label>
                    </div>
                  </div>
                </div>

                <div v-if="form.has_kids === 'true'">
                  <label for="kids-ages" class="form-label">Edades de los hijos</label>
                  <input
                    id="kids-ages"
                    v-model="form.kids_ages"
                    type="text"
                    class="form-input"
                    placeholder="Ej. 4, 7 y 10 años"
                  />
                </div>

                <div v-if="form.has_other_pets === 'true'">
                  <label for="other-pets-details" class="form-label">Detalles de tus mascotas</label>
                  <textarea
                    id="other-pets-details"
                    v-model="form.other_pets_details"
                    rows="2"
                    class="form-input resize-none"
                    placeholder="Ej. Un perro mestizo de 3 años, sociable"
                  ></textarea>
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
                @click="router.push('/adoptante/dashboard')"
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../services/supabaseClient'
import { translateDbError } from '../../utils/errorMessages'
import DashboardLayout from '../../components/layout/DashboardLayout.vue'

const router = useRouter()
const authStore = useAuthStore()

const fullName = ref(authStore.profile?.full_name || '')

const initials = computed(() => {
  const name = fullName.value.trim()
  if (!name) return '🐾'
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
})

const form = reactive({
  city: '',
  housing_type: '',
  has_yard: 'false',
  has_kids: 'false',
  kids_ages: '',
  has_other_pets: 'false',
  other_pets_details: '',
  experience_years: 0
})
const errors = ref({})
const loading = ref(false)
const storeError = ref('')
const successMsg = ref('')

function userId() {
  return authStore.user?.id
}

async function loadProfile() {
  const { data, error } = await supabase
    .from('adopter_profiles')
    .select('*')
    .eq('user_id', userId())
    .maybeSingle()

  if (error) {
    storeError.value = translateDbError(error)
    return
  }
  if (data) {
    form.has_yard = data.has_yard ? 'true' : 'false'
    form.has_kids = data.has_kids ? 'true' : 'false'
    form.kids_ages = data.kids_ages || ''
    form.has_other_pets = data.has_other_pets ? 'true' : 'false'
    form.other_pets_details = data.other_pets_details || ''
    form.experience_years = data.experience_years != null ? data.experience_years : 0
    form.city = data.city || ''
    form.housing_type = data.housing_type || ''
  }
}

onMounted(async () => {
  await authStore.getSession()
  fullName.value = authStore.profile?.full_name || ''
  await loadProfile()
})

function validate() {
  const e = {}
  if (!form.city.trim()) e.city = 'Indica tu ciudad.'
  if (!form.housing_type) e.housing_type = 'Selecciona el tipo de vivienda.'
  if (form.experience_years == null || form.experience_years < 0 || Number.isNaN(Number(form.experience_years))) {
    e.experience_years = 'Ingresa un número de años válido.'
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
    const { error } = await supabase
      .from('adopter_profiles')
      .upsert({
        user_id: userId(),
        has_yard: form.has_yard === 'true',
        has_kids: form.has_kids === 'true',
        kids_ages: form.kids_ages.trim() || null,
        has_other_pets: form.has_other_pets === 'true',
        other_pets_details: form.other_pets_details.trim() || null,
        experience_years: Math.max(0, Number(form.experience_years) || 0),
        city: form.city.trim(),
        housing_type: form.housing_type
      }, { onConflict: 'user_id' })
    if (error) throw error
    successMsg.value = '¡Perfil guardado correctamente!'
  } catch (e) {
    storeError.value = translateDbError(e)
  } finally {
    loading.value = false
  }
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

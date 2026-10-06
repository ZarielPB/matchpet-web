<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-2xl mx-auto px-4 py-8">
      <button
        type="button"
        class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        @click="router.push('/adoptante/dashboard')"
      >
        ← Volver al panel
      </button>

      <div class="bg-white p-6 sm:p-8 rounded-xl shadow-md">
        <h1 class="text-2xl font-bold text-indigo-600">Mi Perfil de Adoptante 🐾</h1>
        <p class="text-sm text-gray-500 mt-1">
          Cuéntanos sobre tu hogar para encontrar a la mascota ideal para ti.
        </p>

        <form class="mt-8 space-y-5" novalidate @submit.prevent="handleSave">
          <div>
            <label for="full-name" class="block text-sm font-medium text-gray-700 mb-1">
              Nombre completo *
            </label>
            <input
              id="full-name"
              v-model="fullName"
              type="text"
              required
              class="input"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label for="city" class="block text-sm font-medium text-gray-700 mb-1">Ciudad *</label>
            <input
              id="city"
              v-model="form.city"
              type="text"
              class="input"
              :class="{ 'border-red-400': errors.city }"
              placeholder="Ej. La Paz"
            />
            <p v-if="errors.city" class="text-xs text-red-500 mt-1">{{ errors.city }}</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label for="housing-type" class="block text-sm font-medium text-gray-700 mb-1">
                Tipo de vivienda *
              </label>
              <select
                id="housing-type"
                v-model="form.housing_type"
                required
                class="input"
                :class="{ 'border-red-400': errors.housing_type }"
              >
                <option value="" disabled>Selecciona una opción</option>
                <option value="casa">Casa</option>
                <option value="departamento">Apartamento</option>
              </select>
              <p v-if="errors.housing_type" class="text-xs text-red-500 mt-1">{{ errors.housing_type }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">¿Tienes patio/jardín?</label>
              <div class="flex gap-6">
                <label class="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input v-model="form.has_yard" type="radio" value="true" class="accent-indigo-600" />
                  Sí
                </label>
                <label class="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input v-model="form.has_yard" type="radio" value="false" class="accent-indigo-600" />
                  No
                </label>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">¿Tienes hijos?</label>
              <div class="flex gap-6">
                <label class="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input v-model="form.has_kids" type="radio" value="true" class="accent-indigo-600" />
                  Sí
                </label>
                <label class="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input v-model="form.has_kids" type="radio" value="false" class="accent-indigo-600" />
                  No
                </label>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">¿Tienes otras mascotas?</label>
              <div class="flex gap-6">
                <label class="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input v-model="form.has_other_pets" type="radio" value="true" class="accent-indigo-600" />
                  Sí
                </label>
                <label class="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input v-model="form.has_other_pets" type="radio" value="false" class="accent-indigo-600" />
                  No
                </label>
              </div>
            </div>
          </div>

          <div v-if="form.has_kids === 'true'">
            <label for="kids-ages" class="block text-sm font-medium text-gray-700 mb-1">
              Edades de los hijos
            </label>
            <input
              id="kids-ages"
              v-model="form.kids_ages"
              type="text"
              class="input"
              placeholder="Ej. 4, 7 y 10 años"
            />
          </div>

          <div v-if="form.has_other_pets === 'true'">
            <label for="other-pets-details" class="block text-sm font-medium text-gray-700 mb-1">
              Detalles de tus mascotas
            </label>
            <textarea
              id="other-pets-details"
              v-model="form.other_pets_details"
              rows="2"
              class="input resize-none"
              placeholder="Ej. Un perro mestizo de 3 años, sociable"
            ></textarea>
          </div>

          <div>
            <label for="experience-years" class="block text-sm font-medium text-gray-700 mb-1">
              Años de experiencia con mascotas *
            </label>
            <input
              id="experience-years"
              v-model.number="form.experience_years"
              type="number"
              min="0"
              required
              class="input"
              :class="{ 'border-red-400': errors.experience_years }"
              placeholder="Ej. 5"
            />
            <p v-if="errors.experience_years" class="text-xs text-red-500 mt-1">{{ errors.experience_years }}</p>
          </div>

          <p v-if="storeError" class="text-red-500 text-sm text-center">{{ storeError }}</p>
          <p v-if="successMsg" class="text-emerald-600 text-sm text-center">{{ successMsg }}</p>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {{ loading ? 'Guardando...' : 'Guardar mi perfil' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../services/supabaseClient'
import { translateDbError } from '../../utils/errorMessages'

const router = useRouter()
const authStore = useAuthStore()

const fullName = ref(authStore.profile?.full_name || '')

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
.input {
  @apply appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white;
}
</style>
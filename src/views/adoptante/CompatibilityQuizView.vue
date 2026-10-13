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
      <h1 class="text-2xl font-bold text-gray-900">Cuestionario de estilo de vida</h1>
      <p class="text-sm text-gray-500 mt-1 mb-4">
        Con tus respuestas calculamos qué mascotas son más compatibles contigo.
      </p>

      <div
        v-if="route.query.from === 'recomendaciones'"
        class="mb-4 px-4 py-3 bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm rounded-lg"
      >
        Para ver tus recomendaciones primero necesitamos conocerte: completa este cuestionario.
      </div>

      <div
        v-if="!authStore.hasAdopterProfile && !loadingInitial"
        class="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg"
      >
        Aún no completaste tu perfil de adoptante (niños, otras mascotas y experiencia también cuentan para el match).
        <router-link to="/adoptante/perfil" class="underline font-medium">Completar perfil</router-link>
      </div>

      <!-- Barra de progreso (HU-30 CA#4) -->
      <div class="mb-6">
        <div class="flex justify-between text-xs text-gray-500 mb-1">
          <span>Paso {{ step }} de 2 · {{ stepTitles[step - 1] }}</span>
          <span>{{ answered }} de {{ TOTAL_QUESTIONS }} preguntas respondidas</span>
        </div>
        <div
          class="h-2 bg-gray-200 rounded-full overflow-hidden"
          role="progressbar"
          :aria-valuenow="answered"
          aria-valuemin="0"
          :aria-valuemax="TOTAL_QUESTIONS"
        >
          <div class="h-full bg-indigo-600 transition-all" :style="{ width: `${(answered / TOTAL_QUESTIONS) * 100}%` }"></div>
        </div>
      </div>

      <div v-if="loadingInitial" class="text-center py-12 text-gray-500">Cargando…</div>

      <form v-else class="bg-white rounded-xl shadow-sm p-6 space-y-6" novalidate @submit.prevent="handleSubmit">
        <!-- Paso 1: Tu hogar -->
        <template v-if="step === 1">
          <fieldset>
            <legend class="font-medium text-gray-900 mb-2">🏠 ¿Qué tipo de espacio tienes? *</legend>
            <div class="grid grid-cols-2 gap-3">
              <label v-for="o in spaceOptions" :key="o.value" :class="optionClass(form.space_type === o.value)">
                <input v-model="form.space_type" type="radio" name="space" :value="o.value" class="sr-only" />
                <span class="text-2xl">{{ o.icon }}</span>
                <span class="text-sm font-medium">{{ o.label }}</span>
              </label>
            </div>
            <p v-if="errors.space_type" class="text-xs text-red-500 mt-1">{{ errors.space_type }}</p>
          </fieldset>

          <fieldset>
            <legend class="font-medium text-gray-900 mb-2">🐕 ¿Qué tamaño de mascota prefieres? *</legend>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label v-for="o in sizeOptions" :key="o.value" :class="optionClass(form.preferred === o.value)">
                <input v-model="form.preferred" type="radio" name="preferred" :value="o.value" class="sr-only" />
                <span class="text-sm font-medium">{{ o.label }}</span>
              </label>
            </div>
            <p v-if="errors.preferred" class="text-xs text-red-500 mt-1">{{ errors.preferred }}</p>
          </fieldset>
        </template>

        <!-- Paso 2: Tu rutina -->
        <template v-else>
          <fieldset>
            <legend class="font-medium text-gray-900 mb-2">⏰ ¿Cuántas horas al día estás en casa? *</legend>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label v-for="o in hoursOptions" :key="o.value" :class="optionClass(form.hours_at_home === o.value)">
                <input v-model="form.hours_at_home" type="radio" name="hours" :value="o.value" class="sr-only" />
                <span class="text-sm font-medium">{{ o.label }}</span>
              </label>
            </div>
            <p v-if="errors.hours_at_home" class="text-xs text-red-500 mt-1">{{ errors.hours_at_home }}</p>
          </fieldset>

          <fieldset>
            <legend class="font-medium text-gray-900 mb-2">🏃 ¿Qué tan activo eres? *</legend>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label v-for="o in activityOptions" :key="o.value" :class="optionClass(form.activity_level === o.value)">
                <input v-model="form.activity_level" type="radio" name="activity" :value="o.value" class="sr-only" />
                <span class="text-2xl">{{ o.icon }}</span>
                <span class="text-sm font-medium">{{ o.label }}</span>
              </label>
            </div>
            <p v-if="errors.activity_level" class="text-xs text-red-500 mt-1">{{ errors.activity_level }}</p>
          </fieldset>
        </template>

        <p v-if="serverError" class="text-red-500 text-sm text-center">{{ serverError }}</p>
        <p v-if="successMsg" class="text-emerald-600 text-sm text-center font-medium">{{ successMsg }}</p>

        <div class="flex gap-3">
          <button
            v-if="step === 2"
            type="button"
            class="flex-1 py-2.5 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            @click="step = 1"
          >
            Atrás
          </button>
          <button
            v-if="step === 1"
            type="button"
            class="flex-1 py-2.5 px-4 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            @click="goNext"
          >
            Siguiente
          </button>
          <button
            v-else
            type="submit"
            :disabled="saving || !!successMsg"
            class="flex-1 py-2.5 px-4 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
          >
            {{ saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Finalizar' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'
import { useCompatibilityStore } from '../../stores/compatibilityStore'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const compatibilityStore = useCompatibilityStore()

const TOTAL_QUESTIONS = 4
const stepTitles = ['Tu hogar', 'Tu rutina']

const spaceOptions = [
  { value: 'pequeño', label: 'Pequeño (departamento)', icon: '🏢' },
  { value: 'amplio', label: 'Amplio (casa / patio)', icon: '🏡' }
]
const sizeOptions = [
  { value: 'pequeño', label: 'Pequeño' },
  { value: 'mediano', label: 'Mediano' },
  { value: 'grande', label: 'Grande' },
  { value: 'ninguna', label: 'Sin preferencia' }
]
const hoursOptions = [
  { value: 'menos_de_4', label: 'Menos de 4 h' },
  { value: '4_a_8', label: 'Entre 4 y 8 h' },
  { value: 'mas_de_8', label: 'Más de 8 h' }
]
const activityOptions = [
  { value: 'bajo', label: 'Tranquilo', icon: '🛋️' },
  { value: 'moderado', label: 'Moderado', icon: '🚶' },
  { value: 'alto', label: 'Muy activo', icon: '🏃' }
]

const form = reactive({ space_type: '', preferred: '', hours_at_home: '', activity_level: '' })
const errors = ref({})
const step = ref(1)
const loadingInitial = ref(true)
const saving = ref(false)
const isEdit = ref(false)
const serverError = ref('')
const successMsg = ref('')

const answered = computed(() => Object.values(form).filter(Boolean).length)

function optionClass(active) {
  return [
    'flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 cursor-pointer text-center transition focus-within:ring-2 focus-within:ring-indigo-400',
    active ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-indigo-300 text-gray-700'
  ]
}

// HU-30 CA#3: todas obligatorias para avanzar / finalizar.
function validateStep(n) {
  const e = {}
  const msg = 'Selecciona una opción.'
  if (n === 1) {
    if (!form.space_type) e.space_type = msg
    if (!form.preferred) e.preferred = msg
  } else {
    if (!form.hours_at_home) e.hours_at_home = msg
    if (!form.activity_level) e.activity_level = msg
  }
  errors.value = e
  return Object.keys(e).length === 0
}

function goNext() {
  if (validateStep(1)) step.value = 2
}

async function handleSubmit() {
  serverError.value = ''
  if (!validateStep(1)) { step.value = 1; return }
  if (!validateStep(2)) return
  saving.value = true
  const result = await compatibilityStore.saveAnswers({
    hours_at_home: form.hours_at_home,
    activity_level: form.activity_level,
    space_type: form.space_type,
    preferred_size: form.preferred === 'ninguna' ? null : form.preferred
  })
  saving.value = false
  if (!result.success) {
    serverError.value = result.error
    return
  }
  successMsg.value = '¡Cuestionario completado! Estamos calculando tus mejores matches'
  setTimeout(() => router.push('/adoptante/recomendaciones'), 1500)
}

onMounted(async () => {
  // HU-31 CA#4: precarga de respuestas anteriores.
  const [res] = await Promise.all([compatibilityStore.fetchAnswers(), authStore.loadAdopterProfile()])
  if (res.success && res.data) {
    isEdit.value = true
    form.space_type = res.data.space_type
    form.preferred = res.data.preferred_size || 'ninguna'
    form.hours_at_home = res.data.hours_at_home
    form.activity_level = res.data.activity_level
  } else if (!res.success) {
    serverError.value = res.error
  }
  loadingInitial.value = false
})
</script>

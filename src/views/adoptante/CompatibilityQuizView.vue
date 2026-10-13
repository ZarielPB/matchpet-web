<template>
  <DashboardLayout role="adoptante" title="Cuestionario de estilo de vida">
    <div class="mx-auto max-w-2xl">
      <h1 class="font-display text-2xl font-black text-[#040404]">Cuestionario de estilo de vida</h1>
      <p class="mb-4 mt-1 text-sm text-ink-soft">
        Con tus respuestas calculamos qué mascotas son más compatibles contigo.
      </p>

      <div
        v-if="route.query.from === 'recomendaciones'"
        class="mb-4 rounded-xl border border-[#E1A16C]/40 bg-[#FCD8B8]/40 px-4 py-3 text-sm text-[#040404]"
      >
        Para ver tus recomendaciones primero necesitamos conocerte: completa este cuestionario.
      </div>

      <div
        v-if="!authStore.hasAdopterProfile && !loadingInitial"
        class="mb-4 rounded-xl border border-[#E1A16C]/40 bg-[#E1A16C]/10 px-4 py-3 text-sm text-[#040404]"
      >
        Aún no completaste tu perfil de adoptante (niños, otras mascotas y experiencia también cuentan para el match).
        <router-link to="/adoptante/perfil" class="font-semibold text-[#BA8C71] underline">Completar perfil</router-link>
      </div>

      <!-- Barra de progreso (HU-30 CA#4) -->
      <div class="mb-6">
        <div class="mb-1.5 flex justify-between text-xs font-medium text-ink-soft">
          <span>Paso {{ step }} de 2 · {{ stepTitles[step - 1] }}</span>
          <span>{{ answered }} de {{ TOTAL_QUESTIONS }} respondidas</span>
        </div>
        <div
          class="h-2.5 overflow-hidden rounded-full bg-[#FCD8B8]/60"
          role="progressbar"
          :aria-valuenow="answered"
          aria-valuemin="0"
          :aria-valuemax="TOTAL_QUESTIONS"
        >
          <div
            class="h-full rounded-full bg-gradient-to-r from-[#BA8C71] to-[#E1A16C] transition-all duration-500"
            :style="{ width: `${(answered / TOTAL_QUESTIONS) * 100}%` }"
          ></div>
        </div>
      </div>

      <div v-if="loadingInitial" class="py-12 text-center text-ink-soft">Cargando…</div>

      <form v-else class="rounded-2xl border border-[#A3AEB9]/20 bg-white p-6 shadow-sm" novalidate @submit.prevent="handleSubmit">
        <Transition name="mp-step" mode="out-in">
          <!-- Paso 1: Tu hogar -->
          <div v-if="step === 1" key="s1" class="space-y-6">
            <fieldset>
              <legend class="mb-2 flex items-center gap-2 font-semibold text-[#040404]">
                <span class="material-symbols-outlined text-[22px] text-[#BA8C71]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">home</span>
                ¿Qué tipo de espacio tienes? *
              </legend>
              <div class="grid grid-cols-2 gap-3">
                <label v-for="o in spaceOptions" :key="o.value" :class="optionClass(form.space_type === o.value)">
                  <input v-model="form.space_type" type="radio" name="space" :value="o.value" class="sr-only" />
                  <span class="material-symbols-outlined text-[28px]" aria-hidden="true">{{ o.icon }}</span>
                  <span class="text-sm font-semibold">{{ o.label }}</span>
                </label>
              </div>
              <p v-if="errors.space_type" class="mt-1 text-xs text-alert">{{ errors.space_type }}</p>
            </fieldset>

            <fieldset>
              <legend class="mb-2 flex items-center gap-2 font-semibold text-[#040404]">
                <span class="material-symbols-outlined text-[22px] text-[#BA8C71]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">pets</span>
                ¿Qué tamaño de mascota prefieres? *
              </legend>
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label v-for="o in sizeOptions" :key="o.value" :class="optionClass(form.preferred === o.value)">
                  <input v-model="form.preferred" type="radio" name="preferred" :value="o.value" class="sr-only" />
                  <span class="text-sm font-semibold">{{ o.label }}</span>
                </label>
              </div>
              <p v-if="errors.preferred" class="mt-1 text-xs text-alert">{{ errors.preferred }}</p>
            </fieldset>
          </div>

          <!-- Paso 2: Tu rutina -->
          <div v-else key="s2" class="space-y-6">
            <fieldset>
              <legend class="mb-2 flex items-center gap-2 font-semibold text-[#040404]">
                <span class="material-symbols-outlined text-[22px] text-[#BA8C71]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">schedule</span>
                ¿Cuántas horas al día estás en casa? *
              </legend>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label v-for="o in hoursOptions" :key="o.value" :class="optionClass(form.hours_at_home === o.value)">
                  <input v-model="form.hours_at_home" type="radio" name="hours" :value="o.value" class="sr-only" />
                  <span class="text-sm font-semibold">{{ o.label }}</span>
                </label>
              </div>
              <p v-if="errors.hours_at_home" class="mt-1 text-xs text-alert">{{ errors.hours_at_home }}</p>
            </fieldset>

            <fieldset>
              <legend class="mb-2 flex items-center gap-2 font-semibold text-[#040404]">
                <span class="material-symbols-outlined text-[22px] text-[#BA8C71]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">directions_run</span>
                ¿Qué tan activo eres? *
              </legend>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label v-for="o in activityOptions" :key="o.value" :class="optionClass(form.activity_level === o.value)">
                  <input v-model="form.activity_level" type="radio" name="activity" :value="o.value" class="sr-only" />
                  <span class="material-symbols-outlined text-[28px]" aria-hidden="true">{{ o.icon }}</span>
                  <span class="text-sm font-semibold">{{ o.label }}</span>
                </label>
              </div>
              <p v-if="errors.activity_level" class="mt-1 text-xs text-alert">{{ errors.activity_level }}</p>
            </fieldset>
          </div>
        </Transition>

        <p v-if="serverError" class="mt-5 rounded-xl border border-alert/30 bg-alert-container px-3 py-2 text-center text-sm text-alert" role="alert">{{ serverError }}</p>
        <p v-if="successMsg" class="mp-fade-up mt-5 rounded-xl border border-[#E1A16C]/40 bg-[#FCD8B8]/40 px-3 py-2 text-center text-sm font-semibold text-[#040404]">{{ successMsg }}</p>

        <div class="mt-6 flex gap-3">
          <button v-if="step === 2" type="button" class="mp-btn-ghost flex-1" @click="step = 1">Atrás</button>
          <button v-if="step === 1" type="button" class="mp-btn-primary flex-1" @click="goNext">Siguiente</button>
          <button v-else type="submit" :disabled="saving || !!successMsg" class="mp-btn-primary flex-1">
            {{ saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Finalizar' }}
          </button>
        </div>
      </form>
    </div>
  </DashboardLayout>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DashboardLayout from '../../components/layout/DashboardLayout.vue'
import { useAuthStore } from '../../stores/authStore'
import { useCompatibilityStore } from '../../stores/compatibilityStore'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const compatibilityStore = useCompatibilityStore()

const TOTAL_QUESTIONS = 4
const stepTitles = ['Tu hogar', 'Tu rutina']

const spaceOptions = [
  { value: 'pequeño', label: 'Pequeño (departamento)', icon: 'apartment' },
  { value: 'amplio', label: 'Amplio (casa / patio)', icon: 'cottage' }
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
  { value: 'bajo', label: 'Tranquilo', icon: 'weekend' },
  { value: 'moderado', label: 'Moderado', icon: 'directions_walk' },
  { value: 'alto', label: 'Muy activo', icon: 'directions_run' }
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
    'flex flex-col items-center justify-center gap-1 p-3 min-h-[56px] rounded-xl border-2 cursor-pointer text-center transition-all duration-200 focus-within:ring-2 focus-within:ring-[#BA8C71]/40',
    active ? 'border-[#BA8C71] bg-[#FCD8B8]/50 text-[#040404] shadow-sm' : 'border-[#A3AEB9]/30 hover:border-[#E1A16C] text-[#040404]'
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

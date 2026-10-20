<template>
  <Transition name="mp-modal">
    <div v-if="application" class="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[#040404]/50 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="delivery-title">
      <div class="mp-modal-panel w-full max-w-md rounded-2xl border border-[#A3AEB9]/20 bg-white p-6 shadow-xl">
        <h2 id="delivery-title" class="font-display text-lg font-bold text-[#040404]">Registrar entrega</h2>
        <p class="mt-1 text-sm text-ink-soft">
          Entrega formal de <strong>{{ application.pets?.name }}</strong> a {{ application.profiles?.full_name || 'el adoptante' }}. La mascota quedará como «adoptada».
        </p>

        <label for="delivery-date" class="mp-label mt-4">Fecha de entrega *</label>
        <input
          id="delivery-date"
          v-model="deliveredAt"
          type="date"
          :max="today"
          class="h-12 w-full rounded-xl border border-edge bg-white px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />

        <fieldset class="mt-4">
          <legend class="mp-label">Documentos entregados</legend>
          <label v-for="doc in DOCUMENTS" :key="doc" class="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-ink sm:min-h-0 sm:py-1">
            <input v-model="documents" type="checkbox" :value="doc" class="h-4 w-4 accent-[#BA8C71]" />
            {{ doc }}
          </label>
        </fieldset>

        <label for="delivery-notes" class="mp-label mt-4">Observaciones</label>
        <textarea
          id="delivery-notes"
          v-model="observations"
          rows="3"
          maxlength="500"
          class="w-full rounded-xl border border-edge bg-white px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="Estado de la mascota al entregarla, acuerdos finales…"
        ></textarea>

        <p v-if="error" class="mt-3 rounded-xl border border-alert/30 bg-alert-container px-3 py-2 text-sm text-alert" role="alert">{{ error }}</p>

        <div class="mt-5 flex gap-3">
          <button type="button" class="mp-btn-ghost flex-1" :disabled="submitting" @click="emit('close')">Volver</button>
          <button type="button" class="mp-btn-primary flex-1" :disabled="!deliveredAt || submitting" @click="confirm">
            {{ submitting ? 'Guardando…' : 'Registrar entrega' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useApplicationManagementStore } from '../../stores/applicationManagementStore'

const DOCUMENTS = ['Contrato de adopción firmado', 'Cartilla de vacunación', 'Copia de documento de identidad', 'Comprobante de domicilio']

const props = defineProps({ application: { type: Object, default: null } })
const emit = defineEmits(['close', 'done'])

const store = useApplicationManagementStore()

// Fecha local (toISOString daría la UTC y puede adelantarse un día).
const localToday = () => new Date().toLocaleDateString('en-CA')
const today = localToday()

const deliveredAt = ref(today)
const documents = ref([])
const observations = ref('')
const error = ref('')
const submitting = ref(false)

watch(() => props.application, () => {
  deliveredAt.value = localToday()
  documents.value = []
  observations.value = ''
  error.value = ''
})

async function confirm() {
  submitting.value = true
  error.value = ''
  const result = await store.registerDelivery(props.application.id, deliveredAt.value, documents.value, observations.value.trim())
  submitting.value = false
  if (result.success) emit('done', '¡Entrega registrada! La mascota ya tiene un hogar.')
  else error.value = result.error
}
</script>

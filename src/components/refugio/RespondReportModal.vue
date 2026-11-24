<template>
  <Transition name="mp-modal">
    <div v-if="report" class="fixed inset-0 z-[60] flex items-center justify-center bg-[#040404]/50 px-4" role="dialog" aria-modal="true" aria-labelledby="respond-title">
      <div class="mp-modal-panel max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#A3AEB9]/20 bg-white p-6 shadow-xl">
        <h2 id="respond-title" class="font-display text-lg font-bold text-[#040404]">Responder reporte</h2>
        <p class="mt-1 text-sm text-ink-soft">
          {{ report.profiles?.full_name || 'El adoptante' }} · {{ report.pets?.name }} · {{ report.category }}
        </p>
        <p class="mt-3 whitespace-pre-line rounded-xl border border-[#A3AEB9]/20 bg-[#FCD8B8]/20 px-3 py-2 text-sm text-[#040404]">{{ report.description }}</p>
        <AttachmentPreview :path="report.image_url" />

        <label for="respond-text" class="mp-label mt-4">Orientación para el adoptante *</label>
        <textarea
          id="respond-text"
          v-model="response"
          rows="4"
          maxlength="1000"
          class="w-full rounded-xl border border-edge bg-white px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="Escribe tu respuesta (mínimo 5 caracteres)"
        ></textarea>

        <label for="respond-visit" class="mp-label mt-4">Agendar visita de seguimiento (opcional)</label>
        <input id="respond-visit" v-model="visit" type="date" :min="today" class="h-12 w-full rounded-xl border border-edge bg-white px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />

        <label class="mt-4 flex min-h-[44px] items-center gap-2 text-sm text-[#040404]">
          <input v-model="close" type="checkbox" class="h-4 w-4 accent-[#BA8C71]" />
          Cerrar el caso con esta respuesta
        </label>

        <p v-if="error" class="mt-3 rounded-xl border border-alert/30 bg-alert-container px-3 py-2 text-sm text-alert" role="alert">{{ error }}</p>

        <div class="mt-5 flex gap-3">
          <button type="button" class="mp-btn-ghost flex-1" :disabled="submitting" @click="emit('close')">Volver</button>
          <button type="button" class="mp-btn-primary flex-1" :disabled="!valid || submitting" @click="confirm">
            {{ submitting ? 'Enviando…' : 'Enviar respuesta' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import AttachmentPreview from '../ui/AttachmentPreview.vue'
import { useFollowUpStore } from '../../stores/followUpStore'

const props = defineProps({ report: { type: Object, default: null } })
const emit = defineEmits(['close', 'done'])

const store = useFollowUpStore()
const d = new Date()
const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const response = ref('')
const visit = ref('')
const close = ref(false)
const error = ref('')
const submitting = ref(false)

const valid = computed(() => response.value.trim().length >= 5)

watch(() => props.report, () => {
  response.value = props.report?.shelter_response || ''
  visit.value = ''
  close.value = false
  error.value = ''
})

async function confirm() {
  submitting.value = true
  error.value = ''
  const result = await store.respondReport(props.report.id, response.value.trim(), visit.value || null, close.value)
  submitting.value = false
  if (result.success) emit('done', close.value ? 'Reporte respondido y cerrado. Se notificó al adoptante.' : 'Respuesta enviada. Se notificó al adoptante.')
  else error.value = result.error
}
</script>

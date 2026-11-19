<template>
  <Transition name="mp-modal">
    <div v-if="record" class="fixed inset-0 z-[60] flex items-center justify-center bg-[#040404]/50 px-4" role="dialog" aria-modal="true" aria-labelledby="complete-title">
      <div class="mp-modal-panel w-full max-w-md rounded-2xl border border-[#A3AEB9]/20 bg-white p-6 shadow-xl">
        <h2 id="complete-title" class="font-display text-lg font-bold text-[#040404]">Marcar como completada</h2>
        <p class="mt-1 text-sm text-ink-soft"><strong>{{ record.vaccine_name }}</strong> · {{ petName }}</p>

        <label for="proof-file" class="mp-label mt-4">Foto del comprobante o certificado (opcional)</label>
        <input
          id="proof-file"
          ref="fileInput"
          type="file"
          :accept="PROOF_TYPES.join(',')"
          class="block w-full text-sm text-[#040404] file:mr-3 file:min-h-[44px] file:cursor-pointer file:rounded-xl file:border-0 file:bg-[#FCD8B8] file:px-4 file:text-sm file:font-semibold file:text-[#040404] hover:file:bg-[#FCD8B8]/70"
          @change="file = $event.target.files[0] || null"
        />
        <p class="mt-1 text-xs text-ink-soft">JPG, PNG o WebP. Máximo {{ PROOF_MAX_MB }} MB.</p>

        <p v-if="error" class="mt-3 rounded-xl border border-alert/30 bg-alert-container px-3 py-2 text-sm text-alert" role="alert">{{ error }}</p>

        <div class="mt-5 flex gap-3">
          <button type="button" class="mp-btn-ghost flex-1" :disabled="submitting" @click="emit('close')">Volver</button>
          <button type="button" class="mp-btn-primary flex-1" :disabled="submitting" @click="confirm">{{ submitting ? 'Guardando…' : 'Confirmar' }}</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch } from 'vue'
import { PROOF_MAX_MB, PROOF_TYPES, useHealthStore } from '../../stores/healthStore'

const props = defineProps({ record: { type: Object, default: null }, petName: { type: String, default: '' } })
const emit = defineEmits(['close', 'done'])

const store = useHealthStore()
const file = ref(null)
const fileInput = ref(null)
const error = ref('')
const submitting = ref(false)

watch(() => props.record, () => {
  file.value = null
  if (fileInput.value) fileInput.value.value = ''
  error.value = ''
})

async function confirm() {
  submitting.value = true
  error.value = ''
  const result = await store.completeRecord(props.record.id, file.value)
  submitting.value = false
  if (result.success) emit('done', 'Registro marcado como completado')
  else error.value = result.error
}
</script>

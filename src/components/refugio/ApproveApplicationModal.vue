<template>
  <Transition name="mp-modal">
    <div v-if="application" class="fixed inset-0 z-[60] flex items-center justify-center bg-[#040404]/50 px-4" role="dialog" aria-modal="true" aria-labelledby="approve-title">
      <div class="mp-modal-panel w-full max-w-md rounded-2xl border border-[#A3AEB9]/20 bg-white p-6 shadow-xl">
        <h2 id="approve-title" class="font-display text-lg font-bold text-[#040404]">Aprobar solicitud</h2>
        <p class="mt-1 text-sm text-ink-soft">
          {{ application.profiles?.full_name || 'El adoptante' }} podrá retirar a <strong>{{ application.pets?.name }}</strong>. La mascota pasará a «en proceso».
        </p>

        <label for="approve-comments" class="mp-label mt-4">Condiciones o comentarios (recomendado)</label>
        <textarea
          id="approve-comments"
          v-model="comments"
          rows="4"
          maxlength="500"
          class="w-full rounded-xl border border-edge bg-white px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="Ej: Retirar el sábado con transportadora y carnet de identidad."
        ></textarea>

        <p v-if="error" class="mt-3 rounded-xl border border-alert/30 bg-alert-container px-3 py-2 text-sm text-alert" role="alert">{{ error }}</p>

        <div class="mt-5 flex gap-3">
          <button type="button" class="mp-btn-ghost flex-1" :disabled="submitting" @click="emit('close')">Volver</button>
          <button type="button" class="mp-btn-primary flex-1" :disabled="submitting" @click="confirm">
            {{ submitting ? 'Aprobando…' : 'Confirmar Aprobación' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useApplicationManagementStore } from '../../stores/applicationManagementStore'

const props = defineProps({ application: { type: Object, default: null } })
const emit = defineEmits(['close', 'done'])

const store = useApplicationManagementStore()
const comments = ref('')
const error = ref('')
const submitting = ref(false)

watch(() => props.application, () => {
  comments.value = ''
  error.value = ''
})

async function confirm() {
  submitting.value = true
  error.value = ''
  const result = await store.approve(props.application.id, comments.value.trim())
  submitting.value = false
  if (result.success) emit('done', 'Solicitud aprobada. Se notificó al adoptante.')
  else error.value = result.error
}
</script>

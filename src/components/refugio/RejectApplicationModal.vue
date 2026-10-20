<template>
  <Transition name="mp-modal">
    <div v-if="application" class="fixed inset-0 z-[60] flex items-center justify-center bg-[#040404]/50 px-4" role="dialog" aria-modal="true" aria-labelledby="reject-title">
      <div class="mp-modal-panel w-full max-w-md rounded-2xl border border-[#A3AEB9]/20 bg-white p-6 shadow-xl">
        <h2 id="reject-title" class="font-display text-lg font-bold text-[#040404]">Rechazar solicitud</h2>
        <p class="mt-1 text-sm text-ink-soft">
          Cuéntale a {{ application.profiles?.full_name || 'el adoptante' }} por qué no podrás avanzar con la adopción de <strong>{{ application.pets?.name }}</strong>. Un mensaje claro y amable ayuda mucho.
        </p>

        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="r in PRESETS"
            :key="r"
            type="button"
            class="rounded-full border border-[#A3AEB9]/40 bg-[#FCD8B8]/30 px-3 py-1 text-xs font-medium text-[#040404] transition hover:bg-[#FCD8B8]/70"
            @click="reason = r"
          >
            {{ r }}
          </button>
        </div>

        <label for="reject-reason" class="mp-label mt-4">Motivo del rechazo *</label>
        <textarea
          id="reject-reason"
          v-model="reason"
          rows="4"
          maxlength="500"
          class="w-full rounded-xl border border-edge bg-white px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="Escribe el motivo (mínimo 10 caracteres)"
        ></textarea>
        <p class="mt-1 text-xs" :class="valid ? 'text-ink-soft' : 'text-alert'">{{ trimmed.length }}/{{ REJECT_REASON_MIN }} caracteres mínimos</p>

        <p v-if="error" class="mt-3 rounded-xl border border-alert/30 bg-alert-container px-3 py-2 text-sm text-alert" role="alert">{{ error }}</p>

        <div class="mt-5 flex gap-3">
          <button type="button" class="mp-btn-ghost flex-1" :disabled="submitting" @click="emit('close')">Volver</button>
          <button
            type="button"
            class="flex h-12 flex-1 items-center justify-center rounded-xl bg-alert text-[15px] font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!valid || submitting"
            @click="confirm"
          >
            {{ submitting ? 'Rechazando…' : 'Confirmar Rechazo' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { REJECT_REASON_MIN, useApplicationManagementStore } from '../../stores/applicationManagementStore'

const PRESETS = ['No compatible con el estilo de vida', 'Mascota ya reservada', 'Faltan datos para evaluar la solicitud']

const props = defineProps({ application: { type: Object, default: null } })
const emit = defineEmits(['close', 'done'])

const store = useApplicationManagementStore()
const reason = ref('')
const error = ref('')
const submitting = ref(false)

const trimmed = computed(() => reason.value.trim())
const valid = computed(() => trimmed.value.length >= REJECT_REASON_MIN)

watch(() => props.application, () => {
  reason.value = ''
  error.value = ''
})

async function confirm() {
  submitting.value = true
  error.value = ''
  const result = await store.reject(props.application.id, trimmed.value)
  submitting.value = false
  if (result.success) emit('done', 'Solicitud rechazada. Se notificó al adoptante.')
  else error.value = result.error
}
</script>

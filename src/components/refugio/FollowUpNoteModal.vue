<template>
  <Transition name="mp-modal">
    <div v-if="adoption" class="fixed inset-0 z-[60] flex items-center justify-center bg-[#040404]/50 px-4" role="dialog" aria-modal="true" aria-labelledby="note-title">
      <div class="mp-modal-panel w-full max-w-md rounded-2xl border border-[#A3AEB9]/20 bg-white p-6 shadow-xl">
        <h2 id="note-title" class="font-display text-lg font-bold text-[#040404]">Nota de seguimiento</h2>
        <p class="mt-1 text-sm text-ink-soft">
          Registra cómo va <strong>{{ adoption.pets?.name }}</strong> con {{ adoption.profiles?.full_name || 'su adoptante' }}.
        </p>

        <p class="mp-label mt-4">Tipo de seguimiento *</p>
        <div class="flex gap-2" role="group" aria-label="Tipo de seguimiento">
          <button
            v-for="t in FOLLOW_UP_TYPES"
            :key="t.value"
            type="button"
            class="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition"
            :class="type === t.value ? 'border-[#BA8C71] bg-[#BA8C71] text-white' : 'border-[#A3AEB9]/40 bg-white text-[#040404] hover:bg-[#FCD8B8]/40'"
            :aria-pressed="type === t.value"
            @click="type = t.value"
          >
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">{{ t.icon }}</span>{{ t.label }}
          </button>
        </div>

        <label for="note-date" class="mp-label mt-4">Fecha *</label>
        <input id="note-date" v-model="date" type="date" class="h-12 w-full rounded-xl border border-edge bg-white px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />

        <label for="note-text" class="mp-label mt-4">Observaciones *</label>
        <textarea
          id="note-text"
          v-model="text"
          rows="4"
          maxlength="1000"
          class="w-full rounded-xl border border-edge bg-white px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="Ej: Se adaptó bien, come con normalidad y ya conoce la casa."
        ></textarea>

        <p v-if="error" class="mt-3 rounded-xl border border-alert/30 bg-alert-container px-3 py-2 text-sm text-alert" role="alert">{{ error }}</p>

        <div class="mt-5 flex gap-3">
          <button type="button" class="mp-btn-ghost flex-1" :disabled="submitting" @click="emit('close')">Volver</button>
          <button type="button" class="mp-btn-primary flex-1" :disabled="!valid || submitting" @click="confirm">
            {{ submitting ? 'Guardando…' : 'Guardar nota' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { FOLLOW_UP_TYPES, useFollowUpStore } from '../../stores/followUpStore'

const props = defineProps({ adoption: { type: Object, default: null } })
const emit = defineEmits(['close', 'done'])

const store = useFollowUpStore()
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const type = ref('llamada')
const date = ref(today())
const text = ref('')
const error = ref('')
const submitting = ref(false)

const valid = computed(() => !!date.value && text.value.trim().length >= 3)

watch(() => props.adoption, () => {
  type.value = 'llamada'
  date.value = today() // HU-44 CA#1: fecha por defecto = hoy
  text.value = ''
  error.value = ''
})

async function confirm() {
  submitting.value = true
  error.value = ''
  const result = await store.addNote(props.adoption.id, type.value, date.value, text.value.trim())
  submitting.value = false
  if (result.success) emit('done', 'Nota de seguimiento registrada')
  else error.value = result.error
}
</script>

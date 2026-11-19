<template>
  <Transition name="mp-modal">
    <div v-if="target" class="fixed inset-0 z-[60] flex items-center justify-center bg-[#040404]/50 px-4" role="dialog" aria-modal="true" aria-labelledby="health-title">
      <div class="mp-modal-panel w-full max-w-md rounded-2xl border border-[#A3AEB9]/20 bg-white p-6 shadow-xl">
        <h2 id="health-title" class="font-display text-lg font-bold text-[#040404]">{{ target.record ? 'Editar registro' : 'Agregar al calendario de salud' }}</h2>
        <p class="mt-1 text-sm text-ink-soft">Mascota: <strong>{{ target.petName }}</strong></p>

        <p class="mp-label mt-4">Tipo *</p>
        <div class="flex gap-2" role="group" aria-label="Tipo de registro">
          <button
            v-for="k in HEALTH_KINDS"
            :key="k.value"
            type="button"
            class="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition"
            :class="kind === k.value ? 'border-[#BA8C71] bg-[#BA8C71] text-white' : 'border-[#A3AEB9]/40 bg-white text-[#040404] hover:bg-[#FCD8B8]/40'"
            :aria-pressed="kind === k.value"
            @click="kind = k.value"
          >
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">{{ k.icon }}</span>{{ k.label }}
          </button>
        </div>

        <label for="health-name" class="mp-label mt-4">Nombre *</label>
        <input id="health-name" v-model="name" type="text" maxlength="80" class="h-12 w-full rounded-xl border border-edge bg-white px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Ej: Vacuna múltiple, Desparasitación" />

        <label for="health-due" class="mp-label mt-4">Fecha programada *</label>
        <input id="health-due" v-model="due" type="date" class="h-12 w-full rounded-xl border border-edge bg-white px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />

        <p v-if="error" class="mt-3 rounded-xl border border-alert/30 bg-alert-container px-3 py-2 text-sm text-alert" role="alert">{{ error }}</p>

        <div class="mt-5 flex gap-3">
          <button type="button" class="mp-btn-ghost flex-1" :disabled="submitting" @click="emit('close')">Volver</button>
          <button type="button" class="mp-btn-primary flex-1" :disabled="!valid || submitting" @click="confirm">{{ submitting ? 'Guardando…' : 'Guardar' }}</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { HEALTH_KINDS, useHealthStore } from '../../stores/healthStore'

// target: { applicationId, petName, record? } — con `record` edita; sin él, agrega.
const props = defineProps({ target: { type: Object, default: null }, reload: { type: Function, default: null } })
const emit = defineEmits(['close', 'done'])

const store = useHealthStore()
const kind = ref('vacuna')
const name = ref('')
const due = ref('')
const error = ref('')
const submitting = ref(false)

const valid = computed(() => name.value.trim().length >= 2 && !!due.value)

watch(() => props.target, (t) => {
  kind.value = t?.record?.kind || 'vacuna'
  name.value = t?.record?.vaccine_name || ''
  due.value = t?.record?.due_date || ''
  error.value = ''
})

async function confirm() {
  submitting.value = true
  error.value = ''
  const t = props.target
  const result = t.record
    ? await store.updateRecord(t.record.id, kind.value, name.value.trim(), due.value, props.reload)
    : await store.addRecord(t.applicationId, kind.value, name.value.trim(), due.value, props.reload)
  submitting.value = false
  if (result.success) emit('done', t.record ? 'Registro actualizado' : 'Registro agregado al calendario')
  else error.value = result.error
}
</script>

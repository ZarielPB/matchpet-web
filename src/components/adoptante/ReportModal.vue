<template>
  <Transition name="mp-modal">
    <div v-if="adoption" class="fixed inset-0 z-[60] flex items-center justify-center bg-[#040404]/50 px-4" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <div class="mp-modal-panel w-full max-w-md rounded-2xl border border-[#A3AEB9]/20 bg-white p-6 shadow-xl">
        <h2 id="report-title" class="font-display text-lg font-bold text-[#040404]">Reportar un problema o duda</h2>
        <p class="mt-1 text-sm text-ink-soft">
          El refugio te orientará sobre <strong>{{ adoption.pets?.name }}</strong>. Cuéntanos qué está pasando.
        </p>

        <label for="report-category" class="mp-label mt-4">Categoría *</label>
        <select id="report-category" v-model="category" class="h-12 w-full rounded-xl border border-edge bg-white px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option v-for="c in REPORT_CATEGORIES" :key="c" :value="c">{{ c }}</option>
        </select>

        <label for="report-desc" class="mp-label mt-4">Descripción detallada *</label>
        <textarea
          id="report-desc"
          v-model="description"
          rows="4"
          maxlength="1000"
          class="w-full rounded-xl border border-edge bg-white px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="Describe lo que observas (mínimo 10 caracteres)"
        ></textarea>
        <p class="mt-1 text-xs" :class="valid ? 'text-ink-soft' : 'text-alert'">{{ trimmed.length }}/{{ REPORT_DESC_MIN }} caracteres mínimos</p>

        <label for="report-file" class="mp-label mt-4">Foto o video (opcional)</label>
        <input
          id="report-file"
          ref="fileInput"
          type="file"
          :accept="ATTACHMENT_TYPES.join(',')"
          class="block w-full text-sm text-[#040404] file:mr-3 file:min-h-[44px] file:cursor-pointer file:rounded-xl file:border-0 file:bg-[#FCD8B8] file:px-4 file:text-sm file:font-semibold file:text-[#040404] hover:file:bg-[#FCD8B8]/70"
          @change="file = $event.target.files[0] || null"
        />
        <p class="mt-1 text-xs text-ink-soft">JPG, PNG, WebP, MP4 o WebM. Máximo {{ ATTACHMENT_MAX_MB }} MB.</p>

        <p v-if="error" class="mt-3 rounded-xl border border-alert/30 bg-alert-container px-3 py-2 text-sm text-alert" role="alert">{{ error }}</p>

        <div class="mt-5 flex gap-3">
          <button type="button" class="mp-btn-ghost flex-1" :disabled="submitting" @click="emit('close')">Volver</button>
          <button type="button" class="mp-btn-primary flex-1" :disabled="!valid || submitting" @click="confirm">
            {{ submitting ? 'Enviando…' : 'Enviar reporte' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ATTACHMENT_MAX_MB, ATTACHMENT_TYPES, REPORT_CATEGORIES, REPORT_DESC_MIN, useFollowUpStore } from '../../stores/followUpStore'

const props = defineProps({ adoption: { type: Object, default: null } })
const emit = defineEmits(['close', 'done'])

const store = useFollowUpStore()
const category = ref(REPORT_CATEGORIES[0])
const description = ref('')
const file = ref(null)
const fileInput = ref(null)
const error = ref('')
const submitting = ref(false)

const trimmed = computed(() => description.value.trim())
const valid = computed(() => trimmed.value.length >= REPORT_DESC_MIN)

watch(() => props.adoption, () => {
  category.value = REPORT_CATEGORIES[0]
  description.value = ''
  file.value = null
  if (fileInput.value) fileInput.value.value = ''
  error.value = ''
})

async function confirm() {
  submitting.value = true
  error.value = ''
  const result = await store.createReport(props.adoption.id, category.value, trimmed.value, file.value)
  submitting.value = false
  if (result.success) emit('done', 'Reporte enviado. El refugio fue notificado.')
  else error.value = result.error
}
</script>

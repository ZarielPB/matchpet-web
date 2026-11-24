<template>
  <p v-if="!records.length" class="rounded-xl border border-dashed border-[#A3AEB9]/40 bg-[#FCD8B8]/20 px-4 py-3 text-sm text-ink-soft">
    {{ emptyText }}
  </p>
  <ul v-else class="space-y-2">
    <li
      v-for="(r, idx) in records"
      :key="r.id"
      class="mp-fade-up flex flex-wrap items-center gap-3 rounded-xl border bg-white px-3 py-2.5"
      :class="status(r) === 'vencida' ? 'border-alert/40' : status(r) === 'proxima' ? 'border-[#E1A16C]/60' : 'border-[#A3AEB9]/20'"
      :style="{ animationDelay: `${Math.min(idx, 8) * 50}ms` }"
    >
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FCD8B8] text-[#8F6349]">
        <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">{{ kind(r.kind).icon }}</span>
      </span>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold text-[#040404]">{{ r.vaccine_name }}</p>
        <p class="text-xs text-ink-soft">
          {{ r.completed_at ? 'Completada el ' + formatDate(r.completed_at) : 'Fecha: ' + formatDate(r.due_date) }}
        </p>
        <AttachmentPreview v-if="r.proof_image_url" :path="r.proof_image_url" :loader="proofLoader" />
      </div>
      <span :class="BADGES[status(r)].class" class="whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold">{{ BADGES[status(r)].label }}</span>
      <slot name="actions" :record="r" :status="status(r)" />
    </li>
  </ul>
</template>

<script setup>
import AttachmentPreview from './AttachmentPreview.vue'
import { HEALTH_KINDS, healthStatus, useHealthStore } from '../../stores/healthStore'

defineProps({
  records: { type: Array, default: () => [] },
  emptyText: { type: String, default: 'Aún no hay registros en el calendario de salud.' }
})

const store = useHealthStore()
const proofLoader = (path) => store.getProofUrl(path)
const status = (r) => healthStatus(r)
const kind = (value) => HEALTH_KINDS.find((k) => k.value === value) || HEALTH_KINDS[0]

const BADGES = {
  completada: { label: 'Completada', class: 'bg-[#E1A16C] text-[#040404]' },
  vencida: { label: 'Vencida', class: 'bg-alert-container text-alert' },
  proxima: { label: 'Próxima', class: 'bg-[#BA8C71] text-white' },
  pendiente: { label: 'Pendiente', class: 'bg-[#FCD8B8] text-[#040404]' }
}

function formatDate(raw) {
  const iso = String(raw).length === 10 ? `${raw}T00:00:00` : raw
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

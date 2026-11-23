<template>
  <p v-if="!notes.length" class="rounded-xl border border-dashed border-[#A3AEB9]/40 bg-[#FCD8B8]/20 px-4 py-3 text-sm text-ink-soft">
    {{ emptyText }}
  </p>
  <ol v-else class="relative ml-4 border-l-2 border-[#E1A16C]/40">
    <li
      v-for="(n, idx) in notes"
      :key="n.id"
      class="mp-fade-up relative pb-4 pl-6 last:pb-0"
      :style="{ animationDelay: `${Math.min(idx, 8) * 60}ms` }"
    >
      <span class="absolute -left-[17px] top-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#FCD8B8] text-[#8F6349] ring-4 ring-white">
        <span class="material-symbols-outlined text-[18px]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">{{ meta(n.type).icon }}</span>
      </span>
      <p class="text-xs font-semibold text-[#8F6349]">
        {{ meta(n.type).label }} · {{ formatDate(n.noted_at) }}
        <span v-if="isFuture(n.noted_at)" class="ml-1 rounded-full bg-[#E1A16C] px-2 py-0.5 text-[10px] font-bold text-[#040404]">Agendada</span>
      </p>
      <p class="mt-0.5 whitespace-pre-line text-sm text-[#040404]">{{ n.notes }}</p>
    </li>
  </ol>
</template>

<script setup>
import { FOLLOW_UP_TYPES } from '../../stores/followUpStore'

defineProps({
  notes: { type: Array, default: () => [] },
  emptyText: { type: String, default: 'El refugio aún no ha registrado notas de seguimiento' }
})

const meta = (type) => FOLLOW_UP_TYPES.find((t) => t.value === type) || { label: type, icon: 'edit_note' }

// noted_at es DATE (YYYY-MM-DD): se parsea como fecha local para no desfasar el día.
function parse(raw) {
  const [y, m, d] = String(raw).split('-').map(Number)
  return new Date(y, m - 1, d)
}
function formatDate(raw) {
  const d = parse(raw)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
}
function isFuture(raw) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return parse(raw) > today
}
</script>

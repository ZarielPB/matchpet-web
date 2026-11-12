<template>
  <section aria-label="Métricas del refugio" class="mb-6">
    <div v-if="store.error && !s" class="rounded-2xl border border-alert/30 bg-alert-container px-4 py-3 text-sm text-alert" role="alert">{{ store.error }}</div>

    <!-- HU-49 CA#5: skeletons mientras se calculan las métricas -->
    <div v-else-if="!s" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="n in 4" :key="n" class="h-28 animate-pulse rounded-2xl bg-[#A3AEB9]/20"></div>
    </div>

    <template v-else>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article
          v-for="(k, idx) in kpis"
          :key="k.label"
          class="mp-fade-up rounded-2xl border border-[#A3AEB9]/20 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#BA8C71] hover:shadow-lg"
          :style="{ animationDelay: `${idx * 60}ms` }"
        >
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FCD8B8] text-[#BA8C71]">
            <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">{{ k.icon }}</span>
          </span>
          <p class="mt-3 font-display text-3xl font-black text-[#040404]">{{ k.value }}</p>
          <p class="text-sm font-semibold text-[#040404]">{{ k.label }}</p>
          <p v-if="k.hint" class="mt-0.5 text-xs text-ink-soft">{{ k.hint }}</p>
        </article>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article class="mp-fade-up rounded-2xl border border-[#A3AEB9]/20 bg-white p-5 shadow-sm">
          <h2 class="font-display font-bold text-[#040404]">Mascotas por estado</h2>
          <ul class="mt-3 space-y-2">
            <li v-for="p in petStates" :key="p.label" class="flex items-center gap-3 text-sm">
              <span class="w-24 text-[#040404]">{{ p.label }}</span>
              <span class="h-2.5 flex-1 overflow-hidden rounded-full bg-[#A3AEB9]/20">
                <span class="block h-full rounded-full transition-all duration-700" :class="p.color" :style="{ width: p.width }"></span>
              </span>
              <span class="w-6 text-right font-semibold text-[#040404]">{{ p.count }}</span>
            </li>
          </ul>
        </article>

        <!-- HU-49 CA#3: actividad reciente -->
        <article class="mp-fade-up rounded-2xl border border-[#A3AEB9]/20 bg-white p-5 shadow-sm">
          <h2 class="font-display font-bold text-[#040404]">Actividad reciente</h2>
          <p v-if="!s.recent_activity.length" class="mt-3 text-sm text-ink-soft">Todavía no hay actividad.</p>
          <ul v-else class="mt-3 space-y-2">
            <li v-for="(a, i) in s.recent_activity" :key="i" class="flex items-center justify-between gap-2 text-sm">
              <span class="truncate text-[#040404]">{{ a.pet }}</span>
              <span class="flex shrink-0 items-center gap-2">
                <span class="text-xs text-ink-soft">{{ formatDate(a.at) }}</span>
                <span :class="badge(a.status).class" class="rounded-full px-2.5 py-0.5 text-xs font-semibold">{{ badge(a.status).label }}</span>
              </span>
            </li>
          </ul>
        </article>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useStatsStore } from '../../stores/statsStore'

const store = useStatsStore()
const s = computed(() => store.dashboard)

const BADGES = {
  pendiente: { label: 'Pendiente', class: 'bg-[#FCD8B8] text-[#040404]' },
  aprobada: { label: 'Aprobada', class: 'bg-[#BA8C71] text-white' },
  rechazada: { label: 'Rechazada', class: 'bg-alert-container text-alert' },
  cancelada: { label: 'Cancelada', class: 'bg-[#A3AEB9]/30 text-[#040404]' },
  completada: { label: 'Completada', class: 'bg-[#E1A16C] text-[#040404]' }
}
const badge = (status) => BADGES[status] || { label: status, class: 'bg-[#A3AEB9]/20 text-[#040404]' }

const kpis = computed(() => [
  { label: 'Total de mascotas', value: s.value.pets_total, icon: 'pets', hint: `${s.value.pets_disponible} disponibles` },
  { label: 'Solicitudes pendientes', value: s.value.pending_applications, icon: 'mail', hint: s.value.open_reports ? `${s.value.open_reports} reporte(s) sin responder` : 'Por revisar' },
  { label: 'Adopciones del mes', value: s.value.adoptions_this_month, icon: 'volunteer_activism', hint: 'Entregas registradas este mes' },
  { label: 'Tasa de éxito', value: `${s.value.success_rate}%`, icon: 'trending_up', hint: `Adopciones / ${s.value.applications_total} solicitudes` }
])

const petStates = computed(() => {
  const total = Math.max(s.value.pets_total, 1)
  const pct = (n) => `${Math.round((n / total) * 100)}%`
  return [
    { label: 'Disponibles', count: s.value.pets_disponible, width: pct(s.value.pets_disponible), color: 'bg-[#BA8C71]' },
    { label: 'En proceso', count: s.value.pets_en_proceso, width: pct(s.value.pets_en_proceso), color: 'bg-[#E1A16C]' },
    { label: 'Adoptadas', count: s.value.pets_adoptada, width: pct(s.value.pets_adoptada), color: 'bg-[#A3AEB9]' }
  ]
})

function formatDate(raw) {
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })
}

onMounted(() => store.fetchDashboard())
</script>

<template>
  <DashboardLayout role="refugio" title="Estadísticas">
    <div class="mx-auto max-w-5xl">
      <!-- HU-50: gráficas con filtro de rango -->
      <section class="mp-fade-up rounded-2xl border border-[#A3AEB9]/20 bg-white p-5 shadow-sm" aria-label="Adopciones por período">
        <h2 class="font-display text-lg font-bold text-[#040404]">Adopciones por período</h2>

        <div class="mt-4 flex flex-wrap gap-2" role="group" aria-label="Rango de fechas">
          <button
            v-for="r in RANGES"
            :key="r.value"
            type="button"
            class="min-h-[44px] rounded-full px-4 py-1.5 text-sm font-semibold transition sm:min-h-0"
            :class="range === r.value ? 'bg-[#BA8C71] text-white' : 'border border-[#A3AEB9]/30 bg-white text-[#040404] hover:bg-[#FCD8B8]/40'"
            :aria-pressed="range === r.value"
            @click="setRange(r.value)"
          >{{ r.label }}</button>
        </div>

        <div v-if="range === 'custom'" class="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label for="from" class="mp-label">Desde</label>
            <input id="from" v-model="from" type="date" :max="to" class="h-11 rounded-xl border border-edge bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label for="to" class="mp-label">Hasta</label>
            <input id="to" v-model="to" type="date" :min="from" class="h-11 rounded-xl border border-edge bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <button type="button" class="mp-btn-primary !h-11 !w-auto px-5" :disabled="!from || !to || from > to" @click="loadCharts">Aplicar</button>
        </div>

        <p v-if="chartsError" class="mt-4 rounded-xl border border-alert/30 bg-alert-container px-3 py-2 text-sm text-alert" role="alert">{{ chartsError }}</p>
        <div v-else-if="!store.charts" class="mt-4 h-64 animate-pulse rounded-xl bg-[#A3AEB9]/20"></div>
        <!-- HU-50 CA#5: empty state -->
        <div v-else-if="store.charts.total === 0" class="mt-4 rounded-xl border border-dashed border-[#A3AEB9]/40 bg-[#FCD8B8]/20 py-12 text-center">
          <span class="material-symbols-outlined text-[48px] text-ink-soft" style="font-variation-settings: 'FILL' 1" aria-hidden="true">bar_chart</span>
          <p class="mt-2 text-sm font-medium text-[#040404]">No hay registros de adopciones en este período</p>
        </div>
        <div v-else class="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div class="lg:col-span-3">
            <p class="mb-2 text-sm font-semibold text-[#040404]">Adopciones por mes <span class="font-normal text-ink-soft">({{ store.charts.total }} en total)</span></p>
            <div class="h-64"><Bar :data="monthData" :options="barOptions" aria-label="Adopciones por mes" role="img" /></div>
          </div>
          <div class="lg:col-span-2">
            <div class="mb-2 flex items-center justify-between gap-2">
              <p class="text-sm font-semibold text-[#040404]">Por {{ dim === 'by_species' ? 'especie' : 'tamaño' }}</p>
              <div class="flex gap-1" role="group" aria-label="Dimensión del gráfico">
                <button v-for="d in DIMS" :key="d.value" type="button" class="min-h-[44px] rounded-full px-4 py-1 text-xs font-semibold transition sm:min-h-0 sm:px-3" :class="dim === d.value ? 'bg-[#E1A16C] text-[#040404]' : 'border border-[#A3AEB9]/30 text-[#040404] hover:bg-[#FCD8B8]/40'" :aria-pressed="dim === d.value" @click="dim = d.value">{{ d.label }}</button>
              </div>
            </div>
            <div class="h-64"><Doughnut :data="donutData" :options="donutOptions" aria-label="Adopciones por categoría" role="img" /></div>
          </div>
        </div>
      </section>

      <!-- HU-51: métricas del algoritmo de compatibilidad (agregadas y anónimas) -->
      <section class="mp-fade-up mt-6 rounded-2xl border border-[#A3AEB9]/20 bg-white p-5 shadow-sm" aria-label="Métricas de compatibilidad">
        <h2 class="font-display text-lg font-bold text-[#040404]">Efectividad del cuestionario de compatibilidad</h2>
        <p class="text-sm text-ink-soft">Datos agregados: no incluyen información personal de los adoptantes.</p>

        <p v-if="compatError" class="mt-4 rounded-xl border border-alert/30 bg-alert-container px-3 py-2 text-sm text-alert" role="alert">{{ compatError }}</p>
        <div v-else-if="!c" class="mt-4 h-40 animate-pulse rounded-xl bg-[#A3AEB9]/20"></div>
        <template v-else>
          <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div class="rounded-xl bg-[#FCD8B8]/30 p-4">
              <p class="font-display text-3xl font-black text-[#040404]">{{ c.quiz_completed_total }}</p>
              <p class="text-sm text-[#040404]">Adoptantes con cuestionario completado</p>
            </div>
            <div class="rounded-xl bg-[#FCD8B8]/30 p-4">
              <p class="font-display text-3xl font-black text-[#040404]">{{ c.avg_score_adopted == null ? '—' : `${c.avg_score_adopted}%` }}</p>
              <p class="text-sm text-[#040404]">Compatibilidad promedio de las mascotas adoptadas</p>
            </div>
            <div class="rounded-xl bg-[#FCD8B8]/30 p-4">
              <p class="font-display text-3xl font-black text-[#040404]">{{ rate(c.adoptions_with_quiz, c.applications_with_quiz) }}</p>
              <p class="text-sm text-[#040404]">Conversión de solicitudes con cuestionario</p>
            </div>
          </div>

          <h3 class="mt-6 text-sm font-semibold text-[#040404]">Embudo de conversión <span class="font-normal text-ink-soft">(personas)</span></h3>
          <ul class="mt-2 space-y-2">
            <li v-for="f in funnel" :key="f.label">
              <div class="flex justify-between text-sm"><span class="text-[#040404]">{{ f.label }}</span><span class="font-semibold text-[#040404]">{{ f.value }}</span></div>
              <div class="mt-1 h-3 overflow-hidden rounded-full bg-[#A3AEB9]/20">
                <div class="h-full rounded-full transition-all duration-700" :class="f.color" :style="{ width: f.width }"></div>
              </div>
            </li>
          </ul>

          <!-- HU-51 CA#5: con cuestionario vs. sin cuestionario -->
          <h3 class="mt-6 text-sm font-semibold text-[#040404]">Con cuestionario vs. sin cuestionario</h3>
          <div class="mt-2 overflow-x-auto">
            <table class="w-full min-w-[420px] text-left text-sm">
              <thead><tr class="border-b border-[#A3AEB9]/30 text-xs uppercase tracking-wide text-ink-soft"><th class="py-2 pr-3 font-semibold">Grupo</th><th class="py-2 pr-3 font-semibold">Solicitudes</th><th class="py-2 pr-3 font-semibold">Adopciones</th><th class="py-2 font-semibold">Conversión</th></tr></thead>
              <tbody>
                <tr v-for="g in groups" :key="g.label" class="border-b border-[#A3AEB9]/10"><td class="py-2 pr-3 font-medium text-[#040404]">{{ g.label }}</td><td class="py-2 pr-3">{{ g.apps }}</td><td class="py-2 pr-3">{{ g.done }}</td><td class="py-2 font-semibold text-[#040404]">{{ rate(g.done, g.apps) }}</td></tr>
              </tbody>
            </table>
          </div>
        </template>
      </section>
    </div>
  </DashboardLayout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Bar, Doughnut } from 'vue-chartjs'
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js'
import DashboardLayout from '../../components/layout/DashboardLayout.vue'
import { useStatsStore } from '../../stores/statsStore'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Legend, Tooltip)

const store = useStatsStore()
const c = computed(() => store.compat)

const RANGES = [
  { value: '30d', label: 'Últimos 30 días' },
  { value: '6m', label: 'Últimos 6 meses' },
  { value: 'year', label: 'Año actual' },
  { value: 'custom', label: 'Rango personalizado' }
]
const DIMS = [
  { value: 'by_species', label: 'Especie' },
  { value: 'by_size', label: 'Tamaño' }
]
const PALETTE = ['#BA8C71', '#E1A16C', '#A3AEB9', '#8F6349', '#F0C199']
const LABELS = { perro: 'Perros', gato: 'Gatos', pequeño: 'Pequeño', mediano: 'Mediano', grande: 'Grande' }

const range = ref('6m')
const dim = ref('by_species')
const from = ref('')
const to = ref('')
const chartsError = ref('')
const compatError = ref('')

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function presetRange(value) {
  const end = new Date()
  const start = new Date()
  if (value === '30d') start.setDate(start.getDate() - 30)
  else if (value === '6m') { start.setMonth(start.getMonth() - 5); start.setDate(1) }
  else start.setMonth(0, 1)
  return [iso(start), iso(end)]
}

async function loadCharts() {
  chartsError.value = ''
  const result = await store.fetchCharts(from.value, to.value)
  if (!result.success) chartsError.value = result.error
}

function setRange(value) {
  range.value = value
  if (value === 'custom') return // espera a "Aplicar"
  ;[from.value, to.value] = presetRange(value)
  loadCharts()
}

const monthLabel = (m) => {
  const [y, mo] = m.split('-').map(Number)
  return new Date(y, mo - 1, 1).toLocaleDateString('es-BO', { month: 'short', year: '2-digit' })
}

const monthData = computed(() => ({
  labels: store.charts.by_month.map((m) => monthLabel(m.month)),
  datasets: [{ label: 'Adopciones', data: store.charts.by_month.map((m) => m.count), backgroundColor: '#BA8C71', hoverBackgroundColor: '#E1A16C', borderRadius: 8 }]
}))

const donutData = computed(() => {
  const rows = store.charts[dim.value]
  return {
    labels: rows.map((r) => LABELS[r.label] || r.label),
    datasets: [{ data: rows.map((r) => r.count), backgroundColor: PALETTE, borderColor: '#fff', borderWidth: 2 }]
  }
})

const baseOptions = { responsive: true, maintainAspectRatio: false, animation: { duration: 700, easing: 'easeOutQuart' } }
const barOptions = {
  ...baseOptions,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } }
}
const donutOptions = { ...baseOptions, cutout: '60%', plugins: { legend: { position: 'bottom' } } }

const rate = (done, total) => (total ? `${Math.round((done / total) * 100)}%` : '—')

const funnel = computed(() => {
  const steps = [
    { label: 'Adoptantes con cuestionario completado', value: c.value.quiz_completed_total, color: 'bg-[#BA8C71]' },
    { label: 'Enviaron solicitud a tu refugio', value: c.value.applicants_with_quiz, color: 'bg-[#E1A16C]' },
    { label: 'Completaron una adopción', value: c.value.adopters_with_quiz, color: 'bg-[#8F6349]' }
  ]
  const max = Math.max(...steps.map((s) => s.value), 1)
  return steps.map((s) => ({ ...s, width: `${Math.round((s.value / max) * 100)}%` }))
})

const groups = computed(() => [
  { label: 'Con cuestionario', apps: c.value.applications_with_quiz, done: c.value.adoptions_with_quiz },
  { label: 'Sin cuestionario', apps: c.value.applications_without_quiz, done: c.value.adoptions_without_quiz }
])

onMounted(async () => {
  setRange('6m')
  const result = await store.fetchCompat()
  if (!result.success) compatError.value = result.error
})
</script>

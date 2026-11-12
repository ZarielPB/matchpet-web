<template>
  <DashboardLayout role="adoptante" title="Mis adopciones">
    <div class="mx-auto max-w-3xl">
      <p class="mb-6 text-sm text-ink-soft">Acompañamiento del refugio y canal oficial para tus dudas sobre tu mascota.</p>

      <div v-if="flash" class="mp-fade-up mb-4 rounded-xl border border-[#E1A16C]/40 bg-[#FCD8B8]/40 px-4 py-3 text-sm font-medium text-[#040404]" role="status">✅ {{ flash }}</div>

      <div v-if="store.loading && !store.adoptions.length" class="space-y-4">
        <div v-for="n in 2" :key="n" class="h-48 animate-pulse rounded-2xl bg-[#A3AEB9]/20"></div>
      </div>

      <div v-else-if="store.error && !store.adoptions.length" class="rounded-2xl border border-alert/30 bg-alert-container py-12 text-center text-alert" role="alert">{{ store.error }}</div>

      <div v-else-if="!store.adoptions.length" class="rounded-2xl border border-[#A3AEB9]/20 bg-white py-16 text-center shadow-sm">
        <span class="material-symbols-outlined text-[64px] text-[#A3AEB9]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">volunteer_activism</span>
        <p class="mt-3 font-medium text-[#040404]">Aún no tienes mascotas adoptadas.</p>
        <router-link to="/catalogo" class="mt-5 inline-block rounded-xl bg-[#BA8C71] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#E1A16C]">Explorar catálogo</router-link>
      </div>

      <ul v-else class="space-y-6">
        <li
          v-for="(a, idx) in store.adoptions"
          :key="a.id"
          class="mp-fade-up rounded-2xl border border-[#A3AEB9]/20 bg-white p-5 shadow-sm"
          :style="{ animationDelay: `${Math.min(idx, 8) * 60}ms` }"
        >
          <div class="flex gap-4">
            <img v-if="photo(a)" :src="photo(a)" :alt="`Foto de ${a.pets?.name || 'la mascota'}`" class="h-20 w-20 shrink-0 rounded-xl object-cover" loading="lazy" />
            <div v-else class="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-[#FCD8B8]/40 text-3xl text-[#A3AEB9]">🐾</div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-display text-lg font-bold text-[#040404]">{{ a.pets?.name }}</p>
              <p class="text-sm text-ink-soft">{{ a.pets?.shelters?.shelter_name || 'Refugio' }}<span v-if="a.pets?.shelters?.city"> · {{ a.pets.shelters.city }}</span></p>
              <p class="mt-0.5 text-xs text-ink-soft">Adoptada el {{ formatDate(delivery(a)?.delivered_at || a.resolved_at) }}</p>
            </div>
            <button type="button" class="hidden h-fit min-h-[44px] shrink-0 rounded-xl bg-[#BA8C71] px-4 text-sm font-bold text-white transition hover:bg-[#E1A16C] sm:block" @click="toReport = a">Reportar problema</button>
          </div>
          <button type="button" class="mt-3 min-h-[44px] w-full rounded-xl bg-[#BA8C71] px-4 text-sm font-bold text-white transition hover:bg-[#E1A16C] sm:hidden" @click="toReport = a">Reportar problema</button>

          <h3 class="mt-5 font-display text-sm font-bold uppercase tracking-wide text-[#040404]">Seguimiento del refugio</h3>
          <div class="mt-3"><FollowUpTimeline :notes="a.follow_up_notes || []" /></div>

          <h3 class="mt-5 font-display text-sm font-bold uppercase tracking-wide text-[#040404]">Mis reportes</h3>
          <p v-if="!a.post_adoption_reports?.length" class="mt-2 text-sm text-ink-soft">Aún no has enviado reportes.</p>
          <ul v-else class="mt-2 space-y-3">
            <li v-for="r in a.post_adoption_reports" :key="r.id" class="rounded-xl border border-[#A3AEB9]/20 bg-[#FCD8B8]/10 p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-semibold text-[#040404]">{{ r.category }}</p>
                <span :class="badge(r.status).class" class="rounded-full px-2.5 py-0.5 text-xs font-semibold">{{ badge(r.status).label }}</span>
              </div>
              <p class="mt-1 whitespace-pre-line text-sm text-[#040404]">{{ r.description }}</p>
              <AttachmentPreview :path="r.image_url" />
              <p v-if="r.shelter_response" class="mt-2 rounded-lg border border-[#E1A16C]/30 bg-white px-3 py-2 text-sm text-[#040404]">
                <span class="font-semibold">Respuesta del refugio:</span> {{ r.shelter_response }}
              </p>
            </li>
          </ul>
        </li>
      </ul>
    </div>

    <ReportModal :adoption="toReport" @close="toReport = null" @done="onDone" />
  </DashboardLayout>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import DashboardLayout from '../../components/layout/DashboardLayout.vue'
import FollowUpTimeline from '../../components/ui/FollowUpTimeline.vue'
import AttachmentPreview from '../../components/ui/AttachmentPreview.vue'
import ReportModal from '../../components/adoptante/ReportModal.vue'
import { useFollowUpStore } from '../../stores/followUpStore'

const store = useFollowUpStore()
const toReport = ref(null)
const flash = ref('')

// Mismos colores que los demás estados del proyecto.
const BADGES = {
  pendiente: { label: 'Pendiente', class: 'bg-[#FCD8B8] text-[#040404]' },
  respondido: { label: 'Respondido', class: 'bg-[#BA8C71] text-white' },
  cerrado: { label: 'Cerrado', class: 'bg-[#A3AEB9]/30 text-[#040404]' }
}
const badge = (status) => BADGES[status] || BADGES.pendiente

const one = (x) => (Array.isArray(x) ? x[0] : x) || null
const delivery = (a) => one(a.adoption_deliveries)

function photo(a) {
  const imgs = a.pets?.pet_images || []
  return (imgs.find((i) => i.is_primary) || imgs[0])?.image_url || null
}

function formatDate(raw) {
  if (!raw) return '—'
  const d = new Date(raw.length === 10 ? `${raw}T00:00:00` : raw)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function onDone(message) {
  toReport.value = null
  flash.value = message
}

onMounted(() => store.fetchMyAdoptions())
</script>

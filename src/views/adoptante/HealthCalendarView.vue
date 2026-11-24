<template>
  <DashboardLayout role="adoptante" title="Calendario de salud">
    <div class="mx-auto max-w-3xl">
      <p class="mb-6 text-sm text-ink-soft">Vacunas y desparasitaciones de tus mascotas adoptadas. Te avisamos 3 días antes de cada fecha.</p>

      <div v-if="flash" class="mp-fade-up mb-4 rounded-xl border border-[#E1A16C]/40 bg-[#FCD8B8]/40 px-4 py-3 text-sm font-medium text-[#040404]" role="status">✅ {{ flash }}</div>

      <div v-if="store.loading && !store.adoptions.length" class="space-y-4">
        <div v-for="n in 2" :key="n" class="h-48 animate-pulse rounded-2xl bg-[#A3AEB9]/20"></div>
      </div>

      <div v-else-if="store.error && !store.adoptions.length" class="rounded-2xl border border-alert/30 bg-alert-container py-12 text-center text-alert" role="alert">{{ store.error }}</div>

      <div v-else-if="!store.adoptions.length" class="rounded-2xl border border-[#A3AEB9]/20 bg-white py-16 text-center shadow-sm">
        <span class="material-symbols-outlined text-[64px] text-ink-soft" style="font-variation-settings: 'FILL' 1" aria-hidden="true">vaccines</span>
        <p class="mt-3 font-medium text-[#040404]">Aún no tienes mascotas adoptadas con calendario de salud.</p>
        <router-link to="/catalogo" class="mt-5 inline-block rounded-xl bg-[#BA8C71] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#E1A16C]">Explorar catálogo</router-link>
      </div>

      <ul v-else class="space-y-6">
        <li v-for="(a, idx) in store.adoptions" :key="a.id" class="mp-fade-up rounded-2xl border border-[#A3AEB9]/20 bg-white p-5 shadow-sm" :style="{ animationDelay: `${Math.min(idx, 8) * 60}ms` }">
          <div class="flex items-center gap-4">
            <img v-if="photo(a)" :src="photo(a)" :alt="`Foto de ${a.pets?.name || 'la mascota'}`" class="h-16 w-16 shrink-0 rounded-xl object-cover" loading="lazy" />
            <div v-else class="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#FCD8B8]/40 text-2xl text-ink-soft">🐾</div>
            <div class="min-w-0">
              <p class="truncate font-display text-lg font-bold text-[#040404]">{{ a.pets?.name }}</p>
              <p class="text-xs text-ink-soft">{{ summary(a) }}</p>
            </div>
          </div>
          <div class="mt-4">
            <HealthRecordList :records="a.vaccination_records" empty-text="El refugio aún no cargó el calendario de salud de esta mascota.">
              <template #actions="{ record, status }">
                <button
                  v-if="status !== 'completada'"
                  type="button"
                  class="min-h-[44px] rounded-xl bg-[#BA8C71] px-3 text-sm font-bold text-white transition hover:bg-[#E1A16C] sm:min-h-0 sm:py-1.5"
                  @click="toComplete = { record, petName: a.pets?.name }"
                >Marcar como completada</button>
              </template>
            </HealthRecordList>
          </div>
        </li>
      </ul>
    </div>

    <CompleteHealthModal :record="toComplete?.record || null" :pet-name="toComplete?.petName || ''" @close="toComplete = null" @done="onDone" />
  </DashboardLayout>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import DashboardLayout from '../../components/layout/DashboardLayout.vue'
import HealthRecordList from '../../components/ui/HealthRecordList.vue'
import CompleteHealthModal from '../../components/adoptante/CompleteHealthModal.vue'
import { healthStatus, useHealthStore } from '../../stores/healthStore'

const store = useHealthStore()
const toComplete = ref(null)
const flash = ref('')

function summary(a) {
  const recs = a.vaccination_records || []
  const pending = recs.filter((r) => healthStatus(r) !== 'completada').length
  const overdue = recs.filter((r) => healthStatus(r) === 'vencida').length
  if (!recs.length) return 'Sin registros'
  return `${recs.length - pending} de ${recs.length} completados${overdue ? ` · ${overdue} vencido(s)` : ''}`
}

function photo(a) {
  const imgs = a.pets?.pet_images || []
  return (imgs.find((i) => i.is_primary) || imgs[0])?.image_url || null
}

function onDone(message) {
  toComplete.value = null
  flash.value = message
}

onMounted(() => store.fetchMyCalendar())
</script>

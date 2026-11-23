<template>
  <DashboardLayout role="refugio" title="Seguimiento post-adopción">
    <div class="mx-auto max-w-3xl">
      <p class="mb-6 text-sm text-ink-soft">Registra llamadas, visitas y mensajes para saber cómo se adaptan tus mascotas adoptadas.</p>

      <div v-if="flash" class="mp-fade-up mb-4 rounded-xl border border-[#E1A16C]/40 bg-[#FCD8B8]/40 px-4 py-3 text-sm font-medium text-[#040404]" role="status">✅ {{ flash }}</div>

      <div v-if="store.loading && !store.adoptions.length" class="space-y-4">
        <div v-for="n in 2" :key="n" class="h-44 animate-pulse rounded-2xl bg-[#A3AEB9]/20"></div>
      </div>

      <div v-else-if="store.error && !store.adoptions.length" class="rounded-2xl border border-alert/30 bg-alert-container py-12 text-center text-alert" role="alert">{{ store.error }}</div>

      <div v-else-if="!store.adoptions.length" class="rounded-2xl border border-[#A3AEB9]/20 bg-white py-16 text-center shadow-sm">
        <span class="material-symbols-outlined text-[64px] text-ink-soft" style="font-variation-settings: 'FILL' 1" aria-hidden="true">volunteer_activism</span>
        <p class="mt-3 font-medium text-[#040404]">Aún no hay adopciones entregadas para hacer seguimiento.</p>
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
            <div v-else class="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-[#FCD8B8]/40 text-3xl text-ink-soft">🐾</div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-display text-lg font-bold text-[#040404]">{{ a.pets?.name }}</p>
              <p class="text-sm text-[#040404]">Adoptante: {{ a.profiles?.full_name || '—' }}</p>
              <p class="mt-0.5 text-xs text-ink-soft">
                Entregada el {{ formatDate(delivery(a)?.delivered_at || a.resolved_at) }} · {{ a.follow_up_notes?.length || 0 }} nota(s)
              </p>
            </div>
          </div>
          <button type="button" class="mp-btn-primary mt-4 !h-11" @click="toNote = a">Registrar nota de seguimiento</button>

          <div class="mt-5 flex items-center justify-between gap-2">
            <h3 class="font-display text-sm font-bold uppercase tracking-wide text-[#040404]">Calendario de salud</h3>
            <button type="button" class="min-h-[44px] rounded-xl border border-[#A3AEB9]/40 bg-white px-3 text-sm font-semibold text-[#040404] transition hover:bg-[#FCD8B8]/40 sm:min-h-0 sm:py-1.5" @click="toHealth = { applicationId: a.id, petName: a.pets?.name }">+ Agregar</button>
          </div>
          <div class="mt-3">
            <HealthRecordList :records="a.vaccination_records || []" empty-text="Sin registros. Agrega la primera vacuna o desparasitación.">
              <template #actions="{ record, status }">
                <span v-if="status !== 'completada'" class="flex gap-1">
                  <button type="button" class="min-h-[44px] rounded-lg px-2 text-xs font-semibold text-[#8F6349] hover:bg-[#FCD8B8]/40 sm:min-h-0 sm:py-1" @click="toHealth = { applicationId: a.id, petName: a.pets?.name, record }">Editar</button>
                  <button type="button" class="min-h-[44px] rounded-lg px-2 text-xs font-semibold text-alert hover:bg-alert-container sm:min-h-0 sm:py-1" @click="removeRecord(record)">Quitar</button>
                </span>
              </template>
            </HealthRecordList>
          </div>

          <h3 class="mt-5 font-display text-sm font-bold uppercase tracking-wide text-[#040404]">Historial</h3>
          <div class="mt-3"><FollowUpTimeline :notes="a.follow_up_notes || []" empty-text="Aún no registraste notas para esta adopción." /></div>
        </li>
      </ul>
    </div>

    <HealthRecordModal :target="toHealth" :reload="store.fetchShelterAdoptions" @close="toHealth = null" @done="onDone" />
    <FollowUpNoteModal :adoption="toNote" @close="toNote = null" @done="onDone" />
  </DashboardLayout>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import DashboardLayout from '../../components/layout/DashboardLayout.vue'
import FollowUpTimeline from '../../components/ui/FollowUpTimeline.vue'
import HealthRecordList from '../../components/ui/HealthRecordList.vue'
import HealthRecordModal from '../../components/refugio/HealthRecordModal.vue'
import FollowUpNoteModal from '../../components/refugio/FollowUpNoteModal.vue'
import { useFollowUpStore } from '../../stores/followUpStore'
import { useHealthStore } from '../../stores/healthStore'

const store = useFollowUpStore()
const health = useHealthStore()
const toNote = ref(null)
const toHealth = ref(null)
const flash = ref('')

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

async function removeRecord(record) {
  if (!window.confirm(`¿Quitar "${record.vaccine_name}" del calendario?`)) return
  const result = await health.deleteRecord(record.id, store.fetchShelterAdoptions)
  flash.value = result.success ? 'Registro eliminado' : result.error
}

function onDone(message) {
  toNote.value = null
  toHealth.value = null
  flash.value = message // HU-44 CA#4
}

onMounted(() => store.fetchShelterAdoptions())
</script>

<template>
  <div v-if="!online || justSynced" class="fixed inset-x-0 top-0 z-[80] px-4 py-2 text-center text-sm font-semibold" :class="online ? 'bg-emerald-600 text-white' : 'bg-[#040404] text-white'" role="status" aria-live="polite">
    <template v-if="!online">
      <span class="material-symbols-outlined mr-1 align-middle text-[18px]" aria-hidden="true">cloud_off</span>Estás navegando sin conexión
    </template>
    <template v-else>Conexión recuperada. Se enviaron tus cambios pendientes.</template>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { isOffline } from '../../services/offlineQueue'

// App.vue envía los cambios en cola al volver la red y avisa con el evento `matchpet:synced`.
const online = ref(!isOffline())
const justSynced = ref(false)
let timer

const goOffline = () => { online.value = false }
const goOnline = () => { online.value = true }
const onSynced = () => {
  justSynced.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { justSynced.value = false }, 4000)
}

onMounted(() => {
  window.addEventListener('offline', goOffline)
  window.addEventListener('online', goOnline)
  window.addEventListener('matchpet:synced', onSynced)
})
onBeforeUnmount(() => {
  window.removeEventListener('offline', goOffline)
  window.removeEventListener('online', goOnline)
  window.removeEventListener('matchpet:synced', onSynced)
  clearTimeout(timer)
})
</script>

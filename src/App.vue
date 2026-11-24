<template>
  <OfflineBanner />
  <RouterView />
</template>

<script setup>
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useAuthStore } from './stores/authStore'
import { useNotificationStore } from './stores/notificationStore'
import { usePetStore } from './stores/petStore'
import OfflineBanner from './components/ui/OfflineBanner.vue'

const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const petStore = usePetStore()

// HU-55 CA#4: al volver la red se envían las acciones que quedaron en cola.
async function syncOfflineQueue() {
  if (!authStore.user?.id) return
  const sent = await petStore.syncPendingFavorites()
  if (sent > 0) window.dispatchEvent(new Event('matchpet:synced'))
}

// HU-41: el Realtime vive mientras haya sesión (login, recarga y logout).
// Se orquesta aquí, no en authStore, para que los stores no se importen entre sí.
watch(
  () => authStore.user?.id,
  (id) => {
    if (id) {
      notificationStore.subscribeToRealtime()
      notificationStore.fetchNotifications()
    } else {
      notificationStore.unsubscribeFromRealtime()
      notificationStore.notifications = []
      notificationStore.unreadCount = 0
    }
  },
  { immediate: true }
)

// El splash estático de index.html se retira cuando Vue ya montó la app,
// evitando la pantalla en blanco durante la restauración de sesión (HU-09).
onMounted(() => {
  window.addEventListener('online', syncOfflineQueue)
  syncOfflineQueue()
  const boot = document.getElementById('app-boot')
  if (boot) boot.remove()
})
onBeforeUnmount(() => window.removeEventListener('online', syncOfflineQueue))
</script>

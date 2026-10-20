<template>
  <RouterView />
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useAuthStore } from './stores/authStore'
import { useNotificationStore } from './stores/notificationStore'

const authStore = useAuthStore()
const notificationStore = useNotificationStore()

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
  const boot = document.getElementById('app-boot')
  if (boot) boot.remove()
})
</script>

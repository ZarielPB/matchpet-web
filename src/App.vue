<template>
  <RouterView />
</template>

<script setup>
import { onMounted } from 'vue'

// El splash estático de index.html se retira cuando Vue ya montó la app,
// evitando la pantalla en blanco durante la restauración de sesión (HU-09).
onMounted(() => {
  const boot = document.getElementById('app-boot')
  if (boot) boot.remove()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <div class="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-md">
      <h1 class="text-2xl font-bold text-indigo-600">Panel del Adoptante 🐾</h1>
      <p class="mt-2 text-gray-600">Bienvenido/a, {{ authStore.profile?.full_name || 'Adoptante' }}.</p>
      <p class="mt-4 text-sm text-gray-500">Aquí podrás ver tus mascotas favoritas, el estado de tus solicitudes y más. (Próximamente en Sprint 2)</p>
      <button @click="handleLogout" class="mt-6 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Cerrar Sesión</button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>

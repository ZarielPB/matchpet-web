<template>
  <div class="min-h-screen bg-surface p-4">
    <div class="max-w-4xl mx-auto bg-surface-card p-8 rounded-2xl shadow-card">
      <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-4" style="background-color: #e6f2ee; color: #3b7b75;">
        <span class="material-symbols-outlined text-[14px]">home_work</span>
        <span class="text-[11px] uppercase tracking-wider font-bold">Panel del Refugio</span>
      </div>
      <h1 class="text-2xl font-extrabold text-teal tracking-tight">Panel del Refugio 🏠</h1>
      <p class="mt-2 text-ink-soft">Bienvenido/a, {{ authStore.profile?.shelter_name || 'Refugio' }}.</p>
      <p class="mt-4 text-sm text-ink-soft">Aquí podrás gestionar tus mascotas, revisar solicitudes y ver estadísticas. (Próximamente en Sprint 2)</p>
      <button @click="handleLogout" class="mt-6 px-4 py-2 bg-teal text-white rounded-xl shadow-emerald-btn hover:bg-teal-deep transition">Cerrar Sesión</button>
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
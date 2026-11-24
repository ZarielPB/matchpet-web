<template>
  <section class="rounded-2xl border border-[#A3AEB9]/20 bg-white p-5" aria-labelledby="push-title">
    <div class="flex items-center justify-between gap-4">
      <div class="min-w-0">
        <h2 id="push-title" class="font-display text-base font-bold text-[#040404]">Notificaciones push</h2>
        <p class="mt-1 text-sm text-ink-soft">{{ hint }}</p>
      </div>
      <button
        type="button"
        role="switch"
        :aria-checked="enabled"
        aria-labelledby="push-title"
        class="relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        :class="enabled ? 'bg-[#8F6349]' : 'bg-gray-300'"
        :disabled="support !== 'ok' || busy"
        @click="toggle"
      >
        <span class="absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform" :class="enabled ? 'translate-x-6' : ''" />
      </button>
    </div>
    <p v-if="message" class="mt-3 text-sm text-red-700" role="alert">{{ message }}</p>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { disablePush, enablePush, isPushEnabled, pushSupport } from '../../services/pushClient'

const auth = useAuthStore()
const support = pushSupport()
const enabled = ref(false)
const busy = ref(false)
const message = ref('')

const hint = computed(() => {
  if (support === 'ios-instalar') return 'En iPhone las notificaciones solo funcionan con la app instalada: en Safari pulsa Compartir y "Agregar a pantalla de inicio".'
  if (support === 'no-soportado') return 'Este navegador o dispositivo no admite notificaciones push.'
  return enabled.value ? 'Recibirás avisos de tus solicitudes y recordatorios aunque no tengas la app abierta.' : 'Activa los avisos de solicitudes y recordatorios en este dispositivo.'
})

onMounted(async () => { enabled.value = await isPushEnabled().catch(() => false) })

async function toggle() {
  busy.value = true
  message.value = ''
  const res = enabled.value ? await disablePush() : await enablePush(auth.user?.id)
  if (res.success) enabled.value = !enabled.value
  else message.value = res.error
  busy.value = false
}
</script>

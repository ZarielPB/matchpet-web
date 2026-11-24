<template>
  <div v-if="path" class="mt-2">
    <p v-if="loading" class="text-xs text-ink-soft">Cargando adjunto…</p>
    <p v-else-if="!url" class="text-xs text-ink-soft">No se pudo cargar el adjunto.</p>
    <video v-else-if="isVideo" :src="url" controls preload="metadata" class="max-h-56 w-full rounded-xl bg-[#040404]"></video>
    <a v-else :href="url" target="_blank" rel="noopener">
      <img :src="url" alt="Adjunto del reporte" class="max-h-56 rounded-xl border border-[#A3AEB9]/20 object-cover" loading="lazy" />
    </a>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useFollowUpStore } from '../../stores/followUpStore'

// `loader` permite reutilizarlo con otro bucket privado (por defecto, adjuntos de reportes).
const props = defineProps({ path: { type: String, default: null }, loader: { type: Function, default: null } })
const store = useFollowUpStore()
const url = ref(null)
const loading = ref(!!props.path)
const isVideo = computed(() => /\.(mp4|webm)$/i.test(props.path || ''))

onMounted(async () => {
  if (props.path) url.value = await (props.loader || store.getAttachmentUrl)(props.path)
  loading.value = false
})
</script>

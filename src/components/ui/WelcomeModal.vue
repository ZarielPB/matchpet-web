<template>
  <Transition name="modal">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#040404]/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
      @click.self="emit('close')"
    >
      <div class="modal-card relative w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
        <span class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FCD8B8] text-[#BA8C71]">
          <span
            class="material-symbols-outlined text-[40px]"
            style="font-variation-settings: 'FILL' 1"
            aria-hidden="true"
          >
            pets
          </span>
        </span>

        <h2 id="welcome-modal-title" class="mt-5 font-display text-2xl font-black text-[#040404]">
          ¡Bienvenido/a, {{ displayName }}!
        </h2>
        <p class="mx-auto mt-2 max-w-xs text-sm text-[#A3AEB9]">{{ message }}</p>

        <button
          type="button"
          class="mt-6 w-full rounded-xl bg-[#BA8C71] px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#E1A16C]"
          @click="emit('close')"
        >
          Empezar el día
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  userName: { type: String, default: '' },
  role: { type: String, default: '' }
})
const emit = defineEmits(['close'])

const displayName = computed(() => props.userName?.trim() || 'amigo')

const message = computed(() =>
  props.role === 'refugio'
    ? 'Gracias por seguir dando segundas oportunidades hoy.'
    : 'Hoy podrías encontrar a tu nuevo mejor amigo.'
)

function onKeydown(event) {
  if (event.key === 'Escape') emit('close')
}

watch(
  () => props.show,
  (open) => {
    if (open) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  }
)

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active .modal-card,
.modal-leave-active .modal-card {
  transition: transform 0.32s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.32s ease;
}
.modal-enter-from .modal-card,
.modal-leave-to .modal-card {
  opacity: 0;
  transform: scale(0.92) translateY(10px);
}

@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active .modal-card,
  .modal-leave-active .modal-card {
    transition: none;
  }
  .modal-enter-from .modal-card,
  .modal-leave-to .modal-card {
    transform: none;
  }
}
</style>

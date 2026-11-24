<template>
  <div v-if="chat.available" class="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
    <section
      v-if="open"
      id="chat-panel"
      class="flex h-[min(32rem,calc(100dvh-7rem))] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-[#A3AEB9]/30 bg-white shadow-2xl"
      role="dialog"
      aria-label="Asistente MatchPet"
    >
      <header class="flex items-center justify-between gap-2 bg-[#8F6349] px-4 py-3 text-white">
        <div class="min-w-0">
          <p class="truncate font-display text-sm font-black">Asistente MatchPet</p>
          <p class="truncate text-xs text-white/80">Dudas sobre adopción y compatibilidad</p>
        </div>
        <div class="flex shrink-0 items-center">
          <button v-if="chat.messages.length" type="button" class="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/15" aria-label="Nueva conversación" @click="chat.reset()">
            <span class="material-symbols-outlined text-[20px]" aria-hidden="true">restart_alt</span>
          </button>
          <button type="button" class="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/15" aria-label="Cerrar asistente" @click="open = false">
            <span class="material-symbols-outlined text-[22px]" aria-hidden="true">close</span>
          </button>
        </div>
      </header>

      <div ref="listEl" class="flex-1 space-y-3 overflow-y-auto bg-[#FCD8B8]/10 px-4 py-3" aria-live="polite">
        <p v-if="!chat.messages.length" class="rounded-xl bg-white p-3 text-sm text-ink-soft">
          ¡Hola! Soy el asistente de MatchPet. Pregúntame por el cuidado de una mascota o por qué tu compatibilidad es la que ves.
        </p>
        <div v-for="(m, i) in chat.messages" :key="i" class="flex" :class="m.role === 'user' ? 'justify-end' : 'justify-start'">
          <p
            class="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm"
            :class="m.role === 'user' ? 'bg-[#8F6349] text-white' : m.error ? 'bg-amber-50 text-amber-900' : 'bg-white text-ink shadow-sm'"
          >{{ m.content }}</p>
        </div>
        <p v-if="chat.sending" class="text-xs text-ink-soft" role="status">
          {{ chat.waking ? 'Despertando al asistente, puede tardar hasta un minuto…' : 'Escribiendo…' }}
        </p>
      </div>

      <form class="flex items-end gap-2 border-t border-[#A3AEB9]/20 bg-white p-3" @submit.prevent="submit">
        <label for="chat-input" class="sr-only">Escribe tu pregunta</label>
        <textarea
          id="chat-input"
          v-model="draft"
          rows="1"
          maxlength="1000"
          :disabled="chat.limitReached"
          :placeholder="chat.limitReached ? 'Llegaste al límite de esta conversación' : 'Escribe tu pregunta…'"
          class="max-h-24 min-h-11 flex-1 resize-none rounded-xl border border-[#A3AEB9]/40 px-3 py-2.5 text-sm focus:border-[#BA8C71] focus:outline-none disabled:bg-gray-100"
          @keydown.enter.exact.prevent="submit"
        />
        <button type="submit" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#8F6349] text-white disabled:opacity-50" :disabled="!draft.trim() || chat.sending || chat.limitReached" aria-label="Enviar mensaje">
          <span class="material-symbols-outlined text-[22px]" aria-hidden="true">send</span>
        </button>
      </form>
    </section>

    <button
      type="button"
      class="flex h-14 w-14 items-center justify-center rounded-full bg-[#8F6349] text-white shadow-lg hover:bg-[#7a5440]"
      :aria-label="open ? 'Cerrar asistente' : 'Abrir asistente de IA'"
      :aria-expanded="open"
      aria-controls="chat-panel"
      @click="open = !open"
    >
      <span class="material-symbols-outlined text-[28px]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">{{ open ? 'close' : 'smart_toy' }}</span>
    </button>
  </div>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { useChatStore } from '../../stores/chatStore'

const chat = useChatStore()
const open = ref(false)
const draft = ref('')
const listEl = ref(null)

async function submit() {
  const text = draft.value
  if (!text.trim()) return
  draft.value = ''
  await chat.send(text)
}

watch(
  () => [chat.messages.length, chat.sending, open.value],
  async () => {
    await nextTick()
    if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
  }
)
</script>

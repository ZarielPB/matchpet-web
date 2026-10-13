<template>
  <div class="min-h-screen bg-[#FCD8B8]/20">
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-300"
      leave-to-class="opacity-0"
    >
      <div
        v-if="mobileOpen"
        class="fixed inset-0 z-40 bg-[#040404]/50 backdrop-blur-sm lg:hidden"
        aria-hidden="true"
        @click="closeMobile"
      />
    </Transition>

    <aside
      id="dashboard-sidebar"
      class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#A3AEB9]/20 bg-white transition-transform duration-300 ease-out lg:translate-x-0"
      :class="mobileOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex h-20 shrink-0 items-center justify-between px-5">
        <RouterLink to="/" class="flex items-center gap-3" aria-label="MatchPet inicio">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#BA8C71] text-white">
            <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">pets</span>
          </span>
          <span class="font-display text-xl font-black tracking-tight text-[#040404]">
            Match<span class="text-[#BA8C71]">Pet</span>
          </span>
        </RouterLink>
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-lg text-[#A3AEB9] hover:bg-[#FCD8B8]/50 hover:text-[#040404] lg:hidden"
          aria-label="Cerrar menú"
          @click="closeMobile"
        >
          <span class="material-symbols-outlined text-[22px]" aria-hidden="true">close</span>
        </button>
      </div>

      <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Navegación del panel">
        <RouterLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200"
          :class="isActive(item)
            ? 'bg-[#E1A16C]/15 text-[#E1A16C]'
            : 'text-[#040404] hover:bg-[#FCD8B8]/50'"
          :aria-current="isActive(item) ? 'page' : undefined"
          @click="closeMobile"
        >
          <span
            class="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#E1A16C] transition-all duration-200"
            :class="isActive(item) ? 'opacity-100' : 'opacity-0'"
            aria-hidden="true"
          />
          <span
            class="material-symbols-outlined text-[21px] transition-colors duration-200"
            :class="isActive(item) ? 'text-[#E1A16C]' : 'text-[#BA8C71] group-hover:text-[#E1A16C]'"
            style="font-variation-settings: 'FILL' 1"
            aria-hidden="true"
          >
            {{ item.icon }}
          </span>
          <span class="truncate">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="shrink-0 border-t border-[#A3AEB9]/20 p-3">
        <div class="flex items-center gap-3 rounded-xl px-2 py-2">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#BA8C71] text-sm font-bold text-white">
            {{ initials }}
          </span>
          <div class="min-w-0">
            <p class="truncate text-sm font-bold text-[#040404]">{{ displayName }}</p>
            <p class="truncate text-xs text-[#A3AEB9]">{{ roleLabel }}</p>
          </div>
        </div>
        <button
          type="button"
          class="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#040404] transition-colors duration-200 hover:bg-[#FCD8B8]/50 hover:text-[#E1A16C]"
          @click="handleLogout"
        >
          <span class="material-symbols-outlined text-[21px] text-[#BA8C71]" aria-hidden="true">logout</span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>

    <div class="flex min-h-screen flex-col lg:pl-64">
      <header class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[#A3AEB9]/20 bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:hidden">
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-xl text-[#040404] hover:bg-[#FCD8B8]/50"
          aria-label="Abrir menú"
          aria-controls="dashboard-sidebar"
          :aria-expanded="mobileOpen"
          @click="mobileOpen = true"
        >
          <span class="material-symbols-outlined text-[24px]" aria-hidden="true">menu</span>
        </button>
        <span class="font-display text-lg font-black tracking-tight text-[#040404]">
          Match<span class="text-[#BA8C71]">Pet</span>
        </span>
      </header>

      <main class="flex-1 p-4 sm:p-6 lg:p-8">
        <div v-if="title" class="mb-6">
          <h1 class="font-display text-2xl font-black tracking-tight text-[#040404] sm:text-3xl">{{ title }}</h1>
        </div>
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/authStore'

const NAV_BY_ROLE = {
  adoptante: [
    { to: '/adoptante/dashboard', label: 'Inicio', icon: 'dashboard' },
    { to: '/catalogo', label: 'Explorar catálogo', icon: 'travel_explore' },
    { to: '/favoritos', label: 'Mis favoritos', icon: 'favorite' },
    { to: '/adoptante/perfil', label: 'Mi perfil', icon: 'account_circle' }
  ],
  refugio: [
    { to: '/refugio/dashboard', label: 'Inicio', icon: 'dashboard' },
    { to: '/refugio/mascotas', label: 'Gestionar mascotas', icon: 'pets' },
    { to: '/refugio/perfil', label: 'Mi refugio', icon: 'home_work' },
    { to: '/catalogo', label: 'Ver catálogo', icon: 'storefront' }
  ]
}

const props = defineProps({
  role: { type: String, default: 'adoptante' },
  nav: { type: Array, default: null },
  title: { type: String, default: '' }
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const mobileOpen = ref(false)

const items = computed(() => props.nav ?? NAV_BY_ROLE[props.role] ?? NAV_BY_ROLE.adoptante)

const roleLabel = computed(() => (props.role === 'refugio' ? 'Refugio' : 'Adoptante'))

const displayName = computed(() => authStore.profile?.full_name || roleLabel.value)

const initials = computed(() => {
  const name = authStore.profile?.full_name?.trim()
  if (!name) return roleLabel.value.charAt(0)
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
})

function isActive(item) {
  return route.path === item.to || route.path.startsWith(`${item.to}/`)
}

function closeMobile() {
  mobileOpen.value = false
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

watch(() => route.path, closeMobile)

watch(mobileOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

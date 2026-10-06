<template>
  <!--
    NOTA: se usa overflow-x-CLIP (no overflow-x-HIDDEN) a propósito.
    `overflow-x: hidden` hace que `overflow-y` compute a `auto`, convirtiendo este
    div en scroll container. Eso rompe `position: sticky` del <header>, porque
    sticky se resuelve contra el ancestro scrolleable más cercano (este div, que
    nunca scrollea) en lugar de contra el viewport.
    `overflow: clip` recorta igual en X pero NO crea scroll container -> sticky funciona.
  -->
  <div class="min-h-screen bg-[#faf9fe] text-slate-800 font-sans antialiased overflow-x-clip">
    <!-- ══════════ HEADER (STICKY) ══════════ -->
    <header
      :class="[
        'sticky top-0 z-50 border-b transition-all duration-300',
        isScrolled
          ? 'bg-white/95 backdrop-blur-xl border-purple-200/70 shadow-[0_12px_30px_-20px_rgba(55,20,87,0.5)]'
          : 'bg-white/85 backdrop-blur-md border-purple-100',
      ]"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        <router-link to="/" class="flex items-center gap-3 group shrink-0" aria-label="MatchPet - Ir al inicio">
          <div
            class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-purple to-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-900/20 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300"
          >
            <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 13.5c-1.6 0-3 1.2-3 2.8 0 1.9 1.6 3.7 3 3.7s3-1.8 3-3.7c0-1.6-1.4-2.8-3-2.8zm-4.7-2.7c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm9.4 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-7.2-4.5c-1.2 0-2.2 1-2.2 2.2 0 1.2 1 2.2 2.2 2.2s2.2-1 2.2-2.2c0-1.2-1-2.2-2.2-2.2zm5 0c-1.2 0-2.2 1-2.2 2.2 0 1.2 1 2.2 2.2 2.2s2.2-1 2.2-2.2c0-1.2-1-2.2-2.2-2.2z"></path>
            </svg>
          </div>
          <div class="flex flex-col">
            <span
              class="text-2xl font-black tracking-tight text-brand-purple font-display leading-tight flex items-center"
            >
              Match<span class="text-purple-600">Pet</span>
            </span>
            <span class="text-[10px] font-semibold text-teal-600 tracking-wider uppercase -mt-1">Adopción Responsable</span>
          </div>
        </router-link>

        <nav class="hidden md:flex items-center gap-1 text-sm font-semibold text-slate-600" aria-label="Navegación principal">
          <a
            v-for="link in navLinks"
            :key="link.target"
            :href="`#${link.target}`"
            :class="[
              'relative px-3 py-2 rounded-lg transition-colors duration-200 hover:text-brand-purple',
              activeSection === link.target ? 'text-brand-purple' : '',
            ]"
            :aria-current="activeSection === link.target ? 'true' : undefined"
          >
            {{ link.label }}
            <span
              :class="[
                'absolute left-3 right-3 -bottom-0.5 h-0.5 rounded-full bg-brand-purple transition-all duration-300',
                activeSection === link.target ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0',
              ]"
              aria-hidden="true"
            ></span>
          </a>
        </nav>

        <div class="flex items-center gap-2 sm:gap-3">
          <router-link
            to="/login"
            class="hidden sm:inline-flex px-5 py-2.5 rounded-xl bg-brand-purple text-white text-sm font-semibold shadow-md shadow-purple-950/20 hover:bg-purple-900 hover:-translate-y-0.5 transition-all duration-200 items-center gap-2"
          >
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">login</span>
            Ingresar
          </router-link>
          <button
            type="button"
            class="md:hidden w-10 h-10 rounded-xl border border-purple-200 bg-white text-brand-purple flex items-center justify-center hover:bg-purple-50 transition-colors duration-200"
            :aria-expanded="isMobileMenuOpen"
            aria-controls="mp-mobile-menu"
            aria-label="Abrir menú de navegación"
            @click="isMobileMenuOpen = !isMobileMenuOpen"
          >
            <span class="material-symbols-outlined text-[22px]" aria-hidden="true">{{
              isMobileMenuOpen ? 'close' : 'menu'
            }}</span>
          </button>
        </div>
      </div>
      <Teleport to="body">
        <Transition name="mp-overlay">
          <div
            v-if="isMobileMenuOpen"
            class="md:hidden fixed inset-x-0 top-20 bottom-0 z-40 bg-brand-deep/50"
            aria-hidden="true"
            @click="closeMobileMenu"
          ></div>
        </Transition>
      </Teleport>
      <Transition name="mp-menu">
        <div
          v-if="isMobileMenuOpen"
          id="mp-mobile-menu"
          class="md:hidden absolute inset-x-0 top-20 z-50 bg-white border-b border-purple-200 shadow-[0_24px_48px_-16px_rgba(35,11,59,0.45)]"
        >
          <nav class="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-1" aria-label="Navegación móvil">
            <a
              v-for="link in navLinks"
              :key="link.target"
              :href="`#${link.target}`"
              :class="[
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors duration-200',
                activeSection === link.target
                  ? 'bg-purple-50 text-brand-purple'
                  : 'text-slate-700 hover:bg-surface-low hover:text-brand-purple',
              ]"
              @click="closeMobileMenu"
            >
              <span
                class="material-symbols-outlined text-[20px] shrink-0"
                :class="activeSection === link.target ? 'text-brand-purple' : 'text-slate-500'"
                aria-hidden="true"
                >{{ link.icon }}</span
              >
              {{ link.label }}
            </a>
            <router-link
              to="/login"
              class="mt-2 sm:hidden inline-flex justify-center items-center gap-2 px-5 py-3 rounded-xl bg-brand-purple text-white text-sm font-semibold shadow-md shadow-purple-950/20"
              @click="closeMobileMenu"
            >
              <span class="material-symbols-outlined text-[18px]" aria-hidden="true">login</span>
              Ingresar
            </router-link>
          </nav>
        </div>
      </Transition>
    </header>

    <!-- ══════════ HERO ══════════ -->
    <section id="hero" class="mp-section-top relative overflow-hidden pt-28 pb-20 hero-glow">
      <div class="absolute inset-0 paw-pattern pointer-events-none" aria-hidden="true"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="flex items-center justify-center mb-6" v-reveal>
          <span
            class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-purple-200 text-xs font-bold text-brand-purple shadow-sm"
          >
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true"></span>
            ¡Conecta con tu compañero ideal en Bolivia!
            <span class="material-symbols-outlined text-[15px] text-teal-600" aria-hidden="true">location_on</span>
          </span>
        </div>

        <div class="text-center max-w-3xl mx-auto">
          <h1
            v-reveal="80"
            class="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15] font-display flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 sm:gap-3"
          >
            <span class="inline-flex items-center justify-center gap-2">
              <span class="material-symbols-outlined text-brand-purple" style="font-variation-settings: 'FILL' 1" aria-hidden="true">pets</span>
              MatchPet
            </span>
            <span class="block mp-gradient-text">Encuentra a tu compañero ideal</span>
          </h1>
          <p v-reveal="160" class="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Conectamos refugios de Bolivia con adoptantes responsables mediante un algoritmo de compatibilidad. Menos
            devoluciones, más hogares felices.
          </p>
        </div>

        <div v-reveal="220" class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <router-link
            to="/registro"
            class="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-purple text-white font-bold text-base shadow-xl shadow-brand-purple/25 hover:bg-purple-900 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
          >
            Quiero adoptar
            <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">pets</span>
          </router-link>
          <router-link
            to="/registro-refugio"
            class="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white text-teal-700 border-2 border-teal-600/80 font-bold text-base hover:bg-teal-50 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
          >
            Soy un refugio
            <span class="material-symbols-outlined text-[21px]" aria-hidden="true">home_work</span>
          </router-link>
        </div>

        <!-- Hero Visual Composition -->
        <div v-reveal data-reveal="zoom" class="mt-14 relative max-w-4xl mx-auto">
          <div
            class="relative bg-white rounded-3xl p-6 sm:p-10 border border-purple-100 shadow-soft overflow-hidden mp-ring-brand"
          >
            <div class="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-purple-100/60 pointer-events-none blur-2xl" aria-hidden="true"></div>
            <div class="absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-teal-100/50 pointer-events-none blur-xl" aria-hidden="true"></div>

            <div class="grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative">
              <div class="md:col-span-5 space-y-4">
                <span class="inline-block text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                  Match Destacado del Día
                </span>
                <h3 class="text-2xl font-black text-brand-purple font-display">Pequeños listos para dar y recibir amor</h3>
                <p class="text-slate-600 text-sm leading-relaxed">
                  Cada peludo proviene de refugios certificados en Bolivia. Evaluamos su personalidad, energía y
                  necesidades para asegurar que su próximo hogar sea definitivo y lleno de amor.
                </p>
                <div class="bg-purple-50/80 backdrop-blur-sm border border-purple-200/80 p-3 rounded-2xl flex items-center gap-3 w-max">
                  <div
                    class="w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-400 to-teal-600 flex items-center justify-center text-white"
                    aria-hidden="true"
                  >
                    <span class="material-symbols-outlined text-[26px]" style="font-variation-settings: 'FILL' 1">pets</span>
                  </div>
                  <div>
                    <h4 class="text-sm font-bold text-slate-800 leading-tight">Mark • 1 año</h4>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span class="h-2 w-20 bg-purple-200 rounded-full overflow-hidden block">
                        <span class="h-full bg-teal-500 w-[94%] block"></span>
                      </span>
                      <span class="text-[11px] font-bold text-teal-700">98% Match</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="md:col-span-7 relative flex justify-center">
                <div class="relative w-72 sm:w-80 md:w-96 aspect-square rounded-full bg-gradient-to-tr from-brand-purple to-purple-400 p-2 shadow-2xl">
                  <img
                    src="/cat_dog.png"
                    alt="Perro y gato adoptables"
                    class="w-full h-full object-cover rounded-full"
                    loading="lazy"
                  />
                </div>

                <div
                  class="absolute -top-4 right-2 sm:right-6 bg-white border border-purple-100 p-3 rounded-2xl shadow-xl flex items-center gap-3"
                >
                  <div
                    class="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-300 to-amber-500 flex items-center justify-center text-white"
                    aria-hidden="true"
                  >
                    <span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' 1">pets</span>
                  </div>
                  <div>
                    <div class="flex items-center justify-between gap-4">
                      <span class="text-xs font-bold text-slate-900">Tiny (Mestizo)</span>
                      <span class="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true"></span>
                    </div>
                    <div class="w-24 bg-purple-100 h-1.5 rounded-full mt-1.5">
                      <div class="bg-brand-purple h-1.5 rounded-full w-[95%]"></div>
                    </div>
                    <span class="text-[10px] text-purple-700 font-semibold mt-1 block">Compatible con departamento</span>
                  </div>
                </div>

                <div
                  class="absolute bottom-4 left-2 sm:left-4 bg-white/95 backdrop-blur border border-emerald-200 px-3.5 py-2 rounded-xl shadow-lg flex items-center gap-2"
                >
                  <div
                    class="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"
                    aria-hidden="true"
                  >
                    <span class="material-symbols-outlined text-[16px]">verified</span>
                  </div>
                  <span class="text-xs font-bold text-slate-800">Vacunación &amp; Esterilización Obligatoria</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3 Value Pillars -->
        <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div
            v-for="(pillar, i) in pillars"
            :key="pillar.title"
            v-reveal="i * 110"
            class="group bg-white rounded-2xl p-7 border border-purple-100 shadow-soft text-center shadow-hover"
          >
            <div
              :class="['w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110', pillar.bg, pillar.textColor]"
              aria-hidden="true"
            >
              <span class="material-symbols-outlined text-[30px]">{{ pillar.icon }}</span>
            </div>
            <h2 class="text-lg font-bold text-slate-900 mb-2">{{ pillar.title }}</h2>
            <p class="text-sm text-slate-600 leading-relaxed">{{ pillar.text }}</p>
          </div>
        </div>

        <p v-reveal class="text-center text-sm text-slate-500 mt-8">
          ¿Ya tienes cuenta activa?
          <router-link to="/login" class="text-brand-purple font-bold underline decoration-purple-400 hover:text-purple-900">
            Inicia sesión aquí
          </router-link>
        </p>
      </div>
    </section>

    <!-- ══════════ NOSOTROS ══════════ -->
    <section id="empresa" class="mp-section py-20 bg-white relative border-t border-purple-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div class="lg:col-span-6 space-y-6">
            <div class="flex items-center gap-2" v-reveal data-reveal="left">
              <span class="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-teal-600 bg-teal-50 px-3 py-1.5 rounded-full border border-teal-200">
                Sobre MatchPet
                <span class="material-symbols-outlined text-[15px]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">pets</span>
              </span>
            </div>
            <h2
              v-reveal="80"
              data-reveal="left"
              class="text-3xl sm:text-4xl font-black text-brand-purple font-display tracking-tight leading-tight"
            >
              Un puente tecnológico y humano contra el abandono animal
            </h2>
            <div class="space-y-4 text-slate-600 text-sm sm:text-base leading-relaxed">
              <p v-reveal="140" data-reveal="left">
                MatchPet nace para transformar las adopciones informales y desorganizadas de redes sociales en procesos
                seguros, transparentes y duraderos en La Paz, El Alto, Santa Cruz y Cochabamba. Combatimos las altas
                tasas de devolución y el abandono secundario centralizando a los refugios bolivianos y dando
                visibilidad a los animales 'invisibles': adultos, mestizos y con requerimientos especiales.
              </p>
              <p v-reveal="200" data-reveal="left">
                A través de nuestra evaluación digital integral de hogares, garantizamos que cada adopción sea un
                compromiso de vida consciente, digno y sustentable.
              </p>
            </div>

            <div class="pt-4">
              <h4 v-reveal data-reveal="left" class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                Nuestra propuesta de valor
              </h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  v-for="(value, i) in valueProps"
                  :key="value.title"
                  v-reveal="i * 110"
                  data-reveal="left"
                  :class="['rounded-2xl p-4 shadow-hover mp-ring-brand', value.card, value.border]"
                >
                  <div :class="['w-9 h-9 rounded-xl mb-3 flex items-center justify-center', value.iconBg, value.iconText]" aria-hidden="true">
                    <span class="material-symbols-outlined text-[20px]">{{ value.icon }}</span>
                  </div>
                  <h5 class="font-bold text-slate-900 text-sm">{{ value.title }}</h5>
                  <p class="text-xs text-slate-600 mt-1">{{ value.text }}</p>

                  <!-- Botón que abre el modal de la Ley 700 -->
                  <button
                    v-if="value.action === 'ley700'"
                    type="button"
                    class="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-purple text-white text-xs font-semibold rounded-lg hover:bg-purple-900 hover:-translate-y-0.5 transition-all duration-200"
                    @click="openLey700"
                  >
                    Conoce más
                    <span class="material-symbols-outlined text-[15px]" aria-hidden="true">open_in_new</span>
                  </button>
                  <a
                    v-else
                    :href="value.href"
                    class="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-purple text-white text-xs font-semibold rounded-lg hover:bg-purple-900 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    Ver detalles
                    <span class="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_forward</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div class="lg:col-span-6 relative flex justify-center" v-reveal data-reveal="right">
            <div
              class="relative w-full max-w-md aspect-square rounded-[3rem] bg-gradient-to-tr from-purple-100 to-teal-50 p-4 border border-purple-100 flex items-center justify-center"
            >
              <img
                src="/dogBlack.png"
                alt="Perro feliz saludando"
                class="w-full h-full object-cover rounded-[2.5rem] shadow-xl"
                loading="lazy"
              />
              <div class="absolute -bottom-6 -left-4 sm:-left-6 bg-white border border-purple-100 p-4 rounded-2xl shadow-xl max-w-xs flex items-center gap-3">
                <div
                  class="w-12 h-12 rounded-xl bg-amber-100 text-amber-500 flex items-center justify-center shrink-0"
                  aria-hidden="true"
                >
                  <span class="material-symbols-outlined text-[26px]" style="font-variation-settings: 'FILL' 1">star</span>
                </div>
                <div>
                  <p class="text-xs font-bold text-slate-900">100% Satisfacción</p>
                  <p class="text-[11px] text-slate-500">Seguimiento Veterinario.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════ ¿CÓMO FUNCIONA? ══════════ -->
    <section id="como-funciona" class="mp-section py-24 bg-[#f8f6fc] relative overflow-hidden">
      <div class="absolute inset-0 paw-pattern pointer-events-none" aria-hidden="true"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="text-center max-w-2xl mx-auto mb-16">
          <div class="flex items-center justify-center gap-2 mb-2" v-reveal>
            <span class="text-sm font-bold uppercase tracking-widest text-purple-700">¿CÓMO FUNCIONA?</span>
            <span class="material-symbols-outlined text-brand-purple text-[20px]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">pets</span>
          </div>
          <h2 v-reveal="80" class="text-3xl sm:text-4xl font-black text-slate-900 font-display">
            Tu camino hacia una adopción segura
          </h2>
          <p v-reveal="140" class="mt-3 text-sm sm:text-base text-slate-600">
            Pasos metodológicos basados en compatibilidad real para asegurar bienestar animal permanente.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            v-for="(step, i) in steps"
            :key="step.title"
            v-reveal="i * 110"
            class="group bg-white p-7 rounded-2xl border border-purple-100 shadow-soft text-center shadow-hover relative overflow-hidden"
          >
            <div
              :class="[
                'w-14 h-14 mx-auto mb-5 rounded-2xl text-white flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-110',
                step.bg,
              ]"
              aria-hidden="true"
            >
              <span class="material-symbols-outlined text-[30px]">{{ step.icon }}</span>
            </div>
            <span
              class="absolute top-4 right-5 text-[64px] leading-none font-black text-slate-900/[0.04] select-none"
              aria-hidden="true"
            >
              {{ step.number }}
            </span>
            <h3 class="text-base font-bold text-slate-900 relative">{{ step.title }}</h3>
            <p class="text-xs text-slate-600 mt-2 leading-relaxed relative">{{ step.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════ BENEFICIOS ══════════ -->
    <section id="beneficios" class="mp-section py-10 bg-white relative border-t border-purple-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-14">
          <div class="flex items-center justify-center gap-2 mb-2" v-reveal>
            <span class="text-sm font-bold uppercase tracking-widest text-teal-600">BENEFICIOS</span>
            <span class="material-symbols-outlined text-teal-600 text-[24px]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">emoji_events</span>
          </div>
          <h2 v-reveal="80" class="text-3xl sm:text-4xl font-black text-brand-purple font-display tracking-tight">
            ¿Por qué adoptar con MatchPet?
          </h2>
          <p v-reveal="140" class="mt-3 text-sm sm:text-base text-slate-600">
            Una plataforma pensada para que cada adopción sea definitiva.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="(benefit, i) in benefits"
            :key="benefit.title"
            v-reveal="i * 80"
            class="group bg-[#f8f6fc] rounded-2xl p-6 border border-purple-100 shadow-soft shadow-hover flex gap-4"
          >
            <div
              :class="[
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110',
                benefit.bg,
                benefit.textColor,
              ]"
              aria-hidden="true"
            >
              <span class="material-symbols-outlined text-[22px]">{{ benefit.icon }}</span>
            </div>
            <div>
              <h3 class="font-bold text-slate-900 text-sm">{{ benefit.title }}</h3>
              <p class="text-xs text-slate-600 mt-1 leading-relaxed">{{ benefit.text }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════ DISCOVERY ══════════ -->
    <section id="discovery" class="mp-section py-20 bg-white border-t border-purple-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-10">
          <h2 v-reveal class="text-3xl sm:text-4xl font-black text-brand-purple font-display tracking-tight">DESCUBRELOS</h2>
          <p v-reveal="80" class="text-sm sm:text-base text-slate-600 mt-2">
            Conoce los perfiles compatibles y razas para adopción responsable y convivencia armoniosa.
          </p>
        </div>

        <!-- Filtro por especie -->
        <div v-reveal="120" class="flex flex-wrap items-center justify-center gap-3 mb-10" role="tablist" aria-label="Filtrar por especie">
          <button
            v-for="cat in categories"
            :key="cat.id"
            type="button"
            role="tab"
            :aria-selected="activeCategory === cat.id"
            :class="[
              'inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200',
              activeCategory === cat.id
                ? 'bg-brand-purple text-white shadow-md shadow-brand-purple/25 scale-[1.02]'
                : 'bg-slate-50 hover:bg-purple-50 text-slate-700 border border-slate-200 hover:border-purple-200 hover:-translate-y-0.5',
            ]"
            @click="activeCategory = cat.id"
          >
            <span class="material-symbols-outlined text-[20px]" aria-hidden="true">{{ cat.icon }}</span>
            {{ cat.label }}
          </button>
        </div>

        <!-- Tarjetas filtradas -->
        <TransitionGroup name="pet" tag="div" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <article
            v-for="pet in visiblePets"
            :key="pet.id"
            class="bg-white rounded-2xl border border-purple-100 p-5 shadow-soft shadow-hover flex flex-col mp-ring-brand"
          >
            <div :class="['w-full h-44 rounded-xl overflow-hidden mb-4 bg-gradient-to-tr flex items-center justify-center', pet.grad]">
              <span class="text-6xl drop-shadow-sm" aria-hidden="true">{{ pet.emoji }}</span>
            </div>
            <h3 class="text-lg font-black text-brand-purple tracking-tight font-display">{{ pet.name }}</h3>
            <p class="text-xs text-slate-500 flex items-center gap-1 mt-0.5 mb-4">
              <span class="material-symbols-outlined text-[14px] opacity-70" aria-hidden="true">public</span>
              Origen: {{ pet.origin }}
            </p>

            
            <div class="space-y-3 text-[11px] font-medium text-slate-600">
              <div v-for="trait in pet.traits" :key="trait.label">
                <div class="flex justify-between mb-1">
                  <span>{{ trait.label }}</span>
                  <span class="font-bold text-slate-700">{{ trait.value }}</span>
                </div>
                <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div class="bg-brand-purple h-full rounded-full transition-[width] duration-700" :style="{ width: trait.pct + '%' }"></div>
                </div>
              </div>
            </div>

            <p class="text-xs text-slate-600 mt-4 leading-relaxed flex-1">{{ pet.text }}</p>
            <a
              href="#contacto"
              class="mt-5 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-brand-purple hover:underline pt-4 border-t border-slate-100 transition-colors"
            >
              Conocer Más
              <span class="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_forward</span>
            </a>
          </article>
        </TransitionGroup>

        <!-- Estado vacío (categoría sin fichas cargadas) -->
        <div
          v-if="visiblePets.length === 0"
          class="mt-4 text-center border border-dashed border-purple-200 rounded-2xl bg-[#f8f6fc] py-14 px-6"
        >
          <span class="material-symbols-outlined text-purple-400 text-[44px]" aria-hidden="true">flare</span>
          <h3 class="mt-3 font-bold text-slate-900">Próximamente</h3>
          <p class="mt-1 text-sm text-slate-600 max-w-md mx-auto">
            Todavía no hay perfiles cargados en esta categoría. Escríbenos y te ayudamos a encontrar el
            compañero ideal.
          </p>
          <a
            href="#contacto"
            class="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-purple text-white text-sm font-semibold hover:bg-purple-900 transition-colors"
          >
            Contactar a un refugio
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
          </a>
        </div>

        <p v-if="visiblePets.length > 0" class="flex items-center justify-center gap-2 mt-10 text-xs font-semibold text-slate-500">
          <span class="material-symbols-outlined text-[16px] text-teal-600" aria-hidden="true">info</span>
          Mostrando {{ visiblePets.length }} {{ visiblePets.length === 1 ? 'perfil' : 'perfiles' }} de
          {{ activeCategory === 'perros' ? 'perros' : activeCategory === 'gatos' ? 'gatos' : 'otras especies' }}
        </p>
      </div>
    </section>

    <!-- ══════════ ESTADÍSTICAS DE IMPACTO ══════════ -->
    <section class="bg-[#1e293b] text-white py-16 relative overflow-hidden" data-purpose="metrics-counter">
      <div class="absolute inset-0 paw-pattern pointer-events-none" aria-hidden="true"></div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-700/60">
          <div
            v-for="(stat, i) in stats"
            :key="stat.label"
            v-reveal="i * 90"
            class="pt-4 md:pt-0 px-4"
          >
            <div class="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 mx-auto flex items-center justify-center mb-3" aria-hidden="true">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path :d="stat.path" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
              </svg>
            </div>
            <p class="text-3xl sm:text-4xl font-black font-display text-white">{{ stat.value }}</p>
            <p class="text-xs sm:text-sm text-slate-300 font-medium mt-1">{{ stat.label }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════ TESTIMONIOS ══════════ -->
    <section id="testimonios" class="mp-section py-20 bg-[#f8f6fc] relative overflow-hidden">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-14">
          <div class="flex items-center justify-center gap-2 mb-2" v-reveal>
            <span class="text-sm font-bold uppercase tracking-widest text-purple-700">CASOS DE ÉXITO</span>
            <span class="material-symbols-outlined text-brand-purple text-[20px]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">favorite</span>
          </div>
          <h2 v-reveal="80" class="text-3xl sm:text-4xl font-black text-slate-900 font-display">Historias que cambian vidas</h2>
          <p v-reveal="140" class="mt-3 text-sm sm:text-base text-slate-600">
            Adoptantes, refugios y voluntarios que ya confían en MatchPet.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <figure
            v-for="(t, i) in testimonials"
            :key="t.name"
            v-reveal="i * 110"
            class="bg-white rounded-2xl border border-purple-100 shadow-soft p-7 shadow-hover flex flex-col"
          >
            <div class="flex items-center gap-0.5 text-amber-400" :aria-label="`${t.rating} de 5 estrellas`">
              <span v-for="n in 5" :key="n" class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">star</span>
            </div>
            <blockquote class="text-sm text-slate-600 leading-relaxed mt-4 flex-1">{{ t.text }}</blockquote>
            <figcaption class="flex items-center gap-3 mt-6 pt-5 border-t border-slate-100">
              <div :class="['w-11 h-11 rounded-full text-white flex items-center justify-center font-black shrink-0', t.grad]" aria-hidden="true">
                {{ t.initials }}
              </div>
              <div>
                <p class="text-sm font-bold text-slate-900">{{ t.name }}</p>
                <p class="text-xs text-slate-500">{{ t.role }}</p>
              </div>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- ══════════ CONTACTO ══════════ -->
    <section id="contacto" class="mp-section py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div v-reveal data-reveal="left" class="lg:col-span-6 bg-slate-50/70 p-8 sm:p-10 rounded-3xl border border-purple-100 shadow-soft">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-brand-purple font-black text-2xl font-display">CONTÁCTANOS</span>
              <span class="material-symbols-outlined text-purple-600 text-[22px]" style="font-variation-settings: 'FILL' 1" aria-hidden="true">pets</span>
            </div>
            <p class="text-slate-600 text-sm mb-8">
              Déjanos tu mensaje para iniciar tu proceso de adopción, registrar tu refugio o sumarte como voluntario en
              Bolivia.
            </p>
            <form class="space-y-5" @submit.prevent>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="full-name">Nombre Completo</label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none" aria-hidden="true">person</span>
                  <input
                    class="w-full rounded-xl border-slate-200 text-sm focus:border-brand-purple focus:ring-brand-purple bg-white pl-11 pr-4 py-3"
                    id="full-name"
                    name="full-name"
                    placeholder="Ej: Patricia Mendoza"
                    type="text"
                  >
                </div>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="phone">Número de Teléfono / WhatsApp</label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none" aria-hidden="true">call</span>
                  <input
                    class="w-full rounded-xl border-slate-200 text-sm focus:border-brand-purple focus:ring-brand-purple bg-white pl-11 pr-4 py-3"
                    id="phone"
                    name="phone"
                    placeholder="Ej: +591 70000000"
                    type="tel"
                  >
                </div>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="email">Correo Electrónico</label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none" aria-hidden="true">mail</span>
                  <input
                    class="w-full rounded-xl border-slate-200 text-sm focus:border-brand-purple focus:ring-brand-purple bg-white pl-11 pr-4 py-3"
                    id="email"
                    name="email"
                    placeholder="ejemplo@correo.com"
                    type="email"
                  >
                </div>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" for="interest">Interés principal</label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none" aria-hidden="true">tune</span>
                  <select
                    class="w-full appearance-none rounded-xl border-slate-200 text-sm focus:border-brand-purple focus:ring-brand-purple bg-white pl-11 pr-10 py-3"
                    id="interest"
                    name="interest"
                  >
                    <option>Quiero adoptar responsablemente</option>
                    <option>Soy un albergue / refugio y quiero registrarme</option>
                    <option>Quiero ser voluntario o casa de acogida</option>
                    <option>Apoyo y donaciones a refugios certificados</option>
                  </select>
                  <span class="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none" aria-hidden="true">expand_more</span>
                </div>
              </div>
              <div class="pt-2 flex items-center gap-4">
                <button
                  class="px-7 py-3 rounded-xl bg-brand-purple text-white font-bold text-sm shadow-md hover:bg-purple-900 hover:-translate-y-0.5 transition-all duration-200 flex-1 sm:flex-none inline-flex items-center justify-center gap-2"
                  type="submit"
                >
                  <span class="material-symbols-outlined text-[18px]" aria-hidden="true">send</span>
                  Enviar Consulta
                </button>
                <button
                  class="px-6 py-3 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-colors"
                  type="reset"
                >
                  Limpiar
                </button>
              </div>
            </form>
          </div>

          <div class="lg:col-span-6 flex flex-col items-center justify-center text-center" v-reveal data-reveal="right">
            <div class="relative max-w-md w-full">
              <div class="relative w-72 h-72 sm:w-80 sm:h-80 mx-auto rounded-full p-2 bg-gradient-to-tr from-brand-purple via-purple-400 to-teal-400 shadow-2xl">
                <img
                  src="/dogBlack.png"
                  alt="Mascota rescatada en brazos de un voluntario"
                  class="w-full h-full object-cover rounded-full"
                  loading="lazy"
                />
              </div>
              <div class="mt-8 bg-purple-50 rounded-2xl p-5 border border-purple-100 max-w-sm mx-auto shadow-sm">
                <div class="flex items-center gap-2.5">
                  <span
                    class="w-9 h-9 rounded-xl bg-white text-brand-purple border border-purple-200 flex items-center justify-center shrink-0"
                    aria-hidden="true"
                  >
                    <span class="material-symbols-outlined text-[20px]">verified_user</span>
                  </span>
                  <h4 class="font-bold text-brand-purple text-sm">Adopciones Seguras y Conscientes</h4>
                </div>
                <p class="text-xs text-slate-600 mt-3 leading-relaxed">
                  Validamos cada solicitud para proteger la vida, integridad y salud de cada mascota en Bolivia.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════ FOOTER ══════════ -->
    <footer class="bg-[#f2eefb] border-t border-purple-100 pt-16 pb-12 text-slate-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-purple-200/70">
          <div class="lg:col-span-5 space-y-4">
            <router-link to="/" class="flex items-center gap-3" aria-label="MatchPet">
              <div class="w-10 h-10 rounded-xl bg-brand-purple flex items-center justify-center text-white">
                <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 13.5c-1.6 0-3 1.2-3 2.8 0 1.9 1.6 3.7 3 3.7s3-1.8 3-3.7c0-1.6-1.4-2.8-3-2.8zm-4.7-2.7c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm9.4 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-7.2-4.5c-1.2 0-2.2 1-2.2 2.2 0 1.2 1 2.2 2.2 2.2s2.2-1 2.2-2.2c0-1.2-1-2.2-2.2-2.2zm5 0c-1.2 0-2.2 1-2.2 2.2 0 1.2 1 2.2 2.2 2.2s2.2-1 2.2-2.2c0-1.2-1-2.2-2.2-2.2z"></path>
                </svg>
              </div>
              <span class="text-2xl font-black text-brand-purple font-display tracking-tight">MatchPet</span>
            </router-link>
            <p class="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm">
              La plataforma tecnológica que une hogares amorosos con refugios certificados en Bolivia. Algoritmo de
              compatibilidad, cero devoluciones y seguimiento con amor.
            </p>

            <!-- Contacto con iconos (antes eran emojis) -->
            <ul class="space-y-2.5 text-xs sm:text-sm text-slate-600 font-medium pt-2">
              <li>
                <a href="mailto:contacto@matchpet.bo" class="group flex items-center gap-3 hover:text-brand-purple transition-colors">
                  <span class="w-8 h-8 rounded-lg bg-white border border-purple-200 text-brand-purple flex items-center justify-center group-hover:bg-brand-purple group-hover:text-white transition-colors duration-200 shrink-0" aria-hidden="true">
                    <span class="material-symbols-outlined text-[17px]">mail</span>
                  </span>
                  contacto@matchpet.bo
                </a>
              </li>
              <li>
                <a href="tel:+59170890434" class="group flex items-center gap-3 hover:text-brand-purple transition-colors">
                  <span class="w-8 h-8 rounded-lg bg-white border border-purple-200 text-brand-purple flex items-center justify-center group-hover:bg-brand-purple group-hover:text-white transition-colors duration-200 shrink-0" aria-hidden="true">
                    <span class="material-symbols-outlined text-[17px]">call</span>
                  </span>
                  +591 708-90434 / +591 650-38772
                </a>
              </li>
              <li class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-lg bg-white border border-purple-200 text-brand-purple flex items-center justify-center shrink-0" aria-hidden="true">
                  <span class="material-symbols-outlined text-[17px]">location_on</span>
                </span>
                La Paz • El Alto • Cochabamba • Santa Cruz
              </li>
            </ul>

            <!-- Redes sociales con SVG (antes eran "Ig/Fb/In") -->
            <div class="flex items-center gap-3 pt-3">
              <a
                v-for="social in socials"
                :key="social.name"
                href="#"
                :aria-label="social.name"
                class="w-9 h-9 rounded-xl bg-white border border-purple-200 text-brand-purple flex items-center justify-center hover:bg-brand-purple hover:text-white hover:-translate-y-0.5 transition-all duration-200"
              >
                <!-- INSERTAR ICONO MODERNO AQUÍ si prefieres otro set: svg oficial de la marca -->
                <svg class="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path :d="social.path"></path>
                </svg>
              </a>
            </div>
          </div>

          <div class="lg:col-span-3 space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-brand-purple">Plataforma</h4>
            <ul class="space-y-2 text-xs sm:text-sm text-slate-600">
              <li><router-link to="/registro" class="hover:text-brand-purple transition">Quiero adoptar</router-link></li>
              <li><router-link to="/registro-refugio" class="hover:text-brand-purple transition">Registrar mi refugio</router-link></li>
              <li><router-link to="/login" class="hover:text-brand-purple transition">Iniciar sesión</router-link></li>
              <li><a href="#como-funciona" class="hover:text-brand-purple transition">Cómo funciona</a></li>
              <li><a href="#beneficios" class="hover:text-brand-purple transition">Beneficios</a></li>
            </ul>
          </div>

          <div class="lg:col-span-2 space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-brand-purple">Navegación</h4>
            <ul class="space-y-2 text-xs sm:text-sm text-slate-600">
              <li><a href="#hero" class="hover:text-brand-purple transition">Inicio</a></li>
              <li><a href="#empresa" class="hover:text-brand-purple transition">Sobre Nosotros</a></li>
              <li><a href="#discovery" class="hover:text-brand-purple transition">Discovery Razas</a></li>
              <li><a href="#testimonios" class="hover:text-brand-purple transition">Casos de Éxito</a></li>
              <li><a href="#contacto" class="hover:text-brand-purple transition">Contacto</a></li>
            </ul>
          </div>

         
        </div>

        <div class="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p class="flex items-center gap-1.5">
            © 2026 MatchPet. Todos los derechos reservados. Hecho con
            <span class="material-symbols-outlined text-[15px] text-rose-500 align-middle" style="font-variation-settings: 'FILL' 1" aria-label="amor">favorite</span>
            para las mascotas.
          </p>
          <div class="flex flex-wrap justify-center gap-6">
            <a href="#" class="hover:underline">Políticas de Privacidad</a>
            <a href="#" class="hover:underline">Términos de Adopción</a>
            <a href="#" class="hover:underline">Seguridad</a>
          </div>
        </div>
      </div>
    </footer>

    <!-- ══════════ MODAL: SOBRE LA LEY 700 ══════════ -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showLey700"
          class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ley700-title"
        >
          <!-- Backdrop -->
          <div
            class="absolute inset-0 bg-brand-deep/60 backdrop-blur-sm"
            aria-hidden="true"
            @click="closeLey700"
          ></div>

          <!-- Panel -->
          <div
            ref="modalPanel"
            class="mp-modal-panel relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[86vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl ring-1 ring-purple-100 overflow-hidden focus:outline-none"
            tabindex="-1"
          >
            <!-- Cabecera -->
            <div class="relative px-6 sm:px-8 pt-6 pb-5 bg-gradient-to-br from-brand-purple to-purple-700 text-white shrink-0">
              <div class="absolute inset-0 paw-pattern opacity-[0.08]" aria-hidden="true"></div>
              <button
                type="button"
                class="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/15 hover:bg-white/30 flex items-center justify-center transition-colors duration-200"
                aria-label="Cerrar"
                @click="closeLey700"
              >
                <span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
              </button>

              <div class="relative flex items-start gap-4 pr-10">
                <span
                  class="w-12 h-12 rounded-2xl bg-white/15 ring-1 ring-white/25 flex items-center justify-center shrink-0"
                  aria-hidden="true"
                >
                  <span class="material-symbols-outlined text-[26px]">gavel</span>
                </span>
                <div>
                  <span class="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-purple-100 mb-1.5">
                    <span class="material-symbols-outlined text-[14px]" aria-hidden="true">verified</span>
                    Legislación de Bolivia
                  </span>
                  <h3 id="ley700-title" class="text-lg sm:text-2xl font-black font-display leading-tight">
                    Ley 700 de Protección y Defensa a la Vida de los Animales
                  </h3>
                </div>
              </div>
            </div>

            <!-- Contenido -->
            <div class="px-6 sm:px-8 py-6 overflow-y-auto overscroll-contain">
              <p class="text-sm text-slate-600 leading-relaxed">
                La <strong class="text-slate-900">Ley Nº 700</strong> es el marco normativo boliviano que establece las
                reglas de protección y defensa de la vida de los animales domésticos y de compañía. MatchPet existe
                para operarla en el día a día: cada adopción pasa por un proceso ordenado, evaluado y documentado que
                reduce el abandono y las devoluciones.
              </p>

              <h4 class="mt-6 mb-3 text-xs font-bold uppercase tracking-wider text-brand-purple">¿Qué establece?</h4>
              <ul class="space-y-3">
                <li
                  v-for="(item, i) in ley700Points"
                  :key="item.title"
                  class="flex gap-3 rounded-2xl border border-purple-100 bg-[#f8f6fc] p-4"
                >
                  <span
                    class="w-9 h-9 rounded-xl bg-white ring-1 ring-purple-200 text-brand-purple flex items-center justify-center shrink-0"
                    aria-hidden="true"
                  >
                    <span class="material-symbols-outlined text-[20px]">{{ item.icon }}</span>
                  </span>
                  <div>
                    <h5 class="text-sm font-bold text-slate-900">{{ item.title }}</h5>
                    <p class="text-xs text-slate-600 mt-0.5 leading-relaxed">{{ item.text }}</p>
                  </div>
                </li>
              </ul>

              <div class="mt-6 rounded-2xl border border-teal-200 bg-teal-50/70 p-4 flex gap-3">
                <span class="material-symbols-outlined text-teal-700 text-[20px] shrink-0" aria-hidden="true">pets</span>
                <p class="text-xs text-slate-700 leading-relaxed">
                  En MatchPet cada adopción incluye un <strong>compromiso firmado</strong> por parte del adoptante, un
                  seguimiento post-adopción y el apoyo de refugios verificados. Si una mascota no puede seguir con
                  su familia, el proceso de devolución es guiado — nunca improvisado.
                </p>
              </div>
            </div>

            <!-- Pie -->
            <div class="px-6 sm:px-8 py-4 border-t border-purple-100 bg-[#fbfaff] flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
              <button
                type="button"
                class="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-5 py-2.5 rounded-xl border border-purple-200 bg-white text-brand-purple text-sm font-semibold hover:bg-purple-50 transition-colors duration-200"
                @click="closeLey700"
              >
                Cerrar
              </button>
              <a
                :href="LEY700_URL"
                target="_blank"
                rel="noopener noreferrer"
                class="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-purple text-white text-sm font-semibold shadow-md shadow-brand-purple/25 hover:bg-purple-900 hover:-translate-y-0.5 transition-all duration-200"
              >
                <span class="material-symbols-outlined text-[18px]" aria-hidden="true">gavel</span>
                Consultar texto oficial
                <span class="material-symbols-outlined text-[16px]" aria-hidden="true">open_in_new</span>
              </a>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

/* ═══════════════════════════════════════════════════════════
   CONFIGURACIÓN
   ═══════════════════════════════════════════════════════════ */
const LEY700_URL = 'https://www.fiscalia.gob.bo/marco-legal/leyes/ley-n-700'

/* ═══════════════════════════════════════════════════════════
   ESTADO DE UI
   ═══════════════════════════════════════════════════════════ */
const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)
const activeSection = ref('hero')
const showLey700 = ref(false)
const activeCategory = ref('perros')
const modalPanel = ref(null)

/* ═══════════════════════════════════════════════════════════
   CONTENIDO
   ═══════════════════════════════════════════════════════════ */
const navLinks = [
  { target: 'hero', label: 'Inicio', icon: 'home' },
  { target: 'empresa', label: 'Nosotros', icon: 'info' },
  { target: 'como-funciona', label: '¿Cómo funciona?', icon: 'route' },
  { target: 'discovery', label: 'Descúbrelos', icon: 'pets' },
  { target: 'contacto', label: 'Contacto', icon: 'mail' },
]

const pillars = [
  {
    icon: 'psychology',
    title: 'Match Inteligente',
    text: 'Algoritmo ponderado: Espacio (40%), Tiempo (40%) y Experiencia (20%) para adopciones conscientes.',
    bg: 'bg-pink-50',
    textColor: 'text-pink-600',
  },
  {
    icon: 'install_mobile',
    title: '100% PWA Móvil',
    text: 'App Web Progresiva ultraligera. Funciona sin ocupar almacenamiento, incluso con conexión lenta.',
    bg: 'bg-amber-50',
    textColor: 'text-amber-600',
  },
  {
    icon: 'volunteer_activism',
    title: 'Adopción Responsable',
    text: 'En sintonía con la Ley 700 de Bolivia. Cero devoluciones y seguimiento continuo.',
    bg: 'bg-red-50',
    textColor: 'text-rose-600',
  },
]

const valueProps = [
  {
    icon: 'tune',
    title: 'Algoritmo Ponderado',
    text: 'Cruce inteligente de vivienda, tiempo y experiencia previa.',
    card: 'bg-emerald-50/70',
    border: 'border-emerald-200',
    iconBg: 'bg-white',
    iconText: 'text-emerald-700',
    action: 'anchor',
    href: '#como-funciona',
  },
  {
    icon: 'gavel',
    title: 'Impacto Social & Ley 700',
    text: 'Desahogo operativo a voluntarios y tenencia responsable.',
    card: 'bg-purple-50/80',
    border: 'border-purple-200',
    iconBg: 'bg-white',
    iconText: 'text-brand-purple',
    action: 'ley700',
  },
]

const steps = [
  {
    number: '1',
    icon: 'person_edit',
    title: 'Registra tu perfil',
    text: 'Crea tu cuenta y responde el cuestionario de vida: espacio, presupuesto, vivienda y rutina.',
    bg: 'bg-brand-purple shadow-brand-purple/30',
  },
  {
    number: '2',
    icon: 'manage_search',
    title: 'Encuentra tus matches',
    text: 'El algoritmo ponderado 40/40/20 cruza tu estilo de vida con cada mascota disponible.',
    bg: 'bg-teal-600 shadow-teal-600/30',
  },
  {
    number: '3',
    icon: 'handshake',
    title: 'Conecta con refugios',
    text: 'Coordina visitas, conoce en persona y comparte tu compromiso bajo la Ley 700.',
    bg: 'bg-brand-purple shadow-brand-purple/30',
  },
  {
    number: '4',
    icon: 'health_and_safety',
    title: 'Adopta y sigue acompañado',
    text: 'Monitoreo médico, etológico y de adaptación para garantizar cero devoluciones.',
    bg: 'bg-red-600 shadow-red-600/30',
  },
]

const benefits = [
  {
    icon: 'tune',
    title: 'Algoritmo ponderado 40/40/20',
    text: 'Compatibilidad medida por espacio, tiempo y experiencia previa real.',
    bg: 'bg-emerald-100',
    textColor: 'text-emerald-700',
  },
  {
    icon: 'home_work',
    title: 'Evaluación digital de hogares',
    text: 'Validamos cada solicitud para proteger la vida y salud de cada mascota.',
    bg: 'bg-emerald-100',
    textColor: 'text-emerald-700',
  },
  {
    icon: 'visibility',
    title: "Visibilidad a animales 'invisibles'",
    text: 'Prioridad para adultos, mestizos y mascotas con requerimientos especiales.',
    bg: 'bg-emerald-100',
    textColor: 'text-emerald-700',
  },
  {
    icon: 'assignment_turned_in',
    title: 'Compromiso Ley 700',
    text: 'Firma digital de compromiso bajo la legislación boliviana contra el maltrato.',
    bg: 'bg-emerald-100',
    textColor: 'text-emerald-700',
  },
  {
    icon: 'verified_user',
    title: 'Refugios verificados',
    text: 'Gestión centralizada con albergues certificados en las 4 ciudades principales.',
    bg: 'bg-emerald-100',
    textColor: 'text-emerald-700',
  },
  {
    icon: 'offline_bolt',
    title: 'PWA ultraligera y offline',
    text: 'Usa la app sin instalar nada, incluso con conexión débil o nula.',
    bg: 'bg-emerald-100',
    textColor: 'text-emerald-700',
  },
]

const categories = [
  { id: 'perros', label: 'Perros', icon: 'pets' },
  { id: 'gatos', label: 'Gatos', icon: 'pets' },
  { id: 'otros', label: 'Otros', icon: 'flare' },
]

/* ── Fichas de "Descúbrelos" ──────────────────────────────
   NOTA: la sub-métrica "Dificultad de crianza" fue eliminada.
   Cada perfil muestra 2 rasgos: Necesidad de ejercicio y
   Convivencia con niños. */
const pets = [
  // ── PERROS ──
  {
    id: 'chihuahua-dog',
    especie: 'perros',
    name: 'CHIHUAHUA DOG',
    emoji: '🐕',
    grad: 'from-purple-100 to-pink-100',
    origin: 'Pando',
    traits: [
      { label: 'Necesidad de ejercicio', value: 'Alto', pct: 85 },
      { label: 'Convivencia con niños', value: 'Media', pct: 60 },
    ],
    text: 'Canes vivaces y afectuosos con sus dueños. Ideales para departamentos y espacios reducidos.',
  },
  {
    id: 'dachshund-dog',
    especie: 'perros',
    name: 'DACHSHUND DOG',
    emoji: '🐕',
    grad: 'from-amber-100 to-orange-100',
    origin: 'Alemania',
    traits: [
      { label: 'Necesidad de ejercicio', value: 'Moderado', pct: 60 },
      { label: 'Convivencia con niños', value: 'Alto', pct: 80 },
    ],
    text: 'Valientes y curiosos, destacan por su agilidad olfativa, lealtad y carácter jovial con los niños.',
  },
  {
    id: 'poodle-dog',
    especie: 'perros',
    name: 'POODLE DOG',
    emoji: '🐩',
    grad: 'from-teal-100 to-emerald-100',
    origin: 'Francia / Alemania',
    traits: [
      { label: 'Necesidad de ejercicio', value: 'Alto', pct: 90 },
      { label: 'Convivencia con niños', value: 'Muy Alto', pct: 95 },
    ],
    text: 'Una de las razas más inteligentes del mundo, hipoalergénicos e idóneos para compañía.',
  },
  {
    id: 'pug-dog',
    especie: 'perros',
    name: 'PUG DOG',
    emoji: '🐶',
    grad: 'from-rose-100 to-purple-100',
    origin: 'China',
    traits: [
      { label: 'Necesidad de ejercicio', value: 'Bajo', pct: 35 },
      { label: 'Convivencia con niños', value: 'Muy Alto', pct: 90 },
    ],
    text: 'Robustos, cariñosos y de personalidad cómica. Ideales para convivir en paz en el hogar.',
  },

  // ── GATOS ──
  {
    id: 'siamese-cat',
    especie: 'gatos',
    name: 'SIAMESE CAT',
    emoji: '🐈',
    grad: 'from-teal-100 to-emerald-100',
    origin: 'Tailandia',
    traits: [
      { label: 'Necesidad de ejercicio', value: 'Alto', pct: 80 },
      { label: 'Convivencia con niños', value: 'Alto', pct: 85 },
    ],
    text: 'Inteligentes, curiosos y muy afectuosos. Necesitan compañía y estímulos constantes.',
  },
  {
    id: 'maine-coon-cat',
    especie: 'gatos',
    name: 'MAINE COON CAT',
    emoji: '🐈',
    grad: 'from-amber-100 to-orange-100',
    origin: 'Estados Unidos',
    traits: [
      { label: 'Necesidad de ejercicio', value: 'Moderado', pct: 65 },
      { label: 'Convivencia con niños', value: 'Muy Alto', pct: 88 },
    ],
    text: 'Los gatos domésticos más grandes. Dóciles, pacientes y excelentes con familias numerosas.',
  },
  {
    id: 'persian-cat',
    especie: 'gatos',
    name: 'PERSIAN CAT',
    emoji: '🐈',
    grad: 'from-rose-100 to-purple-100',
    origin: 'Persia (Irán)',
    traits: [
      { label: 'Necesidad de ejercicio', value: 'Bajo', pct: 30 },
      { label: 'Convivencia con niños', value: 'Media', pct: 50 },
    ],
    text: 'Serenos, nobles y de pelaje denso. Necesitan cepillado regular y ambientes tranquilos.',
  },
  {
    id: 'callejero-boliviano',
    especie: 'gatos',
    name: 'CALLEJERO BOLIVIANO',
    emoji: '🐈',
    grad: 'from-sky-100 to-indigo-100',
    origin: 'Bolivia',
    traits: [
      { label: 'Necesidad de ejercicio', value: 'Moderado', pct: 60 },
      { label: 'Convivencia con niños', value: 'Alto', pct: 85 },
    ],
    text: 'Resilientes, ágiles y sociables. El perfil que mejor se adapta a la vida urbana y a los cambios de hogar.',
  },
]

const socials = [
  {
    name: 'Instagram',
    path: 'M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.8 3.8 0 01-1.38-.9 3.8 3.8 0 01-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 1.98c-3.14 0-3.51.01-4.75.07-1.15.05-1.77.24-2.19.4-.55.21-.94.47-1.35.88-.41.41-.67.8-.88 1.35-.16.42-.35 1.04-.4 2.19-.06 1.24-.07 1.61-.07 4.75s.01 3.51.07 4.75c.05 1.15.24 1.77.4 2.19.21.55.47.94.88 1.35.41.41.8.67 1.35.88.42.16 1.04.35 2.19.4 1.24.06 1.61.07 4.75.07s3.51-.01 4.75-.07c1.15-.05 1.77-.24 2.19-.4.55-.21.94-.47 1.35-.88.41-.41.67-.8.88-1.35.16-.42.35-1.04.4-2.19.06-1.24.07-1.61.07-4.75s-.01-3.51-.07-4.75c-.05-1.15-.24-1.77-.4-2.19a3.6 3.6 0 00-.88-1.35 3.6 3.6 0 00-1.35-.88c-.42-.16-1.04-.35-2.19-.4-1.24-.06-1.61-.07-4.75-.07zm0 3.37a4.49 4.49 0 110 8.98 4.49 4.49 0 010-8.98zm0 7.4a2.91 2.91 0 100-5.82 2.91 2.91 0 000 5.82zm5.72-7.6a1.05 1.05 0 11-2.1 0 1.05 1.05 0 012.1 0z',
  },
  {
    name: 'Facebook',
    path: 'M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94z',
  },
  {
    name: 'LinkedIn',
    path: 'M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 013.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 110-4.13 2.07 2.07 0 010 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z',
  },
]

const stats = [
  {
    value: '1000+',
    label: 'Adoptantes Felices',
    path: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    value: '500+',
    label: 'Mascotas Adoptadas',
    path: 'M21 8a2.5 2.5 0 00-2.5-2.5c-1.3 0-2.4.9-2.5 2.1A2.5 2.5 0 0013.5 8c-1.3 0-2.4.9-2.5 2.1A2.5 2.5 0 008.5 10c-1.3 0-2.4.9-2.5 2.1A2.5 2.5 0 003 14.5 2.5 2.5 0 005.5 17c.7 0 1.3-.3 1.8-.7l4.7 4.7 4.7-4.7c.5.4 1.1.7 1.8.7a2.5 2.5 0 002.5-2.5c0-1.3-.9-2.4-2.1-2.5A2.5 2.5 0 0021 8z',
  },
  {
    value: '98%',
    label: 'Matches Compatibles',
    path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    value: '14',
    label: 'Refugios Aliados',
    path: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  },
]

const testimonials = [
  {
    initials: 'VR',
    name: 'Valeria Rojas',
    role: 'Adoptante · La Paz',
    grad: 'bg-gradient-to-tr from-brand-purple to-purple-400',
    text: '"Gracias al match del 94% encontré a Bruno, un mestizo adulto que nadie quería. Hoy es mi compañero de viajes y de vida. El seguimiento post-adopción hizo toda la diferencia."',
  },
  {
    initials: 'PA',
    name: 'Refugio Pata de Ayuda',
    role: 'Albergue aliado · El Alto',
    grad: 'bg-gradient-to-tr from-teal-500 to-emerald-500',
    text: '"Pasamos de adoptar por redes sociales a un proceso ordenado y humano. Las devoluciones cayeron a cero y encontramos hogar para los perritos que llevaban años con nosotros."',
  },
  {
    initials: 'MS',
    name: 'Marco Salazar',
    role: 'Voluntario · Santa Cruz',
    grad: 'bg-gradient-to-tr from-rose-400 to-pink-500',
    text: '"Como voluntario, la plataforma me permitió dar visibilidad a los casos especiales. Hoy \'Luna\' vive con una familia maravillosa que fue evaluada y preparada para recibirla."',
  },
]

const ley700Points = [
  {
    icon: 'gavel',
    title: 'Marco legal de protección animal',
    text: 'La Ley Nº 700 fija las reglas de protección y defensa de la vida de los animales domésticos y de compañía en Bolivia.',
  },
  {
    icon: 'block',
    title: 'Fin del maltrato y la crueldad',
    text: 'Sanciona el trato cruel, el abandono y las prácticas que ponen en riesgo la integridad física o emocional del animal.',
  },
  {
    icon: 'home',
    title: 'Tenencia responsable',
    text: 'La persona adoptante asume al animal como ser vivo que requiere cuidado, alimentación, atención veterinaria y compañía.',
  },
  {
    icon: 'volunteer_activism',
    title: 'Compromiso de largo plazo',
    text: 'Cada adopción debe entenderse como un compromiso de por vida, con canales de retorno responsable si el vínculo no puede sostenerse.',
  },
  {
    icon: 'domain_add',
    title: 'Rol de refugios y albergues',
    text: 'Los establecimientos de resguardo animal deben operar bajo condiciones de bienestar animal, registro y trazabilidad de cada animal.',
  },
]

/* ═══════════════════════════════════════════════════════════
   COMPUTADOS
   ═══════════════════════════════════════════════════════════ */
const visiblePets = computed(() => pets.filter((p) => p.especie === activeCategory.value))

/* ═══════════════════════════════════════════════════════════
   MODAL LEY 700
   ═══════════════════════════════════════════════════════════ */
const openLey700 = () => {
  showLey700.value = true
  isMobileMenuOpen.value = false
}

const closeLey700 = () => {
  showLey700.value = false
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

/* Bloquea el scroll del body mientras el modal o el menú móvil están abiertos */
const syncBodyScroll = () => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = showLey700.value || isMobileMenuOpen.value ? 'hidden' : ''
}

watch(showLey700, (isOpen) => {
  syncBodyScroll()
  if (isOpen) {
    nextTick(() => {
      if (modalPanel.value) modalPanel.value.focus()
    })
  }
})

watch(isMobileMenuOpen, syncBodyScroll)

/* Cierra con la tecla Escape */
const onKeydown = (event) => {
  if (event.key !== 'Escape') return
  if (showLey700.value) closeLey700()
  else if (isMobileMenuOpen.value) closeMobileMenu()
}

/* ═══════════════════════════════════════════════════════════
   ANIMACIONES AL HACER SCROLL (IntersectionObserver nativo)
   ═══════════════════════════════════════════════════════════ */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

let revealObserver = null
let sectionObserver = null

const getRevealObserver = () => {
  if (revealObserver) return revealObserver
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-revealed')
        revealObserver.unobserve(entry.target)
      })
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
  )
  return revealObserver
}

/* Directiva `v-reveal`: el valor opcional es el retardo en ms. */
const vReveal = {
  mounted(el, binding) {
    el.classList.add('mp-reveal')
    const delay = binding.value
    if (typeof delay === 'number' && delay > 0) {
      el.style.setProperty('--mp-reveal-delay', delay + 'ms')
    }
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-revealed')
      return
    }
    getRevealObserver().observe(el)
  },
  unmounted(el) {
    if (revealObserver) revealObserver.unobserve(el)
  },
}

/* ═══════════════════════════════════════════════════════════
   SCROLL: SOMBRA DEL NAVBAR + SECCIÓN ACTIVA
   ═══════════════════════════════════════════════════════════ */
const onScroll = () => {
  isScrolled.value = window.scrollY > 8
}

/* ═══════════════════════════════════════════════════════════
   CICLO DE VIDA
   ═══════════════════════════════════════════════════════════ */
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('keydown', onKeydown)
  onScroll()

  /* Marca la sección visible en el navbar (scroll-spy) */
  if (typeof IntersectionObserver !== 'undefined') {
    sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible.length) activeSection.value = visible[0].target.id
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: [0, 0.15, 0.5, 1] }
    )
    navLinks.forEach((link) => {
      const el = document.getElementById(link.target)
      if (el) sectionObserver.observe(el)
    })
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('keydown', onKeydown)
  if (revealObserver) revealObserver.disconnect()
  if (sectionObserver) sectionObserver.disconnect()
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})
</script>

<style scoped>
/* ── Menú móvil ───────────────────────────────────────────── */
.mp-menu-enter-active,
.mp-menu-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.mp-menu-enter-from,
.mp-menu-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* ── Overlay del menú móvil ───────────────────────────────── */
.mp-overlay-enter-active,
.mp-overlay-leave-active {
  transition: opacity 0.22s ease;
}
.mp-overlay-enter-from,
.mp-overlay-leave-to {
  opacity: 0;
}

/* ── Filtro de tarjetas "Descúbrelos" ─────────────────────── */
.pet-enter-active,
.pet-leave-active,
.pet-move {
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.pet-enter-from {
  opacity: 0;
  transform: translateY(18px) scale(0.97);
}
.pet-leave-to {
  opacity: 0;
  transform: scale(0.97);
}
.pet-leave-active {
  position: absolute;
  visibility: hidden;
}

/* ── Modal Ley 700 ────────────────────────────────────────── */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}
.modal-enter-active .mp-modal-panel,
.modal-leave-active .mp-modal-panel {
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .mp-modal-panel,
.modal-leave-to .mp-modal-panel {
  opacity: 0;
  transform: translateY(28px) scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .mp-menu-enter-active,
  .mp-menu-leave-active,
  .mp-overlay-enter-active,
  .mp-overlay-leave-active,
  .pet-enter-active,
  .pet-leave-active,
  .pet-move,
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active .mp-modal-panel,
  .modal-leave-active .mp-modal-panel {
    transition: none !important;
  }
}
</style>

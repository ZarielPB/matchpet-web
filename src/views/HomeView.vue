<template>
  <div class="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
    <!-- Hero Section -->
    <div class="max-w-6xl mx-auto px-4 py-16 sm:py-24 text-center">
      <h1 class="text-4xl sm:text-6xl font-extrabold text-gray-900 mb-4">
        🐾 MatchPet
      </h1>
      <p class="text-xl sm:text-2xl text-gray-600 mb-2">
        Encuentra a tu compañero ideal
      </p>
      <p class="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto mb-10">
        Conectamos refugios de Bolivia con adoptantes responsables mediante un algoritmo de compatibilidad. Menos devoluciones, más hogares felices.
      </p>

      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <router-link
          to="/registro"
          class="px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 transition shadow-lg hover:shadow-xl"
        >
          Quiero adoptar 🐶
        </router-link>
        <router-link
          to="/registro-refugio"
          class="px-8 py-4 bg-white text-emerald-600 border-2 border-emerald-600 rounded-xl font-semibold text-lg hover:bg-emerald-50 transition"
        >
          Soy un refugio 🏠
        </router-link>
      </div>
    </div>

    <!-- Features Section -->
    <div class="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="bg-white p-6 rounded-xl shadow-sm text-center">
        <div class="text-4xl mb-3">🧠</div>
        <h3 class="font-bold text-lg text-gray-900 mb-2">Match Inteligente</h3>
        <p class="text-gray-600 text-sm">Nuestro algoritmo cruza tu estilo de vida con las necesidades de cada mascota.</p>
      </div>
      <div class="bg-white p-6 rounded-xl shadow-sm text-center">
        <div class="text-4xl mb-3">📱</div>
        <h3 class="font-bold text-lg text-gray-900 mb-2">100% Móvil</h3>
        <p class="text-gray-600 text-sm">Instala la app en tu celular sin ocupar espacio. Funciona incluso con conexión débil.</p>
      </div>
      <div class="bg-white p-6 rounded-xl shadow-sm text-center">
        <div class="text-4xl mb-3">❤️</div>
        <h3 class="font-bold text-lg text-gray-900 mb-2">Adopción Responsable</h3>
        <p class="text-gray-600 text-sm">Seguimiento post-adopción para asegurar que tu nuevo amigo esté siempre feliz.</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="text-center py-8 text-sm text-gray-400">
      <p>¿Ya tienes cuenta? <router-link to="/login" class="text-indigo-600 hover:underline font-medium">Inicia sesión aquí</router-link></p>
    </div>
  </div>
</template>

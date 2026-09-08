<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
    <h1 class="text-4xl font-extrabold text-gray-900 mb-2">🐾 MatchPet</h1>
    <p class="text-gray-600 mb-8 text-center">Encuentra a tu compañero ideal</p>
    <div class="flex gap-4">
      <router-link
        to="/login"
        class="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
      >
        Iniciar Sesión
      </router-link>
      <router-link
        to="/registro"
        class="px-6 py-3 border border-indigo-600 text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition"
      >
        Registrarme
      </router-link>
    </div>
  </div>
</template>

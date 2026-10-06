# 🐾 MatchPet - Sistema Web de Adopción de Mascotas (PWA)

Bienvenidos al repositorio oficial de **MatchPet**. Este proyecto es una Aplicación Web Progresiva (PWA) diseñada para conectar refugios de animales con adoptantes, utilizando un algoritmo de compatibilidad inteligente y seguimiento post-adopción.

## 🛠️ Stack Tecnológico
- **Frontend:** Vue 3.5 (Composition API, `<script setup>`) + Vite 8
- **Estilos:** TailwindCSS v3 (Mobile-First) + PostCSS
- **Estado Global:** Pinia 4
- **Enrutamiento:** Vue Router 4 (con Guards de Auth y Roles)
- **Backend / BaaS:** Supabase (PostgreSQL, Auth, Storage, RLS, Triggers)
- **Hosting:** Firebase Hosting (CDN global)
- **Gestor de Paquetes:** `pnpm` (v9 - Obligatorio para todo el equipo)

## ⚙️ Requisitos Previos
Antes de comenzar, asegúrate de tener instalado en tu sistema (Windows o Linux):
1. **Node.js** (Versión 18 o superior) -> [Descargar aquí](https://nodejs.org/)
2. **pnpm** (Gestor de paquetes) -> Instalar globalmente ejecutando:
   
   npm install -g pnpm

3. Git para el control de versiones

	** instalacion y ejecucion local **
	- PASO 1: Clonar el repositorio

		git clone https://github.com/ZarielPB/matchpet-web
		cd matchpet-web

	- PASO 2: Instalar dependencias
	ejecuta el siguiente comando para isntalar todas las librerias necesarias. este comando es identico tanto en windows (PowerShell/CMD) como en Linux.

		pnpm install

	- PASO 3: Configurar variables de entorno
	Busca el archivo .env.example en la raiz del proyecto
	Copialo y renombralo a .env
	Llena las variables de entorn con las credenciales de Supabase (el lider de equipo puede proporcionarlas)

		VITE_SUPABASE_URL=
		VITE_SUPABASE_ANON_KEY=

	OJO: NUNCA subir el archivo .env a github. Ya sta ignorado en el .gitignore

	- PASO 4: Levantar el servidor de desarrollo

		pnpm dev

	Abre tu navegador en http://localhost:5173

## ESTRUCTURA DEL PROYECTO

src/
├── assets/         # Estilos globales (Tailwind), fuentes, imágenes locales
├── components/     # Componentes reutilizables (Botones, Cards, Inputs, Modals)
├── views/          # Páginas principales (Home, Catalogo, Login, Paneles de Refugio/Adoptante)
├── router/         # Configuración de rutas (Vue Router) y Guards de seguridad
├── stores/         # Estados globales (Pinia: auth, pets, favorites, etc.)
├── services/       # Conexión con Supabase (supabaseClient.js) y llamadas a API
└── utils/          # Funciones auxiliares (validaciones, algoritmo de match, fechas)

## FLUJO DE TRABAJO GIT
1. Nunca trabajes directamente sobre la rama main.
2. Para cada Historia de Usuario (HU), crea una rama desde develop:

	git checkout develop
	git pull origin develop
	git checkout -b feature/HU-XX-nombre-corto

3. Al terminar, sube tu rama y crea un Pull Request (PR) en GitHub hacia develop.
4. Usa mensajes de commit semánticos: feat: add login form (HU-02) o fix: resolve auth bug.

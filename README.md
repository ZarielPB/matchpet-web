# 🐾 MatchPet - Sistema Web de Adopción de Mascotas (PWA)

Bienvenidos al repositorio oficial de MatchPet. Este proyecto es una Aplicación Web Progresiva (PWA) diseñada para conectar refugios de animales con adoptantes, utilizando un algoritmo de compatibilidad.

## 🛠️ Stack Tecnológico
- **Frontend:** Vue 3 (Composition API) + Vite
- **Estilos:** TailwindCSS v3 (Mobile-First)
- **Estado:** Pinia
- **Backend / BaaS:** Supabase (PostgreSQL, Auth, Storage)
- **Hosting:** Firebase Hosting
- **Gestor de Paquetes:** pnpm (Obligatorio para todo el equipo)

## ⚙️ Requisitos Previos
Antes de comenzar, asegúrate de tener instalado en tu sistema (Windows o Linux):
1. **Node.js** (Versión 18 o superior) -> [Descargar aquí](https://nodejs.org/)
2. **pnpm** (Gestor de paquetes) -> Instalar globalmente ejecutando:
   
   npm install -g pnpm

3. Git para el control de versiones

	** instalacion y ejecucion local **
	- PASO 1: Clonar el repositorio

		git clone 
		cd matchpet-web

	- PASO 2: Instalar dependencias
	ejecuta el siguiente comando para isntalar todas las librerias necesarias. este comando es identico tanto en windows (PowerShell/CMD) como en Linux.

		pnpm install

	- PASO 3: Configurar variables de entorno
	Busca el archivo .env.example en la raiz del proyecto
	Copialo y renombralo a .env
	Llena las variables de entorn con las credenciales de Supabase (el lider de equipo puede proporcionarlas)

		VITE_SUPABASE_URL=tu_url_aqui
		VITE_SUPABASE_ANON_KEY=tu_llave_aqui

	OJO: NUNCA subir el archivo .env a github. Ya sta ignorado en el .gitignore

	- PASO 4: Levantar el servidor de desarrollo

		pnpm dev

	Abre tu navegador en http://localhost:5173

## ESTRUCTURA DEL PROYECTO

src/
├── assets/         # Estilos globales (Tailwind), fuentes, imágenes locales
├── components/     # Componentes reutilizables (Botones, Cards, Inputs)
├── views/          # Páginas principales (Home, Catalogo, Login, Paneles)
├── router/         # Configuración de rutas (Vue Router) y guards
├── stores/         # Estados globales (Pinia: auth, pets, etc.)
├── services/       # Conexión con Supabase (supabaseClient.js)
└── utils/          # Funciones auxiliares (algoritmo de match, fechas)

## FLUJO DE TRABAJO GIT
1. Nunca trabajes directamente sobre la rama main.
2. Para cada Historia de Usuario (HU), crea una rama desde develop:

	git checkout develop
	git pull origin develop
	git checkout -b feature/HU-XX-nombre-corto

3. Al terminar, sube tu rama y crea un Pull Request (PR) en GitHub hacia develop.
4. Usa mensajes de commit semánticos: feat: add login form (HU-02) o fix: resolve auth bug.

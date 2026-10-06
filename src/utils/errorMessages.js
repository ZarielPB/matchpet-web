// Traducción de errores de autenticación de Supabase al español.
// Acepta el objeto `error` de supabase-js (`{ code, message }`) o un string
// con un código/mensaje crudo, y devuelve un mensaje amigable en español.

const errorByCode = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  invalid_login_credentials: 'Correo o contraseña incorrectos.',
  email_not_confirmed: 'Debes confirmar tu correo antes de iniciar sesión.',
  user_not_found: 'No existe una cuenta con este correo.',
  email_exists: 'Este correo ya está registrado.',
  weak_password: 'La contraseña es muy débil. Usa al menos 8 caracteres con letras y números.',
  over_email_send_rate_limit: 'Demasiados intentos. Espera un momento.',
  over_request_rate_limit: 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.',
  same_password: 'La nueva contraseña debe ser diferente de la anterior.',
  user_already_exists: 'Este correo ya está registrado.'
}

export function translateAuthError(error) {
  const rawInput = typeof error === 'string' ? error : (error?.code || error?.message)
  const raw = String(rawInput || '').toLowerCase().trim()

  if (errorByCode[raw]) return errorByCode[raw]

  // Coincidencias por mensaje crudo en inglés (goTrue / supabase-js).
  // El orden importa: revisar primero casos concretos antes de genéricos.
  if (raw.includes('different from the old') || raw.includes('same as the old')) {
    return errorByCode.same_password
  }
  if (raw.includes('invalid login credentials') || raw.includes('invalid email')) {
    return errorByCode.invalid_login_credentials
  }
  if (raw.includes('not confirmed')) {
    return errorByCode.email_not_confirmed
  }
  if (raw.includes('already registered') || raw.includes('has already been taken')) {
    return errorByCode.email_exists
  }
  if (raw.startsWith('password should') || raw.includes('weak') || raw.includes('minimum of 8')) {
    return errorByCode.weak_password
  }
  if (raw.includes('user not found')) {
    return errorByCode.user_not_found
  }
  if (raw.includes('rate limit')) {
    return errorByCode.over_email_send_rate_limit
  }

  return appendRawDetails('Ocurrió un error. Por favor, intenta de nuevo.', error)
}

// ---------------------------------------------------------------------------
// Errores de base de datos (PostgREST) y Storage de Supabase.
// Los errores de Postgres llegan con `code` = SQLSTATE; PostgREST usa códigos
// propios (PGRSTxxx) y Storage no suele traer `code`.
// ---------------------------------------------------------------------------
const dbErrorByCode = {
  // --- SQLSTATE de PostgreSQL ---------------------------------------------
  // 42703: columna inexistente. Es la causa raíz más frecuente de este proyecto
  // (el SELECT embebido falla entero si UNA columna del embed no existe).
  '42703': 'Error de esquema: falta una columna en la base de datos.',
  '23505': 'Ya existe un registro con esos datos.',
  '23503': 'Tu perfil de usuario no está sincronizado. Por favor, cierra sesión y vuelve a ingresar.',
  '23502': 'Faltan campos obligatorios para guardar el registro.',
  '23514': 'Los datos no cumplen las restricciones de la base de datos.',
  '42501': 'No tienes permisos para realizar esta acción.',
  '42P01': 'La tabla solicitada no existe. Asegúrate de ejecutar las migraciones en orden.',
  '22P02': 'El identificador ingresado no es válido.',
  // P0001: error de plpgsql en tiempo de ejecución (p. ej. trigger que toca
  // una columna inexistente). Indica que una migración quedó a medias.
  'P0001': 'Error interno en un trigger de la base de datos. Revisa las migraciones.',

  // --- Códigos propios de PostgREST ----------------------------------------
  // PGRST204: la tabla EXISTE pero le falta una columna del payload/embed.
  'PGRST204': 'Error de esquema: falta una columna en la base de datos.',
  'PGRST205': 'La tabla solicitada no existe o no está expuesta en la base de datos.',
  'PGRST200': 'Error de esquema: falta una relación (clave foránea) entre las tablas.',
  'PGRST202': 'Error de esquema: falta una columna o función en la base de datos.',
  'PGRST116': 'No se encontró el registro solicitado.'
}

// En desarrollo anexamos la traza cruda de Supabase al mensaje. Esto fue lo que
// permitió detectar que `pet_images.is_primary` no existía en la base de datos.
function appendRawDetails(friendly, error) {
  if (!import.meta.env?.DEV) return friendly
  const raw = String(error?.message || '').trim()
  if (!raw) return friendly
  return `${friendly} (dev: ${raw})`
}

export function translateDbError(error) {
  const code = error?.code
  if (code && dbErrorByCode[code]) {
    return appendRawDetails(dbErrorByCode[code], error)
  }

  const raw = String(error?.message || '').toLowerCase()

  // Errores de enum / dominio: el valor enviado no existe en el tipo.
  if (raw.includes('invalid input value for enum') || raw.includes('invalid input value for domain')) {
    return appendRawDetails('Alguno de los valores enviados no es válido.', error)
  }

  // Errores de Storage / upload.
  if (raw.includes('the resource already exists')) {
    return appendRawDetails('La imagen ya existe en el sistema. Cambia el nombre del archivo o intenta de nuevo.', error)
  }
  if (raw.includes('exceeded the maximum allowed size') || raw.includes('payload too large')) {
    return appendRawDetails('La imagen supera el tamaño máximo permitido.', error)
  }
  if (raw.includes('mime type') || raw.includes('invalid_mime_type') || raw.includes('file type not allowed')) {
    return appendRawDetails('El tipo de archivo no está permitido. Usa JPG, PNG o WEBP.', error)
  }
  if (raw.includes('bucket not found')) {
    return appendRawDetails('El almacenamiento de imágenes no está disponible. Ejecuta las migraciones.', error)
  }
  if (raw.includes('permission denied') || raw.includes('new row violates row-level security')) {
    return appendRawDetails('No tienes permisos para realizar esta acción.', error)
  }
  if (raw.includes('invalid api key') || raw.includes('auth problem') || raw.includes('jwt')) {
    return appendRawDetails('No has iniciado sesión correctamente. Vuelve a intentarlo.', error)
  }
  // Red / offline.
  if (raw.includes('load failed') || raw.includes('network') || raw.includes('fetch failed')) {
    return appendRawDetails('No pudimos conectar con el servidor. Revisa tu conexión a internet.', error)
  }

  return appendRawDetails('Ocurrió un error al guardar. Por favor, intenta de nuevo.', error)
}

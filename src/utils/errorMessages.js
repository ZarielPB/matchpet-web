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

  return 'Ocurrió un error. Por favor, intenta de nuevo.'
}
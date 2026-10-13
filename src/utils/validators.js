// HU-10 CA#2: formato de correo (regex estándar, sin espacios).
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const validateEmail = (v) => (EMAIL_RE.test(String(v || '').trim()) ? '' : 'Ingresa un correo válido (usuario@dominio.com).')
export const validatePassword = (v) => (String(v || '').length >= 8 ? '' : 'La contraseña debe tener al menos 8 caracteres.')
export const validateConfirm = (pw, c) => (pw === c && c ? '' : 'Las contraseñas no coinciden.')

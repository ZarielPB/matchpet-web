// HU-55 CA#3: cola de acciones hechas sin conexión (favoritos). Se guarda en localStorage y se envía al volver la red.
const KEY = 'matchpet:offline-queue'

function read() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* almacenamiento lleno o bloqueado: la acción simplemente no se encola */
  }
}

export const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false

// Un favorito solo cuenta por su última intención: encolar lo contrario cancela la acción pendiente.
export function enqueueFavorite({ userId, petId, add }) {
  const rest = read().filter((a) => !(a.type === 'favorite' && a.userId === userId && a.petId === petId))
  write([...rest, { type: 'favorite', userId, petId, add, at: Date.now() }])
}

export const pendingActions = (userId) => read().filter((a) => !userId || a.userId === userId)

export function clearAction(action) {
  write(read().filter((a) => !(a.type === action.type && a.userId === action.userId && a.petId === action.petId)))
}

// Envía las acciones pendientes con la función `run(action)` (debe devolver true si se aplicó). Devuelve cuántas se enviaron.
export async function flushQueue(userId, run) {
  let sent = 0
  for (const action of pendingActions(userId)) {
    try {
      if (await run(action)) {
        clearAction(action)
        sent += 1
      }
    } catch {
      break // sin red otra vez: se reintenta en la próxima reconexión
    }
  }
  return sent
}

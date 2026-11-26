const BASE = import.meta.env.BASE_URL // normalmente "/"

// nombre de la mascota (minúsculas, sin tildes) -> archivo en public/pets/
const BY_NAME = {
  e2eprimera: 'e2e primera.png',  
  coco: 'coco.png',
  nina: 'nina.png',
  taita: 'taita.png',
  simon: 'simon.png',
  mate: 'mate.png',
  pepa: 'pepa.png',
  chispa: 'chispa.png',
  lia: 'lia.png',
  charango: 'charango.png',
  benito: 'benito.png',
  luli: 'luli.png',
  gala: 'gala.png',
  sultana: 'sultana.png',
  tomas: 'tomas.png',
  zeus: 'zeus.png',
  duque: 'duque.png',
  bruno: 'bruno.png',
  cleo: 'cleo.png',
  toby: 'toby.png',
  max: 'max.png',
  nala: 'nala.png',
  tigre: 'tigre.png',
  rocio: 'rocio.png',
  mimi: 'mimi.png',
  jaguar: 'jaguar.png',
  estrella: 'estrella.png',
  luna: 'luna.png',
  michi: 'michi.png',
  pelusa: 'pelusa.png',
  firulais: 'firulais.png',
  yatiri: 'yatiri.png',
  bigotes: 'bigotes.png',
  capitan: 'capitan.png',
  perla: 'perla.png',
  kiwi: 'kiwi.png',
  dalila: 'dalila.png',
  mani: 'mani.png',
  pancho: 'pancho.png',
}

// Si hay dos mascotas con el mismo nombre, usa su id (uuid) para distinguirlas
const BY_ID = {
  // 'uuid-de-la-mascota': 'otra-foto.jpg'
}

const normalize = (s) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

export function localPetPhoto(pet) {
  if (!pet) return null
  const file = BY_ID[pet.id] || BY_NAME[normalize(pet.name)]
  return file ? `${BASE}pets/${file}` : null
}

// Foto local si existe; si no, la que viene de la base de datos
export function petPhoto(pet, fallback = null) {
  return localPetPhoto(pet) || fallback
}
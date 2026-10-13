# DECISIONES DEL ALGORITMO DE MATCHING — HU-32

| Campo | Valor |
|---|---|
| Historia de Usuario | **HU-32 · Algoritmo de compatibilidad (Matching Engine)** |
| Sprint | 3 |
| Módulo | 5 · Compatibilidad y Matching |
| Estado | **APROBADO** — verdad absoluta para la implementación |
| Fuente canónica de datos | `docs/ModeloBD.sql` |
| Migración asociada | `supabase/migrations/20240000000002_sprint3_matching_adoption.sql` |
| Reemplaza | ninguna (primera versión) |

> **Regla de oro:** cualquier cambio en pesos, fórmulas o reglas eliminatorias
> debe reflejarse **primero** aquí y **después** en la función SQL. Este documento
> es la única fuente de verdad del motor de scoring.

---

## 1. Requisitos que gobiernan este diseño (HU-32)

| CA | Texto | Cómo se cumple |
|---|---|---|
| **CA#1** | Evaluar al menos 4 dimensiones: Tamaño/Espacio, Nivel de Energía/Actividad, Temperamento/Experiencia y Compatibilidad con niños/otras mascotas. | Dimensiones **D1, D2, D3, D4** (§3). |
| **CA#2** | Cada dimensión con peso ponderado; el tamaño puede ser **filtro eliminatorio**. | Pesos §3.1; **D1 es eliminatoria** (§4). |
| **CA#3** | Resultado en **porcentaje 0 %–100 %** por mascota. | `score = round(0..100)` (§5). |
| **CA#4** | Excluir automáticamente las mascotas que **no** estén en estado `disponible`. | `WHERE pets.status = 'disponible'` explícito en la consulta (el RLS de `pets` **no** filtra por estado). |
| **CA#5** | Si ninguna mascota supera el 0 %, devolver lista vacía o mensaje controlado. | Se devuelven solo filas con `score > 0`; si no queda ninguna → lista vacía y la capa de store muestra el estado vacío. |

Observación obligatoria de la HU: *"Se debe documentar la lógica de ponderación
(pesos) en un documento técnico antes de codificar."* → **este documento.**

---

## 2. Diccionario de datos de entrada

### 2.1 Lado del adoptante

| Tabla | Columna | Valores posibles | Dimensión |
|---|---|---|---|
| `compatibility_profiles` | `hours_at_home` | `'menos_de_4'` \| `'4_a_8'` \| `'mas_de_8'` | *contexto / frase* (no entra al score) |
| `compatibility_profiles` | `activity_level` | `'bajo'` \| `'moderado'` \| `'alto'` | **D2** |
| `compatibility_profiles` | `space_type` | `'pequeño'` \| `'amplio'` | **D1** |
| `compatibility_profiles` | `preferred_size` | `'pequeño'` \| `'mediano'` \| `'grande'` \| `NULL` | **D1** |
| `adopter_profiles` | `experience_years` | entero ≥ 0 | **D3** |
| `adopter_profiles` | `has_kids` | `boolean` | **D4** |
| `adopter_profiles` | `has_other_pets` | `boolean` | **D4** |

### 2.2 Lado de la mascota

| Tabla | Columna | Valores posibles | Dimensión |
|---|---|---|---|
| `pets` | `size` | `'pequeño'` \| `'mediano'` \| `'grande'` | **D1** |
| `pets` | `energy_level` | `'baja'` \| `'media'` \| `'alta'` **(columna nueva Sprint 3)** | **D2** |
| `pets` | `age_years` | entero \| `NULL` | **D3** |
| `pets` | `health_status` | texto libre | **D3** |
| `pets` | `good_with_kids` | `boolean` **(columna nueva Sprint 3)** | **D4** |
| `pets` | `good_with_other_pets` | `boolean` **(columna nueva Sprint 3)** | **D4** |

> `pets.temperament` es **texto libre** y por diseño **no alimenta el scoring**:
> es frágil ante sinónimos. Se conserva solo para mostrar en la ficha pública.
> `hours_at_home` tampoco entra al score: no tiene contraparte estructurada en
> `pets`. Se conserva para enriquecer la frase dinámica (§6).

---

## 3. Dimensiones y pesos

### 3.1 Tabla maestra

| Dim | Nombre | **Peso** | Tipo |
|---|---|---|---|
| **D1** | Tamaño / Espacio | **25 %** | **ELIMINATORIA** (§4) |
| **D2** | Nivel de Energía / Actividad | **30 %** | Sumador |
| **D3** | Temperamento / Experiencia | **20 %** | Sumador |
| **D4** | Compatibilidad con niños / otras mascotas | **25 %** | Sumador con fuerte penalización |
| | **TOTAL** | **100 %** | |

Cada dimensión devuelve un valor normalizado en **[0, 1]**.

### 3.2 Escalado de índices discretos (para D2)

| `activity_level` | índice | | `energy_level` | índice |
|---|---|---|---|---|
| `'bajo'` | 0 | | `'baja'` | 0 |
| `'moderado'` | 1 | | `'media'` | 1 |
| `'alto'` | 2 | | `'alta'` | 2 |
| `NULL` | 1 (neutral) | | — | — (`NOT NULL DEFAULT 'media'`) |

---

## 4. Fórmulas de cálculo

### 4.1 D1 — Tamaño / Espacio (25 %, ELIMINATORIA)

```
falla_eliminatoria :=
     (preferred_size IS NOT NULL AND pets.size <> preferred_size)
  OR (space_type = 'pequeño' AND pets.size = 'grande')

SI falla_eliminatoria ENTONCES score_total := 0  y la mascota se EXCLUYE
SINO D1 := 1
```

- **No se asigna puntaje parcial en D1:** o pasa entera (1) o excluye (0).
- `preferred_size IS NULL` = "sin preferencia" → nunca elimina.
- `space_type = 'amplio'` → nunca elimina por tamaño.

### 4.2 D2 — Nivel de Energía / Actividad (30 %)

```
D2 := 1 - abs( idx(activity_level) - idx(energy_level) ) / 2
```

| Δ de índice | D2 |
|---|---|
| 0 (idénticos) | **1.00** |
| 1 (un nivel de diferencia) | **0.50** |
| 2 (extremos opuestos) | **0.00** |

### 4.3 D3 — Temperamento / Experiencia (20 %)

Primero, la **demanda** de la mascota:

```
demanda := 0.0                                   -- adulto (1 a 7 años) sin cuidados extra
SI pets.age_years < 1        ENTONCES demanda := 0.5    -- cachorro
SI pets.age_years >= 8       ENTONCES demanda := 0.5    -- senior
SI demanda = 0.5
   Y pets.health_status ILIKE ANY ('%medicación%','%medicamento%',
                                   '%tratamiento%','%crónico%','%crónica%',
                                   '%control%','%operad%','%cirugía%')
   ENTONCES demanda := 1.0                        -- cuidados continuos
```

Luego la **experiencia teórica** del adoptante y la cobertura:

```
experiencia := LEAST(adopter_profiles.experience_years / 2.0, 1.0)
D3 := 1 - GREATEST(0, demanda - experiencia)
```

| Situación | experiencia | demanda | D3 |
|---|---|---|---|
| Mascota adulta sana, adoptante sin experiencia | 0.00 | 0.0 | **1.00** |
| Cachorro, adoptante sin experiencia | 0.00 | 0.5 | **0.50** |
| Cachorro, adoptante con 1 año de experiencia | 0.50 | 0.5 | **1.00** |
| Senior con medicación, adoptante sin experiencia | 0.00 | 1.0 | **0.00** |
| Senior con medicación, adoptante con ≥ 2 años | 1.00 | 1.0 | **1.00** |

> La curva es **suave a propósito**: nadie queda en 0 solo por no tener
> experiencia previa con un animal adulto y sano.

### 4.4 D4 — Niños / Otras mascotas (25 %)

Se evalúan **dos sub-dimensiones independientes** y se promedian.

```
sub(X) :=
  adoptante_tiene_X  Y  mascota.good_with_X = false  -> 0.00   -- CONFLICTO
  adoptante_tiene_X  Y  mascota.good_with_X = true   -> 1.00   -- ideal
  NO adoptante_tiene_X  Y  mascota.good_with_X = false-> 1.00   -- sin conflicto
  NO adoptante_tiene_X  Y  mascota.good_with_X = true -> 0.70   -- capacidad sobrante

D4 := ( sub(kids) + sub(other_pets) ) / 2
```

| `has_kids` | `good_with_kids` | `sub(kids)` |
|---|---|---|
| `true` | `false` | **0.00** (conflicto) |
| `true` | `true` | 1.00 |
| `false` | `false` | 1.00 |
| `false` | `true` | 0.70 |

> **Decisión documentada:** el conflicto (hogar con niños + mascota que no es
> apta para niños) **no es eliminatoria** — es la penalización máxima de D4.
> Razón: HU-32 CA#2 solo designa al **tamaño** como filtro eliminatorio, y
> aplicar dos eliminatorias dejaría el catálogo de recomendaciones vacío con
> demasiada facilidad. Si en QA se decide que es un riesgo inaceptable, se
> promueve a eliminatoria **cambiando únicamente esta línea** y versionando
> este documento.

---

## 5. Score final

```
score := CASE
           WHEN falla_eliminatoria THEN 0
           ELSE ROUND(
             100 * ( 0.25 * D1
                   + 0.30 * D2
                   + 0.20 * D3
                   + 0.25 * D4 )
           )
         END
```

- **Rango:** entero 0–100 (CA#3).
- **Se devuelven** las mascotas con `status = 'disponible'` (CA#4) **y**
  `score > 0`, ordenadas `score DESC` (HU-33 CA#1).
- **Se excluyen** las que fallan la eliminatoria (aparecen con `score = 0` y
  por el filtro `score > 0` no se listan).

### 5.1 Umbrales de presentación (HU-33 CA#2/CA#3)

| Rango | Etiqueta sugerida | Color (badge) |
|---|---|---|
| 80 – 100 | *¡Gran match!* | verde |
| 60 – 79 | *Muy compatible* | emerald/celeste |
| 30 – 59 | *Podría funcionar* | ámbar |
| 1 – 29 | *Compatible con reservas* | gris |

Los umbrales **solo afectan a la UI**; no filtran el resultado del motor.

---

## 6. Frase dinámica del match (HU-33 CA#3)

Se genera en SQL a partir de `top_dimension`, la dimensión con **mayor aporte
absoluto** (`peso * D_i`, con desempate en el orden D1 → D2 → D3 → D4).

| `top_dimension` | Plantilla | Tokens |
|---|---|---|
| `D2` | `¡Gran match! Comparten el mismo nivel de energía ({energy_level}) y se adapta a tu {space_type}.` | `energy_level`, `space_type` |
| `D1` | `Se ajusta perfecto al espacio que ofreces: es {size} y buscabas {preferred_size}.` | `size`, `preferred_size` |
| `D4` | `Compatible con {hogar_text}: {niños/mascotas}.` | `hogar_text` |
| `D3` | `Tu experiencia está a la altura de lo que necesita ({demanda_text}).` | `demanda_text` |

Reglas de presentación:
- Si `preferred_size IS NULL`, la frase de D1 usa `space_type` en su lugar.
- Si `space_type IS NULL`, se omite la cláusula de espacio.
- La frase **nunca** puede quedar vacía: si todos los tokens caen a `NULL`,
  se usa la plantilla genérica `«{name} encaja contigo en varios aspectos de tu día a día.»`.

---

## 7. Casos borde (deben tener prueba en la Fase 3)

| # | Caso | Resultado esperado |
|---|---|---|
| 1 | Adoptante sin fila en `compatibility_profiles` | **No se ejecuta el motor.** La capa de store devuelve `{ needsQuiz: true }` y la vista redirige a HU-30 (HU-33 CA#5). |
| 2 | `preferred_size = 'pequeño'` y todas las mascotas disponibles son `grande` | Lista **vacía** (todas con eliminatoria) → estado vacío amigable. |
| 3 | Ninguna mascota con `score > 0` | Lista **vacía**, mensaje controlado (CA#5). |
| 4 | Cero mascotas en `disponible` | Lista **vacía** (CA#4). |
| 5 | `pets.age_years IS NULL` y `age_months < 12` | `demanda = 0.5` (se evalúa como cachorro por `age_months`). |
| 6 | `pets.health_status IS NULL` | Sin agravante de salud → `demanda` no sube a 1.0. |
| 7 | `adopter_profiles` sin fila (perfil no completado) | Tratar `experience_years = 0`, `has_kids = false`, `has_other_pets = false`; **no** bloquear el scoring. |
| 8 | `activity_level IS NULL` | índice 1 (neutral), no elimina. |

---

## 8. Ejemplos numéricos de verificación

Se usarán como *fixtures* de la Fase 3 (calibración).

### Ejemplo A — match casi perfecto → **100**

| Adoptante | Mascota |
|---|---|
| `preferred_size='mediano'` · `space_type='amplio'` | `size='mediano'` |
| `activity_level='moderado'` | `energy_level='media'` |
| `experience_years=1` | `age_years=3`, `health_status='Al día'` |
| `has_kids=false` · `has_other_pets=false` | `good_with_kids=false` · `good_with_other_pets=false` |

- D1 = 1 (coincide tamaño, espacio amplio)
- D2 = 1 − |1−1|/2 = **1.00**
- D3 = 1 − max(0, 0 − 0.5) = **1.00**
- D4 = (1 + 1)/2 = **1.00**
- **score = round(100 × (0.25·1 + 0.30·1 + 0.20·1 + 0.25·1)) = 100**

### Ejemplo B — eliminatoria de tamaño → **0 (excluida)**

| Adoptante | Mascota |
|---|---|
| `preferred_size='pequeño'` | `size='grande'` |

- `falla_eliminatoria = TRUE` → **score = 0 → no aparece en la lista.**

### Ejemplo C — conflicto de niños + energía opuesta → **44**

| Adoptante | Mascota |
|---|---|
| `preferred_size=NULL` · `space_type='amplio'` | `size='grande'` |
| `activity_level='alto'` (índice 2) | `energy_level='baja'` (índice 0) |
| `experience_years=0` | `age_years=0` (< 1) → demanda 0.5, sin palabras clave de salud |
| `has_kids=true` · `has_other_pets=false` | `good_with_kids=false` · `good_with_other_pets=true` |

- D1 = **1** (sin preferencia de tamaño; espacio amplio)
- D2 = 1 − |2−0|/2 = **0.00**
- D3 = 1 − max(0, 0.5 − 0) = **0.50**
- D4 = ( `sub(kids)=0.00` + `sub(other_pets)=0.70` ) / 2 = **0.35**
- **score = round(100 × (0.25·1 + 0.30·0 + 0.20·0.5 + 0.25·0.35))**
  = round(100 × 0.4375) = **44**

---

## 9. Decisiones explícitas y su justificación

| # | Decisión | Justificación |
|---|---|---|
| 1 | El motor vive en una **función SQL de PostgreSQL** invocada con `supabase.rpc()`. | Un solo origen de verdad reutilizable por HU-38 (panel del refugio, Sprint 4); no se descargan todas las mascotas al cliente; los pesos quedan versionados en BD. |
| 2 | `security invoker` (no `security definer`). | Lee `compatibility_profiles` (RLS propio) y `pets` (RLS público) sin elevar privilegios ni exponer filas ajenas. |
| 3 | Añadir **3 columnas** a `pets` (`energy_level`, `good_with_kids`, `good_with_other_pets`). | Sin ellas, D2 y D4 no tendrían datos estructurados y se apoyarían en `temperament` (texto libre), lo que produce scoring impreciso y frágil. |
| 4 | Defaults conservadores: `'media'` y `false`. | La migración de datos no asume aptitud: ninguna mascota queda presentada como apta para niños por defecto. |
| 5 | Solo una eliminatoria (D1). | HU-32 CA#2 nombra únicamente al tamaño; una segunda eliminatoria vaciaría las recomendaciones. |
| 6 | Nombre de tabla `compatibility_profiles` (no `compatibility_answers`). | Coherencia con `docs/ModeloBD.sql`, fuente canónica. La HU-31 usa `compatibility_answers`; se documenta la discrepancia en el changelog. |
| 7 | `hours_at_home` no entra al score. | No existe contraparta estructurada en `pets`; se usa solo para enriquecer la frase dinámica. |
| 8 | Único parcial `uq_applications_open` sobre `status IN ('pendiente','aprobada')`. | HU-35 CA#5 impide duplicados **abiertos**, pero permite volver a solicitar tras un rechazo o una cancelación. |

---

## 10. Fuera de alcance de este documento

- **Aprobación / rechazo de solicitudes** (HU-39, HU-40) → Sprint 4.
- **Notificaciones** (HU-41) → Sprint 4.
- **Expediente PDF** (HU-43) → Sprint 4.
- **Asistente IA** (HU-34) → Sprint 6.
- **Métricas de compatibilidad del dashboard** (HU-51) → Sprint 5.

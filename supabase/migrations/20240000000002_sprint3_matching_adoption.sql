-- ============================================================================
-- MATCHPET — SPRINT 3 (Módulo 5): COMPATIBILIDAD, MATCHING Y SOLICITUDES
-- ----------------------------------------------------------------------------
-- Archivo    : supabase/migrations/20240000000002_sprint3_matching_adoption.sql
-- HUs        : HU-30 (cuestionario), HU-31 (compatibilidad), HU-32 (matching),
--              HU-33 (recomendaciones), HU-35 (solicitud de adopción)
-- Modelo     : docs/ModeloBD.sql  (fuente canónica)
-- Motor      : docs/DECISIONES_ALGORITMO_MATCHING.md  (verdad absoluta HU-32)
--
-- 100 % IDEMPOTENTE: se puede pegar N veces en el SQL Editor de Supabase.
--   · CREATE TYPE  -> bloque DO con comprobación en pg_type (CREATE TYPE no
--                     admite IF NOT EXISTS)
--   · CREATE TABLE -> IF NOT EXISTS
--   · ADD COLUMN   -> IF NOT EXISTS
--   · CREATE INDEX -> IF NOT EXISTS
--   · TRIGGERS     -> DROP TRIGGER IF EXISTS + CREATE TRIGGER
--   · FUNCTIONS    -> CREATE OR REPLACE
--   · POLICIES     -> DROP POLICY IF EXISTS + CREATE POLICY
--   · RLS/GRANTS   -> comandos naturalmente idempotentes
--
-- ORDEN: debe ejecutarse DESPUÉS de 20240000000000_align_schema.sql
--
-- Incluye match_recommendations() (motor de scoring HU-32), gobernada por
-- docs/DECISIONES_ALGORITMO_MATCHING.md.
-- 100 % ADITIVA: no borra ni modifica datos existentes.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------------
-- 1.1 Estados del ciclo de vida de una solicitud de adopción (HU-35 / HU-39)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typnamespace = 'public'::regnamespace AND typname = 'application_status'
  ) THEN
    CREATE TYPE public.application_status AS ENUM
      ('pendiente', 'aprobada', 'rechazada', 'cancelada', 'completada');
  END IF;
END $$;

-- 1.2 Nivel de energía de la mascota — dimensión D2 del matching (HU-32)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typnamespace = 'public'::regnamespace AND typname = 'energy_level'
  ) THEN
    CREATE TYPE public.energy_level AS ENUM ('baja', 'media', 'alta');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. FUNCIONES DE TRIGGER compartidas (recreadas por si se ejecuta aislado)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auditoría de resolución: cuando el estado sale de 'pendiente' se registra
-- el momento exacto; si vuelve a 'pendiente' se limpia (HU-35).
CREATE OR REPLACE FUNCTION public.set_application_resolved_at()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'pendiente' THEN
      NEW.resolved_at := NULL;
    ELSE
      NEW.resolved_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ---------------------------------------------------------------------------
-- 3. DELTA EN LA TABLA pets — 3 columnas estructuradas del matching
--    Defaults conservadores (Decisión #4 del documento de algoritmo):
--    energía MEDIA y NO apto por defecto para niños ni otros animales.
-- ---------------------------------------------------------------------------
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS energy_level public.energy_level NOT NULL DEFAULT 'media';

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS good_with_kids boolean NOT NULL DEFAULT false;

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS good_with_other_pets boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.pets.energy_level IS
  'HU-32 · dimensión D2 (peso 30%) del motor de matching';
COMMENT ON COLUMN public.pets.good_with_kids IS
  'HU-32 · dimensión D4 (peso 25%) — convivencia con niños';
COMMENT ON COLUMN public.pets.good_with_other_pets IS
  'HU-32 · dimensión D4 (peso 25%) — convivencia con otros animales';

-- ---------------------------------------------------------------------------
-- 4. TABLA compatibility_profiles (HU-30 / HU-31) — 1:1 con profiles
--    Nota de nomenclatura: HU-31 la llama "compatibility_answers"; se adopta
--    el nombre de docs/ModeloBD.sql (fuente canónica). FK a profiles(id).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compatibility_profiles (
  user_id        uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  hours_at_home  text NOT NULL CHECK (hours_at_home  IN ('menos_de_4','4_a_8','mas_de_8')),
  activity_level text NOT NULL CHECK (activity_level IN ('bajo','moderado','alto')),   -- D2
  space_type     text NOT NULL CHECK (space_type     IN ('pequeño','amplio')),         -- D1
  preferred_size public.pet_size,            -- NULL = sin preferencia        -> D1
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.compatibility_profiles IS
  'Respuestas del cuestionario de estilo de vida (HU-30). Fuente de entrada de D1-D4 del matching.';

-- Columnas nuevas en esquemas preexistentes (idempotencia de esquema viejo).
ALTER TABLE public.compatibility_profiles
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.compatibility_profiles
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS update_compatibility_profiles_updated_at ON public.compatibility_profiles;
CREATE TRIGGER update_compatibility_profiles_updated_at
  BEFORE UPDATE ON public.compatibility_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 5. TABLA adoption_applications (HU-35)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.adoption_applications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id           uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message          text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 500),  -- HU-35 CA#3
  status           public.application_status NOT NULL DEFAULT 'pendiente',
  shelter_comments text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  resolved_at      timestamptz
);

COMMENT ON TABLE public.adoption_applications IS
  'HU-35 · Solicitudes de adopción. Máx. 1 abierta por (adoptante, mascota) — índice parcial uq_applications_open.';

ALTER TABLE public.adoption_applications
  ADD COLUMN IF NOT EXISTS shelter_comments text;
ALTER TABLE public.adoption_applications
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

DROP TRIGGER IF EXISTS update_applications_updated_at ON public.adoption_applications;
CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.adoption_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS adoption_applications_set_resolved_at ON public.adoption_applications;
CREATE TRIGGER adoption_applications_set_resolved_at
  BEFORE UPDATE ON public.adoption_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_application_resolved_at();

-- ---------------------------------------------------------------------------
-- 6. ÍNDICES
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_applications_user
  ON public.adoption_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_pet
  ON public.adoption_applications(pet_id);

-- HU-35 CA#5: prohíbe solicitudes DUPLICADAS mientras exista una abierta
-- ('pendiente' o 'aprobada'). Es parcial a propósito: tras un 'rechazada' o
-- 'cancelada' el adoptante puede volver a solicitar la misma mascota.
CREATE UNIQUE INDEX IF NOT EXISTS uq_applications_open
  ON public.adoption_applications(user_id, pet_id)
  WHERE status IN ('pendiente', 'aprobada');

-- ---------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
ALTER TABLE public.compatibility_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adoption_applications  ENABLE ROW LEVEL SECURITY;

-- --- RLS compatibility_profiles: solo su dueño (el adoptante) --------------
DROP POLICY IF EXISTS "cp_select_own" ON public.compatibility_profiles;
CREATE POLICY "cp_select_own" ON public.compatibility_profiles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "cp_insert_own" ON public.compatibility_profiles;
CREATE POLICY "cp_insert_own" ON public.compatibility_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "cp_update_own" ON public.compatibility_profiles;
CREATE POLICY "cp_update_own" ON public.compatibility_profiles
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- --- RLS adoption_applications ---------------------------------------------
-- a) El adoptante ve únicamente SUS solicitudes.
DROP POLICY IF EXISTS "aa_select_own" ON public.adoption_applications;
CREATE POLICY "aa_select_own" ON public.adoption_applications
  FOR SELECT USING (user_id = auth.uid());

-- b) El refugio ve las solicitudes de las MASCOTAS de su refugio.
--    (Base para HU-39/HU-40 del Sprint 4; ya queda creada la lectura.)
DROP POLICY IF EXISTS "aa_select_shelter" ON public.adoption_applications;
CREATE POLICY "aa_select_shelter" ON public.adoption_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.pets pt
      JOIN public.shelters s ON s.id = pt.shelter_id
      WHERE pt.id = adoption_applications.pet_id
        AND s.user_id = auth.uid()
    )
  );

-- c) INSERT: solo rol 'adoptante', solo mascotas 'disponible', siempre
--    nace en 'pendiente' (la transición de estado la gestiona el refugio).
DROP POLICY IF EXISTS "aa_insert_adoptante" ON public.adoption_applications;
CREATE POLICY "aa_insert_adoptante" ON public.adoption_applications
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND status = 'pendiente'
    AND EXISTS (
      SELECT 1 FROM public.pets pt
      WHERE pt.id = adoption_applications.pet_id AND pt.status = 'disponible'
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'adoptante'
    )
    -- HU-35 CA#1: perfil de adoptante completado
    AND EXISTS (
      SELECT 1 FROM public.adopter_profiles ap
      WHERE ap.user_id = auth.uid()
    )
  );

-- d) UPDATE: el adoptante solo puede CANCELAR, solo si está 'pendiente',
--    y no puede tocar shelter_comments (HU-35 CA#6).
DROP POLICY IF EXISTS "aa_update_cancel_own" ON public.adoption_applications;
CREATE POLICY "aa_update_cancel_own" ON public.adoption_applications
  FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pendiente')
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'cancelada'
    AND shelter_comments IS NULL
  );

-- (No existe política de DELETE: ninguna rol elimina solicitudes; el borrado
--  físico ocurre solo por cascada al borrarse la mascota o el perfil.)

-- ---------------------------------------------------------------------------
-- 8. GRANTS: sin acceso anon, sin DELETE. Las políticas RLS siguen aplicando.
--    La migración 00 dio `grant all` por default privileges; aquí se reduce SOLO
--    en las tablas nuevas (no se tocan las existentes).
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.compatibility_profiles FROM anon, authenticated;
REVOKE ALL ON public.adoption_applications  FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.compatibility_profiles TO authenticated;
-- adoption_applications: el adoptante inserta y SOLO puede modificar `status`
-- (HU-37). Sprint 4 añadirá UPDATE(shelter_comments) para el refugio.
GRANT SELECT, INSERT ON public.adoption_applications TO authenticated;
GRANT UPDATE (status) ON public.adoption_applications TO authenticated;

-- ---------------------------------------------------------------------------
-- 9. MOTOR DE MATCHING (HU-32) — docs/DECISIONES_ALGORITMO_MATCHING.md
--    security INVOKER: respeta RLS (compatibility_profiles propia, pets pública).
--    Pesos: D1 25 % (eliminatoria) · D2 30 % · D3 20 % · D4 25 %.
--    Sin fila en compatibility_profiles devuelve 0 filas (el store usa needsQuiz).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_recommendations()
RETURNS TABLE (pet_id uuid, score integer, top_dimension text, reason text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $fn$
  WITH me AS (
    SELECT cp.activity_level, cp.space_type, cp.preferred_size,
           COALESCE(ap.experience_years, 0)    AS exp_years,
           COALESCE(ap.has_kids, false)        AS has_kids,
           COALESCE(ap.has_other_pets, false)  AS has_other_pets
    FROM public.compatibility_profiles cp
    LEFT JOIN public.adopter_profiles ap ON ap.user_id = cp.user_id
    WHERE cp.user_id = auth.uid()
  ),
  base AS (
    SELECT p.id, p.name, p.size, p.energy_level, p.good_with_kids, p.good_with_other_pets,
           me.*,
           -- D1 eliminatoria
           ((me.preferred_size IS NOT NULL AND p.size <> me.preferred_size)
             OR (me.space_type = 'pequeño' AND p.size = 'grande')) AS eliminated,
           -- D2
           1 - abs(
                 CASE me.activity_level WHEN 'bajo' THEN 0 WHEN 'alto' THEN 2 ELSE 1 END
               - CASE p.energy_level WHEN 'baja' THEN 0 WHEN 'alta' THEN 2 ELSE 1 END
               ) / 2.0 AS d2,
           -- D3: demanda de la mascota
           CASE
             WHEN (COALESCE(p.age_years, CASE WHEN p.age_months < 12 THEN 0 END) < 1
                   OR p.age_years >= 8)
              AND p.health_status ILIKE ANY (ARRAY['%medicación%','%medicamento%','%tratamiento%',
                    '%crónico%','%crónica%','%control%','%operad%','%cirugía%']) THEN 1.0
             WHEN COALESCE(p.age_years, CASE WHEN p.age_months < 12 THEN 0 END) < 1
               OR p.age_years >= 8 THEN 0.5
             ELSE 0.0
           END AS demanda,
           -- D4
           ( CASE WHEN me.has_kids THEN (CASE WHEN p.good_with_kids THEN 1.0 ELSE 0.0 END)
                  ELSE (CASE WHEN p.good_with_kids THEN 0.7 ELSE 1.0 END) END
           + CASE WHEN me.has_other_pets THEN (CASE WHEN p.good_with_other_pets THEN 1.0 ELSE 0.0 END)
                  ELSE (CASE WHEN p.good_with_other_pets THEN 0.7 ELSE 1.0 END) END
           ) / 2.0 AS d4
    FROM public.pets p CROSS JOIN me
    WHERE p.status = 'disponible'                                   -- HU-32 CA#4
  ),
  scored AS (
    SELECT b.*, 1.0 AS d1,
           1 - GREATEST(0, b.demanda - LEAST(b.exp_years / 2.0, 1.0)) AS d3
    FROM base b
    WHERE NOT b.eliminated
  ),
  contrib AS (
    SELECT s.*, 0.25 * s.d1 AS c1, 0.30 * s.d2 AS c2, 0.20 * s.d3 AS c3, 0.25 * s.d4 AS c4
    FROM scored s
  ),
  ranked AS (
    SELECT c.*,
           round(100 * (c.c1 + c.c2 + c.c3 + c.c4))::int AS final_score,
           CASE WHEN c.c1 >= c.c2 AND c.c1 >= c.c3 AND c.c1 >= c.c4 THEN 'D1'
                WHEN c.c2 >= c.c3 AND c.c2 >= c.c4 THEN 'D2'
                WHEN c.c3 >= c.c4 THEN 'D3'
                ELSE 'D4' END AS top_dim
    FROM contrib c
  )
  SELECT r.id, r.final_score, r.top_dim,
         COALESCE(
           CASE r.top_dim
             WHEN 'D2' THEN
               CASE WHEN r.d2 = 1
                    THEN '¡Gran match! Comparten el mismo nivel de energía (' || r.energy_level || ') y se adapta a tu espacio ' || r.space_type || '.'
                    ELSE 'Su nivel de energía (' || r.energy_level || ') es cercano al tuyo y se adapta a tu espacio ' || r.space_type || '.' END
             WHEN 'D1' THEN
               'Se ajusta perfecto al espacio que ofreces: es ' || r.size
               || CASE WHEN r.preferred_size IS NOT NULL THEN ' y buscabas ' || r.preferred_size
                       ELSE ' y tu espacio es ' || r.space_type END || '.'
             WHEN 'D4' THEN
               'Compatible con tu hogar (' || CASE WHEN r.has_kids THEN 'con niños' ELSE 'sin niños' END
               || '; ' || CASE WHEN r.has_other_pets THEN 'con otras mascotas' ELSE 'sin otras mascotas' END || ').'
             WHEN 'D3' THEN
               'Tu experiencia está a la altura de lo que necesita ('
               || CASE WHEN r.demanda >= 1 THEN 'cuidados continuos'
                       WHEN r.demanda > 0 THEN 'cuidados especiales moderados'
                       ELSE 'cuidados estándar' END || ').'
           END,
           r.name || ' encaja contigo en varios aspectos de tu día a día.') AS reason
  FROM ranked r
  WHERE r.final_score > 0                                           -- HU-32 CA#5
  ORDER BY r.final_score DESC, r.name;
$fn$;

REVOKE ALL ON FUNCTION public.match_recommendations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_recommendations() TO authenticated;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
-- Verificación rápida (SQL Editor → New query):
--
-- 1) Enums:
--    SELECT typname FROM pg_type
--     WHERE typnamespace = 'public'::regnamespace
--       AND typname IN ('application_status', 'energy_level');
--
-- 2) Columnas nuevas en pets:
--    SELECT column_name, data_type, column_default
--      FROM information_schema.columns
--     WHERE table_schema = 'public' AND table_name = 'pets'
--       AND column_name IN ('energy_level','good_with_kids','good_with_other_pets');
--
-- 3) Tablas creadas:
--    SELECT to_regclass('public.compatibility_profiles'),
--           to_regclass('public.adoption_applications');
--
-- 4) Índices:
--    SELECT indexname, indexdef FROM pg_indexes
--     WHERE schemaname = 'public' AND tablename = 'adoption_applications';
--
-- 5) Triggers:
--    SELECT tgname FROM pg_trigger
--     WHERE tgrelid = 'public.adoption_applications'::regclass AND NOT tgisinternal;
--    SELECT tgname FROM pg_trigger
--     WHERE tgrelid = 'public.compatibility_profiles'::regclass AND NOT tgisinternal;
--
-- 6) Matriz RLS completa (debe salir cp_select_own, cp_insert_own, cp_update_own,
--    aa_select_own, aa_select_shelter, aa_insert_adoptante, aa_update_cancel_own):
--    SELECT tablename, policyname, cmd FROM pg_policies
--     WHERE schemaname = 'public'
--       AND tablename IN ('compatibility_profiles', 'adoption_applications')
--     ORDER BY tablename, policyname;
--
-- 7) anon bloqueado (ambas filas deben dar 0 privilegios):
--    SELECT grantee, table_name, string_agg(privilege_type, ', ')
--      FROM information_schema.table_privileges
--     WHERE table_schema = 'public'
--       AND table_name IN ('compatibility_profiles', 'adoption_applications')
--     GROUP BY grantee, table_name
--     ORDER BY table_name, grantee;
-- ============================================================================

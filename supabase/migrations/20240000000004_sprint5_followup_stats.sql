-- ============================================================================
-- MATCHPET — SPRINT 5 (etapas 1 y 2): SEGUIMIENTO POST-ADOPCIÓN Y ESTADÍSTICAS
-- ----------------------------------------------------------------------------
-- Archivo : supabase/migrations/20240000000004_sprint5_followup_stats.sql
-- HUs     : HU-44, HU-45 (notas), HU-47, HU-48 (reportes),
--           HU-49, HU-50, HU-51 (estadísticas del refugio)
-- Orden   : DESPUÉS de 20240000000003_sprint4_shelter_management.sql
-- ADITIVA E IDEMPOTENTE. Las escrituras pasan por RPC SECURITY DEFINER
-- (search_path vacío); las tablas solo exponen SELECT por RLS.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A. Tipos usados por ModeloBD.sql (no existían en la BD viva)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'follow_up_type') THEN
        CREATE TYPE public.follow_up_type AS ENUM ('llamada', 'visita', 'mensaje');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'report_status') THEN
        CREATE TYPE public.report_status AS ENUM ('pendiente', 'respondido', 'cerrado');
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- B. NOTAS DE SEGUIMIENTO (HU-44 / HU-45)
--    ModeloBD + application_id/user_id (CA#2: vínculo con mascota y adoptante)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.follow_up_notes (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.adoption_applications(id) ON DELETE CASCADE,
    pet_id         UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    shelter_id     UUID NOT NULL REFERENCES public.shelters(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type           public.follow_up_type NOT NULL,
    noted_at       DATE NOT NULL DEFAULT CURRENT_DATE,
    notes          TEXT NOT NULL CHECK (char_length(btrim(notes)) BETWEEN 3 AND 1000),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_follow_up_app ON public.follow_up_notes(application_id, noted_at DESC);

-- ---------------------------------------------------------------------------
-- C. REPORTES POST-ADOPCIÓN (HU-47 / HU-48)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_adoption_reports (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.adoption_applications(id) ON DELETE CASCADE,
    pet_id         UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    shelter_id     UUID NOT NULL REFERENCES public.shelters(id) ON DELETE CASCADE,
    category       TEXT NOT NULL CHECK (category IN ('Comportamiento', 'Salud', 'Duda general', 'Otro')),
    description    TEXT NOT NULL CHECK (char_length(btrim(description)) BETWEEN 10 AND 1000),
    image_url      TEXT,
    status         public.report_status NOT NULL DEFAULT 'pendiente',
    shelter_response TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_shelter ON public.post_adoption_reports(shelter_id, status);
CREATE INDEX IF NOT EXISTS idx_reports_user ON public.post_adoption_reports(user_id);

DROP TRIGGER IF EXISTS update_reports_updated_at ON public.post_adoption_reports;
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON public.post_adoption_reports
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- D. RLS: solo lectura directa para el refugio dueño y el adoptante involucrado
-- ---------------------------------------------------------------------------
ALTER TABLE public.follow_up_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_adoption_reports ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.follow_up_notes, public.post_adoption_reports FROM anon, authenticated;
GRANT SELECT ON public.follow_up_notes, public.post_adoption_reports TO authenticated;

DROP POLICY IF EXISTS "fn_select_shelter" ON public.follow_up_notes;
CREATE POLICY "fn_select_shelter" ON public.follow_up_notes FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.shelters s WHERE s.id = follow_up_notes.shelter_id AND s.user_id = auth.uid()));

DROP POLICY IF EXISTS "fn_select_adopter" ON public.follow_up_notes;
CREATE POLICY "fn_select_adopter" ON public.follow_up_notes FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "pr_select_shelter" ON public.post_adoption_reports;
CREATE POLICY "pr_select_shelter" ON public.post_adoption_reports FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.shelters s WHERE s.id = post_adoption_reports.shelter_id AND s.user_id = auth.uid()));

DROP POLICY IF EXISTS "pr_select_adopter" ON public.post_adoption_reports;
CREATE POLICY "pr_select_adopter" ON public.post_adoption_reports FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- E. RPC DE ESCRITURA
-- ---------------------------------------------------------------------------

-- HU-44: el refugio registra una nota sobre una adopción ya entregada.
CREATE OR REPLACE FUNCTION public.add_follow_up_note(
    p_application_id uuid, p_type text, p_noted_at date, p_notes text
) RETURNS public.follow_up_notes
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_app  public.adoption_applications;
    v_shel public.shelters;
    v_note public.follow_up_notes;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'No autenticado' USING ERRCODE = '28000';
    END IF;
    IF p_type NOT IN ('llamada', 'visita', 'mensaje') THEN
        RAISE EXCEPTION 'Tipo de seguimiento inválido' USING ERRCODE = '22023';
    END IF;
    IF char_length(btrim(COALESCE(p_notes, ''))) < 3 THEN
        RAISE EXCEPTION 'Escribe las observaciones del seguimiento' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_app FROM public.adoption_applications WHERE id = p_application_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Adopción no encontrada' USING ERRCODE = 'P0002';
    END IF;
    SELECT s.* INTO v_shel
    FROM public.pets pt JOIN public.shelters s ON s.id = pt.shelter_id
    WHERE pt.id = v_app.pet_id AND s.user_id = auth.uid();
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No tienes permiso sobre esta adopción' USING ERRCODE = '42501';
    END IF;
    IF v_app.status <> 'completada' THEN
        RAISE EXCEPTION 'El seguimiento solo aplica a adopciones con entrega registrada' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.follow_up_notes (application_id, pet_id, shelter_id, user_id, type, noted_at, notes)
    VALUES (v_app.id, v_app.pet_id, v_shel.id, v_app.user_id, p_type::public.follow_up_type,
            COALESCE(p_noted_at, CURRENT_DATE), btrim(p_notes))
    RETURNING * INTO v_note;
    RETURN v_note;
END;
$$;

-- HU-47: el adoptante reporta un problema o duda (notifica al refugio).
CREATE OR REPLACE FUNCTION public.create_post_adoption_report(
    p_application_id uuid, p_category text, p_description text
) RETURNS public.post_adoption_reports
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_app    public.adoption_applications;
    v_pet    public.pets;
    v_shel   public.shelters;
    v_report public.post_adoption_reports;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'No autenticado' USING ERRCODE = '28000';
    END IF;
    IF p_category NOT IN ('Comportamiento', 'Salud', 'Duda general', 'Otro') THEN
        RAISE EXCEPTION 'Categoría inválida' USING ERRCODE = '22023';
    END IF;
    IF char_length(btrim(COALESCE(p_description, ''))) < 10 THEN
        RAISE EXCEPTION 'Describe el problema con al menos 10 caracteres' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_app FROM public.adoption_applications
     WHERE id = p_application_id AND user_id = auth.uid();
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Adopción no encontrada' USING ERRCODE = 'P0002';
    END IF;
    IF v_app.status <> 'completada' THEN
        RAISE EXCEPTION 'Solo puedes reportar sobre una mascota ya adoptada' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_pet FROM public.pets WHERE id = v_app.pet_id;
    SELECT * INTO v_shel FROM public.shelters WHERE id = v_pet.shelter_id;

    INSERT INTO public.post_adoption_reports (application_id, pet_id, user_id, shelter_id, category, description)
    VALUES (v_app.id, v_pet.id, auth.uid(), v_shel.id, p_category, btrim(p_description))
    RETURNING * INTO v_report;

    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (v_shel.user_id, 'Nuevo reporte post-adopción',
            format('Un adoptante reportó (%s) sobre %s.', p_category, v_pet.name),
            '/refugio/reportes');
    RETURN v_report;
END;
$$;

-- HU-48: el refugio responde (y opcionalmente agenda visita o cierra el caso).
CREATE OR REPLACE FUNCTION public.respond_post_adoption_report(
    p_id uuid, p_response text, p_visit_date date, p_close boolean
) RETURNS public.post_adoption_reports
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_rep  public.post_adoption_reports;
    v_pet  text;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'No autenticado' USING ERRCODE = '28000';
    END IF;
    IF char_length(btrim(COALESCE(p_response, ''))) < 5 THEN
        RAISE EXCEPTION 'Escribe una respuesta de orientación' USING ERRCODE = '22023';
    END IF;

    SELECT r.* INTO v_rep
    FROM public.post_adoption_reports r
    JOIN public.shelters s ON s.id = r.shelter_id
    WHERE r.id = p_id AND s.user_id = auth.uid()
    FOR UPDATE OF r;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reporte no encontrado o sin permiso' USING ERRCODE = '42501';
    END IF;
    IF v_rep.status = 'cerrado' THEN
        RAISE EXCEPTION 'El reporte ya está cerrado' USING ERRCODE = '22023';
    END IF;
    IF p_visit_date IS NOT NULL AND p_visit_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'La visita debe agendarse hoy o en una fecha futura' USING ERRCODE = '22023';
    END IF;

    UPDATE public.post_adoption_reports
       SET shelter_response = btrim(p_response),
           status = CASE WHEN COALESCE(p_close, false) THEN 'cerrado' ELSE 'respondido' END::public.report_status
     WHERE id = p_id
    RETURNING * INTO v_rep;

    -- "Agendar visita" = nota de seguimiento tipo visita con fecha futura.
    IF p_visit_date IS NOT NULL THEN
        INSERT INTO public.follow_up_notes (application_id, pet_id, shelter_id, user_id, type, noted_at, notes)
        VALUES (v_rep.application_id, v_rep.pet_id, v_rep.shelter_id, v_rep.user_id, 'visita', p_visit_date,
                'Visita de seguimiento agendada a raíz de tu reporte (' || v_rep.category || ').');
    END IF;

    SELECT name INTO v_pet FROM public.pets WHERE id = v_rep.pet_id;
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (v_rep.user_id, 'El refugio respondió tu reporte',
            format('Hay una respuesta sobre %s.', v_pet) ||
            CASE WHEN p_visit_date IS NOT NULL THEN ' Se agendó una visita el ' || to_char(p_visit_date, 'DD/MM/YYYY') || '.' ELSE '' END,
            '/adoptante/mis-adopciones');
    RETURN v_rep;
END;
$$;

-- ---------------------------------------------------------------------------
-- F. SCORE GUARDADO EN LA SOLICITUD (HU-51: promedio de compatibilidad)
--    compat_score() reproduce, para UN par (adoptante, mascota), la misma
--    fórmula de match_recommendations() (DECISIONES_ALGORITMO_MATCHING.md).
--    Si cambian los pesos, hay que actualizar ambas funciones.
-- ---------------------------------------------------------------------------
ALTER TABLE public.adoption_applications ADD COLUMN IF NOT EXISTS match_score smallint
    CHECK (match_score BETWEEN 0 AND 100);

CREATE OR REPLACE FUNCTION public.compat_score(p_user uuid, p_pet uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  WITH b AS (
    SELECT cp.activity_level, cp.space_type, cp.preferred_size,
           COALESCE(ap.experience_years, 0) AS exp_years,
           COALESCE(ap.has_kids, false) AS has_kids,
           COALESCE(ap.has_other_pets, false) AS has_other_pets,
           p.size, p.energy_level, p.good_with_kids, p.good_with_other_pets,
           1 - abs(CASE cp.activity_level WHEN 'bajo' THEN 0 WHEN 'alto' THEN 2 ELSE 1 END
                 - CASE p.energy_level WHEN 'baja' THEN 0 WHEN 'alta' THEN 2 ELSE 1 END) / 2.0 AS d2,
           CASE
             WHEN (COALESCE(p.age_years, CASE WHEN p.age_months < 12 THEN 0 END) < 1 OR p.age_years >= 8)
              AND p.health_status ILIKE ANY (ARRAY['%medicación%','%medicamento%','%tratamiento%',
                    '%crónico%','%crónica%','%control%','%operad%','%cirugía%']) THEN 1.0
             WHEN COALESCE(p.age_years, CASE WHEN p.age_months < 12 THEN 0 END) < 1 OR p.age_years >= 8 THEN 0.5
             ELSE 0.0 END AS demanda,
           ((cp.preferred_size IS NOT NULL AND p.size <> cp.preferred_size)
             OR (cp.space_type = 'pequeño' AND p.size = 'grande')) AS eliminated
    FROM public.compatibility_profiles cp
    LEFT JOIN public.adopter_profiles ap ON ap.user_id = cp.user_id
    CROSS JOIN public.pets p
    WHERE cp.user_id = p_user AND p.id = p_pet
  )
  SELECT CASE WHEN b.eliminated THEN NULL ELSE round(100 * (
           0.25
         + 0.30 * b.d2
         + 0.20 * (1 - GREATEST(0, b.demanda - LEAST(b.exp_years / 2.0, 1.0)))
         + 0.25 * ( ( CASE WHEN b.has_kids THEN (CASE WHEN b.good_with_kids THEN 1.0 ELSE 0.0 END)
                           ELSE (CASE WHEN b.good_with_kids THEN 0.7 ELSE 1.0 END) END
                    + CASE WHEN b.has_other_pets THEN (CASE WHEN b.good_with_other_pets THEN 1.0 ELSE 0.0 END)
                           ELSE (CASE WHEN b.good_with_other_pets THEN 0.7 ELSE 1.0 END) END ) / 2.0 )
         ))::int END
  FROM b;
$fn$;
REVOKE ALL ON FUNCTION public.compat_score(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_application_match_score()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    NEW.match_score := public.compat_score(NEW.user_id, NEW.pet_id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_application_match_score ON public.adoption_applications;
CREATE TRIGGER trg_application_match_score
    BEFORE INSERT ON public.adoption_applications
    FOR EACH ROW EXECUTE FUNCTION public.set_application_match_score();

-- Solicitudes previas (el trigger de INSERT no las tocó).
UPDATE public.adoption_applications
   SET match_score = public.compat_score(user_id, pet_id)
 WHERE match_score IS NULL;

-- ---------------------------------------------------------------------------
-- G. ESTADÍSTICAS DEL REFUGIO (HU-49 / HU-50 / HU-51)
--    Siempre filtradas por el refugio del usuario autenticado.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_shelter_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT id FROM public.shelters WHERE user_id = auth.uid() LIMIT 1 $$;

-- HU-49
CREATE OR REPLACE FUNCTION public.shelter_dashboard_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_shelter uuid := public.my_shelter_id();
    v_total int; v_done int;
BEGIN
    IF v_shelter IS NULL THEN
        RAISE EXCEPTION 'Solo los refugios pueden ver estas estadísticas' USING ERRCODE = '42501';
    END IF;

    SELECT count(*), count(*) FILTER (WHERE a.status = 'completada')
      INTO v_total, v_done
    FROM public.adoption_applications a JOIN public.pets p ON p.id = a.pet_id
    WHERE p.shelter_id = v_shelter;

    RETURN jsonb_build_object(
        'pets_total',      (SELECT count(*) FROM public.pets WHERE shelter_id = v_shelter),
        'pets_disponible', (SELECT count(*) FROM public.pets WHERE shelter_id = v_shelter AND status = 'disponible'),
        'pets_en_proceso', (SELECT count(*) FROM public.pets WHERE shelter_id = v_shelter AND status = 'en_proceso'),
        'pets_adoptada',   (SELECT count(*) FROM public.pets WHERE shelter_id = v_shelter AND status = 'adoptada'),
        'pending_applications', (SELECT count(*) FROM public.adoption_applications a JOIN public.pets p ON p.id = a.pet_id
                                  WHERE p.shelter_id = v_shelter AND a.status = 'pendiente'),
        'adoptions_this_month', (SELECT count(*) FROM public.adoption_deliveries d
                                  JOIN public.adoption_applications a ON a.id = d.application_id
                                  JOIN public.pets p ON p.id = a.pet_id
                                  WHERE p.shelter_id = v_shelter
                                    AND date_trunc('month', d.delivered_at) = date_trunc('month', CURRENT_DATE)),
        'applications_total', v_total,
        'success_rate', CASE WHEN v_total = 0 THEN 0 ELSE round(100.0 * v_done / v_total, 1) END,
        'open_reports', (SELECT count(*) FROM public.post_adoption_reports WHERE shelter_id = v_shelter AND status = 'pendiente'),
        'recent_activity', COALESCE((
            SELECT jsonb_agg(x ORDER BY x->>'at' DESC) FROM (
                SELECT jsonb_build_object('pet', p.name, 'status', a.status, 'at', a.updated_at) AS x
                FROM public.adoption_applications a JOIN public.pets p ON p.id = a.pet_id
                WHERE p.shelter_id = v_shelter
                ORDER BY a.updated_at DESC LIMIT 5) t), '[]'::jsonb)
    );
END;
$$;

-- HU-50: adopciones (entregas registradas) en el rango, ya agregadas.
CREATE OR REPLACE FUNCTION public.shelter_adoption_charts(p_from date, p_to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_shelter uuid := public.my_shelter_id();
BEGIN
    IF v_shelter IS NULL THEN
        RAISE EXCEPTION 'Solo los refugios pueden ver estas estadísticas' USING ERRCODE = '42501';
    END IF;
    IF p_from IS NULL OR p_to IS NULL OR p_from > p_to THEN
        RAISE EXCEPTION 'Rango de fechas inválido' USING ERRCODE = '22023';
    END IF;

    RETURN (
        WITH adopted AS (
            SELECT d.delivered_at, p.species, p.size
            FROM public.adoption_deliveries d
            JOIN public.adoption_applications a ON a.id = d.application_id
            JOIN public.pets p ON p.id = a.pet_id
            WHERE p.shelter_id = v_shelter AND d.delivered_at BETWEEN p_from AND p_to
        )
        SELECT jsonb_build_object(
            'total', (SELECT count(*) FROM adopted),
            'by_month', COALESCE((
                SELECT jsonb_agg(jsonb_build_object('month', to_char(m, 'YYYY-MM'),
                       'count', (SELECT count(*) FROM adopted WHERE date_trunc('month', delivered_at) = m)) ORDER BY m)
                FROM generate_series(date_trunc('month', p_from), date_trunc('month', p_to), interval '1 month') m), '[]'::jsonb),
            'by_species', COALESCE((SELECT jsonb_agg(jsonb_build_object('label', species::text, 'count', c))
                                    FROM (SELECT species, count(*) c FROM adopted GROUP BY species) s), '[]'::jsonb),
            'by_size', COALESCE((SELECT jsonb_agg(jsonb_build_object('label', size::text, 'count', c))
                                 FROM (SELECT size, count(*) c FROM adopted GROUP BY size) s), '[]'::jsonb)
        )
    );
END;
$$;

-- HU-51: agregado y anónimo (sin datos personales).
CREATE OR REPLACE FUNCTION public.shelter_compatibility_metrics()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_shelter uuid := public.my_shelter_id();
BEGIN
    IF v_shelter IS NULL THEN
        RAISE EXCEPTION 'Solo los refugios pueden ver estas estadísticas' USING ERRCODE = '42501';
    END IF;

    RETURN (
        WITH apps AS (
            SELECT a.status, a.match_score,
                   EXISTS (SELECT 1 FROM public.compatibility_profiles cp WHERE cp.user_id = a.user_id) AS has_quiz
            FROM public.adoption_applications a JOIN public.pets p ON p.id = a.pet_id
            WHERE p.shelter_id = v_shelter AND a.status <> 'cancelada'
        )
        SELECT jsonb_build_object(
            'quiz_completed_total', (SELECT count(*) FROM public.compatibility_profiles),
            'applications_with_quiz', (SELECT count(*) FROM apps WHERE has_quiz),
            'adoptions_with_quiz', (SELECT count(*) FROM apps WHERE has_quiz AND status = 'completada'),
            'applications_without_quiz', (SELECT count(*) FROM apps WHERE NOT has_quiz),
            'adoptions_without_quiz', (SELECT count(*) FROM apps WHERE NOT has_quiz AND status = 'completada'),
            'avg_score_adopted', (SELECT round(avg(match_score), 1) FROM apps WHERE status = 'completada' AND match_score IS NOT NULL)
        )
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_follow_up_note(uuid, text, date, text),
                           public.create_post_adoption_report(uuid, text, text),
                           public.respond_post_adoption_report(uuid, text, date, boolean),
                           public.my_shelter_id(),
                           public.shelter_dashboard_stats(),
                           public.shelter_adoption_charts(date, date),
                           public.shelter_compatibility_metrics()
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_follow_up_note(uuid, text, date, text),
                          public.create_post_adoption_report(uuid, text, text),
                          public.respond_post_adoption_report(uuid, text, date, boolean),
                          public.my_shelter_id(),
                          public.shelter_dashboard_stats(),
                          public.shelter_adoption_charts(date, date),
                          public.shelter_compatibility_metrics()
    TO authenticated;

-- La función del trigger no debe ser invocable vía /rest/v1/rpc.
REVOKE ALL ON FUNCTION public.set_application_match_score() FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- MATCHPET — SPRINT 5 (etapa 3): CALENDARIO DE SALUD Y RECORDATORIOS (HU-46)
-- ----------------------------------------------------------------------------
-- CA#1 calendario inicial al registrar la entrega (editable por el refugio).
-- CA#2/#3 recordatorio in-app 3 días antes (pg_cron diario o al abrir la app).
-- CA#4/#5 el adoptante marca "completada" y puede subir el comprobante.
-- El calendario base es una GUÍA general por especie, no un criterio médico:
-- el refugio lo ajusta según su veterinario.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vaccination_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID NOT NULL REFERENCES public.adoption_applications(id) ON DELETE CASCADE,
    pet_id          UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    shelter_id      UUID NOT NULL REFERENCES public.shelters(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    kind            TEXT NOT NULL CHECK (kind IN ('vacuna', 'desparasitacion')),
    vaccine_name    TEXT NOT NULL CHECK (char_length(btrim(vaccine_name)) BETWEEN 2 AND 80),
    due_date        DATE NOT NULL,
    completed_at    TIMESTAMPTZ,
    proof_image_url TEXT,
    reminded_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- La tabla pudo crearse antes con el esquema de ModeloBD.sql: se completan las columnas.
ALTER TABLE public.vaccination_records
    ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES public.adoption_applications(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS shelter_id UUID REFERENCES public.shelters(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'vacuna',
    ADD COLUMN IF NOT EXISTS reminded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_vaccination_due ON public.vaccination_records(due_date) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vaccination_app ON public.vaccination_records(application_id);

ALTER TABLE public.vaccination_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vaccination_records FROM anon, authenticated;
GRANT SELECT ON public.vaccination_records TO authenticated;

DROP POLICY IF EXISTS "vr_select_shelter" ON public.vaccination_records;
CREATE POLICY "vr_select_shelter" ON public.vaccination_records FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.shelters s WHERE s.id = vaccination_records.shelter_id AND s.user_id = auth.uid()));
DROP POLICY IF EXISTS "vr_select_adopter" ON public.vaccination_records;
CREATE POLICY "vr_select_adopter" ON public.vaccination_records FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Calendario base por especie (desfase en días desde la entrega).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_health_calendar(p_application_id uuid, p_delivered date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_app public.adoption_applications;
    v_pet public.pets;
    n int;
BEGIN
    SELECT * INTO v_app FROM public.adoption_applications WHERE id = p_application_id;
    IF NOT FOUND THEN RETURN 0; END IF;
    IF EXISTS (SELECT 1 FROM public.vaccination_records WHERE application_id = p_application_id) THEN RETURN 0; END IF;
    SELECT * INTO v_pet FROM public.pets WHERE id = v_app.pet_id;

    INSERT INTO public.vaccination_records (application_id, pet_id, shelter_id, user_id, kind, vaccine_name, due_date)
    SELECT v_app.id, v_pet.id, v_pet.shelter_id, v_app.user_id, c.kind, c.name, p_delivered + c.days
    FROM (
        SELECT 'desparasitacion' AS kind, 'Desparasitación' AS name, d AS days FROM unnest(ARRAY[90, 180, 270, 360]) d
        UNION ALL
        SELECT 'vacuna', CASE WHEN v_pet.species::text = 'gato' THEN 'Vacuna triple felina (refuerzo anual)' ELSE 'Vacuna múltiple (refuerzo anual)' END, 365
        UNION ALL
        SELECT 'vacuna', 'Antirrábica (refuerzo anual)', 365
    ) c;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.generate_health_calendar(uuid, date) FROM PUBLIC, anon, authenticated;

-- CA#1: la entrega formal genera el calendario inicial (misma RPC del Sprint 4 + 1 línea).
CREATE OR REPLACE FUNCTION public.register_adoption_delivery(
    p_id uuid, p_delivered_at date, p_documents text[], p_observations text
) RETURNS public.adoption_deliveries
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_app public.adoption_applications;
    v_del public.adoption_deliveries;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'No autenticado' USING ERRCODE = '28000';
    END IF;
    IF p_delivered_at IS NULL THEN
        RAISE EXCEPTION 'La fecha de entrega es obligatoria' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_app FROM public.adoption_applications WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solicitud no encontrada' USING ERRCODE = 'P0002';
    END IF;

    PERFORM 1
    FROM public.pets pt
    JOIN public.shelters s ON s.id = pt.shelter_id
    WHERE pt.id = v_app.pet_id AND s.user_id = auth.uid()
    FOR UPDATE OF pt;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No tienes permiso sobre esta solicitud' USING ERRCODE = '42501';
    END IF;

    IF v_app.status <> 'aprobada' THEN
        RAISE EXCEPTION 'Solo se puede registrar la entrega de una solicitud aprobada' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.adoption_deliveries (application_id, delivered_at, documents, observations, registered_by)
    VALUES (p_id, p_delivered_at, COALESCE(p_documents, '{}'), NULLIF(btrim(COALESCE(p_observations, '')), ''), auth.uid())
    RETURNING * INTO v_del;

    UPDATE public.adoption_applications SET status = 'completada' WHERE id = p_id;
    UPDATE public.pets SET status = 'adoptada' WHERE id = v_app.pet_id;
    PERFORM public.generate_health_calendar(p_id, p_delivered_at);

    RETURN v_del;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.register_adoption_delivery(uuid, date, text[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_adoption_delivery(uuid, date, text[], text) TO authenticated;

-- Adopciones ya entregadas antes de esta migración.
SELECT public.generate_health_calendar(d.application_id, d.delivered_at) FROM public.adoption_deliveries d;

-- ---------------------------------------------------------------------------
-- Edición del calendario por el refugio (CA#1) y cierre por el adoptante (CA#4/#5)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_health_record(p_application_id uuid, p_kind text, p_name text, p_due date)
RETURNS public.vaccination_records
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_app public.adoption_applications; v_shel public.shelters; v_rec public.vaccination_records;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado' USING ERRCODE = '28000'; END IF;
    IF p_kind NOT IN ('vacuna', 'desparasitacion') THEN RAISE EXCEPTION 'Tipo inválido' USING ERRCODE = '22023'; END IF;
    IF char_length(btrim(COALESCE(p_name, ''))) < 2 THEN RAISE EXCEPTION 'Escribe el nombre de la vacuna o tratamiento' USING ERRCODE = '22023'; END IF;
    IF p_due IS NULL THEN RAISE EXCEPTION 'La fecha es obligatoria' USING ERRCODE = '22023'; END IF;

    SELECT * INTO v_app FROM public.adoption_applications WHERE id = p_application_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Adopción no encontrada' USING ERRCODE = 'P0002'; END IF;
    SELECT s.* INTO v_shel FROM public.pets pt JOIN public.shelters s ON s.id = pt.shelter_id
     WHERE pt.id = v_app.pet_id AND s.user_id = auth.uid();
    IF NOT FOUND THEN RAISE EXCEPTION 'No tienes permiso sobre esta adopción' USING ERRCODE = '42501'; END IF;
    IF v_app.status <> 'completada' THEN RAISE EXCEPTION 'El calendario solo aplica a adopciones entregadas' USING ERRCODE = '22023'; END IF;

    INSERT INTO public.vaccination_records (application_id, pet_id, shelter_id, user_id, kind, vaccine_name, due_date)
    VALUES (v_app.id, v_app.pet_id, v_shel.id, v_app.user_id, p_kind, btrim(p_name), p_due)
    RETURNING * INTO v_rec;
    RETURN v_rec;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_health_record(p_id uuid, p_kind text, p_name text, p_due date)
RETURNS public.vaccination_records
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_rec public.vaccination_records;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado' USING ERRCODE = '28000'; END IF;
    IF p_kind NOT IN ('vacuna', 'desparasitacion') THEN RAISE EXCEPTION 'Tipo inválido' USING ERRCODE = '22023'; END IF;
    IF char_length(btrim(COALESCE(p_name, ''))) < 2 THEN RAISE EXCEPTION 'Escribe el nombre de la vacuna o tratamiento' USING ERRCODE = '22023'; END IF;
    IF p_due IS NULL THEN RAISE EXCEPTION 'La fecha es obligatoria' USING ERRCODE = '22023'; END IF;

    SELECT r.* INTO v_rec FROM public.vaccination_records r JOIN public.shelters s ON s.id = r.shelter_id
     WHERE r.id = p_id AND s.user_id = auth.uid() FOR UPDATE OF r;
    IF NOT FOUND THEN RAISE EXCEPTION 'Registro no encontrado o sin permiso' USING ERRCODE = '42501'; END IF;
    IF v_rec.completed_at IS NOT NULL THEN RAISE EXCEPTION 'No se puede editar un registro ya completado' USING ERRCODE = '22023'; END IF;

    -- Si cambia la fecha, el recordatorio vuelve a poder enviarse.
    UPDATE public.vaccination_records
       SET kind = p_kind, vaccine_name = btrim(p_name), due_date = p_due,
           reminded_at = CASE WHEN due_date IS DISTINCT FROM p_due THEN NULL ELSE reminded_at END
     WHERE id = p_id RETURNING * INTO v_rec;
    RETURN v_rec;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_health_record(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_rec public.vaccination_records;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado' USING ERRCODE = '28000'; END IF;
    SELECT r.* INTO v_rec FROM public.vaccination_records r JOIN public.shelters s ON s.id = r.shelter_id
     WHERE r.id = p_id AND s.user_id = auth.uid() FOR UPDATE OF r;
    IF NOT FOUND THEN RAISE EXCEPTION 'Registro no encontrado o sin permiso' USING ERRCODE = '42501'; END IF;
    IF v_rec.completed_at IS NOT NULL THEN RAISE EXCEPTION 'No se puede eliminar un registro ya completado' USING ERRCODE = '22023'; END IF;
    DELETE FROM public.vaccination_records WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_health_record(p_id uuid, p_proof_path text)
RETURNS public.vaccination_records
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_rec  public.vaccination_records;
    v_path text := NULLIF(btrim(COALESCE(p_proof_path, '')), '');
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado' USING ERRCODE = '28000'; END IF;
    IF v_path IS NOT NULL AND (v_path NOT LIKE auth.uid()::text || '/%' OR v_path LIKE '%..%') THEN
        RAISE EXCEPTION 'Comprobante inválido' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_rec FROM public.vaccination_records WHERE id = p_id AND user_id = auth.uid() FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Registro no encontrado' USING ERRCODE = 'P0002'; END IF;
    IF v_rec.completed_at IS NOT NULL THEN RAISE EXCEPTION 'Este registro ya está completado' USING ERRCODE = '22023'; END IF;

    UPDATE public.vaccination_records SET completed_at = NOW(), proof_image_url = v_path
     WHERE id = p_id RETURNING * INTO v_rec;
    RETURN v_rec;
END;
$$;

-- ---------------------------------------------------------------------------
-- Recordatorios in-app (CA#2/#3): 3 días antes (o ya vencidos), una sola vez.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_health_reminders(p_user uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE n int;
BEGIN
    WITH due AS (
        UPDATE public.vaccination_records r
           SET reminded_at = NOW()
         WHERE r.completed_at IS NULL AND r.reminded_at IS NULL
           AND r.due_date <= CURRENT_DATE + 3
           AND (p_user IS NULL OR r.user_id = p_user)
        RETURNING r.user_id, r.pet_id, r.vaccine_name, r.due_date
    )
    INSERT INTO public.notifications (user_id, title, body, link)
    SELECT d.user_id, 'Recordatorio de salud',
           format('%s de %s: %s.', d.vaccine_name, p.name,
                  CASE WHEN d.due_date < CURRENT_DATE THEN 'venció el ' || to_char(d.due_date, 'DD/MM/YYYY')
                       WHEN d.due_date = CURRENT_DATE THEN 'es hoy'
                       ELSE 'es el ' || to_char(d.due_date, 'DD/MM/YYYY') END),
           '/adoptante/calendario-salud'
    FROM due d JOIN public.pets p ON p.id = d.pet_id;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.send_health_reminders(uuid) FROM PUBLIC, anon, authenticated;

-- Respaldo sin cron: el adoptante dispara sus propios recordatorios al abrir su calendario.
CREATE OR REPLACE FUNCTION public.refresh_my_health_reminders()
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$ SELECT public.send_health_reminders(auth.uid()) $$;

-- Cron diario (si pg_cron está disponible; si no, queda el respaldo anterior).
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.unschedule('matchpet-health-reminders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'matchpet-health-reminders');
    PERFORM cron.schedule('matchpet-health-reminders', '0 12 * * *', 'SELECT public.send_health_reminders()');
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron no disponible (%): se usa solo refresh_my_health_reminders()', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- Comprobantes (CA#5): bucket privado, carpeta del adoptante.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('health-proofs', 'health-proofs', false, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS "health_proof_insert_owner" ON storage.objects;
CREATE POLICY "health_proof_insert_owner" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'health-proofs' AND (storage.foldername(name))[1] = auth.uid()::text
                AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'adoptante'));

DROP POLICY IF EXISTS "health_proof_select" ON storage.objects;
CREATE POLICY "health_proof_select" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'health-proofs' AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR EXISTS (SELECT 1 FROM public.vaccination_records r JOIN public.shelters s ON s.id = r.shelter_id
                    WHERE r.proof_image_url = storage.objects.name AND s.user_id = auth.uid())));

DROP POLICY IF EXISTS "health_proof_delete_owner" ON storage.objects;
CREATE POLICY "health_proof_delete_owner" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'health-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

REVOKE EXECUTE ON FUNCTION public.add_health_record(uuid, text, text, date),
                           public.update_health_record(uuid, text, text, date),
                           public.delete_health_record(uuid),
                           public.complete_health_record(uuid, text),
                           public.refresh_my_health_reminders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_health_record(uuid, text, text, date),
                          public.update_health_record(uuid, text, text, date),
                          public.delete_health_record(uuid),
                          public.complete_health_record(uuid, text),
                          public.refresh_my_health_reminders() TO authenticated;

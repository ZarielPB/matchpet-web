-- ============================================================================
-- MATCHPET — SPRINT 4: GESTIÓN DE SOLICITUDES Y CIERRE DE ADOPCIÓN (lado refugio)
-- ----------------------------------------------------------------------------
-- Archivo    : supabase/migrations/20240000000003_sprint4_shelter_management.sql
-- HUs        : HU-38 (panel), HU-39 (aprobar), HU-40 (rechazar),
--              HU-41 (notificaciones), HU-42 (entrega formal)
-- Orden      : DESPUÉS de 20240000000002_sprint3_matching_adoption.sql
-- 100 % ADITIVA E IDEMPOTENTE (IF NOT EXISTS / DROP ... IF EXISTS / OR REPLACE).
-- El refugio NO recibe UPDATE directo sobre adoption_applications: toda
-- resolución pasa por las RPC atómicas SECURITY DEFINER de la sección D.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A. NOTIFICACIONES IN-APP (HU-41)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL,
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    link       TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
    ON public.notifications(user_id, is_read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.notifications FROM anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (is_read) ON public.notifications TO authenticated;

DROP POLICY IF EXISTS "notif_select_own" ON public.notifications;
CREATE POLICY "notif_select_own" ON public.notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notif_update_own" ON public.notifications;
CREATE POLICY "notif_update_own" ON public.notifications
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Realtime para el badge (ADD TABLE no admite IF NOT EXISTS).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- B. ENTREGA FORMAL (HU-42) — 1:0..1 con adoption_applications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.adoption_deliveries (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL UNIQUE
                   REFERENCES public.adoption_applications(id) ON DELETE CASCADE,
    delivered_at   DATE NOT NULL,
    documents      TEXT[] NOT NULL DEFAULT '{}',
    observations   TEXT,
    registered_by  UUID NOT NULL REFERENCES public.profiles(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.adoption_deliveries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.adoption_deliveries FROM anon, authenticated;
GRANT SELECT ON public.adoption_deliveries TO authenticated;

DROP POLICY IF EXISTS "ad_select_shelter" ON public.adoption_deliveries;
CREATE POLICY "ad_select_shelter" ON public.adoption_deliveries
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1
        FROM public.adoption_applications a
        JOIN public.pets pt     ON pt.id = a.pet_id
        JOIN public.shelters s  ON s.id = pt.shelter_id
        WHERE a.id = adoption_deliveries.application_id
          AND s.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "ad_select_own" ON public.adoption_deliveries;
CREATE POLICY "ad_select_own" ON public.adoption_deliveries
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.adoption_applications a
        WHERE a.id = adoption_deliveries.application_id
          AND a.user_id = auth.uid()
    ));

-- ---------------------------------------------------------------------------
-- C. LECTURA DEL REFUGIO SOBRE SUS SOLICITANTES (HU-38)
--    Solo adoptantes con una solicitud sobre una mascota de SU refugio.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "ap_select_shelter" ON public.adopter_profiles;
CREATE POLICY "ap_select_shelter" ON public.adopter_profiles
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1
        FROM public.adoption_applications a
        JOIN public.pets pt     ON pt.id = a.pet_id
        JOIN public.shelters s  ON s.id = pt.shelter_id
        WHERE a.user_id = adopter_profiles.user_id
          AND s.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "cp_select_shelter" ON public.compatibility_profiles;
CREATE POLICY "cp_select_shelter" ON public.compatibility_profiles
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1
        FROM public.adoption_applications a
        JOIN public.pets pt     ON pt.id = a.pet_id
        JOIN public.shelters s  ON s.id = pt.shelter_id
        WHERE a.user_id = compatibility_profiles.user_id
          AND s.user_id = auth.uid()
    ));

-- ---------------------------------------------------------------------------
-- D. RPC ATÓMICAS (SECURITY DEFINER, search_path vacío)
-- ---------------------------------------------------------------------------

-- HU-39 / HU-40: aprobar o rechazar una solicitud pendiente.
CREATE OR REPLACE FUNCTION public.resolve_adoption_application(
    p_id uuid, p_decision text, p_comments text
) RETURNS public.adoption_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_app      public.adoption_applications;
    v_pet      public.pets;
    v_comments text := NULLIF(btrim(COALESCE(p_comments, '')), '');
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'No autenticado' USING ERRCODE = '28000';
    END IF;
    IF p_decision NOT IN ('aprobada', 'rechazada') THEN
        RAISE EXCEPTION 'Decisión inválida: %', p_decision USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_app FROM public.adoption_applications WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solicitud no encontrada' USING ERRCODE = 'P0002';
    END IF;

    -- Bloquea también la mascota (serializa dos aprobaciones concurrentes).
    SELECT pt.* INTO v_pet
    FROM public.pets pt
    JOIN public.shelters s ON s.id = pt.shelter_id
    WHERE pt.id = v_app.pet_id AND s.user_id = auth.uid()
    FOR UPDATE OF pt;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No tienes permiso sobre esta solicitud' USING ERRCODE = '42501';
    END IF;

    IF v_app.status <> 'pendiente' THEN
        RAISE EXCEPTION 'La solicitud ya no está pendiente' USING ERRCODE = '22023';
    END IF;

    IF p_decision = 'aprobada' THEN
        IF v_pet.status <> 'disponible' THEN
            RAISE EXCEPTION 'La mascota ya no está disponible' USING ERRCODE = '22023';
        END IF;
        UPDATE public.pets SET status = 'en_proceso' WHERE id = v_pet.id;
    ELSIF char_length(COALESCE(v_comments, '')) < 10 THEN
        RAISE EXCEPTION 'El motivo del rechazo debe tener al menos 10 caracteres' USING ERRCODE = '22023';
    END IF;

    UPDATE public.adoption_applications
       SET status = p_decision::public.application_status,
           shelter_comments = v_comments
     WHERE id = p_id
    RETURNING * INTO v_app;

    RETURN v_app;
END;
$$;

-- HU-42: entrega formal (solicitud aprobada -> completada, mascota -> adoptada).
CREATE OR REPLACE FUNCTION public.register_adoption_delivery(
    p_id uuid, p_delivered_at date, p_documents text[], p_observations text
) RETURNS public.adoption_deliveries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

    RETURN v_del;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_adoption_application(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.register_adoption_delivery(uuid, date, text[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_adoption_application(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_adoption_delivery(uuid, date, text[], text) TO authenticated;

-- ---------------------------------------------------------------------------
-- E. NOTIFICACIÓN AUTOMÁTICA (HU-41)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_application_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_pet     text;
    v_shelter text;
    v_title   text;
    v_body    text;
BEGIN
    SELECT pt.name, s.shelter_name INTO v_pet, v_shelter
    FROM public.pets pt
    JOIN public.shelters s ON s.id = pt.shelter_id
    WHERE pt.id = NEW.pet_id;

    IF NEW.status = 'aprobada' THEN
        v_title := '¡Tu solicitud fue aprobada!';
        v_body  := format('%s aprobó tu solicitud por %s.', v_shelter, v_pet);
    ELSIF NEW.status = 'rechazada' THEN
        v_title := 'Actualización de tu solicitud en MatchPet';
        v_body  := format('%s no pudo aceptar tu solicitud por %s.', v_shelter, v_pet);
    ELSE
        v_title := '¡Adopción completada!';
        v_body  := format('%s ya tiene un hogar contigo. ¡Gracias por adoptar!', v_pet);
    END IF;

    IF NEW.shelter_comments IS NOT NULL AND NEW.status <> 'completada' THEN
        v_body := v_body || ' Comentario del refugio: ' || NEW.shelter_comments;
    END IF;

    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (NEW.user_id, v_title, v_body, '/adoptante/solicitudes');

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_application_status ON public.adoption_applications;
CREATE TRIGGER trg_notify_application_status
    AFTER UPDATE OF status ON public.adoption_applications
    FOR EACH ROW
    WHEN (NEW.status IN ('aprobada', 'rechazada', 'completada')
          AND OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.notify_application_status();

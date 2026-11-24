-- ============================================================================
-- MATCHPET — CORRECCIÓN: el refugio no recibía aviso (campana) de solicitudes nuevas
-- ----------------------------------------------------------------------------
-- Solo existía el aviso hacia el adoptante (aprobada/rechazada/completada). Ahora el refugio
-- recibe una notificación cuando llega una solicitud y cuando el adoptante la cancela.
-- Además: funciones de trigger no invocables por RPC y search_path fijo (avisos del linter).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_shelter_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_pet          text;
    v_shelter_user uuid;
    v_adopter      text;
BEGIN
    SELECT pt.name, s.user_id INTO v_pet, v_shelter_user
    FROM public.pets pt JOIN public.shelters s ON s.id = pt.shelter_id
    WHERE pt.id = NEW.pet_id;
    IF v_shelter_user IS NULL THEN RETURN NEW; END IF;

    SELECT COALESCE(NULLIF(btrim(full_name), ''), 'Un adoptante') INTO v_adopter FROM public.profiles WHERE id = NEW.user_id;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.notifications (user_id, title, body, link)
        VALUES (v_shelter_user, 'Nueva solicitud de adopción',
                format('%s quiere adoptar a %s.', v_adopter, v_pet), '/refugio/solicitudes');
    ELSE
        INSERT INTO public.notifications (user_id, title, body, link)
        VALUES (v_shelter_user, 'Solicitud cancelada',
                format('%s canceló su solicitud por %s.', v_adopter, v_pet), '/refugio/solicitudes');
    END IF;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_shelter_application() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_shelter_new_application ON public.adoption_applications;
CREATE TRIGGER trg_notify_shelter_new_application
    AFTER INSERT ON public.adoption_applications
    FOR EACH ROW WHEN (NEW.status = 'pendiente')
    EXECUTE FUNCTION public.notify_shelter_application();

DROP TRIGGER IF EXISTS trg_notify_shelter_cancelled ON public.adoption_applications;
CREATE TRIGGER trg_notify_shelter_cancelled
    AFTER UPDATE OF status ON public.adoption_applications
    FOR EACH ROW WHEN (OLD.status = 'pendiente' AND NEW.status = 'cancelada')
    EXECUTE FUNCTION public.notify_shelter_application();

REVOKE ALL ON FUNCTION public.notify_application_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.set_updated_at() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

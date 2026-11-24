-- ============================================================================
-- MATCHPET — HU-56: webhook de notificaciones push (equivale al "Database Webhook" del panel)
-- ----------------------------------------------------------------------------
-- Al insertar una fila en public.notifications llama a la Edge Function send-push con el
-- encabezado x-webhook-secret. Requiere la extensión pg_net.
--
-- El secreto compartido NO está en este archivo: vive en la bóveda de Supabase. Antes de aplicar
-- esta migración, créalo (el mismo valor que PUSH_WEBHOOK_SECRET de supabase/functions/.env):
--
--   SELECT vault.create_secret('<PUSH_WEBHOOK_SECRET>', 'push_webhook_secret', 'Secreto compartido del webhook de notificaciones push');
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.push_on_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_secret text;
BEGIN
    SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'push_webhook_secret';
    IF v_secret IS NULL THEN RETURN NEW; END IF;
    PERFORM net.http_post(
        url := 'https://ldkfwjoekbkoidpblyso.supabase.co/functions/v1/send-push',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
        body := jsonb_build_object('type', 'INSERT', 'table', 'notifications', 'schema', 'public', 'record', to_jsonb(NEW)),
        timeout_milliseconds := 5000
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Un fallo del push nunca debe impedir que se guarde la notificación.
    RAISE WARNING 'push_on_notification: %', SQLERRM;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.push_on_notification() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_push_on_notification ON public.notifications;
CREATE TRIGGER trg_push_on_notification
    AFTER INSERT ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.push_on_notification();

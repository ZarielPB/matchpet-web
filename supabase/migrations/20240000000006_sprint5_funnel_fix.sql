-- ============================================================================
-- MATCHPET — SPRINT 5: corrige el embudo de HU-51 (misma unidad en cada paso)
-- El embudo mezclaba personas (cuestionarios) con solicitudes. Ahora cuenta
-- adoptantes distintos en los 3 pasos; la comparación con/sin cuestionario
-- sigue contando solicitudes.
-- ============================================================================
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
            SELECT a.user_id, a.status, a.match_score,
                   EXISTS (SELECT 1 FROM public.compatibility_profiles cp WHERE cp.user_id = a.user_id) AS has_quiz
            FROM public.adoption_applications a JOIN public.pets p ON p.id = a.pet_id
            WHERE p.shelter_id = v_shelter AND a.status <> 'cancelada'
        )
        SELECT jsonb_build_object(
            'quiz_completed_total', (SELECT count(*) FROM public.compatibility_profiles),
            'applicants_with_quiz', (SELECT count(DISTINCT user_id) FROM apps WHERE has_quiz),
            'adopters_with_quiz', (SELECT count(DISTINCT user_id) FROM apps WHERE has_quiz AND status = 'completada'),
            'applications_with_quiz', (SELECT count(*) FROM apps WHERE has_quiz),
            'adoptions_with_quiz', (SELECT count(*) FROM apps WHERE has_quiz AND status = 'completada'),
            'applications_without_quiz', (SELECT count(*) FROM apps WHERE NOT has_quiz),
            'adoptions_without_quiz', (SELECT count(*) FROM apps WHERE NOT has_quiz AND status = 'completada'),
            'avg_score_adopted', (SELECT round(avg(match_score), 1) FROM apps WHERE status = 'completada' AND match_score IS NOT NULL)
        )
    );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.shelter_compatibility_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shelter_compatibility_metrics() TO authenticated;

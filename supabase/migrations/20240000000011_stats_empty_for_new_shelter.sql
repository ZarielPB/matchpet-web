-- ============================================================================
-- MATCHPET — CORRECCIÓN: estadísticas de un refugio sin ficha
-- Un refugio recién registrado (sin fila en shelters) veía "Solo los refugios pueden ver estas
-- estadísticas". Ahora el rol 'refugio' sin ficha recibe resultados vacíos; los demás roles siguen bloqueados.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.shelter_dashboard_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_shelter uuid := public.my_shelter_id();
    v_total int; v_done int;
BEGIN
    -- Un refugio recién registrado aún no tiene ficha (shelters): ve las estadísticas vacías, no un error.
    IF v_shelter IS NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'refugio') THEN
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

CREATE OR REPLACE FUNCTION public.shelter_adoption_charts(p_from date, p_to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_shelter uuid := public.my_shelter_id();
BEGIN
    -- Un refugio recién registrado aún no tiene ficha (shelters): ve las estadísticas vacías, no un error.
    IF v_shelter IS NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'refugio') THEN
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

CREATE OR REPLACE FUNCTION public.shelter_compatibility_metrics()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_shelter uuid := public.my_shelter_id();
BEGIN
    -- Un refugio recién registrado aún no tiene ficha (shelters): ve las estadísticas vacías, no un error.
    IF v_shelter IS NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'refugio') THEN
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

REVOKE EXECUTE ON FUNCTION public.shelter_dashboard_stats(), public.shelter_adoption_charts(date, date), public.shelter_compatibility_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shelter_dashboard_stats(), public.shelter_adoption_charts(date, date), public.shelter_compatibility_metrics() TO authenticated;

-- ============================================================================
-- MATCHPET — CORRECCIÓN: "infinite recursion detected in policy for relation adoption_applications"
-- ----------------------------------------------------------------------------
-- Al enviar una solicitud, la política aa_insert_adoptante consulta adopter_profiles y profiles.
-- Las políticas de lectura del refugio sobre adopter_profiles y compatibility_profiles (Sprint 4)
-- consultaban a su vez adoption_applications, cerrando un ciclo. Se reescriben con la función
-- SECURITY DEFINER is_applicant_of_my_shelter() (migración 0008), que el planificador no expande.
-- ============================================================================
DROP POLICY IF EXISTS "ap_select_shelter" ON public.adopter_profiles;
CREATE POLICY "ap_select_shelter" ON public.adopter_profiles
    FOR SELECT TO authenticated
    USING (public.is_applicant_of_my_shelter(user_id));

DROP POLICY IF EXISTS "cp_select_shelter" ON public.compatibility_profiles;
CREATE POLICY "cp_select_shelter" ON public.compatibility_profiles
    FOR SELECT TO authenticated
    USING (public.is_applicant_of_my_shelter(user_id));

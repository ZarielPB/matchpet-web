-- ============================================================================
-- MATCHPET — SEGURIDAD: privacidad de la tabla profiles
-- ----------------------------------------------------------------------------
-- Problema: las políticas profiles_select_public y profiles_select_public_fields
-- (USING true, rol public) dejaban leer TODOS los perfiles (correo, nombre, rol)
-- incluso sin iniciar sesión. Ahora cada persona lee solo su perfil, y el refugio
-- lee además el de quienes enviaron una solicitud a SUS mascotas (panel de
-- solicitudes, seguimiento y reportes). Es una corrección sobre una política
-- anterior a este proyecto; no cambia el comportamiento legítimo de la app.
-- ============================================================================
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public_fields" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_full" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
    USING (id = auth.uid());

-- SECURITY DEFINER para no depender de las políticas de las tablas que consulta.
CREATE OR REPLACE FUNCTION public.is_applicant_of_my_shelter(p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.adoption_applications a
        JOIN public.pets pt    ON pt.id = a.pet_id
        JOIN public.shelters s ON s.id = pt.shelter_id
        WHERE a.user_id = p_user AND s.user_id = auth.uid()
    )
$$;
REVOKE ALL ON FUNCTION public.is_applicant_of_my_shelter(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_applicant_of_my_shelter(uuid) TO authenticated;

CREATE POLICY "profiles_select_shelter_applicants" ON public.profiles FOR SELECT TO authenticated
    USING (public.is_applicant_of_my_shelter(id));

-- Privilegios mínimos: anon solo lee el catálogo (pets, pet_images, shelters).
REVOKE ALL ON public.profiles, public.adopter_profiles, public.favorites FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.pets, public.pet_images, public.shelters FROM anon;
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.profiles FROM authenticated;

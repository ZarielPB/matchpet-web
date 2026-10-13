-- MODELO DE BASE DE DATOS MATCHPET (PostgreSQL / Supabase)
-- 1. Enums (Tipos de datos personalizados)
-- Centralizamos los estados para evitar errores de tipeo y mantener la integridad.
-- Tipos de roles de usuario
CREATE TYPE public.user_role AS ENUM ('adoptante', 'refugio', 'admin');

-- Estados de las mascotas
CREATE TYPE public.pet_status AS ENUM ('disponible', 'en_proceso', 'adoptada');

-- Especies y tamaños (para normalizar filtros)
CREATE TYPE public.pet_species AS ENUM ('perro', 'gato', 'otro');
CREATE TYPE public.pet_size AS ENUM ('pequeño', 'mediano', 'grande');

-- Estados de las solicitudes de adopción
CREATE TYPE public.application_status AS ENUM ('pendiente', 'aprobada', 'rechazada', 'cancelada', 'completada');

-- [SPRINT 3 · HU-32] Nivel de energía de la mascota (dimensión D2 del matching)
CREATE TYPE public.energy_level AS ENUM ('baja', 'media', 'alta');

-- Tipos de seguimiento post-adopción
CREATE TYPE public.follow_up_type AS ENUM ('llamada', 'visita', 'mensaje');

-- Estados de reportes post-adopción
CREATE TYPE public.report_status AS ENUM ('pendiente', 'respondido', 'cerrado');


-- 2. Tablas Principales (Normalizadas)
-- A. Perfiles y Roles (Extensión de Supabase Auth)
-- Tabla base de perfiles (vinculada a auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role public.user_role NOT NULL DEFAULT 'adoptante',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Perfiles extendidos para Adoptantes (HU-12, HU-13)
CREATE TABLE public.adopter_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    housing_type TEXT, -- 'casa', 'departamento'
    has_yard BOOLEAN DEFAULT FALSE,
    has_kids BOOLEAN DEFAULT FALSE,
    kids_ages TEXT, -- Almacenado como texto o JSON si son múltiples
    has_other_pets BOOLEAN DEFAULT FALSE,
    other_pets_details TEXT,
    experience_years INTEGER DEFAULT 0,
    city TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Perfiles extendidos para Refugios (HU-14, HU-15)
CREATE TABLE public.shelters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    shelter_name TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT,
    description TEXT,
    phone TEXT,
    cover_image_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- B. Gestión de Mascotas (HU-16 a HU-21)
-- Catálogo de Mascotas
CREATE TABLE public.pets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shelter_id UUID REFERENCES public.shelters(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    species public.pet_species NOT NULL,
    breed TEXT,
    age_years INTEGER,
    age_months INTEGER,
    size public.pet_size NOT NULL,
    weight_kg NUMERIC(4,2),
    temperament TEXT,
    health_status TEXT NOT NULL,
    description TEXT,
    requirements TEXT,
    status public.pet_status NOT NULL DEFAULT 'disponible',
    -- [SPRINT 3 · HU-32] Atributos estructurados para el motor de matching.
    -- D2 = energy_level; D4 = good_with_kids / good_with_other_pets.
    -- Defaults conservadores: asumir energía media y NO apto para niños/otros
    -- animales hasta que el refugio lo declare explícitamente.
    energy_level public.energy_level NOT NULL DEFAULT 'media',
    good_with_kids BOOLEAN NOT NULL DEFAULT FALSE,
    good_with_other_pets BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Galería de imágenes (1:N con pets) (HU-17, HU-19)
CREATE TABLE public.pet_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- C. Catálogo y Favoritos (HU-28, HU-29)
-- Favoritos (Relación N:M)
CREATE TABLE public.favorites (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, pet_id) -- Evita duplicados
);

-- D. Compatibilidad y Matching (HU-30 a HU-33)
-- [SPRINT 3] Respuestas del cuestionario de estilo de vida (1:1 con profiles).
-- HU-31 la menciona como "compatibility_answers"; el nombre canónico es compatibility_profiles.
CREATE TABLE public.compatibility_profiles (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    hours_at_home TEXT NOT NULL CHECK (hours_at_home IN ('menos_de_4', '4_a_8', 'mas_de_8')),
    activity_level TEXT NOT NULL CHECK (activity_level IN ('bajo', 'moderado', 'alto')), -- D2
    space_type TEXT NOT NULL CHECK (space_type IN ('pequeño', 'amplio')),                 -- D1
    preferred_size public.pet_size,                    -- D1 (NULL = sin preferencia)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- E. Proceso de Adopción (HU-35 a HU-41)
-- [SPRINT 3] Solicitudes de adopción (HU-35).
-- status -> enum application_status; resolved_at lo rellena el trigger de
-- auditoría cuando el estado sale de 'pendiente' (rechazo/aceptación).
CREATE TABLE public.adoption_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL CHECK (char_length(message) BETWEEN 10 AND 500),
    status public.application_status NOT NULL DEFAULT 'pendiente',
    shelter_comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Notificaciones in-app (HU-41)
CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    link TEXT, -- Ruta para redirección (ej: '/mis-solicitudes')
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- F. Seguimiento Post-Adopción (HU-42 a HU-48)
-- Notas de seguimiento del refugio
CREATE TABLE public.follow_up_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
    shelter_id UUID REFERENCES public.shelters(id) ON DELETE CASCADE NOT NULL,
    type public.follow_up_type NOT NULL,
    notes TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendario de vacunas y salud
CREATE TABLE public.vaccination_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
    vaccine_name TEXT NOT NULL,
    due_date DATE NOT NULL,
    completed_at TIMESTAMPTZ,
    proof_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reportes de adoptantes
CREATE TABLE public.post_adoption_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    shelter_id UUID REFERENCES public.shelters(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL, -- 'Comportamiento', 'Salud', 'Duda'
    description TEXT NOT NULL,
    image_url TEXT,
    status public.report_status NOT NULL DEFAULT 'pendiente',
    shelter_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices (Optimización de Consultas)
-- Crucial para que el catálogo y los filtros (HU-23, HU-24) vuelen.
CREATE INDEX idx_pets_status ON public.pets(status);
CREATE INDEX idx_pets_shelter ON public.pets(shelter_id);
CREATE INDEX idx_pets_species ON public.pets(species);
CREATE INDEX idx_pets_size ON public.pets(size);
CREATE INDEX idx_applications_user ON public.adoption_applications(user_id);
CREATE INDEX idx_applications_pet ON public.adoption_applications(pet_id);
-- [SPRINT 3 · HU-35 CA#5] Máximo 1 solicitud ABIERTA por (adoptante, mascota).
-- Parcial: permite volver a solicitar tras un 'rechazada' o 'cancelada'.
CREATE UNIQUE INDEX uq_applications_open
    ON public.adoption_applications(user_id, pet_id)
    WHERE status IN ('pendiente', 'aprobada');
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX idx_vaccination_due ON public.vaccination_records(due_date);

-- 4. Triggers Automáticos (Supabase)
-- A. Creación automática de perfil al registrarse (HU-11)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    assigned_role public.user_role;
BEGIN
    -- Validar y asignar el rol de forma segura
    BEGIN
        assigned_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
    EXCEPTION WHEN OTHERS THEN
        assigned_role := 'adoptante'::public.user_role;
    END;

    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'), 
        COALESCE(assigned_role, 'adoptante'::public.user_role)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- B. Actualización automática de updated_at (Auditoría)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas que tienen updated_at
CREATE TRIGGER update_adopter_profiles_updated_at BEFORE UPDATE ON public.adopter_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shelters_updated_at BEFORE UPDATE ON public.shelters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pets_updated_at BEFORE UPDATE ON public.pets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.adoption_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_compatibility_profiles_updated_at BEFORE UPDATE ON public.compatibility_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- [SPRINT 3 · HU-35] Auditoría de resolución: registra CUÁNDO se cerró la solicitud.
CREATE OR REPLACE FUNCTION public.set_application_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NEW.status = 'pendiente' THEN
            NEW.resolved_at = NULL;   -- se reabre (solo posible en desarrollo/testing)
        ELSE
            NEW.resolved_at = NOW();  -- aprobada / rechazada / cancelada / completada
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER adoption_applications_set_resolved_at
    BEFORE UPDATE ON public.adoption_applications
    FOR EACH ROW EXECUTE FUNCTION public.set_application_resolved_at();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.post_adoption_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Seguridad (Row Level Security - RLS)
-- Habilitamos RLS en todas las tablas para que Supabase proteja los datos.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adopter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compatibility_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adoption_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccination_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_adoption_reports ENABLE ROW LEVEL SECURITY;

-- (Nota: Las políticas CREATE POLICY de las tablas de Sprint 1-2 se configuran
-- en el dashboard de Supabase o mediante scripts adicionales, pero este comando
-- es el que activa el escudo de seguridad).

-- 6. Políticas RLS — [SPRINT 3] Tablas nuevas (matriz aprobada en el Plan Maestro)
-- -----------------------------------------------------------------------
-- compatibility_profiles: solo su dueño (el adoptante) puede leer/escribir.
CREATE POLICY cp_select_own ON public.compatibility_profiles FOR SELECT
    USING (user_id = auth.uid());
CREATE POLICY cp_insert_own ON public.compatibility_profiles FOR INSERT
    WITH CHECK (user_id = auth.uid());
CREATE POLICY cp_update_own ON public.compatibility_profiles FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- adoption_applications:
--   aa_select_own        -> el adoptante ve sus solicitudes.
--   aa_select_shelter    -> el refugio ve las de sus mascotas (base HU-39, Sprint 4).
--   aa_insert_adoptante  -> solo rol adoptante, mascota 'disponible', estado 'pendiente'.
--   aa_update_cancel_own -> solo puede pasar de 'pendiente' a 'cancelada',
--                           sin tocar shelter_comments (HU-35 CA#6).
CREATE POLICY aa_select_own ON public.adoption_applications FOR SELECT
    USING (user_id = auth.uid());
CREATE POLICY aa_select_shelter ON public.adoption_applications FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.pets pt
        JOIN public.shelters s ON s.id = pt.shelter_id
        WHERE pt.id = adoption_applications.pet_id AND s.user_id = auth.uid()
    ));
CREATE POLICY aa_insert_adoptante ON public.adoption_applications FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND status = 'pendiente'
        AND EXISTS (SELECT 1 FROM public.pets pt WHERE pt.id = adoption_applications.pet_id AND pt.status = 'disponible')
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'adoptante')
        AND EXISTS (SELECT 1 FROM public.adopter_profiles ap WHERE ap.user_id = auth.uid())
    );
CREATE POLICY aa_update_cancel_own ON public.adoption_applications FOR UPDATE
    USING (user_id = auth.uid() AND status = 'pendiente')
    WITH CHECK (user_id = auth.uid() AND status = 'cancelada' AND shelter_comments IS NULL);

-- 7. Grants: el rol anónimo NO tiene acceso a las tablas del Sprint 3.
REVOKE ALL ON public.compatibility_profiles FROM anon, authenticated;
REVOKE ALL ON public.adoption_applications FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.compatibility_profiles TO authenticated;
GRANT SELECT, INSERT ON public.adoption_applications TO authenticated;
GRANT UPDATE (status) ON public.adoption_applications TO authenticated; -- HU-37: solo cancelar

-- 8. Motor de matching (HU-32): ver public.match_recommendations() en
--    supabase/migrations/20240000000002_sprint3_matching_adoption.sql
--    y la especificación en docs/DECISIONES_ALGORITMO_MATCHING.md.

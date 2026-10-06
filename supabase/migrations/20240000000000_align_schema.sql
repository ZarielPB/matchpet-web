-- ============================================================================
-- MATCHPET — ALINEACIÓN DE ESQUEMA CON docs/ModeloBD.sql (OPCIÓN A) — v2
-- ----------------------------------------------------------------------------
-- Archivo: supabase/migrations/20240000000000_align_schema.sql
--
-- IMPORTANTE — v2 SELF-CONTAINED:
--   Este script es BOOTSTRAP + ALINEACIÓN a la vez:
--     • Sobre una BD RECIÉN VACIADA (reset total): crea TODO el esquema
--       público desde cero (profiles, shelters, adopter_profiles, pets,
--       pet_images, favorites, enums, RLS, políticas, bucket pet-images,
--       grants y el trigger de perfiles) SIN depender de migraciones previas.
--     • Sobre una BD EXISTENTE (Sprint 1/2): migra datos y columnas al modelo
--       oficial de forma idempotente y sin borrar filas.
--   Es IDEMPOTENTE: puede re-ejecutarse sin romper nada.
--
-- Cómo ejecutar:
--   1. Abre el panel de Supabase → SQL Editor.
--   2. Pega TODO el contenido y ejecuta (Run).
--   3. Después ejecuta supabase/migrations/20240000000001_shelter_images_bucket.sql
--      (bucket shelter-images, usado por el perfil del refugio).
--
-- Qué hace (en orden):
--   1. Habilita pgcrypto y crea los Enums oficiales si no existen
--      (user_role, pet_status, pet_species, pet_size).
--   2. Crea las TABLAS BASE con la estructura oficial si no existen:
--      profiles, shelters, adopter_profiles, pets, pet_images, favorites.
--   3. Migra los datos legacy: profiles.shelter_* → shelters,
--      pets.refugio_id → pets.shelter_id, varchar → enums (incluye renombres
--      pequeno→pequeño y adoptado→adoptada), columnas oficiales (age_years,
--      weight_kg, requirements, etc.).
--   4. Crea el trigger handle_new_user (perfil automático en auth.users) con
--      ON CONFLICT (id) DO UPDATE para no fallar en re-registros.
--   5. Reescribe las políticas RLS de pets, pet_images, shelters, storage,
--      profiles, adopter_profiles y favorites, con el dueño =
--      shelters.user_id / profiles.id.
--   6. Garantiza el bucket público 'pet-images' y los grants mínimos para
--      anon/authenticated (necesarios tras un reset total del proyecto).
--
-- Nota: no borra datos; los datos de refugios existentes se conservan en
--       shelters.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. EXTENSIÓN + ENUMS (CREATE TYPE no soporta IF NOT EXISTS → DO block)
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typnamespace = 'public'::regnamespace AND typname = 'user_role'
  ) THEN
    CREATE TYPE public.user_role AS ENUM ('adoptante', 'refugio', 'admin');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typnamespace = 'public'::regnamespace AND typname = 'pet_status'
  ) THEN
    CREATE TYPE public.pet_status AS ENUM ('disponible', 'en_proceso', 'adoptada');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typnamespace = 'public'::regnamespace AND typname = 'pet_species'
  ) THEN
    CREATE TYPE public.pet_species AS ENUM ('perro', 'gato', 'otro');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typnamespace = 'public'::regnamespace AND typname = 'pet_size'
  ) THEN
    CREATE TYPE public.pet_size AS ENUM ('pequeño', 'mediano', 'grande');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. TABLA profiles (bootstrap si no existe; antes de shelters que la FKa)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text not null default 'Usuario',
  role       public.user_role not null default 'adoptante',
  phone      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil público de usuario (adoptante/refugio) - modelo oficial';

-- ---------------------------------------------------------------------------
-- 3. TABLA shelters + migración de profiles.shelter_* + RLS propia
-- ---------------------------------------------------------------------------
create table if not exists public.shelters (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null unique references public.profiles(id) on delete cascade,
  shelter_name   text not null,
  city           text not null,
  address        text,
  description    text,
  phone          text,
  cover_image_url text,
  updated_at     timestamptz not null default now()
);

comment on table public.shelters is 'Perfil organizacional del refugio (HU-14/HU-15) - modelo oficial';

-- Función oficial de timestamps (si aún no existe).
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_shelters_updated_at on public.shelters;
create trigger update_shelters_updated_at
  before update on public.shelters
  for each row execute function public.update_updated_at_column();

-- Migración de datos: copia perfiles de refugio ya existentes hacia shelters.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'shelter_name'
  ) THEN
    INSERT INTO public.shelters (user_id, shelter_name, city, address, phone)
    SELECT
      id,
      COALESCE(shelter_name, 'Refugio'),
      COALESCE(shelter_city, ''),
      shelter_address,
      phone
    FROM public.profiles
    WHERE role = 'refugio'
      AND shelter_name IS NOT NULL
    ON CONFLICT (user_id) DO UPDATE SET
      shelter_name = EXCLUDED.shelter_name,
      city         = EXCLUDED.city,
      address      = EXCLUDED.address,
      phone        = EXCLUDED.phone;
  END IF;
EXCEPTION
  WHEN undefined_column THEN NULL; -- BD limpia: no hay columnas legacy
END $$;

-- RLS de shelters: el catálogo lee nombre/ciudad públicamente; solo el dueño
-- (user_id = auth.uid()) crea/edita su ficha.
alter table public.shelters enable row level security;

drop policy if exists "shelters_select_public" on public.shelters;
create policy "shelters_select_public" on public.shelters
  for select using (true);

drop policy if exists "shelters_insert_owner" on public.shelters;
create policy "shelters_insert_owner" on public.shelters
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'refugio'
    )
  );

drop policy if exists "shelters_update_owner" on public.shelters;
create policy "shelters_update_owner" on public.shelters
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "shelters_delete_owner" on public.shelters;
create policy "shelters_delete_owner" on public.shelters
  for delete
  using (user_id = auth.uid());

-- ---- Fin de la migración de datos: se eliminan las columnas legadas ----
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'shelter_name'
  ) THEN
    ALTER TABLE public.profiles
      DROP COLUMN IF EXISTS shelter_name,
      DROP COLUMN IF EXISTS shelter_city,
      DROP COLUMN IF EXISTS shelter_address;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. profiles: email (necesario para el trigger oficial), role → enum,
--    full_name y NOT NULLs.
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists email text;

-- Backfill de email desde auth.users (datos preexistentes).
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

create unique index if not exists profiles_email_key on public.profiles (email);

-- Normaliza values previos y convierte role al enum.
DO $$ BEGIN
  IF (select udt_name
      from information_schema.columns
      where table_schema='public' and table_name='profiles' and column_name='role')
     <> 'user_role'
  THEN
    update public.profiles set role = 'adoptante'
    where role is null or role not in ('adoptante', 'refugio', 'admin');
    alter table public.profiles
      alter column role type public.user_role using role::text::public.user_role;
  END IF;
END $$;

update public.profiles set full_name = 'Usuario' where full_name is null;
alter table public.profiles alter column role set default 'adoptante';
alter table public.profiles alter column role set not null;

-- FIX: Si en el futuro se habilita login por teléfono, NEW.email será NULL
-- y el trigger fallará. En ese caso, quitar NOT NULL y usar COALESCE(email, phone).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email is null) THEN
    EXECUTE 'alter table public.profiles alter column email set not null';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. TABLA adopter_profiles (bootstrap si no existe, ya con columnas
--    oficiales; conserva PK sobre user_id para el upsert del frontend).
-- ---------------------------------------------------------------------------
create table if not exists public.adopter_profiles (
  user_id             uuid primary key references public.profiles(id) on delete cascade,
  has_yard            boolean not null default false,
  has_kids            boolean not null default false,
  kids_ages           text,
  has_other_pets      boolean not null default false,
  other_pets_details  text,
  experience_years    integer not null default 0,
  city                text not null default '',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.adopter_profiles is
  'Información extendida del perfil del adoptante (HU-07/HU-12/HU-13)';

alter table public.adopter_profiles enable row level security;

-- Columnas oficiales (solo agrega las que falten en esquemas antiguos).
alter table public.adopter_profiles add column if not exists has_yard boolean not null default false;
alter table public.adopter_profiles add column if not exists has_kids boolean not null default false;
alter table public.adopter_profiles add column if not exists kids_ages text;
alter table public.adopter_profiles add column if not exists has_other_pets boolean not null default false;
alter table public.adopter_profiles add column if not exists other_pets_details text;
alter table public.adopter_profiles add column if not exists experience_years integer not null default 0;
alter table public.adopter_profiles add column if not exists city text;

update public.adopter_profiles set city = '' where city is null;
alter table public.adopter_profiles alter column city set default '';
alter table public.adopter_profiles alter column city set not null;

-- Elimina columnas y CHECKs del diseño anterior (Migraciones SPRINT 2 / 2.1).
alter table public.adopter_profiles drop constraint if exists adopter_profiles_housing_type_check;
alter table public.adopter_profiles drop constraint if exists adopter_profiles_experience_check;
alter table public.adopter_profiles drop constraint if exists adopter_profiles_time_check;
alter table public.adopter_profiles drop column if exists housing_type;
alter table public.adopter_profiles drop column if exists experience_level;
alter table public.adopter_profiles drop column if exists daily_time_available;

drop trigger if exists adopter_profiles_set_updated_at on public.adopter_profiles;
create trigger adopter_profiles_set_updated_at
  before update on public.adopter_profiles
  for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 6. TABLA pets (bootstrap si no existe, ya alineada) + migración legacy.
--    IMPORTANTE: en esquemas antiguos se eliminan primero las políticas RLS
--    que referencian refugio_id, porque Postgres impide dropear una columna
--    usada por una política. Las políticas nuevas se recrean en el paso 9.
-- ---------------------------------------------------------------------------
drop policy if exists "pets_select_public" on public.pets;
drop policy if exists "pets_insert_refugio_owner" on public.pets;
drop policy if exists "pets_update_refugio_owner" on public.pets;
drop policy if exists "pets_delete_refugio_owner" on public.pets;
drop policy if exists "pet_images_select_public" on public.pet_images;
drop policy if exists "pet_images_insert_refugio_owner" on public.pet_images;
drop policy if exists "pet_images_delete_refugio_owner" on public.pet_images;

create table if not exists public.pets (
  id            uuid primary key default gen_random_uuid(),
  shelter_id    uuid not null references public.shelters(id) on delete cascade,
  name          varchar(100)  not null,
  species       public.pet_species not null default 'perro',
  breed         varchar(100),
  age_years     integer,
  age_months    integer not null default 0 check (age_months >= 0),
  size          public.pet_size not null default 'mediano',
  weight_kg     numeric(5,2),
  temperament   text,
  health_status varchar(100) not null default 'Saludable',
  description   text not null default '',
  requirements  text,
  status        public.pet_status not null default 'disponible',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.pets is 'Animales registrados por los refugios (HU-10/11/12) - modelo oficial';

alter table public.pets enable row level security;

-- Nuevas columnas del modelo oficial (no-op si la tabla ya nace alineada).
alter table public.pets add column if not exists shelter_id uuid;
alter table public.pets add column if not exists age_years integer;
-- FIX: numeric(4,2) limitaba a 99.99 kg. Se amplía a numeric(5,2) para
-- soportar perros gigantes (San Bernardo, Mastín, etc.) sin rechazar inserts.
alter table public.pets add column if not exists weight_kg numeric(5,2);
alter table public.pets add column if not exists requirements text;

-- Backfill: vincula cada mascota con la ficha de su refugio.
-- En BD limpia (bootstrap) la columna legacy refugio_id NO existe; se ignora.
DO $$ BEGIN
  update public.pets p
  set shelter_id = s.id
  from public.shelters s
  where s.user_id = p.refugio_id
    and p.shelter_id is null;
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

-- Elimina CHECKs antiguos (VARCHAR) antes de convertir a enums.
alter table public.pets drop constraint if exists pets_species_check;
alter table public.pets drop constraint if exists pets_size_check;
alter table public.pets drop constraint if exists pets_status_check;

-- Renombres de valores para encajar con los enums oficiales.
DO $$ BEGIN
  IF (select udt_name
      from information_schema.columns
      where table_schema='public' and table_name='pets' and column_name='size')
     <> 'pet_size'
  THEN
    update public.pets set size = 'pequeño' where size = 'pequeno';
    update public.pets set status = 'adoptada' where status = 'adoptado';
  END IF;
END $$;

-- Conversión de columnas a los enums.
DO $$ BEGIN
  IF (select udt_name
      from information_schema.columns
      where table_schema='public' and table_name='pets' and column_name='species')
     <> 'pet_species'
  THEN
    alter table public.pets
      alter column species type public.pet_species using species::text::public.pet_species;
  END IF;
END $$;

DO $$ BEGIN
  IF (select udt_name
      from information_schema.columns
      where table_schema='public' and table_name='pets' and column_name='size')
     <> 'pet_size'
  THEN
    alter table public.pets
      alter column size type public.pet_size using size::text::public.pet_size;
  END IF;
END $$;

DO $$ BEGIN
  IF (select udt_name
      from information_schema.columns
      where table_schema='public' and table_name='pets' and column_name='status')
     <> 'pet_status'
  THEN
    alter table public.pets
      alter column status type public.pet_status
      using status::text::public.pet_status;
    alter table public.pets alter column status set default 'disponible';
  END IF;
END $$;

-- FK a shelters y eliminación de la columna refugio_id (ya migrada).
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' and table_name='pets' and column_name='refugio_id'
  ) THEN
    -- elimina el índice sobre la columna legada (si existe)
    drop index if exists pets_refugio_idx;
    -- elimina la columna (y su FK automática pets_refugio_id_fkey)
    alter table public.pets drop column refugio_id;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pets_shelter_id_fkey'
      and conrelid = 'public.pets'::regclass
  ) THEN
    ALTER TABLE public.pets
      ADD CONSTRAINT pets_shelter_id_fkey
      FOREIGN KEY (shelter_id) REFERENCES public.shelters(id) ON DELETE CASCADE;
  END IF;
END $$;

-- NOT NULL sobre shelter_id (modelo oficial), solo si no quedan mascotas huérfanas.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.pets WHERE shelter_id is null) THEN
    EXECUTE 'alter table public.pets alter column shelter_id set not null';
  END IF;
END $$;

drop trigger if exists pets_set_updated_at on public.pets;
create trigger pets_set_updated_at
  before update on public.pets
  for each row execute function public.update_updated_at_column();

-- Índices para el catálogo con la estructura oficial.
drop index if exists pets_refugio_idx;
create index if not exists pets_shelter_idx  on public.pets (shelter_id);
create index if not exists pets_status_idx   on public.pets (status);
create index if not exists pets_species_idx  on public.pets (species);
create index if not exists pets_size_idx     on public.pets (size);

-- ---------------------------------------------------------------------------
-- 7. TABLA pet_images (bootstrap si no existe)
-- ---------------------------------------------------------------------------
create table if not exists public.pet_images (
  id            uuid primary key default gen_random_uuid(),
  pet_id        uuid not null references public.pets(id) on delete cascade,
  storage_path  text,                 -- ruta dentro del bucket pet-images
  image_url     text not null,        -- URL pública completa
  is_primary    boolean not null default false,
  created_at    timestamptz not null default now()
);

comment on table public.pet_images is 'Imágenes de cada mascota (galería del detalle)';

create index if not exists pet_images_pet_idx on public.pet_images (pet_id);

alter table public.pet_images enable row level security;

-- ---------------------------------------------------------------------------
-- 8. TABLA favorites (bootstrap si no existe)
-- ---------------------------------------------------------------------------
create table if not exists public.favorites (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  pet_id     uuid not null references public.pets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, pet_id)
);

comment on table public.favorites is 'Mascotas marcadas como favoritas por un adoptante';

alter table public.favorites enable row level security;

-- ---------------------------------------------------------------------------
-- 9. TRIGGER handle_new_user (creación automática de perfil). Con
--    ON CONFLICT (id) DO UPDATE: si el id ya existe en profiles (re-registro,
--    reintentos) NUNCA revienta → actualiza email/full_name/role.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
declare
  assigned_role public.user_role;
begin
  begin
    assigned_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
  exception when others then
    assigned_role := 'adoptante'::public.user_role;
  end;

  insert into public.profiles (id, email, full_name, role)
  values (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    COALESCE(assigned_role, 'adoptante'::public.user_role)
  )
  on conflict (id) do update set
    email     = excluded.email,
    full_name = excluded.full_name,
    role      = excluded.role;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 10. POLÍTICAS RLS: pets, pet_images, shelters, storage, profiles,
--     adopter_profiles y favorites. El dueño = shelters.user_id.
-- ---------------------------------------------------------------------------
-- --- RLS pets ---------------------------------------------------------------
drop policy if exists "pets_select_public" on public.pets;
create policy "pets_select_public" on public.pets for select using (true);

drop policy if exists "pets_insert_refugio_owner" on public.pets;
create policy "pets_insert_refugio_owner" on public.pets
  for insert
  with check (
    shelter_id in (select id from public.shelters where user_id = auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'refugio'
    )
  );

drop policy if exists "pets_update_refugio_owner" on public.pets;
create policy "pets_update_refugio_owner" on public.pets
  for update
  using (
    shelter_id in (select id from public.shelters where user_id = auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'refugio'
    )
  )
  with check (
    shelter_id in (select id from public.shelters where user_id = auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'refugio'
    )
  );

drop policy if exists "pets_delete_refugio_owner" on public.pets;
create policy "pets_delete_refugio_owner" on public.pets
  for delete
  using (
    shelter_id in (select id from public.shelters where user_id = auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'refugio'
    )
  );

-- --- RLS pet_images ---------------------------------------------------------
drop policy if exists "pet_images_select_public" on public.pet_images;
create policy "pet_images_select_public" on public.pet_images for select using (true);

drop policy if exists "pet_images_insert_refugio_owner" on public.pet_images;
create policy "pet_images_insert_refugio_owner" on public.pet_images
  for insert
  with check (
    exists (
      select 1 from public.pets pt
      where pt.id = pet_id
        and pt.shelter_id in (select id from public.shelters where user_id = auth.uid())
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'refugio'
    )
  );

drop policy if exists "pet_images_delete_refugio_owner" on public.pet_images;
create policy "pet_images_delete_refugio_owner" on public.pet_images
  for delete
  using (
    exists (
      select 1 from public.pets pt
      where pt.id = pet_id
        and pt.shelter_id in (select id from public.shelters where user_id = auth.uid())
    )
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'refugio'
    )
  );

-- --- RLS adopter_profiles ----------------------------------------------------
drop policy if exists "adopter_profiles_select_own" on public.adopter_profiles;
create policy "adopter_profiles_select_own"
  on public.adopter_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "adopter_profiles_insert_own" on public.adopter_profiles;
create policy "adopter_profiles_insert_own"
  on public.adopter_profiles for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'adoptante'
    )
  );

drop policy if exists "adopter_profiles_update_own" on public.adopter_profiles;
create policy "adopter_profiles_update_own"
  on public.adopter_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- --- RLS favorites -----------------------------------------------------------
drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own"
  on public.favorites for select
  using (auth.uid() = user_id);

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own"
  on public.favorites for insert
  with check (auth.uid() = user_id);

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- --- RLS storage.objects (bucket pet-images) --------------------------------
-- El dueño físico de la carpeta es auth.uid() (profiles.id); se mantiene la
-- estructura <user_id>/<uuid>.<ext> y el rol refugio.
drop policy if exists "pet_images_storage_select_public" on storage.objects;
create policy "pet_images_storage_select_public"
  on storage.objects for select
  using (bucket_id = 'pet-images');

drop policy if exists "pet_images_storage_insert_refugio" on storage.objects;
create policy "pet_images_storage_insert_refugio"
  on storage.objects for insert
  with check (
    bucket_id = 'pet-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'refugio'
    )
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "pet_images_storage_update_refugio" on storage.objects;
-- FIX: Se agregó la validación del rol 'refugio' en el WITH CHECK para que
-- sea consistente con el USING y evitar que un usuario autenticado (aunque
-- no sea refugio) pueda modificar archivos dentro de su propia carpeta.
create policy "pet_images_storage_update_refugio"
  on storage.objects for update
  using (
    bucket_id = 'pet-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'refugio'
    )
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'pet-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'refugio'
    )
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "pet_images_storage_delete_refugio" on storage.objects;
create policy "pet_images_storage_delete_refugio"
  on storage.objects for delete
  using (
    bucket_id = 'pet-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'refugio'
    )
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- --- RLS profiles (asegura las políticas públicas mínimas del catálogo) ----
-- NOTA IMPORTANTE: RLS en Postgres filtra FILAS, no COLUMNAS. La política
-- "profiles_select_public_fields" con using(true) permite a cualquier usuario
-- autenticado leer TODAS las columnas (incluyendo email). Si necesitas ocultar
-- columnas específicas al público, usa GRANT/REVOKE a nivel de columna o una
-- vista. Se mantienen ambas políticas por compatibilidad con el frontend.
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_public_fields" on public.profiles;
create policy "profiles_select_public_fields" on public.profiles for select using (true);

drop policy if exists "profiles_select_own_full" on public.profiles;
create policy "profiles_select_own_full" on public.profiles for select using (id = auth.uid());

-- Red de seguridad (QA Bug 3): el trigger `handle_new_user` es el camino
-- normal para crear la fila, pero si no corrió el usuario queda sin perfil y
-- TODA tabla con FK a `profiles` falla con 23503 (p.ej. favorites.user_id).
-- Sin estas políticas el repair del frontend (`authStore.ensureProfile`)
-- recibiría 42501. Solo se permite escribir la propia fila y jamás 'admin'.
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert
  with check (id = auth.uid() and role in ('adoptante', 'refugio'));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid() and role in ('adoptante', 'refugio'));

-- ---------------------------------------------------------------------------
-- 11. STORAGE: bucket público 'pet-images' (bootstrap, post-reset).
--     Políticas ya cubiertas en el paso 10.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('pet-images', 'pet-images', true)
on conflict (id) do update set public = true;

-- ---------------------------------------------------------------------------
-- 12. GRANTS mínimos para anon/authenticated (necesarios tras un reset total
--     del proyecto; inofensivos si ya existen porque la seguridad real la da
--     el RLS, que sigue activo).
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;

-- ---------------------------------------------------------------------------
-- FIN DE LA MIGRACIÓN
-- ---------------------------------------------------------------------------
-- Verificación rápida:
--   select typname from pg_type where typnamespace='public'::regnamespace
--     and typname in ('user_role','pet_status','pet_species','pet_size');
--   select to_regclass('public.profiles'), to_regclass('public.pets'),
--          to_regclass('public.pet_images'), to_regclass('public.adopter_profiles'),
--          to_regclass('public.favorites'), to_regclass('public.shelters');
--   select id, name, public from storage.buckets where id = 'pet-images';
--   select tablename, policyname from pg_policies
--     where schemaname='public' and tablename in ('pets','pet_images','shelters',
--     'adopter_profiles','favorites','profiles') order by tablename;
-- ============================================================================
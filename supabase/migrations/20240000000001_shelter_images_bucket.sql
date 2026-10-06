-- ============================================================================
-- MATCHPET — BUCKET shelter-images (portadas de refugios, HU-14/HU-15)
-- ----------------------------------------------------------------------------
-- Archivo: supabase/migrations/20240000000001_shelter_images_bucket.sql
-- Requiere: ejecutar primero 20240000000000_align_schema.sql
--
-- Qué hace:
--   1. Crea/actualiza el bucket público 'shelter-images' con límite de 2 MB.
--   2. Políticas RLS de storage.objects para ese bucket:
--        - select: público.
--        - insert/update/delete: solo refugios, dentro de su carpeta
--          auth.uid()/... (mismo patrón que pet-images).
-- ============================================================================

-- 1. Bucket (idempotente)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shelter-images', 'shelter-images', true, 2097152, array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'])
on conflict (id) do update set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. Políticas de storage.objects
drop policy if exists "shelter_images_select_public" on storage.objects;
create policy "shelter_images_select_public"
  on storage.objects for select
  using (bucket_id = 'shelter-images');

drop policy if exists "shelter_images_insert_owner" on storage.objects;
create policy "shelter_images_insert_owner"
  on storage.objects for insert
  with check (
    bucket_id = 'shelter-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'refugio'
    )
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "shelter_images_update_owner" on storage.objects;
create policy "shelter_images_update_owner"
  on storage.objects for update
  using (
    bucket_id = 'shelter-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'refugio'
    )
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'shelter-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "shelter_images_delete_owner" on storage.objects;
create policy "shelter_images_delete_owner"
  on storage.objects for delete
  using (
    bucket_id = 'shelter-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'refugio'
    )
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Verificación:
--   select id, name, public, file_size_limit from storage.buckets
--     where id = 'shelter-images';
--   select policyname from pg_policies where schemaname='storage'
--     and policyname like 'shelter_images%';
-- ============================================================================
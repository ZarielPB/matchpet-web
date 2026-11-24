-- ============================================================================
-- MATCHPET — SPRINT 5: ADJUNTO OPCIONAL EN REPORTES (HU-47 CA#1)
-- ----------------------------------------------------------------------------
-- Bucket PRIVADO 'report-attachments' (foto o video, máx. 10 MB). El adoptante
-- sube a su carpeta auth.uid()/...; lo leen él y el refugio destinatario
-- (vía URL firmada). create_post_adoption_report recibe la ruta del adjunto.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-attachments', 'report-attachments', false, 10485760,
        array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "report_att_insert_owner" on storage.objects;
create policy "report_att_insert_owner" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'report-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'adoptante')
  );

drop policy if exists "report_att_select" on storage.objects;
create policy "report_att_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'report-attachments'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.post_adoption_reports r
        join public.shelters s on s.id = r.shelter_id
        where r.image_url = storage.objects.name and s.user_id = auth.uid()
      )
    )
  );

drop policy if exists "report_att_delete_owner" on storage.objects;
create policy "report_att_delete_owner" on storage.objects for delete to authenticated
  using (bucket_id = 'report-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

-- Reemplaza la firma de 3 parámetros por una con adjunto opcional.
DROP FUNCTION IF EXISTS public.create_post_adoption_report(uuid, text, text);

CREATE OR REPLACE FUNCTION public.create_post_adoption_report(
    p_application_id uuid, p_category text, p_description text, p_attachment_path text DEFAULT NULL
) RETURNS public.post_adoption_reports
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_app    public.adoption_applications;
    v_pet    public.pets;
    v_shel   public.shelters;
    v_report public.post_adoption_reports;
    v_path   text := NULLIF(btrim(COALESCE(p_attachment_path, '')), '');
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'No autenticado' USING ERRCODE = '28000';
    END IF;
    IF p_category NOT IN ('Comportamiento', 'Salud', 'Duda general', 'Otro') THEN
        RAISE EXCEPTION 'Categoría inválida' USING ERRCODE = '22023';
    END IF;
    IF char_length(btrim(COALESCE(p_description, ''))) < 10 THEN
        RAISE EXCEPTION 'Describe el problema con al menos 10 caracteres' USING ERRCODE = '22023';
    END IF;
    -- El adjunto debe estar en la carpeta del propio usuario.
    IF v_path IS NOT NULL AND (v_path NOT LIKE auth.uid()::text || '/%' OR v_path LIKE '%..%') THEN
        RAISE EXCEPTION 'Adjunto inválido' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_app FROM public.adoption_applications
     WHERE id = p_application_id AND user_id = auth.uid();
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Adopción no encontrada' USING ERRCODE = 'P0002';
    END IF;
    IF v_app.status <> 'completada' THEN
        RAISE EXCEPTION 'Solo puedes reportar sobre una mascota ya adoptada' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_pet FROM public.pets WHERE id = v_app.pet_id;
    SELECT * INTO v_shel FROM public.shelters WHERE id = v_pet.shelter_id;

    INSERT INTO public.post_adoption_reports (application_id, pet_id, user_id, shelter_id, category, description, image_url)
    VALUES (v_app.id, v_pet.id, auth.uid(), v_shel.id, p_category, btrim(p_description), v_path)
    RETURNING * INTO v_report;

    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (v_shel.user_id, 'Nuevo reporte post-adopción',
            format('Un adoptante reportó (%s) sobre %s.', p_category, v_pet.name),
            '/refugio/reportes');
    RETURN v_report;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_post_adoption_report(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_post_adoption_report(uuid, text, text, text) TO authenticated;

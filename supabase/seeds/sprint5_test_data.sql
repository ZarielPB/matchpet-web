-- ============================================================================
-- DATOS DE PRUEBA — SPRINT 5 (seguimiento, reportes y estadísticas)
-- Todas las mascotas se llaman "[PRUEBA] ..." para identificarlas y borrarlas.
-- Ejecutar con rol postgres (SQL Editor). Es idempotente: limpia y vuelve a crear.
--
-- LIMPIEZA (dejar la BD sin datos de prueba):
--   DELETE FROM public.pets WHERE name LIKE '[PRUEBA]%';        -- cascada: solicitudes, entregas, notas y reportes
--   DELETE FROM public.notifications WHERE title LIKE '[PRUEBA]%';
-- ============================================================================
DO $seed$
DECLARE
  sh1 uuid := '78c74355-e3f1-4beb-97cf-fabf497a6045';  -- refugio de 848d587e… (con casi todas las mascotas)
  sh2 uuid := '72faa03f-e407-449e-b1b0-92504d0be445';  -- refugio de 435774b6… (para probar aislamiento)
  u1  uuid := '848d587e-3253-40b0-b1b5-1130579abe39';
  u2  uuid := '435774b6-9621-4337-ba86-53f87c3f90c4';
  a_q uuid := '2fd9032b-7c1d-45ae-8ada-bb2266c52f84';  -- adoptante CON cuestionario
  a_b uuid := '9c2d234b-8c8b-4d8b-bc7b-e0fc6726963b';  -- sin cuestionario
  a_c uuid := '70744bd7-dde1-4b27-b417-fc9089fc2175';  -- sin cuestionario
  pid uuid; aid uuid;
  r record;
BEGIN
  DELETE FROM public.pets WHERE name LIKE '[PRUEBA]%';
  DELETE FROM public.notifications WHERE title LIKE '[PRUEBA]%';

  -- (nombre, especie, tamaño, refugio, estado, adoptante, estado solicitud, entrega, energía)
  FOR r IN SELECT * FROM (VALUES
    ('[PRUEBA] Pipo',   'gato',  'pequeño', sh1, 'adoptada',   a_b, 'completada', DATE '2026-06-14', 'baja'),
    ('[PRUEBA] Thor',   'perro', 'grande',  sh1, 'adoptada',   a_c, 'completada', DATE '2026-07-20', 'alta'),
    ('[PRUEBA] Lola',   'perro', 'pequeño', sh1, 'adoptada',   a_q, 'completada', DATE '2026-08-09', 'media'),
    ('[PRUEBA] Simba',  'gato',  'mediano', sh1, 'adoptada',   a_b, 'completada', DATE '2026-09-18', 'media'),
    ('[PRUEBA] Dante',  'perro', 'mediano', sh1, 'adoptada',   a_q, 'completada', DATE '2026-10-05', 'alta'),
    ('[PRUEBA] Mía',    'gato',  'pequeño', sh1, 'adoptada',   a_q, 'completada', DATE '2026-11-04', 'baja'),
    ('[PRUEBA] Nube',   'gato',  'pequeño', sh2, 'adoptada',   a_c, 'completada', DATE '2026-10-12', 'baja'),
    ('[PRUEBA] Bobby',  'perro', 'mediano', sh1, 'disponible', a_q, 'pendiente',  NULL,              'media'),
    ('[PRUEBA] Kira',   'perro', 'mediano', sh1, 'disponible', a_b, 'rechazada',  NULL,              'alta')
  ) AS t(pname, species, size, shelter, pstatus, adopter, astatus, delivered, energy)
  LOOP
    INSERT INTO public.pets (shelter_id, name, species, size, health_status, status, energy_level, good_with_kids, good_with_other_pets, description)
    VALUES (r.shelter, r.pname, r.species::public.pet_species, r.size::public.pet_size, 'Vacunado y desparasitado',
            r.pstatus::public.pet_status, r.energy::public.energy_level, true, true, 'Dato de prueba del Sprint 5.')
    RETURNING id INTO pid;

    INSERT INTO public.adoption_applications (pet_id, user_id, message, status, shelter_comments, created_at, resolved_at)
    VALUES (pid, r.adopter, 'Solicitud de prueba para verificar el Sprint 5.', r.astatus::public.application_status,
            CASE WHEN r.astatus = 'rechazada' THEN 'No es compatible con tu estilo de vida (prueba).' END,
            COALESCE(r.delivered, CURRENT_DATE) - 10,
            CASE WHEN r.delivered IS NOT NULL THEN r.delivered ELSE NULL END)
    RETURNING id INTO aid;

    IF r.delivered IS NOT NULL THEN
      INSERT INTO public.adoption_deliveries (application_id, delivered_at, documents, observations, registered_by)
      VALUES (aid, r.delivered, ARRAY['Contrato de adopción', 'Carnet de vacunas'], 'Entrega de prueba',
              CASE WHEN r.shelter = sh1 THEN u1 ELSE u2 END);

      INSERT INTO public.follow_up_notes (application_id, pet_id, shelter_id, user_id, type, noted_at, notes)
      VALUES (aid, pid, r.shelter, r.adopter, 'llamada', r.delivered + 7,  'Llamada de la primera semana: se adaptó bien y come con normalidad.'),
             (aid, pid, r.shelter, r.adopter, 'visita',  r.delivered + 30, 'Visita al hogar: espacio adecuado y mascota tranquila.');
    END IF;
  END LOOP;

  -- Mensaje + nota futura (visita agendada) para Mía, la adopción más reciente.
  INSERT INTO public.follow_up_notes (application_id, pet_id, shelter_id, user_id, type, noted_at, notes)
  SELECT a.id, a.pet_id, sh1, a.user_id, 'mensaje', CURRENT_DATE - 2, 'Mensaje por WhatsApp: el adoptante envió fotos, todo en orden.'
  FROM public.adoption_applications a JOIN public.pets p ON p.id = a.pet_id WHERE p.name = '[PRUEBA] Mía';
  INSERT INTO public.follow_up_notes (application_id, pet_id, shelter_id, user_id, type, noted_at, notes)
  SELECT a.id, a.pet_id, sh1, a.user_id, 'visita', CURRENT_DATE + 14, 'Visita de seguimiento agendada.'
  FROM public.adoption_applications a JOIN public.pets p ON p.id = a.pet_id WHERE p.name = '[PRUEBA] Mía';

  -- Reportes en los tres estados.
  INSERT INTO public.post_adoption_reports (application_id, pet_id, user_id, shelter_id, category, description, status, shelter_response)
  SELECT a.id, a.pet_id, a.user_id, sh1, v.cat, v.descr, v.st::public.report_status, v.resp
  FROM (VALUES
    ('[PRUEBA] Dante',  'Comportamiento', 'Ladra mucho por las noches y no sé cómo calmarlo.', 'pendiente',  NULL),
    ('[PRUEBA] Simba',  'Salud',          'Estornuda seguido desde hace dos días.',            'respondido', 'Llévalo al veterinario esta semana; si empeora avísanos.'),
    ('[PRUEBA] Thor',   'Duda general',   '¿Cada cuánto debo desparasitarlo?',                 'cerrado',    'Cada 3 meses. Caso cerrado, gracias por consultar.')
  ) AS v(pname, cat, descr, st, resp)
  JOIN public.pets p ON p.name = v.pname
  JOIN public.adoption_applications a ON a.pet_id = p.id;

  -- Notificación sin leer para el refugio (campana).
  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (u1, '[PRUEBA] Nuevo reporte post-adopción', 'Un adoptante reportó (Comportamiento) sobre Dante.', '/refugio/reportes');
END
$seed$;

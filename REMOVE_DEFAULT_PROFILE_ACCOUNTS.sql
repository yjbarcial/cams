-- Remove previously seeded default CAMS profile accounts from User Management.
-- Run this in Supabase Dashboard -> SQL Editor.
--
-- This removes only profile rows from the old hardcoded seed list that do not
-- have a matching Supabase Auth user. Real registered accounts are preserved.

WITH default_seed_emails(email) AS (
  VALUES
    ('lexzyrrehdevonnaire.abellanosa@carsu.edu.ph'),
    ('teejay.abello@carsu.edu.ph'),
    ('nissi.abes@carsu.edu.ph'),
    ('belleblanchekyle.abiol@carsu.edu.ph'),
    ('jessahmei.allard@carsu.edu.ph'),
    ('jonhian.alfaras@carsu.edu.ph'),
    ('lendon.almocera@carsu.edu.ph'),
    ('eizzielmarie.bacoy@carsu.edu.ph'),
    ('nevlim.baldelovar@carsu.edu.ph'),
    ('robertlouis.bebis@carsu.edu.ph'),
    ('ryanchristianbenignos@carsu.edu.ph'),
    ('sophija.bentulan@carsu.edu.ph'),
    ('peterlorenzo.calo@carsu.edu.ph'),
    ('levibrian.cejuela@carsu.edu.ph'),
    ('joshuajosh.coralde@carsu.edu.ph'),
    ('josefa.cruzada@carsu.edu.ph'),
    ('lordelie.darog@carsu.edu.ph'),
    ('jezwer.delima@carsu.edu.ph'),
    ('jellanaille.denonong@carsu.edu.ph'),
    ('jonee.elopre@carsu.edu.ph'),
    ('devorahgrace.esguerra@carsu.edu.ph'),
    ('rexter.etang@carsu.edu.ph'),
    ('jerbyclaire.factularin@carsu.edu.ph'),
    ('melede.ganoy@carsu.edu.ph'),
    ('jofredjames.gerasmio@carsu.edu.ph'),
    ('mattandrew.graban@carsu.edu.ph'),
    ('hannahfaith.labadan@carsu.edu.ph'),
    ('megumierika.labaja@carsu.edu.ph'),
    ('anne.lanzon@carsu.edu.ph'),
    ('gerzaallea.lim@carsu.edu.ph'),
    ('jhondavid.lloren@carsu.edu.ph'),
    ('shienygriethzer.lozada@carsu.edu.ph'),
    ('samanthajezette.maestrado@carsu.edu.ph'),
    ('jaylor.malnegro@carsu.edu.ph'),
    ('majulianny.navarez@carsu.edu.ph'),
    ('edwin.mori@carsu.edu.ph'),
    ('kayadanielle.nason@carsu.edu.ph'),
    ('mhegan.niez@carsu.edu.ph'),
    ('kurtclyde.pablo@carsu.edu.ph'),
    ('jharedmiguel.paderna@carsu.edu.ph'),
    ('jevan.racaza@carsu.edu.ph'),
    ('julesleo.reserva@carsu.edu.ph'),
    ('glennferdinan.rojas@carsu.edu.ph'),
    ('missividka.santillan@carsu.edu.ph'),
    ('elainepearl.silagan@carsu.edu.ph'),
    ('samuellhoide.ursales@carsu.edu.ph'),
    ('kentadriane.vinatero@carsu.edu.ph')
),
deleted_profiles AS (
  DELETE FROM public.profiles p
  USING default_seed_emails d
  WHERE lower(p.email) = lower(d.email)
    AND NOT EXISTS (
      SELECT 1
      FROM auth.users au
      WHERE lower(au.email) = lower(p.email)
    )
  RETURNING p.id, p.email, p.role, p.status
)
SELECT *
FROM deleted_profiles
ORDER BY email;

-- 0021_flag_types_seed.sql
-- Workstream IV-3: 14 built-in flag types. These populate the
-- Flutter "create flag" bottom sheet on day one.
--
-- Icons are semantic identifiers — each client (Flutter / dashboard)
-- maps them to their own icon library. The Flutter notification
-- settings screen (already shipped) uses roughly the same set, so
-- keep names aligned:
--   skull    — mortality  (Flutter: Icons.close as placeholder)
--   heart    — humane endpoint
--   band-aid — injury
--   pill     — sick_animal / health concern
--   split    — separation needed
--   swords   — fighting
--   users    — overcrowded
--   droplet  — water_food_issue
--   broom    — cage_dirty
--   run      — escaped
--   brain    — behavioral
--   heart-plus — pregnancy_noted
--   wrench   — equipment_issue
--   flag     — other
--
-- Severity guide:
--   urgent    — welfare emergency; PI must respond within hours
--   attention — should be addressed same-day
--   info      — logged for record but not blocking

INSERT INTO public.flag_types (id, label, description, icon, default_severity, sort_order, system) VALUES
  ('deceased',          'Mortality',            'Animal(s) found deceased',                              'skull',      'urgent',    10,  true),
  ('humane_endpoint',   'Humane Endpoint',      'Animal has reached humane endpoint criteria',           'heart',      'urgent',    20,  true),
  ('injury',            'Injury',               'Visible injury requiring veterinary attention',         'band-aid',   'urgent',    30,  true),
  ('sick_animal',       'Sick Animal',          'Animal showing signs of illness or distress',           'pill',       'urgent',    40,  true),
  ('escaped',           'Escaped',              'Animal(s) escaped from cage',                           'run',        'urgent',    50,  true),
  ('separate_pups',     'Separation Needed',    'Pups need to be separated from parents',                'split',      'attention', 60,  true),
  ('fighting',          'Fighting',             'Aggression between cage-mates',                         'swords',     'attention', 70,  true),
  ('overcrowded',       'Overcrowded',          'Too many animals for cage capacity',                    'users',      'attention', 80,  true),
  ('water_food_issue',  'Water / Food Issue',   'Water bottle empty, food hopper low, or contaminated', 'droplet',    'attention', 90,  true),
  ('cage_dirty',        'Cage Needs Change',    'Bedding requires immediate change',                     'broom',      'attention', 100, true),
  ('equipment_issue',   'Equipment Issue',      'Broken enrichment, water valve, cage lid, etc.',        'wrench',     'attention', 110, true),
  ('behavioral',        'Behavioral Concern',   'Unusual behavior worth noting',                         'brain',      'info',      120, true),
  ('pregnancy_noted',   'Pregnancy Observed',   'Visible pregnancy — please confirm breeding record',    'heart-plus', 'info',      130, true),
  ('other',             'Other',                'Anything not covered above — describe in notes',        'flag',       'info',      900, true)
ON CONFLICT (id) DO NOTHING;

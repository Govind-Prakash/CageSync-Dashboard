-- 0017_institutions_seed.sql
-- Workstream II-1: Seed the institution registry with the ~20
-- institutions most relevant to CageSync's early market. This is
-- founder-curated data for MVP; long-term this becomes a user-
-- submitted-with-approval flow (see roadmap §7 open questions).
--
-- Guiding heuristics for what goes in:
--   * Present in India, Israel, US, UK, EU (matches early customer
--     conversations)
--   * Actually runs animal research (mice, rats, zebrafish, fly)
--   * Multi-campus entries capture the real campuses so labs can
--     scope themselves accurately
--
-- Domains are the primary institutional email domains. Sub-domains
-- users actually receive mail on (mail.tau.ac.il, hms.harvard.edu,
-- etc.) are included so email-domain auto-verify works for them too.

INSERT INTO public.institutions (canonical_name, common_name, country, campuses, email_domains) VALUES
  -- India
  ('Indian Institute of Science Education and Research, Bhopal',
   'IISER Bhopal', 'India', NULL,
   ARRAY['iiserb.ac.in']),

  ('Indian Institute of Science',
   'IISc', 'India', NULL,
   ARRAY['iisc.ac.in']),

  ('National Centre for Biological Sciences',
   'NCBS', 'India', NULL,
   ARRAY['ncbs.res.in']),

  ('Institute for Stem Cell Science and Regenerative Medicine',
   'InStem', 'India', NULL,
   ARRAY['instem.res.in']),

  ('Indian Institute of Technology Bombay',
   'IIT Bombay', 'India', NULL,
   ARRAY['iitb.ac.in']),

  ('All India Institute of Medical Sciences, New Delhi',
   'AIIMS Delhi', 'India', NULL,
   ARRAY['aiims.edu']),

  ('Tata Institute of Fundamental Research',
   'TIFR', 'India',
   ARRAY['Mumbai', 'Hyderabad', 'Bangalore'],
   ARRAY['tifr.res.in']),

  -- Israel
  ('Hebrew University of Jerusalem',
   'HUJI', 'Israel',
   ARRAY['Mount Scopus', 'Givat Ram', 'Ein Karem', 'Rehovot'],
   ARRAY['huji.ac.il', 'mail.huji.ac.il']),

  ('Weizmann Institute of Science',
   'Weizmann', 'Israel', NULL,
   ARRAY['weizmann.ac.il']),

  ('Technion – Israel Institute of Technology',
   'Technion', 'Israel', NULL,
   ARRAY['technion.ac.il', 'campus.technion.ac.il']),

  ('Tel Aviv University',
   'TAU', 'Israel', NULL,
   ARRAY['tau.ac.il', 'mail.tau.ac.il']),

  -- United States
  ('Massachusetts Institute of Technology',
   'MIT', 'United States', NULL,
   ARRAY['mit.edu']),

  ('Broad Institute of MIT and Harvard',
   'Broad Institute', 'United States', NULL,
   ARRAY['broadinstitute.org']),

  ('Harvard University',
   'Harvard', 'United States',
   ARRAY['Cambridge', 'Longwood Medical Area', 'Allston'],
   ARRAY['harvard.edu', 'g.harvard.edu', 'hms.harvard.edu']),

  ('Stanford University',
   'Stanford', 'United States', NULL,
   ARRAY['stanford.edu']),

  ('University of California, San Francisco',
   'UCSF', 'United States',
   ARRAY['Parnassus', 'Mission Bay', 'Mount Zion'],
   ARRAY['ucsf.edu']),

  ('Salk Institute for Biological Studies',
   'Salk', 'United States', NULL,
   ARRAY['salk.edu']),

  ('The Rockefeller University',
   'Rockefeller', 'United States', NULL,
   ARRAY['rockefeller.edu']),

  ('Cold Spring Harbor Laboratory',
   'CSHL', 'United States', NULL,
   ARRAY['cshl.edu']),

  -- United Kingdom + Europe
  ('The Francis Crick Institute',
   'Crick Institute', 'United Kingdom', NULL,
   ARRAY['crick.ac.uk']),

  ('Wellcome Sanger Institute',
   'Sanger', 'United Kingdom', NULL,
   ARRAY['sanger.ac.uk']),

  ('European Molecular Biology Laboratory',
   'EMBL', 'Multi-national',
   ARRAY['Heidelberg', 'Hinxton (EBI)', 'Grenoble', 'Hamburg', 'Rome', 'Barcelona'],
   ARRAY['embl.de', 'embl.org', 'ebi.ac.uk']),

  ('Karolinska Institutet',
   'Karolinska', 'Sweden', NULL,
   ARRAY['ki.se']),

  ('Max Planck Society',
   'Max Planck', 'Germany',
   ARRAY['Berlin', 'Munich', 'Heidelberg', 'Tübingen', 'Dresden', 'Cologne', 'Freiburg', 'Göttingen'],
   ARRAY['mpg.de', 'tuebingen.mpg.de', 'mpi-cbg.de'])
ON CONFLICT (canonical_name) DO NOTHING;

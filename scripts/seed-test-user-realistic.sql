\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
  ws uuid;
  uid text;
  pkg uuid;
  c record;
  p record;
  i integer;
  task_titles text[];
  task_status text;
  task_priority text;
BEGIN
  SELECT u.id, wm.workspace_id INTO uid, ws
  FROM users u
  JOIN workspace_members wm ON wm.user_id = u.id
  WHERE lower(u.email) = 'test@cubiqlo.com' AND wm.role = 'owner'
  LIMIT 1;

  IF uid IS NULL OR ws IS NULL THEN
    RAISE EXCEPTION 'Target user/workspace not found';
  END IF;

  SELECT id INTO pkg FROM packages
  WHERE workspace_id = ws AND active = true AND hours IS NOT NULL
  ORDER BY CASE WHEN currency='IDR' THEN 0 ELSE 1 END, hours
  LIMIT 1;

  IF pkg IS NULL THEN
    pkg := 'c1000000-0000-4000-8000-000000000001';
    INSERT INTO packages (id, workspace_id, name, hours, price, currency, description, features, badge, sort_order, active)
    VALUES (pkg, ws, 'Retainer Growth 40 Jam', 40, 10000000, 'IDR', 'Paket dukungan desain, konten, dan pengembangan bulanan.', '["40 jam kerja per bulan","Prioritas antrean","Laporan progres mingguan"]', 'PALING POPULER', 20, true)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  CREATE TEMP TABLE seed_clients (
    id uuid, name text, company text, email text, phone text, website text, address text, tags text[]
  ) ON COMMIT DROP;

  INSERT INTO seed_clients VALUES
    ('c1000000-0000-4000-8000-000000000101','Nadia Rahmawati','PT Rasa Pangan Nusantara','nadia@rasapangan.test','0812-9001-2244','https://rasapangan.test','Jl. Cipete Raya No. 18, Jakarta Selatan',ARRAY['fnb','branding','retail']),
    ('c1000000-0000-4000-8000-000000000102','dr. Reza Mahendra','Klinik Sehat Sentosa','reza@kliniksehatsentosa.test','0813-7712-8840','https://kliniksehatsentosa.test','Jl. Taman Sari No. 27, Bandung',ARRAY['healthcare','website','seo']),
    ('c1000000-0000-4000-8000-000000000103','Vina Kusuma','Arunika Living','vina@arunikaliving.test','0811-2290-5678','https://arunikaliving.test','Ruko Emerald Blok B2, Tangerang Selatan',ARRAY['property','campaign','social-media']),
    ('c1000000-0000-4000-8000-000000000104','Farhan Akbar','Akademi Talenta Digital','farhan@talentadigital.test','0857-3301-9902','https://talentadigital.test','Jl. Kaliurang KM 7, Sleman, Yogyakarta',ARRAY['education','product','content']),
    ('c1000000-0000-4000-8000-000000000105','Melati Wibowo','PT Bumi Karya Teknik','melati@bumikaryateknik.test','0821-4488-7031','https://bumikaryateknik.test','Kawasan Industri Jababeka II, Cikarang',ARRAY['manufacturing','b2b','corporate']);

  INSERT INTO clients (id, workspace_id, client_number, name, company_name, email, phone, website, address, status, tags, internal_notes, portal_enabled, created_at, updated_at)
  SELECT id, ws, 'CLI-' || right(id::text, 3), name, company, email, phone, website, address, 'active', tags,
         '[DEMO_TEST_USER_20260726] Klien demo realistis untuk QA workspace Test Cubiqlo.', false, now(), now()
  FROM seed_clients
  ON CONFLICT (id) DO UPDATE SET
    name=excluded.name, company_name=excluded.company_name, email=excluded.email, phone=excluded.phone,
    website=excluded.website, address=excluded.address, tags=excluded.tags, updated_at=now();

  CREATE TEMP TABLE seed_projects (
    id uuid, client_id uuid, name text, description text, status text, billing_type text,
    rate numeric, budget numeric, start_date date, due_date date, client_visible boolean
  ) ON COMMIT DROP;

  INSERT INTO seed_projects VALUES
    ('d1000000-0000-4000-8000-000000000101','c1000000-0000-4000-8000-000000000101','Rebranding Kemasan Produk Retail','Penyegaran identitas dan desain kemasan untuk enam SKU makanan siap saji.','active','project',NULL,48000000,'2026-06-10','2026-09-15',true),
    ('d1000000-0000-4000-8000-000000000102','c1000000-0000-4000-8000-000000000101','Optimasi Landing Page Distributor','Perbaikan conversion copy, struktur landing page, dan integrasi formulir distributor.','active','hours',300000,18000000,'2026-07-01','2026-08-30',true),
    ('d1000000-0000-4000-8000-000000000103','c1000000-0000-4000-8000-000000000101','Konten Retail Bulanan','Produksi materi promosi marketplace dan media sosial selama satu bulan.','active','package',NULL,10000000,'2026-07-01','2026-07-31',true),

    ('d1000000-0000-4000-8000-000000000201','c1000000-0000-4000-8000-000000000102','Website Klinik dan Booking Dokter','Website layanan klinik dengan profil dokter, jadwal praktik, dan booking pasien.','active','project',NULL,72000000,'2026-05-20','2026-10-10',true),
    ('d1000000-0000-4000-8000-000000000202','c1000000-0000-4000-8000-000000000102','SEO Lokal Cabang Bandung','Optimasi halaman lokasi, Google Business Profile, dan artikel kesehatan lokal.','active','hours',350000,21000000,'2026-07-05','2026-10-05',true),
    ('d1000000-0000-4000-8000-000000000203','c1000000-0000-4000-8000-000000000102','Maintenance Digital Klinik','Pemeliharaan website, pembaruan jadwal dokter, dan materi edukasi pasien.','active','package',NULL,10000000,'2026-07-01','2026-07-31',true),

    ('d1000000-0000-4000-8000-000000000301','c1000000-0000-4000-8000-000000000103','Kampanye Launching Cluster Arunika','Kampanye digital untuk peluncuran cluster baru beserta creative ads dan microsite.','active','project',NULL,85000000,'2026-06-15','2026-09-30',true),
    ('d1000000-0000-4000-8000-000000000302','c1000000-0000-4000-8000-000000000103','Produksi Materi Sales Gallery','Desain brosur, signage, dan revisi materi presentasi tim penjualan.','on_hold','hours',325000,16000000,'2026-06-20','2026-08-15',false),
    ('d1000000-0000-4000-8000-000000000303','c1000000-0000-4000-8000-000000000103','Social Media Property Retainer','Konten listing, edukasi KPR, dan laporan performa media sosial bulanan.','active','package',NULL,10000000,'2026-07-01','2026-07-31',true),

    ('d1000000-0000-4000-8000-000000000401','c1000000-0000-4000-8000-000000000104','Learning Management System MVP','Desain dan pengembangan MVP platform kelas daring untuk program intensif.','draft','project',NULL,120000000,'2026-08-01','2026-12-15',false),
    ('d1000000-0000-4000-8000-000000000402','c1000000-0000-4000-8000-000000000104','Audit UX Dashboard Mentor','Riset pengguna dan perbaikan alur kerja mentor pada dashboard pembelajaran.','completed','hours',400000,24000000,'2026-04-01','2026-06-20',true),
    ('d1000000-0000-4000-8000-000000000403','c1000000-0000-4000-8000-000000000104','Konten Kelas dan Campaign','Dukungan desain modul kelas serta kampanye intake peserta baru.','active','package',NULL,10000000,'2026-07-01','2026-07-31',true),

    ('d1000000-0000-4000-8000-000000000501','c1000000-0000-4000-8000-000000000105','Company Profile B2B 2026','Penyusunan company profile bilingual untuk kebutuhan tender dan mitra korporat.','active','project',NULL,38000000,'2026-06-25','2026-08-25',true),
    ('d1000000-0000-4000-8000-000000000502','c1000000-0000-4000-8000-000000000105','Portal Katalog Produk Teknik','Penyempurnaan katalog digital, data spesifikasi, dan pengalaman pencarian produk.','active','hours',375000,30000000,'2026-07-10','2026-10-30',true),
    ('d1000000-0000-4000-8000-000000000503','c1000000-0000-4000-8000-000000000105','Design Support Tim Marketing','Retainer desain presentasi, tender deck, dan materi pameran industri.','active','package',NULL,10000000,'2026-07-01','2026-07-31',false);

  INSERT INTO projects (id, workspace_id, client_id, name, description, status, billing_type, rate, budget, currency, start_date, due_date, client_visible, selected_package_id, created_by, created_at, updated_at)
  SELECT id, ws, client_id, name, description, status, billing_type, rate, budget, 'IDR', start_date, due_date,
         client_visible, CASE WHEN billing_type='package' THEN pkg ELSE NULL END, uid, now(), now()
  FROM seed_projects
  ON CONFLICT (id) DO UPDATE SET
    name=excluded.name, description=excluded.description, status=excluded.status, billing_type=excluded.billing_type,
    rate=excluded.rate, budget=excluded.budget, start_date=excluded.start_date, due_date=excluded.due_date,
    client_visible=excluded.client_visible, selected_package_id=excluded.selected_package_id, updated_at=now();

  INSERT INTO project_members (id, project_id, user_id, created_at)
  SELECT ('e' || substr(md5(sp.id::text || uid),2,31))::uuid, sp.id, uid, now()
  FROM seed_projects sp
  ON CONFLICT (project_id,user_id) DO NOTHING;

  FOR p IN SELECT * FROM seed_projects LOOP
    task_titles := CASE
      WHEN p.billing_type='project' THEN ARRAY['Discovery dan konfirmasi ruang lingkup','Produksi aset utama','Review final dan serah terima']
      WHEN p.billing_type='hours' THEN ARRAY['Audit kebutuhan dan backlog','Eksekusi prioritas minggu ini','Laporan jam dan rekomendasi berikutnya']
      ELSE ARRAY['Susun prioritas retainer bulanan','Produksi batch aset minggu kedua','Kirim laporan progres bulanan']
    END;
    FOR i IN 1..3 LOOP
      task_status := (ARRAY['done','in_progress','todo'])[i];
      task_priority := (ARRAY['medium','high','medium'])[i];
      INSERT INTO tasks (id,workspace_id,project_id,title,description,status,priority,assignee_id,due_date,position,client_visible,created_by,created_at,updated_at)
      VALUES (
        ('f' || substr(md5(p.id::text || ':' || i::text),2,31))::uuid, ws, p.id, task_titles[i],
        '[DEMO_TEST_USER_20260726] Task realistis untuk ' || p.name, task_status, task_priority, uid,
        p.start_date + (i * 14), i * 1000, p.client_visible, uid, now(), now()
      )
      ON CONFLICT (id) DO UPDATE SET title=excluded.title,status=excluded.status,priority=excluded.priority,due_date=excluded.due_date,updated_at=now();
    END LOOP;
  END LOOP;
END $$;

COMMIT;

SELECT 'clients_seeded' metric, count(*)::text value FROM clients WHERE internal_notes LIKE '[DEMO_TEST_USER_20260726]%'
UNION ALL
SELECT 'projects_seeded', count(*)::text FROM projects WHERE id::text LIKE 'd1000000-%'
UNION ALL
SELECT 'tasks_seeded', count(*)::text FROM tasks WHERE description LIKE '[DEMO_TEST_USER_20260726]%';

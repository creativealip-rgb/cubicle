-- Comprehensive seed data for Cubiqlo
-- Workspace: e89a10c2-74e0-405e-8395-ab023cafbac3
-- User: ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz
-- Clients: Mr. Okki (bfab3dba), PT Maju Bersama (80311cb8), Mimi Amilia (208c64f1)
-- Projects: VA ODM-12Hrs (f95c38b0), Website Redesign (8f1b3f65), Letter Numbering (a6ea6915)

BEGIN;

-- ============================================================
-- 1. EXPENSE CATEGORIES
-- ============================================================
INSERT INTO expense_categories (id, workspace_id, name, color, icon, is_default, created_at) VALUES
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'Software & Tools', '#6647F0', 'laptop', true, now() - interval '60 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'Transport', '#0091FF', 'car', false, now() - interval '60 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'Makan & Minum', '#ED5F00', 'coffee', false, now() - interval '60 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'Marketing', '#10B981', 'megaphone', false, now() - interval '60 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'Office & Supplies', '#F59E0B', 'package', false, now() - interval '60 days');

-- ============================================================
-- 2. INVOICES (various statuses)
-- ============================================================
-- INV-2026-001: PAID (Mr. Okki, VA work, IDR)
INSERT INTO invoices (id, workspace_id, client_id, invoice_number, issue_date, due_date, currency, subtotal, discount, tax, total, status, notes, terms, created_at, updated_at) VALUES
  ('a1000001-0000-0000-0000-000000000001', 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'bfab3dba-8803-4d99-9dcf-9ed33d75e6f5',
   'INV-2026-001', '2026-06-01', '2026-06-15', 'IDR', 6500000, 0, 715000, 7215000, 'paid',
   'Terima kasih atas kepercayaannya.', 'Pembayaran via transfer bank BCA.', now() - interval '35 days', now() - interval '20 days');

-- INV-2026-002: PAID (PT Maju Bersama, Website Phase 1, IDR)
INSERT INTO invoices (id, workspace_id, client_id, invoice_number, issue_date, due_date, currency, subtotal, discount, tax, total, status, notes, terms, created_at, updated_at) VALUES
  ('a1000001-0000-0000-0000-000000000002', 'e89a10c2-74e0-405e-8395-ab023cafbac3', '80311cb8-b22a-4542-b85a-bf110c2477dd',
   'INV-2026-002', '2026-06-10', '2026-06-25', 'IDR', 15000000, 750000, 1575000, 15825000, 'paid',
   'Down payment 50% sudah diterima. Ini invoice pelunasan.', 'Transfer ke BCA a/n Test User.', now() - interval '27 days', now() - interval '18 days');

-- INV-2026-003: SENT (Mr. Okki, VA July, USD)
INSERT INTO invoices (id, workspace_id, client_id, invoice_number, issue_date, due_date, currency, subtotal, discount, tax, total, status, notes, terms, created_at, updated_at) VALUES
  ('a1000001-0000-0000-0000-000000000003', 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'bfab3dba-8803-4d99-9dcf-9ed33d75e6f5',
   'INV-2026-003', '2026-07-01', '2026-07-15', 'USD', 520, 0, 0, 520, 'sent',
   'Invoice untuk VA service Juli 2026. 8 jam x $65/jam.', 'Payment via Wise/PayPal within 14 days.', now() - interval '6 days', now() - interval '5 days');

-- INV-2026-004: OVERDUE (Mimi, Design, IDR)
INSERT INTO invoices (id, workspace_id, client_id, invoice_number, issue_date, due_date, currency, subtotal, discount, tax, total, status, notes, terms, created_at, updated_at) VALUES
  ('a1000001-0000-0000-0000-000000000004', 'e89a10c2-74e0-405e-8395-ab023cafbac3', '208c64f1-7510-4c0f-82b5-da1f406a9ae0',
   'INV-2026-004', '2026-05-20', '2026-06-05', 'IDR', 3500000, 0, 385000, 3885000, 'overdue',
   'Mohon segera diproses ya Mimi 🙏', 'Transfer BCA/Mandiri.', now() - interval '48 days', now() - interval '10 days');

-- INV-2026-005: DRAFT (PT Maju Bersama, Website Phase 2, IDR)
INSERT INTO invoices (id, workspace_id, client_id, invoice_number, issue_date, due_date, currency, subtotal, discount, tax, total, status, notes, terms, created_at, updated_at) VALUES
  ('a1000001-0000-0000-0000-000000000005', 'e89a10c2-74e0-405e-8395-ab023cafbac3', '80311cb8-b22a-4542-b85a-bf110c2477dd',
   'INV-2026-005', '2026-07-05', '2026-07-20', 'IDR', 22000000, 0, 2420000, 24420000, 'draft',
   'Invoice untuk fase 2: e-commerce integration + SEO.', 'DP 30%, pelunasan sebelum go-live.', now() - interval '2 days', now() - interval '2 days');

-- INV-2026-006: VIEWED (Mr. Okki, Consulting, USD)
INSERT INTO invoices (id, workspace_id, client_id, invoice_number, issue_date, due_date, currency, subtotal, discount, tax, total, status, notes, terms, created_at, updated_at) VALUES
  ('a1000001-0000-0000-0000-000000000006', 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'bfab3dba-8803-4d99-9dcf-9ed33d75e6f5',
   'INV-2026-006', '2026-06-15', '2026-06-30', 'USD', 1300, 100, 0, 1200, 'viewed',
   'Konsultasi strategy session + deliverable report.', 'Net 15, Wise preferred.', now() - interval '22 days', now() - interval '12 days');

-- ============================================================
-- 3. INVOICE ITEMS
-- ============================================================
-- INV-001 items (VA work)
INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount, created_at) VALUES
  (gen_random_uuid(), 'a1000001-0000-0000-0000-000000000001', 'VA Service - Data Entry & Research (50 jam)', 50, 85000, 4250000, now() - interval '35 days'),
  (gen_random_uuid(), 'a1000001-0000-0000-0000-000000000001', 'VA Service - Email Management (25 jam)', 25, 90000, 2250000, now() - interval '35 days');

-- INV-002 items (Website Phase 1)
INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount, created_at) VALUES
  (gen_random_uuid(), 'a1000001-0000-0000-0000-000000000002', 'Website Design & Development - Landing Page', 1, 8000000, 8000000, now() - interval '27 days'),
  (gen_random_uuid(), 'a1000001-0000-0000-0000-000000000002', 'CMS Integration & Admin Dashboard', 1, 5000000, 5000000, now() - interval '27 days'),
  (gen_random_uuid(), 'a1000001-0000-0000-0000-000000000002', 'Responsive Design (Mobile + Tablet)', 1, 2000000, 2000000, now() - interval '27 days');

-- INV-003 items (VA July)
INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount, created_at) VALUES
  (gen_random_uuid(), 'a1000001-0000-0000-0000-000000000003', 'Virtual Assistant - Administrative Support', 5, 65, 325, now() - interval '6 days'),
  (gen_random_uuid(), 'a1000001-0000-0000-0000-000000000003', 'Virtual Assistant - Research & Reporting', 3, 65, 195, now() - interval '6 days');

-- INV-004 items (Design for Mimi)
INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount, created_at) VALUES
  (gen_random_uuid(), 'a1000001-0000-0000-0000-000000000004', 'Logo Design - 3 Konsep + Revisi', 1, 2000000, 2000000, now() - interval '48 days'),
  (gen_random_uuid(), 'a1000001-0000-0000-0000-000000000004', 'Business Card Design', 1, 500000, 500000, now() - interval '48 days'),
  (gen_random_uuid(), 'a1000001-0000-0000-0000-000000000004', 'Social Media Kit (IG, TikTok, WhatsApp)', 1, 1000000, 1000000, now() - interval '48 days');

-- INV-005 items (Website Phase 2)
INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount, created_at) VALUES
  (gen_random_uuid(), 'a1000001-0000-0000-0000-000000000005', 'E-commerce Integration (Product, Cart, Checkout)', 1, 12000000, 12000000, now() - interval '2 days'),
  (gen_random_uuid(), 'a1000001-0000-0000-0000-000000000005', 'SEO Optimization (On-page + Technical)', 1, 5000000, 5000000, now() - interval '2 days'),
  (gen_random_uuid(), 'a1000001-0000-0000-0000-000000000005', 'Payment Gateway Integration (Midtrans)', 1, 3000000, 3000000, now() - interval '2 days'),
  (gen_random_uuid(), 'a1000001-0000-0000-0000-000000000005', 'Performance Optimization & Testing', 1, 2000000, 2000000, now() - interval '2 days');

-- INV-006 items (Consulting)
INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount, created_at) VALUES
  (gen_random_uuid(), 'a1000001-0000-0000-0000-000000000006', 'Strategy Consulting Session (2 jam)', 2, 250, 500, now() - interval '22 days'),
  (gen_random_uuid(), 'a1000001-0000-0000-0000-000000000006', 'Market Research & Competitive Analysis Report', 1, 400, 400, now() - interval '22 days'),
  (gen_random_uuid(), 'a1000001-0000-0000-0000-000000000006', 'Action Plan & Recommendation Document', 1, 400, 400, now() - interval '22 days');

-- ============================================================
-- 4. PAYMENTS (for paid invoices)
-- ============================================================
INSERT INTO payments (id, invoice_id, amount, paid_at, method, notes, created_at) VALUES
  (gen_random_uuid(), 'a1000001-0000-0000-0000-000000000001', 7215000, '2026-06-12', 'BCA Transfer', 'Pembayaran penuh dari Mr. Okki', now() - interval '25 days'),
  (gen_random_uuid(), 'a1000001-0000-0000-0000-000000000002', 7912500, '2026-06-18', 'BCA Transfer', 'DP 50% dari PT Maju Bersama', now() - interval '20 days'),
  (gen_random_uuid(), 'a1000001-0000-0000-0000-000000000002', 7912500, '2026-06-22', 'BCA Transfer', 'Pelunasan dari PT Maju Bersama', now() - interval '18 days');

-- ============================================================
-- 5. EXPENSES
-- ============================================================
-- Get category IDs
DO $$
DECLARE
  cat_software uuid;
  cat_transport uuid;
  cat_food uuid;
  cat_marketing uuid;
  cat_office uuid;
BEGIN
  SELECT id INTO cat_software FROM expense_categories WHERE name = 'Software & Tools' LIMIT 1;
  SELECT id INTO cat_transport FROM expense_categories WHERE name = 'Transport' LIMIT 1;
  SELECT id INTO cat_food FROM expense_categories WHERE name = 'Makan & Minum' LIMIT 1;
  SELECT id INTO cat_marketing FROM expense_categories WHERE name = 'Marketing' LIMIT 1;
  SELECT id INTO cat_office FROM expense_categories WHERE name = 'Office & Supplies' LIMIT 1;

  INSERT INTO expenses (id, workspace_id, category_id, project_id, client_id, amount, currency, date, description, vendor, tax_included, created_by, created_at) VALUES
    (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', cat_software, NULL, NULL, 250000, 'IDR', '2026-06-01', 'Canva Pro bulanan', 'Canva', false, 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', now() - interval '36 days'),
    (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', cat_software, NULL, NULL, 180000, 'IDR', '2026-06-01', 'Notion Team plan', 'Notion', false, 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', now() - interval '36 days'),
    (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', cat_software, NULL, NULL, 350000, 'IDR', '2026-06-15', 'Figma Professional', 'Figma', false, 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', now() - interval '22 days'),
    (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', cat_transport, '8f1b3f65-bc86-4e80-bb62-17f73ad32c49', '80311cb8-b22a-4542-b85a-bf110c2477dd', 125000, 'IDR', '2026-06-10', 'Grab ke kantor PT Maju Bersama - kickoff meeting', 'Grab', false, 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', now() - interval '27 days'),
    (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', cat_food, '8f1b3f65-bc86-4e80-bb62-17f73ad32c49', '80311cb8-b22a-4542-b85a-bf110c2477dd', 85000, 'IDR', '2026-06-10', 'Makan siang meeting dengan client', 'GoFood', false, 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', now() - interval '27 days'),
    (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', cat_marketing, NULL, NULL, 500000, 'IDR', '2026-06-20', 'Instagram Ads - portofolio', 'Meta Ads', false, 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', now() - interval '17 days'),
    (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', cat_office, NULL, NULL, 75000, 'IDR', '2026-06-25', 'Kertas HVS + tinta printer', 'Tokopedia', false, 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', now() - interval '12 days'),
    (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', cat_software, NULL, NULL, 500000, 'IDR', '2026-07-01', 'VPS Hosting bulanan (DigitalOcean)', 'DigitalOcean', false, 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', now() - interval '6 days'),
    (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', cat_software, NULL, NULL, 200000, 'IDR', '2026-07-01', 'Domain renewal (nggawe.web.id)', 'Cloudflare', false, 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', now() - interval '6 days'),
    (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', cat_transport, 'f95c38b0-97fb-4883-a2e2-2f56d420565a', 'bfab3dba-8803-4d99-9dcf-9ed33d75e6f5', 95000, 'IDR', '2026-07-03', 'Gojek ke coworking space - client meeting', 'Gojek', false, 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', now() - interval '4 days');
END $$;

-- ============================================================
-- 6. CONTRACTS
-- ============================================================
INSERT INTO contracts (id, workspace_id, client_id, project_id, title, body, variables, valid_until, status, created_by, created_at, updated_at) VALUES
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'bfab3dba-8803-4d99-9dcf-9ed33d75e6f5', 'f95c38b0-97fb-4883-a2e2-2f56d420565a',
   'Kontrak Virtual Assistant - Mr. Okki',
   'Dengan ini disepakati bahwa pihak pertama (Provider) akan menyediakan jasa Virtual Assistant kepada pihak kedua (Client) dengan ketentuan berikut:\n\n1. Lingkup Pekerjaan: Data entry, email management, riset, dan tugas administratif lainnya.\n2. Durasi: 3 bulan (1 Juni - 31 Agustus 2026)\n3. Jam Kerja: Maksimal 48 jam/bulan\n4. Rate: $65/jam (USD)\n5. Pembayaran: Invoice dikirim awal bulan, jatuh tempo 15 hari.\n\nKedua belah pihak setuju untuk menjalankan kontrak ini dengan itikad baik.',
   '{"client_name": "Mr. Okki Soebagio", "provider_name": "Test User", "rate": "$65/hour", "start_date": "2026-06-01", "end_date": "2026-08-31"}', '2026-08-31', 'signed', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', now() - interval '40 days', now() - interval '35 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', '80311cb8-b22a-4542-b85a-bf110c2477dd', '8f1b3f65-bc86-4e80-bb62-17f73ad32c49',
   'Kontrak Website Redesign - PT Maju Bersama',
   'Kontrak jasa redesign website untuk PT Maju Bersama dengan ketentuan:\n\n1. Lingkup: Redesign landing page, CMS integration, responsive design, e-commerce integration, SEO optimization.\n2. Timeline: Fase 1 (1-30 Juni 2026), Fase 2 (1-31 Juli 2026)\n3. Total Budget: Rp 39.250.000 (setelah diskon)\n4. Pembayaran: DP 50% di awal, pelunasan sebelum go-live.\n5. Revisi: Maksimal 3x revisi per fase.\n\nKontrak ini berlaku sampai project selesai.',
   '{"client_name": "PT Maju Bersama", "provider_name": "Test User", "budget": "Rp 39.250.000", "phase1_deadline": "2026-06-30", "phase2_deadline": "2026-07-31"}', '2026-07-31', 'signed', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', now() - interval '42 days', now() - interval '38 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', '208c64f1-7510-4c0f-82b5-da1f406a9ae0', NULL,
   'Kontrak Desain Grafis - Mimi Amilia',
   'Perjanjian jasa desain grafis:\n\n1. Lingkup: Logo design, business card, social media kit.\n2. Harga: Rp 3.500.000 (termasuk PPN)\n3. Timeline: 14 hari kerja dari brief diterima.\n4. Revisi: 2x revisi per asset.\n5. File delivery: AI, PNG, JPG, PDF.\n\nPembayaran 100% di muka.',
   '{"client_name": "Mimi Amilia", "provider_name": "Test User", "price": "Rp 3.500.000", "delivery_days": "14"}', '2026-07-31', 'sent', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', now() - interval '50 days', now() - interval '30 days');

-- ============================================================
-- 7. PROPOSALS
-- ============================================================
INSERT INTO proposals (id, workspace_id, client_id, project_id, title, body, line_items, subtotal, tax, total, currency, down_payment_percent, valid_until, status, created_by, created_at, updated_at) VALUES
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', '80311cb8-b22a-4542-b85a-bf110c2477dd', '8f1b3f65-bc86-4e80-bb62-17f73ad32c49',
   'Proposal Website Redesign - PT Maju Bersama',
   'Halo PT Maju Bersama,\n\nBerikut proposal untuk redesign website perusahaan Anda. Kami menawarkan solusi lengkap mulai dari desain modern, CMS yang mudah di manage, sampai e-commerce integration.\n\nKeunggulan kami:\n- Desain responsive dan modern\n- SEO-friendly dari awal\n- Maintenance support 3 bulan pasca-launch\n\nSilakan review dan jangan ragu untuk bertanya.',
   '[{"description": "Landing Page Design & Development", "quantity": 1, "unit_price": 8000000, "amount": 8000000}, {"description": "CMS Integration & Admin Dashboard", "quantity": 1, "unit_price": 5000000, "amount": 5000000}, {"description": "Responsive Design (Mobile + Tablet)", "quantity": 1, "unit_price": 2000000, "amount": 2000000}, {"description": "E-commerce Integration", "quantity": 1, "unit_price": 12000000, "amount": 12000000}, {"description": "SEO Optimization", "quantity": 1, "unit_price": 5000000, "amount": 5000000}, {"description": "Payment Gateway Integration", "quantity": 1, "unit_price": 3000000, "amount": 3000000}, {"description": "Testing & Optimization", "quantity": 1, "unit_price": 2000000, "amount": 2000000}]'::jsonb,
   37000000, 4070000, 41070000, 'IDR', 30, '2026-06-15', 'accepted', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', now() - interval '50 days', now() - interval '42 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', '208c64f1-7510-4c0f-82b5-da1f406a9ae0', NULL,
   'Proposal Brand Identity - Mimi Amilia',
   'Hi Mimi,\n\nBerikut proposal untuk brand identity package. Kami bantu dari logo sampai social media kit supaya brand kamu konsisten di semua platform.',
   '[{"description": "Logo Design (3 concepts + revision)", "quantity": 1, "unit_price": 2000000, "amount": 2000000}, {"description": "Business Card Design", "quantity": 1, "unit_price": 500000, "amount": 500000}, {"description": "Social Media Kit", "quantity": 1, "unit_price": 1000000, "amount": 1000000}]'::jsonb,
   3500000, 385000, 3885000, 'IDR', 50, '2026-06-01', 'accepted', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', now() - interval '55 days', now() - interval '50 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', '91b30d0a-4776-43ca-96ed-35decbe96a62', NULL,
   'Proposal Mobile App Development',
   'Proposal pengembangan mobile app untuk manajemen inventory.\n\nTech stack: React Native + Firebase\nTimeline: 3 bulan\n\nDetail fitur ada di lampiran.',
   '[{"description": "UI/UX Design", "quantity": 1, "unit_price": 15000000, "amount": 15000000}, {"description": "Frontend Development (React Native)", "quantity": 1, "unit_price": 25000000, "amount": 25000000}, {"description": "Backend API & Firebase Setup", "quantity": 1, "unit_price": 10000000, "amount": 10000000}, {"description": "Testing & Deployment", "quantity": 1, "unit_price": 5000000, "amount": 5000000}]'::jsonb,
   55000000, 6050000, 61050000, 'IDR', 25, '2026-08-01', 'sent', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', now() - interval '5 days', now() - interval '3 days');

-- ============================================================
-- 8. QUESTIONNAIRES (Client Brief Forms)
-- ============================================================
INSERT INTO questionnaires (id, workspace_id, name, description, schema, created_by, created_at, updated_at) VALUES
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3',
   'Website Brief Form',
   'Formulir brief untuk project website. Dikirim ke client sebelum kickoff.',
   '{"fields": [{"label": "Nama Perusahaan", "type": "text", "required": true}, {"label": "Industri", "type": "text", "required": true}, {"label": "Tujuan Website", "type": "textarea", "required": true}, {"label": "Target Audience", "type": "textarea", "required": true}, {"label": "Warna Brand", "type": "text", "required": false}, {"label": "Website Referensi (URL)", "type": "text", "required": false}, {"label": "Fitur Wajib", "type": "textarea", "required": true}, {"label": "Deadline", "type": "date", "required": true}, {"label": "Budget Range", "type": "select", "options": ["< 10 juta", "10-25 juta", "25-50 juta", "> 50 juta"], "required": true}]}'::jsonb,
   'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', now() - interval '45 days', now() - interval '30 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3',
   'Design Brief Form',
   'Formulir brief untuk project desain grafis.',
   '{"fields": [{"label": "Nama Brand", "type": "text", "required": true}, {"label": "Jenis Desain", "type": "select", "options": ["Logo", "Brand Identity", "Packaging", "Social Media", "Lainnya"], "required": true}, {"label": "Deskripsi Brand", "type": "textarea", "required": true}, {"label": "Warna yang Diinginkan", "type": "text", "required": false}, {"label": "Warna yang Dihindari", "type": "text", "required": false}, {"label": "Referensi Desain", "type": "textarea", "required": false}, {"label": "File Format yang Dibutuhkan", "type": "select", "options": ["PNG + JPG", "PNG + JPG + AI", "PNG + JPG + AI + PDF", "Custom"], "required": true}]}'::jsonb,
   'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', now() - interval '45 days', now() - interval '30 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3',
   'Client Onboarding Form',
   'Formulir onboarding untuk client baru. WAJIB diisi sebelum project dimulai.',
   '{"fields": [{"label": "Nama Lengkap", "type": "text", "required": true}, {"label": "Nama Perusahaan", "type": "text", "required": false}, {"label": "Email", "type": "email", "required": true}, {"label": "No. WhatsApp", "type": "text", "required": true}, {"label": "Jenis Bisnis", "type": "text", "required": true}, {"label": "Layanan yang Dibutuhkan", "type": "textarea", "required": true}, {"label": "Budget Range", "type": "select", "options": ["< 5 juta", "5-15 juta", "15-30 juta", "> 30 juta"], "required": true}, {"label": "Timeline", "type": "text", "required": true}]}'::jsonb,
   'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', now() - interval '60 days', now() - interval '30 days');

-- ============================================================
-- 9. SUPPORT TICKETS
-- ============================================================
INSERT INTO support_tickets (id, workspace_id, title, description, status, priority, assignee_id, client_id, project_id, created_by, created_at, updated_at) VALUES
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3',
   'Website loading lambat di mobile',
   'Client report website loading > 5 detik di mobile. Perlu optimize images dan lazy loading.',
   'open', 'high', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', '80311cb8-b22a-4542-b85a-bf110c2477dd', '8f1b3f65-bc86-4e80-bb62-17f73ad32c49',
   'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', now() - interval '3 days', now() - interval '3 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3',
   'Email tidak masuk ke inbox client',
   'Mr. Okki bilang invoice email masuk spam. Perlu check SPF/DKIM records.',
   'in_progress', 'medium', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', 'bfab3dba-8803-4d99-9dcf-9ed33d75e6f5', NULL,
   'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', now() - interval '5 days', now() - interval '2 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3',
   'Request revisi logo warna secondary',
   'Mimi minta ganti warna secondary logo dari biru ke hijau tosca.',
   'resolved', 'low', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', '208c64f1-7510-4c0f-82b5-da1f406a9ae0', NULL,
   'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', now() - interval '15 days', now() - interval '12 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3',
   'Client minta tambah halaman FAQ',
   'PT Maju Bersama request tambah FAQ page di website. Sudah di-handle di fase 2.',
   'closed', 'low', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', '80311cb8-b22a-4542-b85a-bf110c2477dd', '8f1b3f65-bc86-4e80-bb62-17f73ad32c49',
   'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', now() - interval '20 days', now() - interval '14 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3',
   'Setup payment gateway Midtrans',
   'Perlu setup Midtrans Snap untuk checkout di website PT Maju Bersama. Waiting client kirim credential.',
   'open', 'high', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', '80311cb8-b22a-4542-b85a-bf110c2477dd', '8f1b3f65-bc86-4e80-bb62-17f73ad32c49',
   'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', now() - interval '1 day', now() - interval '1 day');

-- ============================================================
-- 10. APPOINTMENTS (Calendar Events)
-- ============================================================
INSERT INTO appointments (id, workspace_id, client_id, user_id, title, notes, attendee_name, attendee_email, start_time, end_time, status, created_at) VALUES
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', '80311cb8-b22a-4542-b85a-bf110c2477dd', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz',
   'Kickoff Meeting - Website Phase 2',
   'Bahasa scope e-commerce integration, timeline, dan deliverables fase 2.',
   'Budi Santoso', 'budi@majubersama.co.id',
   now() + interval '2 days' + time '10:00', now() + interval '2 days' + time '11:30', 'confirmed', now() - interval '3 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'bfab3dba-8803-4d99-9dcf-9ed33d75e6f5', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz',
   'Weekly Check-in - VA ODM',
   'Review mingguan: task completed, blockers, planning minggu depan.',
   'Mr. Okki Soebagio', 'okki@odmconsulting.com',
   now() + interval '3 days' + time '14:00', now() + interval '3 days' + time '14:30', 'confirmed', now() - interval '1 day'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', '208c64f1-7510-4c0f-82b5-da1f406a9ae0', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz',
   'Presentasi Logo Final - Mimi',
   'Presentasi 3 konsep logo final. Minta feedback langsung.',
   'Mimi Amilia', 'mimi.amilia@gmail.com',
   now() + interval '5 days' + time '15:00', now() + interval '5 days' + time '16:00', 'pending', now() - interval '2 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', NULL, 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz',
   'Focus Time - Design Sprint',
   'Block waktu untuk fokus design work. Jangan schedule meeting di slot ini.',
   NULL, NULL,
   now() + interval '1 day' + time '09:00', now() + interval '1 day' + time '12:00', 'confirmed', now() - interval '1 day'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', '91b30d0a-4776-43ca-96ed-35decbe96a62', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz',
   'Sales Call - Mobile App Project',
   'Follow up proposal mobile app. Bahasa timeline dan budget.',
   'Prospect Client', 'info@trst.com',
   now() + interval '7 days' + time '11:00', now() + interval '7 days' + time '12:00', 'pending', now() - interval '1 day'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', NULL, 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz',
   'Invoice Review & Follow-up',
   'Review semua outstanding invoices. Follow up yang overdue.',
   NULL, NULL,
   now() + interval '1 day' + time '16:00', now() + interval '1 day' + time '17:00', 'confirmed', now() - interval '1 day');

-- ============================================================
-- 11. FOLDERS (File Organization)
-- ============================================================
INSERT INTO folders (id, workspace_id, client_id, project_id, parent_id, name, created_at) VALUES
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', '80311cb8-b22a-4542-b85a-bf110c2477dd', '8f1b3f65-bc86-4e80-bb62-17f73ad32c49', NULL, 'Design Assets', now() - interval '30 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', '80311cb8-b22a-4542-b85a-bf110c2477dd', '8f1b3f65-bc86-4e80-bb62-17f73ad32c49', NULL, 'Contracts & Docs', now() - interval '30 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', '80311cb8-b22a-4542-b85a-bf110c2477dd', '8f1b3f65-bc86-4e80-bb62-17f73ad32c49', NULL, 'Deliverables', now() - interval '30 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'bfab3dba-8803-4d99-9dcf-9ed33d75e6f5', 'f95c38b0-97fb-4883-a2e2-2f56d420565a', NULL, 'Reports', now() - interval '35 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'bfab3dba-8803-4d99-9dcf-9ed33d75e6f5', 'f95c38b0-97fb-4883-a2e2-2f56d420565a', NULL, 'Timesheets', now() - interval '35 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', '208c64f1-7510-4c0f-82b5-da1f406a9ae0', NULL, NULL, 'Brand Assets - Mimi', now() - interval '48 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', NULL, NULL, NULL, 'Templates', now() - interval '60 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', NULL, NULL, NULL, 'Invoices Archive', now() - interval '60 days');

-- ============================================================
-- 12. COMMENTS (on projects & tasks)
-- ============================================================
-- Get a task ID to comment on
DO $$
DECLARE
  task1_id uuid;
  task2_id uuid;
  proj1_id uuid := '8f1b3f65-bc86-4e80-bb62-17f73ad32c49';
  proj2_id uuid := 'f95c38b0-97fb-4883-a2e2-2f56d420565a';
BEGIN
  SELECT id INTO task1_id FROM tasks WHERE project_id = proj1_id LIMIT 1;
  SELECT id INTO task2_id FROM tasks WHERE project_id = proj2_id LIMIT 1;

  -- Project comments
  INSERT INTO comments (id, workspace_id, entity_type, entity_id, author_id, body, created_at) VALUES
    (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'project', proj1_id, 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz',
     'Kickoff meeting selesai. Client mau warna primary biru navy, accent gold. Font pakai Inter + Playfair Display.', now() - interval '28 days'),
    (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'project', proj1_id, 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz',
     'Fase 1 delivered. Client approve, minor revisi: padding hero section kurang besar di mobile.', now() - interval '18 days'),
    (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'project', proj2_id, 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz',
     'VA hours bulan ini: 42 jam. Mr. Okki minta tambah research task untuk competitor analysis.', now() - interval '5 days');

  -- Task comments
  IF task1_id IS NOT NULL THEN
    INSERT INTO comments (id, workspace_id, entity_type, entity_id, author_id, body, created_at) VALUES
      (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'task', task1_id, 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz',
       'Design mockup sudah selesai. Waiting feedback dari client.', now() - interval '10 days');
  END IF;

  IF task2_id IS NOT NULL THEN
    INSERT INTO comments (id, workspace_id, entity_type, entity_id, author_id, body, created_at) VALUES
      (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'task', task2_id, 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz',
       'Data entry batch 3 selesai. Total 850 entries hari ini.', now() - interval '3 days');
  END IF;
END $$;

-- ============================================================
-- 13. PERSONAL NOTES (reminders & recurring)
-- ============================================================
INSERT INTO personal_notes (id, workspace_id, user_id, title, body, status, pinned, due_date, recurrence_rule, notify_7d, notify_3d, notify_1d, created_at, updated_at) VALUES
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz',
   'Bayar hosting VPS',
   'Bayar DigitalOcean droplet $5/bulan. Auto-charge tapi cek kalau ada issue payment.',
   'active', true, now() + interval '25 days', 'monthly', true, true, true, now() - interval '5 days', now() - interval '5 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz',
   'Follow up invoice Mimi (OVERDUE)',
   'Invoice INV-2026-004 sudah overdue. Hubungi Mimi untuk konfirmasi pembayaran.',
   'active', true, now() + interval '2 days', 'none', false, false, true, now() - interval '10 days', now() - interval '10 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz',
   'Prep meeting Phase 2 PT Maju Bersama',
   'Siapkan: wireframe e-commerce, sitemap update, tech stack proposal untuk Midtrans integration.',
   'active', false, now() + interval '1 day', 'none', false, false, true, now() - interval '3 days', now() - interval '3 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz',
   'Update portofolio website',
   'Tambahin project PT Maju Bersama dan Mimi ke portofolio. Screenshot + brief description.',
   'active', false, now() + interval '14 days', 'none', true, false, false, now() - interval '7 days', now() - interval '7 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz',
   'Weekly invoice review',
   'Setiap Senin pagi: review outstanding invoices, follow up yang belum bayar, draft invoice baru.',
   'active', true, now() + interval '5 days', 'weekly', false, false, true, now() - interval '14 days', now() - interval '7 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz',
   'Proposal follow-up - Mobile App',
   'Sudah kirim proposal ke TRST Deep QA. Follow up kalau belum respond dalam 5 hari kerja.',
   'active', false, now() + interval '4 days', 'none', false, false, true, now() - interval '3 days', now() - interval '3 days');

-- ============================================================
-- 14. ACTIVITY LOG (recent activities)
-- ============================================================
INSERT INTO activity_logs (id, workspace_id, actor_id, entity_type, entity_id, action, metadata, created_at) VALUES
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', 'invoice', 'a1000001-0000-0000-0000-000000000003', 'created', '{"invoice_number": "INV-2026-003"}', now() - interval '6 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', 'invoice', 'a1000001-0000-0000-0000-000000000003', 'sent', '{"invoice_number": "INV-2026-003"}', now() - interval '5 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', 'proposal', NULL, 'created', '{"title": "Proposal Mobile App"}', now() - interval '5 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', 'support_ticket', NULL, 'created', '{"title": "Website loading lambat"}', now() - interval '3 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', 'expense', NULL, 'created', '{"description": "VPS Hosting"}', now() - interval '6 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', 'payment', NULL, 'recorded', '{"amount": 7912500, "invoice": "INV-2026-002"}', now() - interval '18 days'),
  (gen_random_uuid(), 'e89a10c2-74e0-405e-8395-ab023cafbac3', 'ycPGDVqPtcXKZhbxZV1TaPaMQoDMycMz', 'contract', NULL, 'signed', '{"title": "Kontrak Website Redesign"}', now() - interval '38 days');

-- Update invoice counter
UPDATE workspace_invoice_counters SET next_number = 7 WHERE workspace_id = 'e89a10c2-74e0-405e-8395-ab023cafbac3';

COMMIT;

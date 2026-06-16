-- P1.3 demo polish — bulk seed
SET client_min_messages = WARNING;

-- Variables (set via psql -v)
-- WS, OWNER, MEMBER, p_web, p_brand, p_ig, p_seo, c_kopi, c_klinik, c_awan

-- 1. Files (mix of deliverable/client-visible + working_file/internal)
INSERT INTO files (workspace_id, project_id, client_id, name, storage_key, mime_type, size_bytes, visibility, uploaded_by, file_type) VALUES
  (:'WS', :'p_web',   :'c_klinik', 'Homepage-Wireframe-v2.pdf',  'seed/web/Homepage-Wireframe-v2.pdf',    'application/pdf', 482104,  'client',   :'MEMBER', 'deliverable'),
  (:'WS', :'p_web',   :'c_klinik', 'Component-Library.fig',      'seed/web/Component-Library.fig',        'application/octet-stream', 2104887, 'internal', :'MEMBER', 'working_file'),
  (:'WS', :'p_brand', :'c_kopi',   'Logo-Exploration-Round-2.pdf','seed/brand/Logo-Exploration-Round-2.pdf','application/pdf', 1842004, 'client',   :'OWNER',  'deliverable'),
  (:'WS', :'p_brand', :'c_kopi',   'Color-Palette-Source.ai',    'seed/brand/Color-Palette-Source.ai',    'application/postscript', 624812, 'internal', :'OWNER',  'working_file'),
  (:'WS', :'p_ig',    :'c_kopi',   'IG-Feed-Caption-Draft.docx', 'seed/ig/IG-Feed-Caption-Draft.docx',     'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 28104, 'client', :'OWNER', 'deliverable'),
  (:'WS', :'p_ig',    :'c_kopi',   'Storyboard-Final.pdf',       'seed/ig/Storyboard-Final.pdf',           'application/pdf', 988402,  'client',   :'OWNER',  'deliverable'),
  (:'WS', :'p_seo',   :'c_klinik', 'Monthly-Report-May-2026.pdf','seed/seo/Monthly-Report-May-2026.pdf',  'application/pdf', 612048,  'client',   :'OWNER',  'deliverable'),
  (:'WS', :'p_seo',   :'c_klinik', 'Keyword-Research-Raw.csv',   'seed/seo/Keyword-Research-Raw.csv',      'text/csv', 84104,         'internal', :'OWNER',  'working_file');

-- 2. Clean up the 0-minute stub + Jan 2027 test appointment
DELETE FROM time_entries WHERE description = 'Revisi template #3' AND duration_minutes = 0;
DELETE FROM appointments WHERE start_time > '2026-12-31';

-- 3. Add 3 more realistic time entries
WITH t AS (SELECT id, title FROM tasks)
INSERT INTO time_entries (workspace_id, task_id, user_id, description, duration_minutes, billable)
SELECT :'WS', t.id, :'MEMBER', 'Implement hero section + responsive nav', 240, true
FROM t WHERE t.title = 'Frontend development' LIMIT 1;
WITH t AS (SELECT id, title FROM tasks)
INSERT INTO time_entries (workspace_id, task_id, user_id, description, duration_minutes, billable)
SELECT :'WS', t.id, :'OWNER', 'Stakeholder review + iteration pass', 90, false
FROM t WHERE t.title = 'Wireframe homepage' LIMIT 1;
INSERT INTO time_entries (workspace_id, user_id, description, duration_minutes, billable)
VALUES (:'WS', :'OWNER', 'Client kickoff call - Kopi Senja brand refresh', 60, true);

-- 4. Add 3 more comments
WITH t AS (SELECT id, title FROM tasks)
INSERT INTO comments (workspace_id, task_id, user_id, body)
SELECT :'WS', t.id, :'OWNER', 'Caption set A ready for review, prefer B for energy tone.'
FROM t WHERE t.title = 'Caption writing' LIMIT 1;
WITH t AS (SELECT id, title FROM tasks)
INSERT INTO comments (workspace_id, task_id, user_id, body)
SELECT :'WS', t.id, :'MEMBER', 'Sip, gue finalize B + tambahin CTA variant.'
FROM t WHERE t.title = 'Caption writing' LIMIT 1;
INSERT INTO comments (workspace_id, user_id, body)
VALUES (:'WS', :'OWNER', 'Reminder: monthly report template updated, all SEO deliverables pakai format baru mulai bulan ini.');

-- Summary
SELECT 'files' AS t, COUNT(*) FROM files
UNION ALL SELECT 'time_entries', COUNT(*) FROM time_entries
UNION ALL SELECT 'comments', COUNT(*) FROM comments
UNION ALL SELECT 'appointments', COUNT(*) FROM appointments;

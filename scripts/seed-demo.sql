-- Cubicle demo seed (idempotent-ish: safe to re-run, will dup rows)
-- Populates rich demo data so the demo "clicks" without manual setup.
-- Run via: docker exec -i cubicle-pg psql -U postgres -d cubicle < scripts/seed-demo.sql

DO $$
DECLARE
  ws_id uuid := '12fc318e-c946-4a91-b389-60e39e270f33';
  owner_id text := '05fba341-488d-4e6f-ad67-b1226c41964d';
  client_kopi uuid := '25ac0fb0-f442-4fd1-96e4-baf4cf20ba3e';
  client_klinik uuid := '024bc01e-b488-4059-9e30-17b3ea574261';
  client_awan uuid := '861ee1a7-c8da-4c00-b59c-925b12db4736';
  project_kopi_ig uuid := 'a47a987b-9fb2-43e6-8fe4-4454dd65f13a';
  project_kopi_brand uuid := '1535aa8f-5815-4a9a-9255-1eab410cdf76';
  project_klinik_web uuid := 'b1f3c79b-059f-40c9-91ec-8dfb562bd6b3';
  questionnaire_id uuid := '8cd30b9d-2b16-4763-982b-0d70b608d455';
  tpl_id uuid;
  contract_id uuid;
  proposal_id uuid;
  resp_id uuid;
BEGIN

-- 1) Default contract template (re-insert if missing)
INSERT INTO contract_templates (workspace_id, name, body, is_default, created_by)
SELECT ws_id, 'Standard Service Agreement',
  E'# Service Agreement\n\nThis Service Agreement is entered into on **{{today}}** between:\n\n**Provider:** {{workspace.name}}\n**Client:** {{client.name}} ({{client.email}})\n\n---\n\n## 1. Scope of Work\n\nProvider agrees to deliver services for project **{{project.name}}**:\n\n{{scope}}\n\n## 2. Compensation\n\nTotal contract value: **{{value}}**\nPayment terms: 50% upfront, 50% upon delivery.\n\n## 3. Timeline\n\nThis Agreement is valid until **{{valid_until}}**.\n\n## 4. Confidentiality\n\nBoth parties agree to keep confidential information private.\n\n## 5. Termination\n\nEither party may terminate with 14 days written notice.\n\n---\n\nBy signing below, both parties agree to the terms outlined above.',
  true, owner_id
WHERE NOT EXISTS (
  SELECT 1 FROM contract_templates WHERE workspace_id = ws_id AND is_default = true
)
RETURNING id INTO tpl_id;

-- 2) A signed contract for Kopi Senja (demo star)
SELECT id INTO tpl_id FROM contract_templates WHERE workspace_id = ws_id AND is_default = true LIMIT 1;
SELECT id INTO contract_id FROM contracts WHERE workspace_id = ws_id AND client_id = client_kopi AND title = 'Brand Refresh — Phase 1' LIMIT 1;
IF contract_id IS NULL THEN
  INSERT INTO contracts (
    workspace_id, client_id, project_id, template_id, title, body, body_resolved, variables,
    valid_until, status, signed_name, signed_email, signature_data_url, signed_at, signed_from_ip, signed_user_agent,
    sent_at, viewed_at, created_by
  ) VALUES (
    ws_id, client_kopi, project_kopi_brand, tpl_id,
    'Brand Refresh — Phase 1',
    'Template body...',
    E'# Service Agreement\n\nThis Service Agreement is entered into on **June 5, 2026** between:\n\n**Provider:** Acme Creative\n**Client:** Kopi Senja (rina@kopisenja.id)\n\n---\n\n## 1. Scope of Work\n\nProvider agrees to deliver services for project **Brand Guideline Refresh**:\n\nLogo refresh, color system, typography, and 12-page brand guidelines book.\n\n## 2. Compensation\n\nTotal contract value: **Rp 18,000,000**\nPayment terms: 50% upfront, 50% upon delivery.\n\n## 3. Timeline\n\nThis Agreement is valid until **August 30, 2026**.\n\n## 4. Confidentiality\n\nBoth parties agree to keep confidential information private.\n\n## 5. Termination\n\nEither party may terminate with 14 days written notice.\n\n---\n\nBy signing below, both parties agree to the terms outlined above.',
    jsonb_build_object(
      'client.name', 'Kopi Senja',
      'client.email', 'rina@kopisenja.id',
      'client.company', 'Kopi Senja',
      'workspace.name', 'Acme Creative',
      'project.name', 'Brand Guideline Refresh',
      'today', 'June 5, 2026',
      'valid_until', 'August 30, 2026',
      'value', 'Rp 18,000,000',
      'scope', 'Logo refresh, color system, typography, and 12-page brand guidelines book.'
    ),
    '2026-08-30', 'signed',
    'Rina Wijaya', 'rina@kopisenja.id',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    NOW() - INTERVAL '8 days',
    '203.0.113.42', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    NOW() - INTERVAL '11 days', NOW() - INTERVAL '10 days', owner_id
  )
  RETURNING id INTO contract_id;
  RAISE NOTICE 'Seeded signed contract: %', contract_id;
END IF;

-- 3) A draft proposal for Klinik Harmoni (demo)
SELECT id INTO proposal_id FROM proposals WHERE workspace_id = ws_id AND title LIKE 'Website Redesign%' LIMIT 1;
IF proposal_id IS NULL THEN
  INSERT INTO proposals (workspace_id, client_id, project_id, title, body, line_items, subtotal, tax, total, currency, down_payment_percent, valid_until, status, created_by)
  VALUES (
    ws_id, client_klinik, project_klinik_web,
    'Website Redesign — Klinik Harmoni',
    E'# Website Redesign Proposal\n\n## Overview\n\nFull redesign of klinikharmoni.id with focus on booking conversion and patient education.\n\n## Deliverables\n\n- Information architecture + user flows\n- Custom design system (Figma)\n- 12 page templates\n- Mobile-first responsive build\n- Booking flow integration with existing system\n- 2 months post-launch support\n\n## Timeline\n\n6 weeks design + build, 2 weeks iteration.\n\n## Investment\n\n**Rp 35,000,000** all-inclusive.',
    '[{"description": "Discovery + IA", "qty": 1, "unit_price": 5000000}, {"description": "Custom design (Figma)", "qty": 1, "unit_price": 12000000}, {"description": "Build + integration", "qty": 1, "unit_price": 15000000}, {"description": "Post-launch support (2mo)", "qty": 1, "unit_price": 3000000}]'::jsonb,
    35000000, 0, 35000000, 'IDR', 50, '2026-07-15', 'sent', owner_id
  )
  RETURNING id INTO proposal_id;
  RAISE NOTICE 'Seeded sent proposal: %', proposal_id;
END IF;

-- 4) A submitted questionnaire response from PT Awan Digital (demo)
SELECT id INTO resp_id FROM questionnaire_responses WHERE workspace_id = ws_id AND respondent_email = 'budi@awandigital.co.id' LIMIT 1;
IF resp_id IS NULL THEN
  INSERT INTO questionnaire_responses (
    workspace_id, questionnaire_id, client_id, project_id,
    respondent_name, respondent_email, answers, status, submitted_at
  ) VALUES (
    ws_id, questionnaire_id, client_awan, NULL,
    'Budi Santoso', 'budi@awandigital.co.id',
    jsonb_build_object(
      'f1', 'Budi Santoso',
      'f2', 'budi@awandigital.co.id',
      'f3', 'We need a new internal dashboard to track our 12-person dev team. Currently using spreadsheets — painful. Want real-time view of: active projects, blockers, time per project, client allocation.',
      'f4', 45000000,
      'f5', '1-2 weeks'
    ),
    'submitted', NOW() - INTERVAL '3 days'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO resp_id;
  RAISE NOTICE 'Seeded questionnaire response from Budi Santoso';
END IF;

-- 5) A few extra invoices in mixed states for dashboard color
INSERT INTO invoices (workspace_id, client_id, invoice_number, subtotal, tax, total, currency, status, issue_date, due_date)
SELECT ws_id, client_kopi, 'INV-2026-0042', 9500000, 0, 9500000, 'IDR', 'paid',    '2026-05-15', '2026-05-29'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE workspace_id = ws_id AND invoice_number = 'INV-2026-0042');

INSERT INTO invoices (workspace_id, client_id, invoice_number, subtotal, tax, total, currency, status, issue_date, due_date)
SELECT ws_id, client_klinik, 'INV-2026-0043', 12000000, 0, 12000000, 'IDR', 'sent',    '2026-06-01', '2026-06-15'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE workspace_id = ws_id AND invoice_number = 'INV-2026-0043');

INSERT INTO invoices (workspace_id, client_id, invoice_number, subtotal, tax, total, currency, status, issue_date, due_date)
SELECT ws_id, client_awan, 'INV-2026-0044', 6500000, 0, 6500000, 'IDR', 'overdue', '2026-05-20', '2026-06-03'
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE workspace_id = ws_id AND invoice_number = 'INV-2026-0044');

END $$;

-- Summary
SELECT 'contract_templates' AS table_name, COUNT(*)::text AS count FROM contract_templates WHERE workspace_id = '12fc318e-c946-4a91-b389-60e39e270f33'
UNION ALL
SELECT 'contracts',         COUNT(*)::text FROM contracts         WHERE workspace_id = '12fc318e-c946-4a91-b389-60e39e270f33'
UNION ALL
SELECT 'proposals',         COUNT(*)::text FROM proposals         WHERE workspace_id = '12fc318e-c946-4a91-b389-60e39e270f33'
UNION ALL
SELECT 'questionnaire_responses', COUNT(*)::text FROM questionnaire_responses WHERE workspace_id = '12fc318e-c946-4a91-b389-60e39e270f33'
UNION ALL
SELECT 'invoices',          COUNT(*)::text FROM invoices          WHERE workspace_id = '12fc318e-c946-4a91-b389-60e39e270f33';

/**
 * Cubiqlo QA Manual Seed — NON-DESTRUCTIVE
 * Creates isolated QA owner/member/viewer + full feature data.
 * Does NOT delete existing production workspaces.
 *
 * Run:
 *   DATABASE_URL=postgresql://postgres:***@127.0.0.1:5432/cubicle \
 *     node scripts/seed-qa-manual.mjs
 *
 * Or via docker network:
 *   docker run --rm --network cubicle_default -v "$PWD":/w -w /w \
 *     -e DATABASE_URL=postgresql://postgres:PASS@cubicle-pg:5432/cubicle \
 *     node:22-alpine node scripts/seed-qa-manual.mjs
 */
import pg from "pg";
import { createHash, randomBytes, randomUUID } from "crypto";
import { hashPassword } from "better-auth/crypto";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const PASSWORD = process.env.QA_PASSWORD || "QaCubiqlo!2026";
const BASE = process.env.APP_URL || "https://cubiqlo.com";
const SUFFIX = new Date().toISOString().slice(0, 10).replace(/-/g, "");

const OWNER_EMAIL = `qa-owner-${SUFFIX}@cubiqlo.test`;
const MEMBER_EMAIL = `qa-member-${SUFFIX}@cubiqlo.test`;
const VIEWER_EMAIL = `qa-viewer-${SUFFIX}@cubiqlo.test`;

function sha256(token) {
  return createHash("sha256").update(token).digest("hex");
}
function hexToken() {
  return randomBytes(32).toString("hex");
}
function b64Token() {
  return randomBytes(32).toString("base64url");
}
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function isoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
function isoTs(offsetDays = 0, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const client = new pg.Client({ connectionString: DATABASE_URL });

async function upsertUser(email, name, passwordHash, plan = "solo") {
  // Soft-clean previous same-email QA rows if re-run same day
  const existing = await client.query(`SELECT id FROM users WHERE email=$1`, [email]);
  if (existing.rows[0]) {
    const uid = existing.rows[0].id;
    // Delete owned workspaces cascade via members cleanup carefully
    await client.query(`DELETE FROM workspace_members WHERE user_id=$1`, [uid]);
    // Delete workspaces owned by this user (cascade will clean children)
    await client.query(`DELETE FROM workspaces WHERE owner_id=$1`, [uid]);
    await client.query(`DELETE FROM accounts WHERE user_id=$1`, [uid]);
    await client.query(`DELETE FROM sessions WHERE user_id=$1`, [uid]);
    await client.query(`DELETE FROM users WHERE id=$1`, [uid]);
  }

  const id = randomBytes(16).toString("base64url"); // better-auth style text id
  await client.query(
    `INSERT INTO users (id, name, email, email_verified, plan, created_at, updated_at)
     VALUES ($1,$2,$3,true,$4,now(),now())`,
    [id, name, email, plan]
  );
  await client.query(
    `INSERT INTO accounts (id, account_id, provider_id, user_id, password, created_at, updated_at)
     VALUES ($1,$2,'credential',$3,$4,now(),now())`,
    [randomUUID(), id, id, passwordHash]
  );
  return id;
}

async function main() {
  await client.connect();
  console.log("Connected. Seeding QA workspace...\n");

  const passwordHash = await hashPassword(PASSWORD);
  const ownerId = await upsertUser(OWNER_EMAIL, "QA Owner", passwordHash, "solo");
  const memberId = await upsertUser(MEMBER_EMAIL, "QA Member", passwordHash, "free");
  const viewerId = await upsertUser(VIEWER_EMAIL, "QA Viewer", passwordHash, "free");
  console.log("✅ Users ready");

  const wsId = randomUUID();
  const bookingSlug = `qa-studio-${SUFFIX}`;
  await client.query(
    `INSERT INTO workspaces (
      id, name, slug, owner_id, default_currency, default_hourly_rate, default_tax_rate,
      billing_name, billing_address, billing_email, billing_phone, tax_id, booking_slug,
      reply_to_email, created_at, updated_at
    ) VALUES (
      $1,'QA Studio Manual Test',$2,$3,'IDR','250000','11',
      'PT QA Studio Indonesia',
      'Jl. Melawai Raya No. 12, Kebayoran Baru, Jakarta Selatan 12160',
      'billing@qastudio.test','081234567890','10.0.0.1-012.000',$4,
      'hello@qastudio.test', now(), now()
    )`,
    [wsId, `qa-studio-${SUFFIX}`, ownerId, bookingSlug]
  );

  await client.query(
    `INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at)
     VALUES
       ($1,$4,$5,'owner',now()),
       ($2,$4,$6,'member',now()),
       ($3,$4,$7,'viewer',now())
     ON CONFLICT (workspace_id, user_id) DO NOTHING`,
    [randomUUID(), randomUUID(), randomUUID(), wsId, ownerId, memberId, viewerId]
  );
  console.log("✅ Workspace + members");

  // Clients
  const c1 = randomUUID();
  const c2 = randomUUID();
  const c3 = randomUUID();
  const portal1 = hexToken();
  const portal2 = hexToken();

  await client.query(
    `INSERT INTO clients (
      id, workspace_id, name, company_name, email, phone, website, address, status, tags,
      internal_notes, portal_enabled, portal_token_hash, portal_token_expires_at, portal_slug, portal_slug_enabled
    ) VALUES
    ($1,$4,'Rina Prameswari','Kopi Senja Roastery','rina.prameswari@kopisenja.test','081298765432','https://kopisenja.test','Jl. Braga No. 45, Bandung 40111','active',ARRAY['branding','social','retainer'],
     '[INTERNAL] Budget Q3 45jt. Jangan share ke portal.', true, $5, $7, 'kopi-senja-qa', true),
    ($2,$4,'dr. Andi Harmoni','Klinik Harmoni','admin@klinikharmoni.test','0215550123','https://klinikharmoni.test','Jl. Kemang Raya No. 8, Jakarta Selatan','active',ARRAY['website','seo'],
     '[INTERNAL] Prefer email pagi. PIC design: Sinta.', true, $6, $7, 'klinik-harmoni-qa', true),
    ($3,$4,'Budi Santoso','PT Awan Digital','budi@awandigital.test','081311122233','https://awandigital.test','BSD City, Tangerang Selatan','inactive',ARRAY['consulting'],
     '[INTERNAL] Kontrak selesai 2025. Archive candidate.', false, NULL, NULL, NULL, false)
    `,
    [c1, c2, c3, wsId, sha256(portal1), sha256(portal2), daysFromNow(90)]
  );
  console.log("✅ Clients x3 + portal tokens");

  // Projects
  const p1 = randomUUID();
  const p2 = randomUUID();
  const p3 = randomUUID();
  const p4 = randomUUID();
  const p5 = randomUUID();
  await client.query(
    `INSERT INTO projects (
      id, workspace_id, client_id, name, description, status, billing_type, currency, rate, budget,
      start_date, due_date, client_visible, created_by
    ) VALUES
    ($1,$6,$7,'Instagram Launch Campaign','Soft launch brand Instagram + content calendar 30 hari outlet Braga.','active','project','IDR',NULL,'18000000',$11,$12,true,$10),
    ($2,$6,$7,'Brand Guideline Refresh','Internal rework logo lockup + color system. Jangan tampil di portal.','active','hours','IDR','250000','8000000',$11,$13,false,$10),
    ($3,$6,$8,'Website Redesign','Redesign website klinik + booking form + SEO on-page.','active','package','IDR',NULL,'35000000',$14,$15,true,$10),
    ($4,$6,$8,'SEO Monthly Retainer','Retainer SEO bulanan.','on_hold','hours','IDR','300000','5000000',$11,$15,true,$10),
    ($5,$6,$9,'Internal Ops Consulting','Ops audit selesai.','completed','project','IDR',NULL,'12000000',$16,$17,false,$10)
    `,
    [
      p1, p2, p3, p4, p5, wsId, c1, c2, c3, ownerId,
      isoDate(-16), isoDate(28), isoDate(45), isoDate(-32), isoDate(75), isoDate(-120), isoDate(-30),
    ]
  );
  console.log("✅ Projects x5");

  // Tasks
  const taskDefs = [
    { projectId: p1, title: "Audit akun Instagram existing", status: "done", priority: "medium", due: isoDate(-12), visible: true, assignee: memberId },
    { projectId: p1, title: "Moodboard visual brand", status: "review", priority: "high", due: isoDate(-5), visible: true, assignee: memberId },
    { projectId: p1, title: "Content calendar 30 hari", status: "in_progress", priority: "high", due: isoDate(3), visible: true, assignee: memberId },
    { projectId: p1, title: "Shoot assets outlet Braga", status: "todo", priority: "urgent", due: isoDate(1), visible: true, assignee: ownerId },
    { projectId: p1, title: "Internal cost tracking notes", status: "todo", priority: "low", due: isoDate(8), visible: false, assignee: null },
    { projectId: p2, title: "Audit existing brand assets", status: "done", priority: "medium", due: isoDate(-10), visible: false, assignee: memberId },
    { projectId: p2, title: "Draft new color palette", status: "in_progress", priority: "high", due: isoDate(2), visible: false, assignee: memberId },
    { projectId: p2, title: "Typography selection", status: "todo", priority: "medium", due: isoDate(10), visible: false, assignee: null },
    { projectId: p3, title: "Sitemap + wireframe homepage", status: "in_progress", priority: "high", due: isoDate(5), visible: true, assignee: memberId },
    { projectId: p3, title: "Migrasi konten layanan", status: "todo", priority: "medium", due: isoDate(15), visible: true, assignee: null },
    { projectId: p3, title: "QA mobile responsive", status: "todo", priority: "high", due: isoDate(34), visible: true, assignee: ownerId },
    { projectId: p3, title: "Design system setup", status: "done", priority: "high", due: isoDate(-20), visible: false, assignee: memberId },
    { projectId: p4, title: "Keyword research", status: "done", priority: "medium", due: isoDate(-25), visible: true, assignee: memberId },
    { projectId: p4, title: "On-page optimization", status: "in_progress", priority: "medium", due: isoDate(7), visible: true, assignee: memberId },
    { projectId: p4, title: "Monthly SEO report", status: "todo", priority: "medium", due: isoDate(-2), visible: true, assignee: memberId }, // overdue
    { projectId: p5, title: "Initial consultation", status: "done", priority: "high", due: isoDate(-100), visible: false, assignee: ownerId },
    { projectId: p5, title: "Ops audit report", status: "done", priority: "high", due: isoDate(-60), visible: false, assignee: ownerId },
    { projectId: p5, title: "Final presentation", status: "done", priority: "high", due: isoDate(-40), visible: false, assignee: ownerId },
  ];
  const taskIds = [];
  for (let i = 0; i < taskDefs.length; i++) {
    const t = taskDefs[i];
    const id = randomUUID();
    taskIds.push(id);
    await client.query(
      `INSERT INTO tasks (
        id, workspace_id, project_id, title, description, status, priority, assignee_id, due_date, position, client_visible, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        id, wsId, t.projectId, t.title, `QA seed task: ${t.title}`, t.status, t.priority,
        t.assignee, t.due, i, t.visible, ownerId,
      ]
    );
  }
  console.log(`✅ Tasks x${taskIds.length}`);

  // Comments
  await client.query(
    `INSERT INTO comments (id, workspace_id, entity_type, entity_id, body, visibility, author_id, source, author_name, author_email)
     VALUES
     ($1,$5,'task',$6,'Cek palette dari Brand Guideline sebelum shoot.','internal',$7,'internal',NULL,NULL),
     ($2,$5,'task',$6,'Moodboard v2 siap direview. Mohon feedback sebelum Jumat.','client',$7,'internal',NULL,NULL),
     ($3,$5,'task',$8,'Template #3 perlu revisi warna earth.','internal',$9,'internal',NULL,NULL),
     ($4,$5,'project',$10,'Bisa share wireframe yang sudah jadi?','client',NULL,'portal','dr. Andi','admin@klinikharmoni.test')
    `,
    [randomUUID(), randomUUID(), randomUUID(), randomUUID(), wsId, taskIds[2], ownerId, taskIds[1], memberId, p3]
  );
  console.log("✅ Comments");

  // Time entries
  await client.query(
    `INSERT INTO time_entries (
      id, workspace_id, client_id, project_id, task_id, user_id, description,
      start_time, end_time, manual_minutes, billable, hourly_rate, status
    ) VALUES
    ($1,$7,$8,$10,$12,$14,'Draft calendar week 1-2 + CTA mapping', $16, $17, NULL, true, '250000', 'approved'),
    ($2,$7,$8,$10,$13,$14,'Moodboard research', $18, $19, NULL, true, '250000', 'approved'),
    ($3,$7,$8,$11,$15,$14,'Internal logo lockup exploration', NULL, NULL, 75, false, '250000', 'draft'),
    ($4,$7,$9,$20,$21,$14,'Wireframe homepage + layanan', NULL, NULL, 180, true, '300000', 'approved'),
    ($5,$7,$9,$20,$22,$14,'Frontend development day', $23, $24, NULL, true, '300000', 'approved'),
    ($6,$7,$8,$10,$12,$14,'Active timer QA (stop me)', $25, NULL, NULL, true, '250000', 'draft')
    `,
    [
      randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID(),
      wsId, c1, c2, p1, p2, taskIds[2], taskIds[1], memberId, taskIds[6],
      isoTs(-3, 9), isoTs(-3, 11), // 2h
      isoTs(-5, 8), isoTs(-5, 12), // 4h
      p3, taskIds[8], taskIds[11],
      isoTs(-2, 9), isoTs(-2, 14), // 5h
      isoTs(0, 8),
    ]
  );
  console.log("✅ Time entries x6");

  // Invoice counter
  await client.query(
    `INSERT INTO workspace_invoice_counters (workspace_id, next_number, updated_at)
     VALUES ($1, 4, now())
     ON CONFLICT (workspace_id) DO UPDATE SET next_number = GREATEST(workspace_invoice_counters.next_number, 4), updated_at = now()`,
    [wsId]
  );

  // Invoices + tokens
  const inv1 = randomUUID();
  const inv2 = randomUUID();
  const inv3 = randomUUID();
  const invToken1 = hexToken();
  const invToken2 = hexToken();
  // totals:
  // inv1: 3500000 + 4500000 + 4200000 = 12200000 + tax 11% 1342000 = 13542000
  await client.query(
    `INSERT INTO invoices (
      id, workspace_id, client_id, project_id, invoice_number, issue_date, due_date, currency,
      subtotal, discount, tax, total, status, notes, terms,
      shared_token_hash, shared_token_expires_at
    ) VALUES
    ($1,$4,$5,$7,'INV-QA-0001',$10,$11,'IDR','12200000','0','1342000','13542000','sent',
     'Pembayaran via transfer BCA. Mohon konfirmasi setelah transfer.','Net 14. Keterlambatan >7 hari dikenai reminder otomatis.',
     $13, $16),
    ($2,$4,$6,$8,'INV-QA-0002',$10,$12,'USD','1050.00','0','0','1050.00','draft',
     'International wire. Quote valid for 14 days.','Net 30',
     $14, $16),
    ($3,$4,$6,$9,'INV-QA-0003',$17,$18,'IDR','2000000','0','220000','2220000','paid',
     'SEO retainer previous period.','Net 14',
     $15, $16)
    `,
    [
      inv1, inv2, inv3, wsId, c1, c2, p1, p3, p4,
      isoDate(-2), isoDate(12), isoDate(30),
      sha256(invToken1), sha256(invToken2), sha256(hexToken()),
      daysFromNow(60),
      isoDate(-45), isoDate(-30),
    ]
  );
  await client.query(
    `INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount, source_type) VALUES
     ($1,$4,'Brand audit + strategy deck','1','3500000','3500000','manual'),
     ($2,$4,'Content calendar 30 hari','1','4500000','4500000','manual'),
     ($3,$4,'Production assets (12 pcs)','12','350000','4200000','manual'),
     ($5,$6,'UX wireframes homepage + services','1','450','450','manual'),
     ($7,$6,'UI design system starter','1','600','600','manual'),
     ($8,$9,'SEO optimization previous month','1','2000000','2000000','manual')
    `,
    [randomUUID(), randomUUID(), randomUUID(), inv1, randomUUID(), inv2, randomUUID(), randomUUID(), inv3]
  );
  await client.query(
    `INSERT INTO payments (id, invoice_id, amount, paid_at, method, notes) VALUES
     ($1,$2,'2220000',$3,'Bank Transfer BCA','Pelunasan lunas')`,
    [randomUUID(), inv3, isoDate(-28)]
  );
  console.log("✅ Invoices x3 + payment");

  // Expense categories + expenses
  const cats = [
    ["Software", "#8b5cf6", "code"],
    ["Travel", "#f59e0b", "plane"],
    ["Production", "#10b981", "camera"],
    ["Meals", "#ec4899", "utensils"],
    ["Office", "#64748b", "building"],
  ];
  const catIds = {};
  for (const [name, color, icon] of cats) {
    const id = randomUUID();
    catIds[name] = id;
    await client.query(
      `INSERT INTO expense_categories (id, workspace_id, name, color, icon, is_default)
       VALUES ($1,$2,$3,$4,$5,true)`,
      [id, wsId, name, color, icon]
    );
  }
  await client.query(
    `INSERT INTO expenses (
      id, workspace_id, category_id, project_id, client_id, amount, currency, date, description, vendor, tax_included, tax_amount, created_by
    ) VALUES
    ($1,$7,$8,$12,$14,'459000','IDR',$17,'Adobe CC team plan Juli','Adobe',true,'45900',$16),
    ($2,$7,$9,$12,$14,'185000','IDR',$18,'Grab ke outlet Braga shoot recce','Grab',false,NULL,$16),
    ($3,$7,$8,$13,$15,'29.00','USD',$19,'Envato Elements monthly','Envato',false,NULL,$16),
    ($4,$7,$10,$12,$14,'2500000','IDR',$20,'Photographer day rate Braga','Studio Lokal',false,NULL,$16),
    ($5,$7,$11,NULL,NULL,'185000','IDR',$21,'Team lunch kickoff','Warung Upnormal',false,NULL,$16),
    ($6,$7,$8,NULL,NULL,'450000','IDR',$22,'Coworking day pass','Plaza Indonesia',false,NULL,$16)
    `,
    [
      randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID(),
      wsId, catIds.Software, catIds.Travel, catIds.Production, catIds.Meals,
      p1, p3, c1, c2, ownerId,
      isoDate(-7), isoDate(-5), isoDate(-9), isoDate(-3), isoDate(-4), isoDate(-6),
    ]
  );
  console.log("✅ Expenses + categories");

  // Proposal
  const propId = randomUUID();
  const propToken = b64Token();
  const lineItems = [
    { description: "Brand audit + strategy deck", quantity: 1, unitPrice: 3500000, amount: 3500000 },
    { description: "Content calendar 30 hari", quantity: 1, unitPrice: 4500000, amount: 4500000 },
    { description: "Production 12 assets", quantity: 12, unitPrice: 350000, amount: 4200000 },
    { description: "Community management 30 hari", quantity: 1, unitPrice: 4000000, amount: 4000000 },
  ];
  // subtotal 16200000 tax 11% = 1782000 total 17982000
  await client.query(
    `INSERT INTO proposals (
      id, workspace_id, client_id, project_id, title, body, line_items, subtotal, tax, total, currency,
      down_payment_percent, valid_until, status, shared_token_hash, shared_token_expires_at, sent_at, created_by
    ) VALUES (
      $1,$2,$3,$4,
      'Proposal Social Launch — Kopi Senja Braga',
      $5,
      $6::jsonb,
      '16200000','1782000','17982000','IDR','50',$7,'sent',$8,$9,now(),$10
    )`,
    [
      propId, wsId, c1, p1,
      "Halo Rina,\n\nBerikut proposal soft launch Instagram + content production outlet Braga.\nScope: strategy, production, publishing support 30 hari.",
      JSON.stringify(lineItems),
      isoDate(14),
      sha256(propToken),
      daysFromNow(30),
      ownerId,
    ]
  );
  console.log("✅ Proposal (sent + public token)");

  // Contract template + contract
  const tmplId = randomUUID();
  const contractBody = `PERJANJIAN JASA KREATIF

Pihak Pertama: QA Studio Manual Test
Pihak Kedua: Kopi Senja Roastery

1. Ruang Lingkup
Pihak Pertama menyediakan jasa Social Launch Instagram + production.

2. Nilai Kontrak
Total nilai jasa sesuai proposal yang disepakati.

3. Jadwal
Pekerjaan dimulai sesuai kickoff setelah DP.

4. Pembayaran
DP 50% sebelum kickoff. Pelunasan 50% sebelum serah terima final.

5. Revisi
Termasuk 2 putaran revisi mayor.

6. HAKI
Final deliverable berpindah ke Klien setelah pelunasan penuh.

7. Kerahasiaan
Berlaku selama dan 12 bulan setelah kontrak.

Ditandatangani secara elektronik.`;
  await client.query(
    `INSERT INTO contract_templates (id, workspace_id, name, body, is_default, created_by)
     VALUES ($1,$2,'Default Jasa Kreatif',$3,true,$4)`,
    [tmplId, wsId, contractBody, ownerId]
  );
  const contractId = randomUUID();
  const contractToken = b64Token();
  await client.query(
    `INSERT INTO contracts (
      id, workspace_id, client_id, project_id, template_id, title, body, body_resolved,
      valid_until, status, shared_token_hash, shared_token_expires_at, sent_at, created_by
    ) VALUES (
      $1,$2,$3,$4,$5,
      'Kontrak Social Launch — Kopi Senja',
      $6,$6,$7,'sent',$8,$9,now(),$10
    )`,
    [contractId, wsId, c1, p1, tmplId, contractBody, isoDate(60), sha256(contractToken), daysFromNow(60), ownerId]
  );
  console.log("✅ Contract template + sent contract");

  // Questionnaire + response token
  const qId = randomUUID();
  const schema = [
    { id: "brand", type: "text", label: "Nama brand", required: true, placeholder: "Contoh: Kopi Senja" },
    { id: "story", type: "textarea", label: "Ceritakan brand dalam 3 kalimat", required: true },
    { id: "budget", type: "select", label: "Budget range", required: true, options: ["<10jt", "10-25jt", "25-50jt", ">50jt"] },
    { id: "channels", type: "multiselect", label: "Channel prioritas", required: false, options: ["Instagram", "TikTok", "Website", "Offline"] },
    { id: "email", type: "email", label: "Email PIC", required: true },
    { id: "launch", type: "date", label: "Target launch", required: false },
    { id: "ref", type: "url", label: "Link referensi visual", required: false },
  ];
  await client.query(
    `INSERT INTO questionnaires (id, workspace_id, name, description, schema, created_by)
     VALUES ($1,$2,'Brand Discovery Form — Kopi Senja','Form brief awal sebelum kickoff branding & social.',$3::jsonb,$4)`,
    [qId, wsId, JSON.stringify(schema), ownerId]
  );
  const intakeToken = b64Token();
  const respId = randomUUID();
  await client.query(
    `INSERT INTO questionnaire_responses (
      id, workspace_id, questionnaire_id, client_id, answers, status, shared_token_hash, shared_token_expires_at
    ) VALUES ($1,$2,$3,$4,'{}'::jsonb,'pending',$5,$6)`,
    [respId, wsId, qId, c1, sha256(intakeToken), daysFromNow(30)]
  );
  console.log("✅ Questionnaire + intake token");

  // Availability + appointments
  for (const day of [1, 2, 3, 4, 5]) {
    await client.query(
      `INSERT INTO availability_rules (id, workspace_id, user_id, day_of_week, start_time, end_time, timezone)
       VALUES ($1,$2,$3,$4,'09:00','17:00','Asia/Jakarta')`,
      [randomUUID(), wsId, ownerId, day]
    ).catch(async () => {
      await client.query(
        `INSERT INTO availability_rules (workspace_id, user_id, day_of_week, start_time, end_time, timezone)
         VALUES ($1,$2,$3,'09:00','17:00','Asia/Jakarta')`,
        [wsId, ownerId, day]
      );
    });
  }
  await client.query(
    `INSERT INTO appointments (
      id, workspace_id, user_id, client_id, title, attendee_name, attendee_email, start_time, end_time, status, notes
    ) VALUES
    ($1,$3,$4,$5,'Review campaign progress','Rina Prameswari','rina.prameswari@kopisenja.test',$7,$8,'scheduled','Bahas moodboard final'),
    ($2,$3,$4,$6,'Website demo','dr. Andi Harmoni','admin@klinikharmoni.test',$9,$10,'scheduled','Demo wireframe homepage')
    `,
    [
      randomUUID(), randomUUID(), wsId, ownerId, c1, c2,
      isoTs(2, 10), isoTs(2, 11),
      isoTs(5, 14), isoTs(5, 15),
    ]
  );
  console.log("✅ Availability + appointments");

  // Packages
  await client.query(
    `INSERT INTO packages (id, workspace_id, name, hours, price, currency, description, features, badge, sort_order, active)
     VALUES
     ($1,$4,'Social Starter 30 Hari',40,'15000000','IDR','Strategy + 12 assets + 30 hari calendar','Strategy deck\n12 assets\nCalendar 30 hari','Popular',1,true),
     ($2,$4,'Website Launch',80,'35000000','IDR','Redesign + SEO on-page','Wireframe\nUI\nSEO','Best value',2,true),
     ($3,$4,'Retainer SEO Bulanan',20,'5000000','IDR','On-page + report bulanan','Keyword\nOn-page\nReport',NULL,3,true)
    `,
    [randomUUID(), randomUUID(), randomUUID(), wsId]
  ).catch((e) => console.warn("⚠️ packages:", e.message));

  // Prompt templates
  await client.query(
    `INSERT INTO prompt_templates (id, workspace_id, name, category, description, template, is_system)
     VALUES
     ($1,$4,'Social Caption','social','Generate engaging social caption','Write a caption for {{platform}} about {{topic}}. Tone: {{tone}}. Include CTA.',true),
     ($2,$4,'Email Marketing','email','Craft email newsletter','Write an email about {{topic}} for {{audience}}. Subject catchy. CTA clear.',true),
     ($3,$4,'Proposal Outline','sales','Outline proposal sections','Create proposal outline for {{service}} to {{client}}. Budget {{budget}}.',true)
    `,
    [randomUUID(), randomUUID(), randomUUID(), wsId]
  ).catch((e) => console.warn("⚠️ prompt_templates:", e.message));

  // Personal notes
  await client.query(
    `INSERT INTO personal_notes (
      id, workspace_id, user_id, title, body, status, pinned, due_date, recurrence_rule, notify_1d
    ) VALUES
    ($1,$3,$4,'Follow up DP Kopi Senja','WA Rina kalau DP belum masuk H+2 after invoice send.','open',true,$5,'none',true),
    ($2,$3,$4,'Daily log QA','Setup QA data Cubiqlo. Client Kopi + Klinik. Invoice draft ready.','open',false,NULL,'none',false)
    `,
    [randomUUID(), randomUUID(), wsId, ownerId, daysFromNow(3)]
  ).catch((e) => console.warn("⚠️ personal_notes:", e.message));

  // Activity logs
  await client.query(
    `INSERT INTO activity_logs (id, workspace_id, actor_id, action, entity_type, entity_id)
     VALUES
     ($1,$4,$5,'created_workspace','workspace',$4),
     ($2,$4,$5,'created_client','client',$6),
     ($3,$4,$5,'created_invoice','invoice',$7)
    `,
    [randomUUID(), randomUUID(), randomUUID(), wsId, ownerId, c1, inv1]
  ).catch(() => {});

  const out = {
    base: BASE,
    login: {
      owner: { email: OWNER_EMAIL, password: PASSWORD, role: "owner", plan: "solo" },
      member: { email: MEMBER_EMAIL, password: PASSWORD, role: "member" },
      viewer: { email: VIEWER_EMAIL, password: PASSWORD, role: "viewer" },
    },
    workspace: {
      id: wsId,
      name: "QA Studio Manual Test",
      bookingSlug,
      bookingUrl: `${BASE}/booking/${bookingSlug}`,
    },
    publicLinks: {
      portalKopiSenja: `${BASE}/client-portal/${portal1}`,
      portalKlinikHarmoni: `${BASE}/client-portal/${portal2}`,
      invoiceSent: `${BASE}/invoice/${invToken1}`,
      invoiceDraftUsd: `${BASE}/invoice/${invToken2}`,
      proposal: `${BASE}/proposal/${propToken}`,
      contract: `${BASE}/contract/${contractToken}`,
      intake: `${BASE}/intake/${intakeToken}`,
    },
    ids: {
      clients: { kopiSenja: c1, klinikHarmoni: c2, awanDigital: c3 },
      projects: { igLaunch: p1, brandGuide: p2, website: p3, seo: p4, ops: p5 },
      invoices: { sent: inv1, draftUsd: inv2, paid: inv3 },
      proposal: propId,
      contract: contractId,
      questionnaire: qId,
    },
  };

  console.log("\n════════════════════════════════════════");
  console.log("QA SEED READY — copy credentials below");
  console.log("════════════════════════════════════════\n");
  console.log(JSON.stringify(out, null, 2));
  console.log("\nLogin: " + BASE + "/login");
  console.log(`Owner:  ${OWNER_EMAIL} / ${PASSWORD}`);
  console.log(`Member: ${MEMBER_EMAIL} / ${PASSWORD}`);
  console.log(`Viewer: ${VIEWER_EMAIL} / ${PASSWORD}`);
  console.log(`Booking: ${out.workspace.bookingUrl}`);
  console.log(`Portal:  ${out.publicLinks.portalKopiSenja}`);
  console.log(`Invoice: ${out.publicLinks.invoiceSent}`);
  console.log(`Proposal:${out.publicLinks.proposal}`);
  console.log(`Contract:${out.publicLinks.contract}`);
  console.log(`Intake:  ${out.publicLinks.intake}`);

  // Write machine-readable + human checklist companion
  const fs = await import("fs");
  fs.writeFileSync("/tmp/cubiqlo-qa-seed.json", JSON.stringify(out, null, 2));
  console.log("\nSaved: /tmp/cubiqlo-qa-seed.json");
  await client.end();
}

main().catch(async (e) => {
  console.error("Seed failed:", e);
  try { await client.end(); } catch {}
  process.exit(1);
});

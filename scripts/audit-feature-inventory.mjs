import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appDir = path.join(root, "src/app");
const apiDir = path.join(root, "src/app/api");
const actionsDir = path.join(root, "src/lib/actions");
const schemaPath = path.join(root, "src/db/schema.ts");

function walk(dir, ext = ".tsx") {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full, ext));
    } else if (full.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

const pages = walk(appDir, "page.tsx").map(p => path.relative(root, p));
const apiRoutes = walk(apiDir, "route.ts").map(p => path.relative(root, p));
const actionFiles = walk(actionsDir, ".ts").map(p => path.relative(root, p));
const schemaText = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, "utf8") : "";
const tables = [...schemaText.matchAll(/export const (\w+)\s*=\s*pgTable\(\s*["\']([^"\']+)/g)].map(m => ({ name: m[1], table: m[2] }));

const md = `# Cubiqlo Generated Feature Inventory
*Generated automatically by scripts/audit-feature-inventory.mjs*

## Summary Counts
- App Pages: ${pages.length}
- API Routes: ${apiRoutes.length}
- Server Action Files: ${actionFiles.length}
- Database Tables: ${tables.length}

## Database Tables
${tables.map(t => `- \`${t.name}\` (\`${t.table}\`)`).join("\n")}

## App Pages
${pages.map(p => `- \`${p}\``).join("\n")}
`;

const target = path.join(root, "docs/audits/cubiqlo-feature-matrix.md");
fs.writeFileSync(target, md);
console.log("Inventory written to docs/audits/cubiqlo-feature-matrix.md with", tables.length, "tables and", pages.length, "pages.");

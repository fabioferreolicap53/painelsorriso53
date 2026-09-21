// Ver logs de erro do PocketBase (mail/smtp/verification) e requests do painelsorriso53
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envRaw = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf-8");
const env = {};
for (const line of envRaw.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const PB_URL = "https://centraldedados.dev.br";

const authResp = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ identity: env.PB_EMAIL, password: env.PB_PASSWORD }),
});
const auth = await authResp.json();

const logsResp = await fetch(`${PB_URL}/api/logs?perPage=200`, { headers: { Authorization: auth.token } });
const logs = await logsResp.json();
const items = logs.items || [];
console.log("total logs:", items.length);
console.log("levels:", JSON.stringify([...new Set(items.map(i => i.level))]));

// Filtrar por e-mail / verification / smtp / errors
const keywords = /mail|smtp|verification|reset|error|failed|painelsorriso53_users/i;
const relevant = items.filter(i => keywords.test(JSON.stringify(i) ));
console.log("\n=== Logs relevantes (" + relevant.length + ") ===");
for (const item of relevant.slice(0, 30)) {
  const data = item.data || {};
  console.log(`\n[${item.level}] ${new Date(item.created).toISOString()}`);
  console.log("msg:", (item.message || "").slice(0, 300));
  console.log("data:", JSON.stringify(item.data || {}).slice(0, 400));
}
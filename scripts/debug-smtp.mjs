// Verificar if smtp.password existe de verdade (PocketBase pode mascarar)
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
const sResp = await fetch(`${PB_URL}/api/settings`, { headers: { Authorization: auth.token } });
const s = await sResp.json();
const smtp = s.smtp || {};
console.log("keys smtp:", Object.keys(smtp));
console.log("smtp JSON:", JSON.stringify(smtp, null, 2));
console.log("password len:", (smtp.password ?? "").length);

// Testar se e-mail sai: usar endpoint do PB para testar SMTP? O PB v0.22 tem
// POST /api/settings/... apenas. O dashboard usa um endpoint interno.
// Vou verificar se há logs de erro do servidor
const logsResp = await fetch(`${PB_URL}/api/logs?perPage=10`, { headers: { Authorization: auth.token } });
const logs = await logsResp.json();
console.log("\nlogs status:", logsResp.status);
if (logsResp.ok) {
  console.log("logs count:", (logs.items || []).length);
  for (const item of (logs.items || []).slice(0, 10)) {
    console.log("-", item.level, "|", (item.message || "").slice(0, 200), "|", JSON.stringify(item.data || {}).slice(0, 200));
  }
}
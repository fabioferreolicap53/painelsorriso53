// Buscar logs de erro (mail/smtp/verification) e logs recentes após testes
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

// 1. Disparar um request-verification de teste
const tResp = await fetch(`${PB_URL}/api/collections/painelsorriso53_users/request-verification`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "fabioferreoli@gmail.com" }),
});
console.log("request-verification status:", tResp.status, await tResp.text());

// 2. Buscar logs de erro
const logsResp = await fetch(`${PB_URL}/api/logs?perPage=500`, { headers: { Authorization: auth.token } });
const logs = await logsResp.json();
const items = logs.items || [];
console.log("\ntotal logs:", items.length);

// Logs mais recentes (últimos 5)
console.log("\n=== 5 últimos logs ===");
for (const item of items.slice(0, 5)) {
  console.log(`\n[${item.level}] ${item.created}`);
  console.log("msg:", (item.message || "").slice(0, 200));
  console.log("data:", JSON.stringify(item.data || {}).slice(0, 300));
}

// Logs com erro (level > 0)
console.log("\n=== Logs de erro (level>0) ===");
const errors = items.filter(i => i.level > 0);
console.log("quantidade:", errors.length);
for (const item of errors.slice(0, 20)) {
  console.log(`\n[${item.level}] ${item.created}`);
  console.log("msg:", (item.message || "").slice(0, 400));
  console.log("data:", JSON.stringify(item.data || {}).slice(0, 500));
}

// Logs com "mail", "smtp", "verification", "reset" no message
console.log("\n=== Logs com e-mail no message ===");
const mailLogs = items.filter(i => /mail|smtp|verification|reset/i.test(i.message || ""));
console.log("quantidade:", mailLogs.length);
for (const item of mailLogs.slice(0, 20)) {
  console.log(`\n[${item.level}] ${item.created}`);
  console.log("msg:", (item.message || "").slice(0, 300));
  console.log("data:", JSON.stringify(item.data || {}).slice(0, 400));
}
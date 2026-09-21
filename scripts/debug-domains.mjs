// Verificar SMTP.password + qual bundle cada domínio serve
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
const PB_URL = (env.VITE_POCKETBASE_URL || "https://centraldedados.dev.br").replace(/\/+$/, "");

// 1. Login superuser
const authResp = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ identity: env.PB_EMAIL, password: env.PB_PASSWORD }),
});
const auth = await authResp.json();
const token = auth.token;
if (!token) { console.log("Falha login"); process.exit(1); }
console.log("Login OK");

// 2. settings completas (checar smtp.password)
const sResp = await fetch(`${PB_URL}/api/settings`, { headers: { Authorization: token } });
const settings = await sResp.json();
console.log("\n=== SMTP ===");
console.log(JSON.stringify({ ...settings.smtp, password: settings.smtp?.password ? "***CONFIGURADO***" : "VAZIO" }, null, 2));

// 3. Testar domínios
for (const host of ["https://centraldedados.dev.br", "https://painelsorriso53.pages.dev"]) {
  try {
    const r = await fetch(host, { redirect: "manual" });
    const text = await r.text();
    const bundleMatch = text.match(/assets\/index-([A-Za-z0-9_-]+)\.js/) || text.match(/index-([A-Za-z0-9_-]+)\.js/);
    console.log(`\n=== ${host} → status ${r.status} ${r.statusText} ===`);
    console.log("bundle:", bundleMatch ? bundleMatch[1] : "não encontrado no HTML");
    console.log("title:", (text.match(/<title>(.*?)<\/title>/) || [])[1] || "—");
  } catch (e) {
    console.log(`\n=== ${host} → ERRO: ${e.message}`);
  }
}
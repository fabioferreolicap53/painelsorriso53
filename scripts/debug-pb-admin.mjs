// Diagnóstico: login superuser e inspeção de settings SMTP + templates de verificação
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");
const envRaw = fs.readFileSync(envPath, "utf-8");
const env = {};
for (const line of envRaw.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

const PB_URL = (env.VITE_POCKETBASE_URL || "https://centraldedados.dev.br").replace(/\/+$/, "");
const EMAIL = env.PB_EMAIL;
const PASSWORD = env.PB_PASSWORD;

async function tryLogin(label, url, body) {
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await resp.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* não json */ }
    if (resp.ok) {
      console.log(`\n[OK] ${label}: ${resp.status}`);
      return data;
    }
    console.log(`\n[FAIL] ${label}: ${resp.status} ${text.slice(0, 200)}`);
  } catch (e) {
    console.log(`\n[ERR] ${label}: ${e.message}`);
  }
  return null;
}

const tokenAdmin = await tryLogin("auth admins", `${PB_URL}/api/admins/auth-with-password`, {
  identity: EMAIL,
  password: PASSWORD,
});

let token = tokenAdmin ? tokenAdmin.token : null;

if (!token) {
  const t2 = await tryLogin("auth _superusers", `${PB_URL}/api/collections/_superusers/auth-with-password`, {
    identity: EMAIL,
    password: PASSWORD,
  });
  token = t2 ? t2.token : null;
}

if (!token) {
  console.error("\nNão consegui autenticar como admin. Verifique PB_EMAIL/PB_PASSWORD no .env");
  process.exit(1);
}

async function get(label, url) {
  const resp = await fetch(url, {
    headers: { Authorization: token },
  });
  const text = await resp.text();
  console.log(`\n===== GET ${label} → ${resp.status} =====`);
  if (resp.ok) {
    try {
      const data = JSON.parse(text);
      return data;
    } catch {
      console.log(text.slice(0, 1000));
      return null;
    }
  }
  console.log(text.slice(0, 1000));
  return null;
}

await get("settings (SMTP/mail)", `${PB_URL}/api/settings`);

const coll = await get("collection painelsorriso53_users", `${PB_URL}/api/collections/painelsorriso53_users`);

if (coll) {
  const opts = {
    verificationTemplate: coll.verificationTemplate ?? null,
    resetPasswordTemplate: coll.resetPasswordTemplate ?? null,
    confirmEmailChangeTemplate: coll.confirmEmailChangeTemplate ?? null,
    passwordAuth: coll.passwordAuth ?? null,
    options: {
      allowEmailAuth: coll.options?.allowEmailAuth,
      minPasswordLength: coll.options?.minPasswordLength,
      requireEmail: coll.options?.requireEmail,
      exceptEmailDomains: coll.options?.exceptEmailDomains,
      onlyEmailDomains: coll.options?.onlyEmailDomains,
    },
  };
  console.log("\n===== Config de e-mail da collection =====");
  console.log(JSON.stringify(opts, null, 2));
}

const sett = await get("settings completo", `${PB_URL}/api/settings`);
if (sett && sett.meta) {
  console.log("\n===== meta (appUrl) =====");
  console.log(JSON.stringify(sett.meta, null, 2));
}
if (sett && sett.smtp) {
  console.log("\n===== smtp =====");
  console.log(JSON.stringify(sett.smtp, null, 2));
}
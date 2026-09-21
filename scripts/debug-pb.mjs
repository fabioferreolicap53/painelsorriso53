import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  const envPath = resolve(__dirname, "..", ".env");
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && rest.length > 0) process.env[key.trim()] = rest.join("=").trim();
  }
} catch {}

const PB_URL = process.env.VITE_POCKETBASE_URL;
const COLLECTION = "painelsorriso53_users";

// 1. GET collection config
console.log(`\n=== GET /api/collections/${COLLECTION} ===`);
try {
  const resp = await fetch(`${PB_URL}/api/collections/${COLLECTION}`, { headers: { "Accept": "application/json" } });
  console.log(`Status: ${resp.status}`);
  const data = await resp.json();
  console.log(JSON.stringify({
    name: data.name,
    type: data.type,
    emailVisibility: data.emailVisibility,
    passwordAuth: data.passwordAuth,
    authAlert: data.authAlert,
    verificationToken: data.verificationToken,
    manageRule: data.manageRule,
    deleteRule: data.deleteRule,
    options: data.options,
  }, null, 2));
} catch (e) {
  console.log("ERRO:", e.message);
}

// 2. Test request-verification (JSON) com email inexistente (nao envia email real)
console.log(`\n=== POST request-verification (JSON) - email inexistente ===`);
try {
  const resp = await fetch(`${PB_URL}/api/collections/${COLLECTION}/request-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ email: "naoexiste-abc123@gmail.com" }),
  });
  console.log(`Status: ${resp.status}`);
  const json = await resp.json().catch(() => ({}));
  console.log("Response:", JSON.stringify(json));
} catch (e) {
  console.log("ERRO:", e.message);
}

// 3. Test request-verification (form-urlencoded)
console.log(`\n=== POST request-verification (form) - email inexistente ===`);
try {
  const resp = await fetch(`${PB_URL}/api/collections/${COLLECTION}/request-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
    body: "email=" + encodeURIComponent("naoexiste-abc123@gmail.com"),
  });
  console.log(`Status: ${resp.status}`);
  const json = await resp.json().catch(() => ({}));
  console.log("Response:", JSON.stringify(json));
} catch (e) {
  console.log("ERRO:", e.message);
}
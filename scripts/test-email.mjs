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

async function testRequestVerification(email) {
  console.log(`\nTestando request-verification para: ${email}`);
  const resp = await fetch(`${PB_URL}/api/collections/${COLLECTION}/request-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await resp.json().catch(() => ({}));
  console.log(`Status: ${resp.status}`);
  console.log(`Response:`, JSON.stringify(data, null, 2));
}

async function testConfirmVerification(token) {
  console.log(`\nTestando confirm-verification com token: ${token.substring(0, 30)}...`);
  
  // Test JSON
  console.log("\n--- JSON body ---");
  let resp = await fetch(`${PB_URL}/api/collections/${COLLECTION}/confirm-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ token }),
  });
  let data = await resp.json().catch(() => ({}));
  console.log(`Status: ${resp.status}`);
  console.log(`Response:`, JSON.stringify(data, null, 2));

  // Test form-urlencoded
  console.log("\n--- form-urlencoded body ---");
  resp = await fetch(`${PB_URL}/api/collections/${COLLECTION}/confirm-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "token=" + encodeURIComponent(token),
  });
  data = await resp.json().catch(() => ({}));
  console.log(`Status: ${resp.status}`);
  console.log(`Response:`, JSON.stringify(data, null, 2));
}

async function testRegister(email, password) {
  console.log(`\nTestando registro: ${email}`);
  const resp = await fetch(`${PB_URL}/api/collections/${COLLECTION}/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, passwordConfirm: password }),
  });
  const data = await resp.json().catch(() => ({}));
  console.log(`Status: ${resp.status}`);
  console.log(`Response:`, JSON.stringify(data, null, 2));
  return data;
}

async function checkCollectionOptions() {
  console.log("\nVerificando collection config...");
  const resp = await fetch(`${PB_URL}/api/collections/${COLLECTION}`);
  const data = await resp.json().catch(() => ({}));
  console.log("passwordAuth:", JSON.stringify(data.passwordAuth, null, 2));
  console.log("authAlert:", JSON.stringify(data.authAlert, null, 2));
  console.log("verificationToken:", JSON.stringify(data.verificationToken, null, 2));
}

// Run tests
const email = process.env.PB_EMAIL || "fabioferreoli.cap53@gmail.com";

await checkCollectionOptions();
await testRequestVerification(email);

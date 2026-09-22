// UI demonstration only. Production sessions must be issued and enforced by the patient BFF.
const key = "tatva-demo-credential";
const encoder = new TextEncoder();
async function derive(value, salt) {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(value),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    material,
    256,
  );
  return Array.from(new Uint8Array(bits), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
}
export async function saveDemoCredential(value, type) {
  const salt = crypto.randomUUID();
  const hash = await derive(value, salt);
  localStorage.setItem(
    key,
    JSON.stringify({ salt, hash, type, failures: 0, lockedUntil: 0 }),
  );
}
export function getCredentialType() {
  try {
    return JSON.parse(localStorage.getItem(key))?.type;
  } catch {
    return null;
  }
}
export async function verifyDemoCredential(value) {
  const credential = JSON.parse(localStorage.getItem(key) || "null");
  if (!credential)
    throw new Error(
      "Set a quick PIN or password in Settings first, or use the demo OTP.",
    );
  if (credential.lockedUntil > Date.now())
    throw new Error(
      "Too many attempts. Try again in five minutes, or use the demo OTP.",
    );
  if ((await derive(value, credential.salt)) !== credential.hash) {
    credential.failures++;
    if (credential.failures >= 5) credential.lockedUntil = Date.now() + 300000;
    localStorage.setItem(key, JSON.stringify(credential));
    throw new Error("That PIN or password did not match.");
  }
  localStorage.setItem(
    key,
    JSON.stringify({ ...credential, failures: 0, lockedUntil: 0 }),
  );
  return true;
}

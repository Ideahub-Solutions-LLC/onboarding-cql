const encoder = new TextEncoder();
const ITERATIONS = 210_000;

const encode = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");
const decode = (value: string) => new Uint8Array(Buffer.from(value, "base64url"));

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt.buffer as ArrayBuffer, iterations },
    key,
    256,
  ));
}

export async function hashPassword(password: string) {
  if (password.length < 12 || password.length > 200) throw new Error("Password must be between 12 and 200 characters.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${encode(salt)}$${encode(await derive(password, salt, ITERATIONS))}`;
}

export async function verifyPassword(password: string, encoded: string | undefined) {
  if (!encoded || password.length > 200) return false;
  const [algorithm, count, saltValue, expectedValue] = encoded.split("$");
  const iterations = Number(count);
  if (algorithm !== "pbkdf2" || !Number.isInteger(iterations) || iterations < 100_000 || !saltValue || !expectedValue) return false;
  try {
    const actual = await derive(password, decode(saltValue), iterations);
    const expected = decode(expectedValue);
    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let index = 0; index < actual.length; index++) difference |= actual[index] ^ expected[index];
    return difference === 0;
  } catch {
    return false;
  }
}

export async function safePasswordMatch(actual: string, expected: string | undefined) {
  if (!expected || actual.length > 200) return false;
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(actual)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a[index] ^ b[index];
  return difference === 0;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a canonical RFC 4122 UUID (the id type used by Supabase). */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Creates a UUID v4. Supabase catalog ids are `uuid`, so new bags and lectures
 * must use this instead of the old short prototype ids.
 */
export function createUuid(): string {
  const cryptoObj = globalThis.crypto;
  if (typeof cryptoObj?.randomUUID === "function") return cryptoObj.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof cryptoObj?.getRandomValues === "function") cryptoObj.getRandomValues(bytes);
  else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }

  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

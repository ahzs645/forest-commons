/** Exact explicit origin allowlist; no wildcard and no credential-bearing URL. */
export function allowedOrigin(origin: string | undefined, host: string | undefined, configured = "") {
  if (!origin) return true;
  let parsed: URL;
  try { parsed = new URL(origin); } catch { return false; }
  if (parsed.origin !== origin || !["http:", "https:"].includes(parsed.protocol)) return false;
  return parsed.host === host || configured.split(",").map(x => x.trim()).filter(Boolean).includes(origin);
}

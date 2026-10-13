const encoder = new TextEncoder();
const decode = value => Uint8Array.from(atob(value.replace(/-/g,"+").replace(/_/g,"/")), c => c.charCodeAt(0));
const jsonPart = value => JSON.parse(new TextDecoder().decode(decode(value)));

export function accessIssuer(env) {
  const value = String(env.ACCESS_TEAM_DOMAIN || "").trim().replace(/\/$/, "");
  if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/i.test(value)) throw new Error("ACCESS_SETUP");
  if (!/^[a-z0-9]{32,128}$/i.test(String(env.ACCESS_AUD || ""))) throw new Error("ACCESS_SETUP");
  return value;
}

// Each Worker isolate caches the issuer's public signing keys, never a user's JWT.
export function createAuthenticator(fetcher = fetch) {
  const cache = new Map();
  async function keys(issuer, refresh = false) {
    const saved = cache.get(issuer);
    if (!refresh && saved && saved.until > Date.now()) return saved.keys;
    const response = await fetcher(`${issuer}/cdn-cgi/access/certs`, { signal:AbortSignal.timeout(10000), redirect:"error" });
    if (!response.ok) throw new Error("AUTH_UNAVAILABLE");
    const body = await response.json();
    if (!Array.isArray(body.keys)) throw new Error("AUTH_UNAVAILABLE");
    cache.set(issuer, {keys:body.keys, until:Date.now()+300000});
    return body.keys;
  }
  return async function authenticate(request, env) {
    const url = new URL(request.url);
    // This preview identity is impossible on a public HTTPS Worker, even if the flag is copied there.
    if (env.LOCAL_DEV === "true" && url.protocol === "http:" && ["127.0.0.1","localhost","[::1]"].includes(url.hostname)) {
      return {id:"local-preview", email:"local-preview@example.test", local:true};
    }
    const issuer = accessIssuer(env);
    const token = request.headers.get("cf-access-jwt-assertion");
    if (!token || token.length > 16384) return null;
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      const header = jsonPart(parts[0]), payload = jsonPart(parts[1]);
      const now = Math.floor(Date.now()/1000);
      if (header.alg !== "RS256" || typeof header.kid !== "string") return null;
      if (payload.iss !== issuer || !Array.isArray(payload.aud) || !payload.aud.includes(env.ACCESS_AUD)) return null;
      if (payload.type !== "app" || typeof payload.sub !== "string" || !payload.sub || payload.sub.length > 200) return null;
      if (typeof payload.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) || payload.email.length > 254) return null;
      if (!Number.isSafeInteger(payload.exp) || payload.exp <= now) return null;
      if (payload.nbf !== undefined && (!Number.isSafeInteger(payload.nbf) || payload.nbf > now+30)) return null;
      if (payload.iat !== undefined && (!Number.isSafeInteger(payload.iat) || payload.iat > now+30)) return null;
      let jwk = (await keys(issuer)).find(k => k.kid === header.kid && k.kty === "RSA");
      if (!jwk) jwk = (await keys(issuer,true)).find(k => k.kid === header.kid && k.kty === "RSA");
      if (!jwk) return null;
      const key = await crypto.subtle.importKey("jwk", jwk, {name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"}, false, ["verify"]);
      const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,decode(parts[2]),encoder.encode(`${parts[0]}.${parts[1]}`));
      return valid ? {id:`access:${payload.sub}`,email:payload.email.toLowerCase(),local:false} : null;
    } catch { return null; }
  };
}

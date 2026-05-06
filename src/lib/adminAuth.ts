interface JwksKey extends JsonWebKey {
  kid: string;
  alg?: string;
}

function importParams(alg: string): RsaHashedImportParams | EcKeyImportParams {
  if (alg === 'ES256') return { name: 'ECDSA', namedCurve: 'P-256' };
  return { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
}

function verifyParams(alg: string): AlgorithmIdentifier | EcdsaParams {
  if (alg === 'ES256') return { name: 'ECDSA', hash: 'SHA-256' };
  return { name: 'RSASSA-PKCS1-v1_5' };
}

async function verifyAccessJwt(token: string, teamDomain: string): Promise<string | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;

    const decode = (s: string) => JSON.parse(atob(s.replace(/-/g, '+').replace(/_/g, '/')));
    const header = decode(headerB64);
    const payload = decode(payloadB64);

    if (payload.exp && Date.now() / 1000 > payload.exp) return null;

    const jwksRes = await fetch(`https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`);
    if (!jwksRes.ok) return null;
    const { keys } = await jwksRes.json<{ keys: JwksKey[] }>();
    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) return null;

    const cryptoKey = await crypto.subtle.importKey('jwk', jwk, importParams(header.alg), false, ['verify']);
    const sigBytes = Uint8Array.from(atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const valid = await crypto.subtle.verify(verifyParams(header.alg), cryptoKey, sigBytes, data);

    return valid ? (payload.email ?? null) : null;
  } catch {
    return null;
  }
}

function parseCookieToken(cookieHeader: string): string | null {
  const match = cookieHeader.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Returns the authenticated admin email, or null if not authenticated.
 * Checks (in order): CF Access header, CF Access JWT cookie, Basic Auth secret.
 */
export async function getAdminEmail(request: Request, env: Env): Promise<string | null> {
  // Cloudflare Access header
  const headerEmail = request.headers.get('CF-Access-Authenticated-User-Email');
  if (headerEmail) return headerEmail;

  // Cloudflare Access JWT cookie
  const teamDomain = (env as unknown as Record<string, string>).CF_TEAM_DOMAIN;
  if (teamDomain) {
    const token = parseCookieToken(request.headers.get('Cookie') ?? '');
    if (token) {
      const email = await verifyAccessJwt(token, teamDomain);
      if (email) return email;
    }
  }

  // Basic Auth fallback (local dev)
  const auth = request.headers.get('Authorization') ?? '';
  if (auth.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const password = decoded.split(':').slice(1).join(':');
      if (password === env.ADMIN_SECRET) return 'admin';
    } catch { /* fall through */ }
  }

  return null;
}

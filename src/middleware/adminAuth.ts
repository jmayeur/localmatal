import type { Context, Next } from 'hono';
import { AppError, ErrorCode } from '../lib/errors';

interface JwksKey extends JsonWebKey {
  kid: string;
}

function algParams(alg: string): AlgorithmIdentifier | RsaPssParams | EcdsaParams {
  if (alg === 'ES256') return { name: 'ECDSA', hash: 'SHA-256' };
  return { name: 'RSASSA-PKCS1-v1_5' }; // RS256
}

function importParams(alg: string): RsaHashedImportParams | EcKeyImportParams {
  if (alg === 'ES256') return { name: 'ECDSA', namedCurve: 'P-256' };
  return { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
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

    const jwksRes = await fetch(
      `https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`,
    );
    if (!jwksRes.ok) return null;
    const { keys } = await jwksRes.json<{ keys: JwksKey[] }>();
    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) return null;

    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      importParams(header.alg),
      false,
      ['verify'],
    );

    const sigBytes = Uint8Array.from(
      atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')),
      (ch) => ch.charCodeAt(0),
    );
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const valid = await crypto.subtle.verify(algParams(header.alg), cryptoKey, sigBytes, data);

    return valid ? (payload.email ?? null) : null;
  } catch {
    return null;
  }
}

export async function adminAuthMiddleware(c: Context, next: Next) {
  const env = c.env as unknown as Env;

  // Cloudflare Access header (injected in some Access configurations)
  const headerEmail = c.req.header('CF-Access-Authenticated-User-Email');
  if (headerEmail) {
    c.set('adminEmail', headerEmail);
    await next();
    return;
  }

  // Cloudflare Access JWT cookie (standard browser flow)
  const teamDomain = (env as unknown as Record<string, string>).CF_TEAM_DOMAIN;
  if (teamDomain) {
    const cookieHeader = c.req.header('Cookie') ?? '';
    const match = cookieHeader.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
    if (match) {
      const email = await verifyAccessJwt(match[1], teamDomain);
      if (email) {
        c.set('adminEmail', email);
        await next();
        return;
      }
    }
  }

  // Fall back to HTTP Basic Auth (local dev / wrangler dev)
  const auth = c.req.header('Authorization') ?? '';
  if (auth.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const password = decoded.split(':').slice(1).join(':');
      if (password === env.ADMIN_SECRET) {
        c.set('adminEmail', 'admin');
        await next();
        return;
      }
    } catch { /* fall through */ }
  }

  throw new AppError(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
}

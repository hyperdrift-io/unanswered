// A service-account access token for Vertex AI, minted by hand: sign a JWT with the
// account's private key, exchange it at Google's token endpoint, cache it until it
// is about to expire. No SDK, no dependency: node:crypto does the RS256.

import { createSign } from 'node:crypto';

type ServiceAccount = { client_email: string; private_key: string; project_id: string };

let cached: { token: string; expiresAt: number } | null = null;

const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

export function serviceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SA_KEY_B64;
  if (!raw) return null;
  return JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as ServiceAccount;
}

export async function accessToken(sa: ServiceAccount): Promise<string> {
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).end().sign(sa.private_key).toString('base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  const data = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!data.access_token) throw new Error(`Google token: ${data.error_description ?? res.status}`);
  cached = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return cached.token;
}

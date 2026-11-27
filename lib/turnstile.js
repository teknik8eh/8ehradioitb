export async function verifyTurnstile(token, remoteIp) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, unavailable: true };
  if (typeof token !== 'string' || !token || token.length > 2048) {
    return { ok: false, unavailable: false };
  }

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set('remoteip', remoteIp);
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { ok: false, unavailable: true };
    const result = await response.json();
    return { ok: result.success === true, unavailable: false };
  } catch {
    return { ok: false, unavailable: true };
  }
}

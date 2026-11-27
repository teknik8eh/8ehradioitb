import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyTurnstile } from './turnstile.js';

const originalFetch = globalThis.fetch;
const originalSecret = process.env.TURNSTILE_SECRET_KEY;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = originalSecret;
});

test('rejects missing token without calling Siteverify', async () => {
  process.env.TURNSTILE_SECRET_KEY = 'test-secret';
  globalThis.fetch = () => { throw new Error('Siteverify should not be called'); };
  assert.deepEqual(await verifyTurnstile('', null), { ok: false, unavailable: false });
});

test('accepts only successful Siteverify response', async () => {
  process.env.TURNSTILE_SECRET_KEY = 'test-secret';
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.body.get('response'), 'valid-token');
    assert.equal(options.body.get('secret'), 'test-secret');
    return { ok: true, json: async () => ({ success: true }) };
  };
  assert.deepEqual(await verifyTurnstile('valid-token', null), { ok: true, unavailable: false });
});

test('rejects expired or used token', async () => {
  process.env.TURNSTILE_SECRET_KEY = 'test-secret';
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
  });
  assert.deepEqual(await verifyTurnstile('expired-token', null), { ok: false, unavailable: false });
});

test('fails closed when Siteverify is unavailable', async () => {
  process.env.TURNSTILE_SECRET_KEY = 'test-secret';
  globalThis.fetch = async () => { throw new Error('network unavailable'); };
  assert.deepEqual(await verifyTurnstile('token', null), { ok: false, unavailable: true });
});

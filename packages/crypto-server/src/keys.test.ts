import { describe, expect, it } from 'vitest';

import { KeyService } from './keys.js';
import { DeterministicKms } from './kms.js';

function service() {
  return new KeyService({
    kms: new DeterministicKms(),
    hmacKeyId: 'test-hmac-cmk',
    wrapKeyId: 'test-wrap-cmk',
  });
}

const token = { v: 'QG2', ev: 'EVT1', tkt: '0000000001', ep: 1 };

describe('KeyService (deterministic KMS)', () => {
  it('known vector: fixed inputs produce a stable, well-formed signature', async () => {
    const svc = service();
    const eventKey = await svc.getEventKey('event-aaaa', 1);
    const ticketKey = svc.getTicketKey(eventKey, 'ABCDEFGHJKMN');
    const sig = svc.signToken(ticketKey, token);
    // Deterministic across calls.
    expect(svc.signToken(ticketKey, token)).toBe(sig);
    // 10 bytes -> 16 Crockford chars, alphabet without I L O U.
    expect(sig).toMatch(/^[0-9A-HJKMNP-TV-Z]{16}$/);
    // TODO(F0-03): pin the concrete value with `toMatchInlineSnapshot` once the
    // real KMS decision lands and the algorithm is frozen.
  });

  it('different event_id yields a different event key', async () => {
    const svc = service();
    const a = Buffer.from(await svc.getEventKey('event-aaaa', 1)).toString('hex');
    const b = Buffer.from(await svc.getEventKey('event-bbbb', 1)).toString('hex');
    expect(a).not.toBe(b);
  });

  it('bumping key_version changes the signature', async () => {
    const svc = service();
    const k1 = svc.getTicketKey(await svc.getEventKey('event-aaaa', 1), 'CODE00000000');
    const k2 = svc.getTicketKey(await svc.getEventKey('event-aaaa', 2), 'CODE00000000');
    expect(svc.signToken(k1, token)).not.toBe(svc.signToken(k2, token));
  });

  it('manifest key wrap/unwrap round-trips', async () => {
    const svc = service();
    const kms = new DeterministicKms();
    const priv = Buffer.from('an ed25519 private key placeholder 32ish');
    const wrapped = await kms.encrypt('test-wrap-cmk', priv);
    expect(Buffer.from(wrapped).equals(priv)).toBe(false);
    const unwrapped = await svc.getManifestSigningKey(wrapped);
    expect(Buffer.from(unwrapped).equals(priv)).toBe(true);
  });
});

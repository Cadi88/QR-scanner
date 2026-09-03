/**
 * Key derivation and token signing — F0-03.
 *
 *   event key   = KMS.GenerateMac(CMK_HMAC, event_id || "|qr-v" || key_version)
 *   ticket key  = HMAC-SHA256(event key, public_code)
 *   sig         = base32(HMAC-SHA256(ticket key, v|ev|tkt|ep)[0..9])   // 10 bytes
 *
 * The event key is cached in-process with a short TTL and never persisted
 * (R-05-17). `sig` is never stored (R-05-03) — it is recomputed on demand.
 */

import { createHmac } from 'node:crypto';

import { encodeCrockford32 } from './base32.js';
import type { KmsClient } from './kms.js';

const EVENT_KEY_TTL_MS = 15 * 60 * 1000;

type CacheEntry = { key: Uint8Array; expiresAt: number };

export type KeyServiceOptions = {
  kms: KmsClient;
  /** CMK id for the HMAC master key (GenerateMac). */
  hmacKeyId: string;
  /** CMK id used to wrap/unwrap the Ed25519 manifest private key. */
  wrapKeyId: string;
  now?: () => number;
};

export class KeyService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly now: () => number;

  constructor(private readonly opts: KeyServiceOptions) {
    this.now = opts.now ?? (() => Date.now());
  }

  async getEventKey(eventId: string, keyVersion: number): Promise<Uint8Array> {
    const cacheKey = `${eventId}|${keyVersion}`;
    const hit = this.cache.get(cacheKey);
    if (hit && hit.expiresAt > this.now()) return hit.key;

    const message = Buffer.from(`${eventId}|qr-v${keyVersion}`, 'utf8');
    const key = await this.opts.kms.generateMac(this.opts.hmacKeyId, message);
    this.cache.set(cacheKey, { key, expiresAt: this.now() + EVENT_KEY_TTL_MS });
    return key;
  }

  getTicketKey(eventKey: Uint8Array, publicCode: string): Uint8Array {
    return createHmac('sha256', eventKey).update(publicCode, 'utf8').digest();
  }

  /** `sig` field of the QR token: base32 of the first 10 HMAC bytes (~16 chars). */
  signToken(
    ticketKey: Uint8Array,
    parts: { v: string; ev: string; tkt: string; ep: number },
  ): string {
    const msg = `${parts.v}|${parts.ev}|${parts.tkt}|${parts.ep}`;
    const mac = createHmac('sha256', ticketKey).update(msg, 'utf8').digest();
    return encodeCrockford32(mac.subarray(0, 10));
  }

  async getManifestSigningKey(
    wrappedPrivateKey: Uint8Array,
  ): Promise<Uint8Array> {
    return this.opts.kms.decrypt(this.opts.wrapKeyId, wrappedPrivateKey);
  }

  /** Test/lifecycle hook — R-05-17: never let a derived key outlive its TTL. */
  clearCache(): void {
    this.cache.clear();
  }
}

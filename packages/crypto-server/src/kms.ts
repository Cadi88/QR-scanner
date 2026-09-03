/**
 * KMS facade — R-05-16, R-05-17, R-05-19.
 *
 * The event key is derived by an HMAC *inside* KMS (`GenerateMac`) so the
 * master key never leaves. The Ed25519 manifest key cannot live in AWS KMS
 * (no Ed25519 there) — it is generated in-process and wrapped with
 * `kms:Encrypt`. See F0-03.
 *
 * BLOCKED (F0-03): the real AWS implementation and the decision about which
 * runtime calls KMS are out of scope for this pass. `DeterministicKms` is a
 * dev/CI stand-in behind the same interface so issuance (F1-05) is not
 * blocked. It is NOT secure and must never be selected in production.
 */

import { createHmac, hkdfSync } from 'node:crypto';

export interface KmsClient {
  /** KMS GenerateMac(CMK_HMAC, message) → raw MAC bytes. */
  generateMac(keyId: string, message: Uint8Array): Promise<Uint8Array>;
  /** KMS Encrypt → opaque ciphertext blob. */
  encrypt(keyId: string, plaintext: Uint8Array): Promise<Uint8Array>;
  /** KMS Decrypt → plaintext. */
  decrypt(keyId: string, ciphertext: Uint8Array): Promise<Uint8Array>;
}

/**
 * Deterministic local stand-in. Derives everything from a fixed dev secret via
 * HKDF/HMAC so tests get stable known vectors. No network, no real KMS.
 */
export class DeterministicKms implements KmsClient {
  constructor(private readonly devSecret = 'qr-access-dev-kms-secret') {}

  private root(keyId: string): Buffer {
    return Buffer.from(
      hkdfSync('sha256', Buffer.from(this.devSecret), Buffer.from(keyId), Buffer.from('root'), 32),
    );
  }

  async generateMac(keyId: string, message: Uint8Array): Promise<Uint8Array> {
    return createHmac('sha256', this.root(keyId)).update(message).digest();
  }

  async encrypt(keyId: string, plaintext: Uint8Array): Promise<Uint8Array> {
    // XOR keystream — reversible, deterministic, obviously not for production.
    const key = this.root(`${keyId}|wrap`);
    const out = Buffer.alloc(plaintext.length);
    for (let i = 0; i < plaintext.length; i++) {
      out[i] = plaintext[i]! ^ key[i % key.length]!;
    }
    return out;
  }

  async decrypt(keyId: string, ciphertext: Uint8Array): Promise<Uint8Array> {
    return this.encrypt(keyId, ciphertext);
  }
}

export function createKmsClient(): KmsClient {
  // TODO(F0-03): switch on env (AWS region + CMK ids) once the infra decision
  // is made. Until then, dev-only.
  return new DeterministicKms();
}

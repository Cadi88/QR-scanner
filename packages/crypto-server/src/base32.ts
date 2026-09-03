/**
 * Crockford Base32 (alphabet without I, L, O, U).
 *
 * TEMPORARY HOME. The plan puts the canonical codec in `packages/qr`
 * (F1-05). This is the minimal encoder `signToken` needs now; move it and
 * delete this file when packages/qr lands.
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function encodeCrockford32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

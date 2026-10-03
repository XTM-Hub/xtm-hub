import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';
import { PULSE_SALT_BYTES } from './pulse.const';

const AES_BLOCK_BYTES = 16;

const aesAlgorithmForKey = (key: Buffer): 'aes-128-ecb' | 'aes-256-ecb' => {
  if (key.length === 16) {
    return 'aes-128-ecb';
  }
  if (key.length === 32) {
    return 'aes-256-ecb';
  }
  throw new Error(`Unsupported AES key length: ${key.length} bytes`);
};

// ECB is used on purpose: every value is exactly one block, so the cipher
// acts as a keyed permutation of 128-bit keys (no padding, no IV).
const transformBlock = (
  mode: 'encrypt' | 'decrypt',
  key: Buffer,
  block: Buffer
): Buffer => {
  if (block.length !== AES_BLOCK_BYTES) {
    throw new Error(
      `Threat Pulse keys are single AES blocks, got ${block.length} bytes`
    );
  }
  const algorithm = aesAlgorithmForKey(key);
  const cipher =
    mode === 'encrypt'
      ? createCipheriv(algorithm, key, null)
      : createDecipheriv(algorithm, key, null);
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(block), cipher.final()]);
};

export const PulseCrypto = {
  generateSalt: (): Buffer => randomBytes(PULSE_SALT_BYTES),

  transportHashToStableKey: (transportHash: string, salt: Buffer): Buffer =>
    transformBlock('decrypt', salt, Buffer.from(transportHash, 'hex')),

  stableKeyToTransportHash: (stableKey: Buffer, salt: Buffer): string =>
    transformBlock('encrypt', salt, stableKey).toString('hex'),

  stableKeyToAtRestKey: (stableKey: Buffer, atRestSecret: Buffer): Buffer =>
    transformBlock('encrypt', atRestSecret, stableKey),

  atRestKeyToStableKey: (atRestKey: Buffer, atRestSecret: Buffer): Buffer =>
    transformBlock('decrypt', atRestSecret, atRestKey),

  transportHashToAtRestKey: (
    transportHash: string,
    salt: Buffer,
    atRestSecret: Buffer
  ): string =>
    PulseCrypto.stableKeyToAtRestKey(
      PulseCrypto.transportHashToStableKey(transportHash, salt),
      atRestSecret
    ).toString('hex'),

  atRestKeyToTransportHash: (
    atRestKey: string,
    salt: Buffer,
    atRestSecret: Buffer
  ): string =>
    PulseCrypto.stableKeyToTransportHash(
      PulseCrypto.atRestKeyToStableKey(
        Buffer.from(atRestKey, 'hex'),
        atRestSecret
      ),
      salt
    ),

  platformPseudonym: (platformId: string, platformSecret: Buffer): string =>
    createHmac('sha256', platformSecret)
      .update(platformId, 'utf8')
      .digest('hex'),
};

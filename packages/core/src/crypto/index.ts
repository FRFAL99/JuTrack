export type { RandomSource, SecureKeyStore } from './types';

export {
  VAULT_KEY_BYTES,
  generateVaultKey,
  deriveVaultKeys,
  authToken,
  secretsMatch,
  assertVaultKey,
  type VaultKeys,
} from './keys';

export { SEAL_VERSION, seal, open } from './seal';

export {
  BACKUP_PREFIX,
  BACKUP_VERSION,
  DEFAULT_SCRYPT_PARAMS,
  exportBackup,
  importBackup,
  type ScryptParams,
} from './backup';

export {
  bytesToBase64url,
  base64urlToBytes,
  bytesToHex,
  hexToBytes,
  concatBytes,
  utf8ToBytes,
} from './encoding';

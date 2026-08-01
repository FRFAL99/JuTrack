import { describe, expect, it } from 'vitest';
import {
  createPairingInvite,
  DEFAULT_PAIRING_TTL_MS,
  describePairingError,
  PAIRING_CLOCK_SKEW_MS,
  PAIRING_URI_PREFIX,
  parsePairingUri,
  type PairingErrorReason,
} from './uri';
import { deriveVaultKeys, generateVaultKey, VAULT_KEY_BYTES } from '../crypto/keys';
import { bytesToBase64url } from '../crypto/encoding';
import { fixedRandom } from '../crypto/testing';

const NOW = 1_800_000_000_000;
const key = generateVaultKey(fixedRandom());

describe('createPairingInvite', () => {
  it('produce un URI con schema, versione, chiave e scadenza', () => {
    const { uri } = createPairingInvite(key, { now: NOW });
    expect(uri).toBe(
      `${PAIRING_URI_PREFIX}?v=1&k=${bytesToBase64url(key)}&e=${Math.floor((NOW + DEFAULT_PAIRING_TTL_MS) / 1000)}`,
    );
  });

  it('non trasporta il vaultId: è derivato dalla chiave', () => {
    // Metterlo dentro allungherebbe il QR per un dato che il ricevente ricava da solo,
    // e un vaultId incoerente con la chiave produrrebbe un vault muto.
    const { uri } = createPairingInvite(key, { now: NOW });
    expect(uri).not.toContain(deriveVaultKeys(key).vaultId);
  });

  it('rifiuta una chiave di lunghezza sbagliata', () => {
    expect(() => createPairingInvite(new Uint8Array(16), { now: NOW })).toThrow(/16/);
  });

  it('resta corto abbastanza da stare in un QR leggibile da lontano', () => {
    // Oltre un centinaio di caratteri il QR sale di versione, i moduli si infittiscono
    // e inquadrarlo dall'altro telefono diventa faticoso.
    const { uri } = createPairingInvite(key, { now: NOW });
    expect(uri.length).toBeLessThan(100);
  });
});

describe('parsePairingUri', () => {
  it('recupera esattamente la chiave di partenza', () => {
    // La proprietà che conta: il telefono B deve arrivare allo stesso vault del telefono A.
    const { uri } = createPairingInvite(key, { now: NOW });
    const result = parsePairingUri(uri, NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.key).toEqual(key);
    expect(deriveVaultKeys(result.key).vaultId).toBe(deriveVaultKeys(key).vaultId);
  });

  it('ignora spazi accidentali attorno al testo incollato', () => {
    const { uri } = createPairingInvite(key, { now: NOW });
    expect(parsePairingUri(`  ${uri}\n`, NOW).ok).toBe(true);
  });

  it('accetta lo schema in maiuscolo', () => {
    // La modalità alfanumerica dei QR, più compatta, non prevede le lettere minuscole:
    // alcuni encoder trasformano il prefisso in maiuscolo.
    const { uri } = createPairingInvite(key, { now: NOW });
    const shouted = uri.replace(PAIRING_URI_PREFIX, PAIRING_URI_PREFIX.toUpperCase());
    expect(parsePairingUri(shouted, NOW).ok).toBe(true);
  });

  it('tollera un invito senza scadenza', () => {
    const result = parsePairingUri(`${PAIRING_URI_PREFIX}?v=1&k=${bytesToBase64url(key)}`, NOW);
    expect(result).toEqual({ ok: true, key, expiresAt: null });
  });

  const rejections: Array<[string, string, PairingErrorReason]> = [
    ['un QR qualsiasi del mondo', 'https://example.com/', 'not-pairing-uri'],
    ['un altro schema custom', 'otpauth://totp/x', 'not-pairing-uri'],
    ['stringa vuota', '', 'not-pairing-uri'],
    [
      'versione futura',
      `${PAIRING_URI_PREFIX}?v=2&k=${bytesToBase64url(key)}`,
      'unsupported-version',
    ],
    ['versione assente', `${PAIRING_URI_PREFIX}?k=${bytesToBase64url(key)}`, 'unsupported-version'],
    ['chiave assente', `${PAIRING_URI_PREFIX}?v=1`, 'missing-key'],
    ['chiave vuota', `${PAIRING_URI_PREFIX}?v=1&k=`, 'missing-key'],
    ['chiave non base64url', `${PAIRING_URI_PREFIX}?v=1&k=non!valido!`, 'malformed-key'],
    [
      'chiave troppo corta',
      `${PAIRING_URI_PREFIX}?v=1&k=${bytesToBase64url(key.slice(0, 16))}`,
      'malformed-key',
    ],
    [
      'chiave troppo lunga',
      `${PAIRING_URI_PREFIX}?v=1&k=${bytesToBase64url(new Uint8Array(VAULT_KEY_BYTES + 1))}`,
      'malformed-key',
    ],
  ];

  it.each(rejections)('rifiuta %s', (_label, uri, reason) => {
    expect(parsePairingUri(uri, NOW)).toEqual({ ok: false, reason });
  });

  it('rifiuta un invito scaduto', () => {
    const { uri, expiresAt } = createPairingInvite(key, { now: NOW, ttlMs: 60_000 });
    const result = parsePairingUri(uri, expiresAt + PAIRING_CLOCK_SKEW_MS + 1);
    expect(result).toEqual({ ok: false, reason: 'expired' });
  });

  it('tollera la deriva fra gli orologi dei due telefoni', () => {
    // Senza tolleranza, mezzo minuto di sfasamento farebbe rifiutare un QR appena
    // generato con un messaggio di scadenza incomprensibile per chi lo guarda.
    const { uri, expiresAt } = createPairingInvite(key, { now: NOW, ttlMs: 60_000 });
    expect(parsePairingUri(uri, expiresAt + PAIRING_CLOCK_SKEW_MS - 1).ok).toBe(true);
  });

  it('non si lascia dirottare da un parametro ripetuto', () => {
    // Accodare `&k=<chiave dell'attaccante>` a un invito legittimo non deve poter
    // sostituire la chiave: vince la prima occorrenza.
    const intruder = generateVaultKey(fixedRandom(0x99));
    const { uri } = createPairingInvite(key, { now: NOW });
    const result = parsePairingUri(`${uri}&k=${bytesToBase64url(intruder)}`, NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.key).toEqual(key);
  });

  it('non esplode su percent-encoding malformata', () => {
    const result = parsePairingUri(`${PAIRING_URI_PREFIX}?v=1&k=%E0%A4%A`, NOW);
    expect(result).toEqual({ ok: false, reason: 'malformed-key' });
  });
});

describe('describePairingError', () => {
  it('ha un messaggio per ogni motivo', () => {
    const reasons: PairingErrorReason[] = [
      'not-pairing-uri',
      'unsupported-version',
      'missing-key',
      'malformed-key',
      'expired',
    ];
    for (const reason of reasons) {
      expect(describePairingError(reason)).not.toBe('');
    }
  });
});

import { describe, expect, it } from 'vitest';
import {
  createInviteLink,
  createPairingInvite,
  DEFAULT_PAIRING_TTL_MS,
  describePairingError,
  INVITE_NAME_MAX_CHARS,
  INVITE_PATH,
  JOIN_URI_PREFIX,
  PAIRING_CLOCK_SKEW_MS,
  PAIRING_URI_PREFIX,
  parseInvite,
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

const RELAY = 'https://relay.example.workers.dev';

describe('createInviteLink', () => {
  it('mette la chiave nel fragment, mai nel percorso o nella query', () => {
    // È l'intera ragione per cui il link ha questa forma: il fragment non lascia il
    // browser, quindi non finisce nei log del relay né nelle anteprime delle chat.
    const { url } = createInviteLink(key, { baseUrl: RELAY, now: NOW });
    const [address, fragment] = url.split('#');

    expect(address).toBe(`${RELAY}${INVITE_PATH}`);
    expect(address).not.toContain(bytesToBase64url(key));
    expect(fragment).toContain(`k=${bytesToBase64url(key)}`);
  });

  it('offre lo stesso invito nello schema dell’app', () => {
    // La pagina di atterraggio costruisce esattamente questo per riaprire l'invito
    // dentro JuTrack: il fragment passa da un URL all'altro senza essere rielaborato.
    const { url, joinUri } = createInviteLink(key, { baseUrl: RELAY, now: NOW });
    expect(joinUri).toBe(`${JOIN_URI_PREFIX}#${url.split('#')[1] ?? ''}`);
  });

  it('non raddoppia la barra se il relay è configurato con quella finale', () => {
    const { url } = createInviteLink(key, { baseUrl: `${RELAY}/`, now: NOW });
    expect(url.startsWith(`${RELAY}${INVITE_PATH}#`)).toBe(true);
  });

  it('porta il nome del gruppo, così chi riceve sa dove sta entrando', () => {
    const { url } = createInviteLink(key, { baseUrl: RELAY, name: 'Casa', now: NOW });
    const result = parseInvite(url, NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.name).toBe('Casa');
  });

  it('non lascia che un nome inietti parametri nel fragment', () => {
    // Il nome è testo scelto dall'utente e finisce in un URL: senza codifica, un `&k=`
    // dentro il nome sostituirebbe la chiave dell'invito.
    const intruder = generateVaultKey(fixedRandom(0x99));
    const { url } = createInviteLink(key, {
      baseUrl: RELAY,
      name: `Casa&k=${bytesToBase64url(intruder)}`,
      now: NOW,
    });
    const result = parseInvite(url, NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.key).toEqual(key);
  });

  it('taglia un nome lunghissimo invece di trasportarlo tutto', () => {
    const { url } = createInviteLink(key, { baseUrl: RELAY, name: 'x'.repeat(500), now: NOW });
    const result = parseInvite(url, NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.name).toHaveLength(INVITE_NAME_MAX_CHARS);
  });

  it('omette il nome quando non c’è nulla da dire', () => {
    const { url } = createInviteLink(key, { baseUrl: RELAY, name: '   ', now: NOW });
    expect(url).not.toContain('n=');
    expect(parseInvite(url, NOW)).toMatchObject({ ok: true, name: null });
  });

  it('rifiuta una chiave di lunghezza sbagliata', () => {
    expect(() => createInviteLink(new Uint8Array(16), { baseUrl: RELAY, now: NOW })).toThrow(/16/);
  });
});

describe('parseInvite', () => {
  it('recupera la chiave dal link condivisibile', () => {
    const { url } = createInviteLink(key, { baseUrl: RELAY, now: NOW });
    const result = parseInvite(url, NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.key).toEqual(key);
    expect(deriveVaultKeys(result.key).vaultId).toBe(deriveVaultKeys(key).vaultId);
  });

  it('recupera la chiave dallo stesso invito riaperto nello schema dell’app', () => {
    const { joinUri } = createInviteLink(key, { baseUrl: RELAY, now: NOW });
    expect(parseInvite(joinUri, NOW)).toMatchObject({ ok: true, key });
  });

  it('accetta ancora i QR generati prima degli inviti via link', () => {
    // I codici già in circolazione devono continuare a valere: chi aggiorna l'app non
    // deve trovarsi un invito mostrato sull'altro telefono improvvisamente illeggibile.
    const { uri, expiresAt } = createPairingInvite(key, { now: NOW });
    expect(parseInvite(uri, NOW)).toEqual({ ok: true, key, name: null, expiresAt });
  });

  it('accetta un relay diverso da quello che ha generato il link', () => {
    // Il relay non è un'autorità: non decide chi entra in un gruppo, e la pagina `/j`
    // non vede nemmeno passare l'invito. Legare il parsing a un host lo trasformerebbe
    // in un permesso.
    const { url } = createInviteLink(key, { baseUrl: 'https://un-altro-relay.example', now: NOW });
    expect(parseInvite(url, NOW).ok).toBe(true);
  });

  it('ignora spazi e a capo di un link incollato da una chat', () => {
    const { url } = createInviteLink(key, { baseUrl: RELAY, now: NOW });
    expect(parseInvite(`  ${url}\n`, NOW).ok).toBe(true);
  });

  it('rifiuta un invito scaduto', () => {
    const { url, expiresAt } = createInviteLink(key, { baseUrl: RELAY, now: NOW, ttlMs: 60_000 });
    expect(parseInvite(url, expiresAt + PAIRING_CLOCK_SKEW_MS + 1)).toEqual({
      ok: false,
      reason: 'expired',
    });
  });

  it('chiama «incompleto» un link a cui la chat ha tolto il fragment', () => {
    // Succede: alcune anteprime riscrivono l'URL. Dire «non è un invito di JuTrack»
    // manderebbe l'utente a cercare il problema dalla parte sbagliata.
    expect(parseInvite(`${RELAY}${INVITE_PATH}`, NOW)).toEqual({
      ok: false,
      reason: 'missing-key',
    });
    expect(parseInvite(JOIN_URI_PREFIX, NOW)).toEqual({ ok: false, reason: 'missing-key' });
  });

  const linkRejections: Array<[string, string, PairingErrorReason]> = [
    ['una pagina qualsiasi con un fragment', 'https://example.com/x#v=1', 'not-pairing-uri'],
    ['un percorso diverso sullo stesso relay', `${RELAY}/altro#v=1`, 'not-pairing-uri'],
    [
      'versione futura',
      `${RELAY}${INVITE_PATH}#v=2&k=${bytesToBase64url(key)}`,
      'unsupported-version',
    ],
    ['chiave assente', `${RELAY}${INVITE_PATH}#v=1&n=Casa`, 'missing-key'],
    [
      'chiave troncata',
      `${RELAY}${INVITE_PATH}#v=1&k=${bytesToBase64url(key.slice(0, 16))}`,
      'malformed-key',
    ],
  ];

  it.each(linkRejections)('rifiuta %s', (_label, uri, reason) => {
    expect(parseInvite(uri, NOW)).toEqual({ ok: false, reason });
  });

  it('non si lascia dirottare da un parametro ripetuto nel fragment', () => {
    const intruder = generateVaultKey(fixedRandom(0x99));
    const { url } = createInviteLink(key, { baseUrl: RELAY, now: NOW });
    const result = parseInvite(`${url}&k=${bytesToBase64url(intruder)}`, NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.key).toEqual(key);
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

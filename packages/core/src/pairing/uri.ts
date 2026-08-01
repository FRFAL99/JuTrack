/**
 * URI di pairing: come la chiave del vault passa dal primo telefono al secondo.
 *
 * Il secondo dispositivo deve ricevere la **stessa** vaultKey del primo. Se ne generasse
 * una propria otterrebbe un `vaultId` diverso, quindi un vault diverso sul relay, e i due
 * telefoni non si sincronizzerebbero mai — sembrando però funzionare entrambi.
 *
 * Nell'URI viaggia solo la chiave: `vaultId`, `contentKey` e `authKey` sono tutte derivate
 * da essa con HKDF, quindi trasmetterle sarebbe ridondante e allargherebbe inutilmente il
 * QR.
 *
 * **La chiave è in chiaro.** Chi fotografa il QR entra nel vault e può leggere tutto.
 * È un rischio accettato e documentato nel threat model: l'interfaccia deve dichiararlo,
 * non nasconderlo. Un protocollo autenticato (SAS o PAKE) lo eliminerebbe ed è tracciato
 * fra i miglioramenti futuri.
 */
import { assertVaultKey, VAULT_KEY_BYTES } from '../crypto/keys';
import { base64urlToBytes, bytesToBase64url } from '../crypto/encoding';

/** Schema dell'app, dichiarato in `app.json`. */
export const PAIRING_URI_PREFIX = 'jutrack://pair';

/**
 * Versione del formato di pairing.
 *
 * Un dispositivo che riceve una versione che non conosce deve rifiutare, non tentare di
 * indovinare: interpretare male i byte della chiave creerebbe un vault vuoto e separato.
 */
export const PAIRING_VERSION = 1;

/**
 * Quanto resta valido un invito: cinque minuti.
 *
 * Abbastanza per inquadrare con calma, poco perché uno screenshot dimenticato nella
 * galleria smetta presto di funzionare.
 */
export const DEFAULT_PAIRING_TTL_MS = 5 * 60 * 1000;

/**
 * Sfasamento fra i due orologi tollerato in fase di verifica.
 *
 * I due telefoni non condividono un orologio: senza tolleranza, un minuto di deriva
 * farebbe rifiutare un QR appena generato, con un messaggio d'errore incomprensibile.
 */
export const PAIRING_CLOCK_SKEW_MS = 60 * 1000;

/** Invito di pairing pronto da mostrare. */
export interface PairingInvite {
  /** L'URI da codificare nel QR. */
  uri: string;
  /** Istante di scadenza, in millisecondi epoch. */
  expiresAt: number;
}

/** Motivo per cui un URI scansionato non è utilizzabile. */
export type PairingErrorReason =
  | 'not-pairing-uri'
  | 'unsupported-version'
  | 'missing-key'
  | 'malformed-key'
  | 'expired';

export type PairingParseResult =
  | { ok: true; key: Uint8Array; expiresAt: number | null }
  | { ok: false; reason: PairingErrorReason };

/**
 * Crea un invito che scade dopo `ttlMs`.
 *
 * La scadenza è una **cortesia, non una difesa**: è scritta dentro l'URI, quindi chi ne
 * ha copiato il contenuto può rimuoverla. Limita la finestra in cui un QR ripreso da una
 * vecchia foto viene accettato da un'app onesta, niente di più. La chiave, una volta
 * fotografata, resta valida finché il vault esiste.
 */
export function createPairingInvite(
  key: Uint8Array,
  options: { now: number; ttlMs?: number },
): PairingInvite {
  assertVaultKey(key);
  const ttlMs = options.ttlMs ?? DEFAULT_PAIRING_TTL_MS;
  const expiresAt = options.now + ttlMs;

  // Secondi e non millisecondi: tre caratteri in meno nel QR, e la precisione al
  // millisecondo su una scadenza di minuti non ha alcun uso.
  const params = [
    `v=${PAIRING_VERSION}`,
    `k=${bytesToBase64url(key)}`,
    `e=${Math.floor(expiresAt / 1000)}`,
  ];

  return { uri: `${PAIRING_URI_PREFIX}?${params.join('&')}`, expiresAt };
}

/**
 * Interpreta un URI scansionato o incollato.
 *
 * Restituisce un esito tipizzato invece di sollevare: qui l'input arriva da una fotocamera
 * puntata sul mondo, e un QR sbagliato è un evento ordinario da spiegare all'utente, non
 * un guasto del programma.
 */
export function parsePairingUri(uri: string, now: number): PairingParseResult {
  const trimmed = uri.trim();

  // Lo schema può arrivare in maiuscolo: alcuni encoder QR passano alla modalità
  // alfanumerica, più compatta, che non prevede le lettere minuscole.
  const separator = trimmed.indexOf('?');
  const prefix = separator === -1 ? trimmed : trimmed.slice(0, separator);
  if (prefix.toLowerCase() !== PAIRING_URI_PREFIX) return { ok: false, reason: 'not-pairing-uri' };

  const params = parseQuery(separator === -1 ? '' : trimmed.slice(separator + 1));

  const version = params.get('v');
  if (version !== String(PAIRING_VERSION)) return { ok: false, reason: 'unsupported-version' };

  const encodedKey = params.get('k');
  if (encodedKey === undefined || encodedKey === '') return { ok: false, reason: 'missing-key' };

  let key: Uint8Array;
  try {
    key = base64urlToBytes(encodedKey);
  } catch {
    return { ok: false, reason: 'malformed-key' };
  }
  if (key.length !== VAULT_KEY_BYTES) return { ok: false, reason: 'malformed-key' };

  const expiresAt = parseExpiry(params.get('e'));
  if (expiresAt !== null && now - PAIRING_CLOCK_SKEW_MS > expiresAt) {
    return { ok: false, reason: 'expired' };
  }

  return { ok: true, key, expiresAt };
}

/** Messaggio da mostrare all'utente per un pairing fallito. */
export function describePairingError(reason: PairingErrorReason): string {
  switch (reason) {
    case 'not-pairing-uri':
      return 'Questo codice non è un invito di JuTrack.';
    case 'unsupported-version':
      return 'Invito creato da una versione più recente di JuTrack. Aggiorna l’app su questo telefono.';
    case 'missing-key':
    case 'malformed-key':
      return 'Il codice è incompleto o danneggiato. Falne generare uno nuovo.';
    case 'expired':
      return 'Invito scaduto. Falne generare uno nuovo sull’altro telefono.';
  }
}

function parseQuery(query: string): Map<string, string> {
  const params = new Map<string, string>();
  if (query === '') return params;

  for (const pair of query.split('&')) {
    if (pair === '') continue;
    const eq = pair.indexOf('=');
    const name = eq === -1 ? pair : pair.slice(0, eq);
    const value = eq === -1 ? '' : pair.slice(eq + 1);
    // Il primo valore vince: un `k` ripetuto non deve poter sovrascrivere il primo,
    // altrimenti basterebbe accodare un parametro per dirottare il pairing.
    if (!params.has(name)) params.set(name, safeDecode(value));
  }
  return params;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    // Una percent-encoding malformata non deve far fallire l'intero parsing: il valore
    // grezzo verrà comunque rifiutato più avanti dalla validazione che lo riguarda.
    return value;
  }
}

/** Una scadenza assente o non numerica vale «nessuna scadenza», non «scaduto». */
function parseExpiry(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return seconds * 1000;
}

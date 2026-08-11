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
 *
 * ## Due forme, una grammatica
 *
 * Dallo Step 13 lo stesso invito viaggia anche come **link condivisibile**:
 *
 * ```
 * https://<relay>/j#v=1&k=<base64url>&n=<nome>&e=<epoch>
 *                    ▲
 *                    fragment: i browser non lo trasmettono mai al server
 * ```
 *
 * La chiave sta nel fragment di proposito: non finisce nei log del relay, né nelle
 * anteprime che le chat generano visitando il link. Il relay continua a non poter leggere
 * nulla, e la pagina che serve è statica.
 *
 * Un link inoltrabile in chat però **allarga il modello di minaccia** rispetto a un QR
 * mostrato a schermo: si copia, si inoltra e resta nella cronologia della conversazione.
 * La scadenza resta ciò che era già dichiarata di essere — una cortesia, non una difesa.
 */
import { assertVaultKey, VAULT_KEY_BYTES } from '../crypto/keys';
import { base64urlToBytes, bytesToBase64url } from '../crypto/encoding';

/** Schema dell'app, dichiarato in `app.json`. */
export const PAIRING_URI_PREFIX = 'jutrack://pair';

/**
 * Schema con cui la pagina di atterraggio del relay riapre l'invito dentro l'app.
 *
 * Distinto da `PAIRING_URI_PREFIX` perché la forma è diversa — chiave nel **fragment** e
 * non nella query — e perché i QR già in circolazione continuano a portare il vecchio
 * URI: due rotte separate evitano che una schermata debba indovinare quale delle due
 * grammatiche ha davanti.
 */
export const JOIN_URI_PREFIX = 'jutrack://join';

/** Percorso della pagina di atterraggio degli inviti, servita dal relay. */
export const INVITE_PATH = '/j';

/**
 * Quanti caratteri del nome del gruppo viaggiano nel link.
 *
 * Il nome serve solo a far vedere a chi riceve *dove* sta entrando prima di accettare:
 * l'autorevole sta dentro il vault e arriva col primo sync. Tagliarlo tiene corto un
 * link che finirà incollato in chat, dove le anteprime troncano.
 */
export const INVITE_NAME_MAX_CHARS = 64;

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

  const result = readInvite(parseQuery(separator === -1 ? '' : trimmed.slice(separator + 1)), now);
  if (!result.ok) return result;
  return { ok: true, key: result.key, expiresAt: result.expiresAt };
}

/**
 * Valida i parametri comuni alle tre forme di invito.
 *
 * Query di un `jutrack://pair?…` e fragment di un `https://…/j#…` hanno la stessa
 * grammatica: tenerne una sola evita che una delle due strade diventi più permissiva
 * dell'altra senza che nessuno se ne accorga.
 */
function readInvite(params: Map<string, string>, now: number): InviteParseResult {
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

  return { ok: true, key, name: normalizeInviteName(params.get('n')), expiresAt };
}

/**
 * Riconosce l'indirizzo che precede il fragment.
 *
 * Il confronto è sull'host **libero**: il link può essere stato generato da un relay
 * diverso da quello configurato su questo telefono, e rifiutarlo per questo bloccherebbe
 * l'ingresso in un gruppo la cui chiave è lì davanti. Il relay non è un'autorità: non
 * decide chi entra, e la pagina `/j` non vede nemmeno passare l'invito.
 */
function isInviteTarget(target: string): boolean {
  const withoutQuery = target.split('?')[0] ?? '';
  const lower = withoutQuery.toLowerCase().replace(/\/+$/, '');
  return lower === JOIN_URI_PREFIX || /^https?:\/\/[^/]+\/j$/.test(lower);
}

/**
 * Il nome del gruppo come arriva dal link: ripulito, tagliato, o assente.
 *
 * Non ci si può fidare: lo scrive chi ha generato l'invito. Vale come **suggerimento** per
 * la riga del registro locale, mai come verità — l'autorevole sta dentro il vault e
 * sovrascrive questo alla prima sincronizzazione.
 */
function normalizeInviteName(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  // I caratteri di controllo non appartengono a un nome e in una riga di lista
  // produrrebbero effetti che non si vedono nel testo ma si vedono a schermo.
  const cleaned = raw
    .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  return cleaned === '' ? null : cleaned.slice(0, INVITE_NAME_MAX_CHARS);
}

/**
 * Un invito condivisibile come link.
 *
 * `url` è quello da mandare in chat; `joinUri` è la stessa cosa nello schema dell'app, ed
 * è ciò che la pagina di atterraggio costruisce per riaprire l'invito qui dentro. Averlo
 * già pronto serve anche a chi incolla a mano quando i due telefoni non hanno modo di
 * scambiarsi un link.
 */
export interface InviteLink {
  url: string;
  joinUri: string;
  expiresAt: number;
}

/** Ciò che un invito trasporta, qualunque sia la forma da cui è stato letto. */
export type InviteParseResult =
  | { ok: true; key: Uint8Array; name: string | null; expiresAt: number | null }
  | { ok: false; reason: PairingErrorReason };

/**
 * Crea il link da condividere per far entrare qualcuno nel gruppo.
 *
 * `baseUrl` è l'origine del relay: la pagina `/j` è servita da lì perché è l'unico
 * indirizzo pubblico che il progetto possiede, non perché il relay partecipi all'invito.
 * Non riceve nulla — il fragment resta nel browser di chi apre il link.
 *
 * Il nome del gruppo viaggia in chiaro accanto alla chiave. Non è un peggioramento: chi
 * legge il fragment ha già la chiave, quindi il nome lo leggerebbe comunque entrando.
 */
export function createInviteLink(
  key: Uint8Array,
  options: { baseUrl: string; name?: string; now: number; ttlMs?: number },
): InviteLink {
  assertVaultKey(key);
  const ttlMs = options.ttlMs ?? DEFAULT_PAIRING_TTL_MS;
  const expiresAt = options.now + ttlMs;

  const params = [`v=${PAIRING_VERSION}`, `k=${bytesToBase64url(key)}`];
  const name = normalizeInviteName(options.name);
  // `encodeURIComponent` codifica anche `&` e `#`: è ciò che impedisce a un nome di
  // gruppo — testo scelto dall'utente — di iniettare parametri nel fragment.
  if (name !== null) params.push(`n=${encodeURIComponent(name)}`);
  params.push(`e=${Math.floor(expiresAt / 1000)}`);

  const fragment = params.join('&');
  return {
    url: `${options.baseUrl.replace(/\/+$/, '')}${INVITE_PATH}#${fragment}`,
    joinUri: `${JOIN_URI_PREFIX}#${fragment}`,
    expiresAt,
  };
}

/**
 * Interpreta un invito in una qualunque delle tre forme in circolazione.
 *
 * 1. `https://<relay>/j#…` — il link condivisibile;
 * 2. `jutrack://join#…` — lo stesso invito riaperto dentro l'app;
 * 3. `jutrack://pair?…` — i QR generati prima dello Step 13, che continuano a valere.
 *
 * Una funzione sola e non tre: chi incolla un codice non sa in quale forma sia, e tre
 * campi distinti sarebbero un rompicapo per l'utente e tre strade da tenere allineate
 * per noi.
 */
export function parseInvite(uri: string, now: number): InviteParseResult {
  const trimmed = uri.trim();
  const hash = trimmed.indexOf('#');

  if (hash === -1) {
    // Un link arrivato senza fragment non è «non è un invito»: è un invito **mutilato**,
    // di solito da una chat che ha riscritto l'URL. Distinguerlo cambia il consiglio che
    // si può dare a chi lo guarda: rifallo generare, non «non è roba nostra».
    if (isInviteTarget(trimmed)) return { ok: false, reason: 'missing-key' };

    const legacy = parsePairingUri(trimmed, now);
    return legacy.ok
      ? { ok: true, key: legacy.key, name: null, expiresAt: legacy.expiresAt }
      : legacy;
  }

  if (!isInviteTarget(trimmed.slice(0, hash))) return { ok: false, reason: 'not-pairing-uri' };
  return readInvite(parseQuery(trimmed.slice(hash + 1)), now);
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

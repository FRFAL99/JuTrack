import { newId, type RandomSource } from '@jutrack/core';
import type { KeyValueStore } from '@/platform/app-meta';

/**
 * Il profilo: chi sono io, su questo telefono.
 *
 * Uno per persona, **condiviso fra tutti i gruppi**. Non è un account e non c'è alcun
 * login: `profileId` è un identificatore casuale e opaco, generato una volta sola al
 * primo avvio, e non esce mai dal telefono se non come chiave del proprio membro dentro
 * un vault.
 *
 * Serve perché nel modello dati mancava una nozione di «me». Senza, ogni dispositivo
 * creava un membro «Io» con un id casuale suo: dopo il sync erano due persone distinte,
 * le spese di ciascuno puntavano al proprio id, e **il calcolo di chi deve quanto
 * all'altro era sbagliato**. Non era un problema di autenticazione — un provider
 * d'identità avrebbe comunque dovuto scrivere un id dentro il CRDT, che è esattamente
 * ciò che fa questo.
 */
export interface Profile {
  /**
   * Casuale e **opaco**: mai derivato da un nome, da un'email o da una chiave.
   *
   * È il seam che permetterà, un giorno, di agganciare un provider d'identità senza
   * cambiare la chiave con cui i membri sono scritti nei vault — che è la parte cara da
   * modificare a posteriori, perché toccherebbe `paidBy` e le quote di ogni spesa.
   */
  profileId: string;
  name: string;
  color: string;
  /**
   * Codice ISO della valuta con cui **questo telefono** scrive e legge gli importi.
   *
   * Assente finché non la si sceglie, e allora vale `DEFAULT_CURRENCY`. Sta qui e non nel
   * documento del gruppo perché è una preferenza di chi guarda, non un dato del gruppo:
   * scriverla nel vault costringerebbe tutti i membri alla scelta di uno solo.
   *
   * Il prezzo, che va detto: **JuTrack non converte**. Due membri che scelgono valute
   * diverse registrano nello stesso gruppo importi in unità diverse, e ogni totale li
   * somma come se fossero la stessa cosa. La valuta è locale nel codice ed è una scelta
   * comune di fatto.
   */
  currency?: string;
  /**
   * Codice ISO 639-1 della lingua in cui **questo telefono** scrive le proprie schermate.
   *
   * Assente finché non la si sceglie, e allora vale la lingua del telefono — non
   * `DEFAULT_LANGUAGE`: la scelta esplicita e l'assenza di scelta portano a due posti
   * diversi, ed è `resolveLanguage` a saperlo.
   *
   * Sta accanto a `currency` e per la stessa ragione, ma con una differenza che vale la
   * pena dire: la valuta è una scelta comune di fatto, perché due membri con valute diverse
   * sommano unità diverse; la lingua **no**. Traduce l'app e nient'altro — i nomi di gruppi,
   * categorie e spese stanno nel documento condiviso e restano come li ha scritti chi li ha
   * scritti. Due persone possono leggere lo stesso gruppo in due lingue senza che nessun
   * numero cambi.
   */
  language?: string;
  /** Previsto e non usato: il posto dove un provider d'identità si aggancerebbe. */
  identity?: { provider: string; subject: string };
}

/**
 * Colori assegnabili a una persona.
 *
 * Distinti fra loro e leggibili su fondo chiaro e scuro, come quelli delle categorie —
 * ma scelti in una famiglia diversa, così un membro non si confonde con una categoria
 * quando compaiono nella stessa schermata.
 */
export const PROFILE_COLORS = [
  '#3B5BDB',
  '#C2255C',
  '#2F9E44',
  '#E8590C',
  '#7048E8',
  '#0C8599',
] as const;

/** Limite del nome: sta in una riga di lista anche sui telefoni stretti. */
export const MAX_PROFILE_NAME = 24;

const PROFILE_KEY = 'profile';

/**
 * Il gruppo è nato qui o si è entrati in quello di qualcun altro?
 *
 * Determina una cosa sola, ma che si vede: chi entra **non semina** le categorie di
 * default, le riceve col primo sync. Seminarle comunque significa ritrovarsene sedici
 * invece di otto, ed è successo davvero.
 *
 * Vive nella riga del gruppo (`GroupRecord.origin`), scritta quando la chiave viene
 * creata o adottata: dopo, guardando un documento pieno di dati sincronizzati, i due casi
 * sono indistinguibili.
 */
export type VaultOrigin = 'created' | 'joined';

/** Toglie gli spazi di troppo e taglia; `null` se non resta nulla di utile. */
export function normalizeProfileName(raw: string): string | null {
  const collapsed = raw.trim().replace(/\s+/g, ' ');
  if (collapsed === '') return null;
  return collapsed.slice(0, MAX_PROFILE_NAME);
}

/** Nuovo profilo, non ancora salvato. Il colore ruota se non lo si indica. */
export function createProfile(
  name: string,
  color: string,
  random: RandomSource,
  identity?: { provider: string; subject: string },
): Profile {
  const normalized = normalizeProfileName(name);
  if (normalized === null) throw new Error('il nome del profilo non può essere vuoto');
  return {
    profileId: newId(random),
    name: normalized,
    color,
    ...(identity !== undefined && { identity }),
  };
}

/**
 * Rilegge il profilo salvato.
 *
 * Un valore illeggibile viene trattato come «nessun profilo»: l'onboarding riparte e se
 * ne crea uno nuovo. È peggio per chi ci passa, ma proseguire con un `profileId` vuoto
 * scriverebbe un membro senza id dentro il vault — un danno che si propaga all'altro
 * telefono e non si disfa.
 */
export async function loadProfile(meta: KeyValueStore): Promise<Profile | null> {
  const raw = await meta.get(PROFILE_KEY);
  if (raw === null) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { profileId, name, color, currency, language, identity } = parsed as Record<
      string,
      unknown
    >;
    if (typeof profileId !== 'string' || profileId === '') return null;
    if (typeof name !== 'string' || name === '') return null;
    if (typeof color !== 'string' || color === '') return null;
    return {
      profileId,
      name,
      color,
      // Una valuta illeggibile non fa cadere il profilo, a differenza di `profileId`: si
      // torna al default e si continua. È una preferenza di formattazione, e rimandare
      // all'onboarding per un simbolo sbagliato costerebbe molto più di quanto vale.
      ...(typeof currency === 'string' && currency !== '' && { currency }),
      // Stesso trattamento della valuta, e per il motivo che vale il doppio qui: una lingua
      // illeggibile che mandasse all'onboarding renderebbe irrecuperabile un telefono
      // proprio a chi non capisce la lingua in cui l'onboarding è scritto.
      ...(typeof language === 'string' && language !== '' && { language }),
      ...(isIdentity(identity) && { identity }),
    };
  } catch {
    return null;
  }
}

export async function saveProfile(meta: KeyValueStore, profile: Profile): Promise<void> {
  await meta.set(PROFILE_KEY, JSON.stringify(profile));
}

function isIdentity(value: unknown): value is { provider: string; subject: string } {
  if (typeof value !== 'object' || value === null) return false;
  const { provider, subject } = value as Record<string, unknown>;
  return typeof provider === 'string' && typeof subject === 'string';
}

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
/** Un membro per vault: di norma è il `profileId`, ma può essere stato ricollegato. */
const myMemberKey = (vaultId: string): string => `my_member_id:${vaultId}`;
const vaultOriginKey = (vaultId: string): string => `vault_origin:${vaultId}`;

/**
 * Il vault è nato qui o si è entrati in quello di qualcun altro?
 *
 * Determina una cosa sola, ma che si vede: chi entra **non semina** le categorie di
 * default, le riceve col primo sync. Seminarle comunque significa ritrovarsene sedici
 * invece di otto, ed è successo davvero.
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
    const { profileId, name, color, identity } = parsed as Record<string, unknown>;
    if (typeof profileId !== 'string' || profileId === '') return null;
    if (typeof name !== 'string' || name === '') return null;
    if (typeof color !== 'string' || color === '') return null;
    return {
      profileId,
      name,
      color,
      ...(isIdentity(identity) && { identity }),
    };
  } catch {
    return null;
  }
}

export async function saveProfile(meta: KeyValueStore, profile: Profile): Promise<void> {
  await meta.set(PROFILE_KEY, JSON.stringify(profile));
}

/**
 * Il membro che rappresenta me in questo vault.
 *
 * Di norma è il `profileId`. Esiste separato perché non lo sarà sempre: ripristinare il
 * backup della chiave su un telefono nuovo genera un `profileId` nuovo, e servirà poter
 * dire «in questo gruppo sono già io, con quell'altro nome» invece di comparire due
 * volte. Il ricollegamento arriva con i gruppi (Step 12); qui c'è già il posto dove
 * scriverlo, così le spese non dovranno essere riscritte allora.
 */
export async function loadMyMemberId(
  meta: KeyValueStore,
  vaultId: string,
  profileId: string,
): Promise<string> {
  return (await meta.get(myMemberKey(vaultId))) ?? profileId;
}

export async function setMyMemberId(
  meta: KeyValueStore,
  vaultId: string,
  memberId: string,
): Promise<void> {
  await meta.set(myMemberKey(vaultId), memberId);
}

export async function markVaultOrigin(
  meta: KeyValueStore,
  vaultId: string,
  origin: VaultOrigin,
): Promise<void> {
  await meta.set(vaultOriginKey(vaultId), origin);
}

/**
 * `null` se non risulta nulla — che è il caso di chi usa l'app senza vault.
 *
 * Nel dubbio si semina: un tracker locale senza categorie sarebbe inutilizzabile, mentre
 * il costo di sbagliare è qualche categoria doppia da archiviare.
 */
export async function loadVaultOrigin(
  meta: KeyValueStore,
  vaultId: string,
): Promise<VaultOrigin | null> {
  const raw = await meta.get(vaultOriginKey(vaultId));
  return raw === 'created' || raw === 'joined' ? raw : null;
}

function isIdentity(value: unknown): value is { provider: string; subject: string } {
  if (typeof value !== 'object' || value === null) return false;
  const { provider, subject } = value as Record<string, unknown>;
  return typeof provider === 'string' && typeof subject === 'string';
}

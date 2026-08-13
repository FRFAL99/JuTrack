/**
 * Quale lingua, e come si decide.
 *
 * Sta a parte da `index.ts` — che è l'istanza `i18next` — perché qui non c'è niente di
 * `i18next` né di React: sono funzioni pure su stringhe, e sono l'unica parte dell'i18n che
 * si può provare senza un telefono. Stessa divisione già fatta fra `settings.ts` (dati) e
 * `useNotifications.ts` (React) nel filone delle notifiche.
 */

export interface LanguageChoice {
  /** Codice ISO 639-1, **senza regione**: `it`, non `it-IT`. Vedi `normalizeLanguage`. */
  code: string;
  /**
   * Il nome della lingua **scritto in quella lingua**.
   *
   * Mai tradotto, e non è una dimenticanza: chi apre il selettore perché non capisce la
   * lingua corrente deve poter riconoscere la propria: «Inglese» non aiuta chi cerca
   * «English», ed è l'unica etichetta dell'app che deve restare uguale in tutte le lingue.
   */
  label: string;
}

/**
 * Le lingue che l'app sa parlare.
 *
 * Due, e restano due finché non c'è qualcuno che traduce: una voce in più nel selettore
 * senza il dizionario dietro mostrerebbe l'italiano sotto un'etichetta straniera, che è
 * peggio di non offrire la lingua.
 */
export const LANGUAGES: readonly LanguageChoice[] = [
  { code: 'it', label: 'Italiano' },
  { code: 'en', label: 'English' },
] as const;

/**
 * La lingua di chi non ne ha scelta una e ha il telefono in una lingua che non parliamo.
 *
 * È l'italiano perché è la lingua in cui l'app è **scritta**: il dizionario italiano è la
 * fonte, quello inglese la copia. Un `fallbackLng` che punta alla copia mostrerebbe una
 * chiave grezza ogni volta che la traduzione resta indietro, invece della frase originale.
 */
export const DEFAULT_LANGUAGE = 'it';

/** Il codice è fra quelli che il selettore propone? */
export function isKnownLanguage(code: string): boolean {
  return LANGUAGES.some((language) => language.code === code);
}

/**
 * Da un tag qualsiasi al codice di una lingua che sappiamo parlare, o `null`.
 *
 * Accetta quello che arriva da fuori — `en-GB` dalle impostazioni del telefono, `it_IT` con
 * il trattino basso, `EN` in maiuscolo — e tiene la sola parte prima della regione. La
 * regione non la guardiamo di proposito: non esiste un dizionario `en-GB` distinto da
 * `en-US`, e trattarli come lingue diverse vorrebbe dire non riconoscerne nessuna delle due.
 *
 * `null` e non il default, perché chi chiama deve poter distinguere «non capito» da «scelto
 * l'italiano»: è quella distinzione che permette a `resolveLanguage` di provare la sorgente
 * successiva invece di fermarsi alla prima.
 */
export function normalizeLanguage(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toLowerCase().split(/[-_]/)[0] ?? '';
  return isKnownLanguage(code) ? code : null;
}

/**
 * La lingua da usare adesso: **scelta, poi telefono, poi italiano**.
 *
 * L'ordine è tutto lo step in una riga. La scelta esplicita viene prima perché è l'unica
 * fatta da una persona: un telefono in inglese non deve rimettere in inglese chi ha appena
 * scelto l'italiano — e siccome la scelta vive nel profilo, sopravvive anche al cambio di
 * lingua del sistema.
 *
 * Riceve la lingua di sistema come parametro invece di andarsela a prendere: è ciò che rende
 * questa funzione — dove sta tutta la decisione — verificabile senza un telefono e senza
 * `Intl`.
 */
export function resolveLanguage(
  chosen: string | null | undefined,
  systemLocale: string | null | undefined,
): string {
  return normalizeLanguage(chosen) ?? normalizeLanguage(systemLocale) ?? DEFAULT_LANGUAGE;
}

/**
 * In che lingua è il telefono, per quel che se ne può sapere da qui.
 *
 * **Non usa `expo-localization`, e non è una svista.** Il piano v5 lo nominava, ma è un
 * modulo nativo: entrarci dentro renderebbe questo step il terzo a chiedere una build EAS
 * — mentre il piano lo dà per «Build EAS: No» — e, peggio, romperebbe l'app sulla build
 * oggi installata, che quel modulo non ce l'ha. Stessa conclusione dello Step 36, per la
 * stessa ragione: la sveglia c'era già, e qui c'è già `Intl`.
 *
 * Serve **solo al primo avvio**, prima che qualcuno tocchi il selettore: sbagliare qui costa
 * un tocco, non un dato. Per questo tutto è dentro un `try` e la risposta può essere `null`:
 * su un motore JS senza `Intl` si parte in italiano invece di non partire.
 */
export function systemLocale(): string | null {
  try {
    return new Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return null;
  }
}

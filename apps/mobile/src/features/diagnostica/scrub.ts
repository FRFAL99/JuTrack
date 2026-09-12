/**
 * Cosa si lascia uscire da JuTrack insieme a un rapporto di errore.
 *
 * Sentry, lasciato ai suoi valori di default, allega a ogni evento le **briciole**:
 * le richieste di rete fatte di recente e quello che l'app ha scritto in console.
 * Per quasi tutte le app e' materiale innocuo. Qui no, per due ragioni precise:
 *
 * - **Gli URL del relay contengono il `vaultId`**, che e' l'identificativo di un
 *   gruppo. Non permette di leggere le spese — sono cifrate e la chiave non lascia i
 *   telefoni — ma e' comunque il dato che l'informativa promette di trattare con
 *   parsimonia, e non c'e' ragione di spedirlo a un terzo per diagnosticare un guasto.
 * - **Una console puo' contenere qualunque cosa**, importi compresi, e nessuno
 *   ricorda tutte le `console.log` che ha scritto.
 *
 * Un'app che promette «il nostro server non puo' leggere le tue spese» e poi carica
 * briciole con dentro le spese si smentisce da sola. Quindi la regola qui e'
 * **scartare per categoria, non ripulire per euristica**: una ripulitura sbagliata si
 * nota solo leggendo i rapporti su Sentry, cioe' mai.
 *
 * Queste funzioni sono pure e testate apposta: sono l'unico punto in cui si decide
 * cosa esce dal telefono, e un difetto qui non si vede da nessuna parte nell'app.
 */

/**
 * La forma minima di una briciola e di un evento: solo i campi su cui si decide.
 *
 * Descritti qui invece di importare i tipi di Sentry, e le funzioni sono **generiche**
 * sopra di essi: cosi' il modulo resta puro e provabile senza la libreria, e chi lo
 * chiama riceve indietro esattamente il tipo che gli ha dato — niente conversioni
 * forzate al confine, che sono il punto in cui un tipo sbagliato smette di farsi notare.
 */
export type Briciola = {
  category?: string | undefined;
  /** Dichiarati perche' compaiono nelle briciole vere e nei test; qui non si leggono. */
  message?: unknown;
  data?: unknown;
};

export type Evento = {
  user?: unknown;
  request?: { url?: string | undefined; headers?: Record<string, string> | undefined } | undefined;
  breadcrumbs?: readonly Briciola[] | undefined;
};

/**
 * Le categorie che non devono mai lasciare il telefono.
 *
 * `xhr` e `fetch` sono le richieste di rete; `console` e' quello che l'app stampa.
 * `navigation` resta, perche' dice **su quale schermata** e' successo il guasto — che
 * e' la meta' dell'informazione utile — e non contiene dati: i percorsi di JuTrack
 * portano un `vaultId` in `/groups/<id>`, quindi passa comunque da `ripuliscUrl`.
 */
const CATEGORIE_DA_SCARTARE = new Set(['xhr', 'fetch', 'http', 'console']);

/** `null` butta la briciola. E' il contratto di `beforeBreadcrumb` di Sentry. */
export function filtraBriciola<T extends Briciola>(b: T | null | undefined): T | null {
  if (!b) return null;
  if (typeof b.category === 'string' && CATEGORIE_DA_SCARTARE.has(b.category)) return null;
  return b;
}

/**
 * Sostituisce con `<id>` ogni tratto di percorso che sia un identificativo esadecimale
 * lungo: i `vaultId` sono 32 caratteri, i token 64. Resta la **forma** dell'URL, che e'
 * quello che serve per capire quale chiamata e' fallita.
 */
export function ripuliscUrl(url: string): string {
  return url.replace(/\b[0-9a-f]{32,}\b/gi, '<id>');
}

/**
 * L'ultima rete prima che l'evento parta. Toglie l'utente — non ne abbiamo uno, ma il
 * default di Sentry ne inventa uno dall'installazione — ripulisce l'URL, butta le
 * intestazioni (c'e' il token di autorizzazione del vault) e rifiltra le briciole, che
 * possono essere state aggiunte senza passare da `beforeBreadcrumb`.
 */
export function ripuliscEvento<T extends Evento>(e: T): T {
  const pulito: T = { ...e };
  delete (pulito as { user?: unknown }).user;

  const req = pulito.request;
  if (req) {
    const { headers: _scartate, ...resto } = req;
    if (typeof resto.url === 'string') resto.url = ripuliscUrl(resto.url);
    (pulito as { request?: unknown }).request = resto;
  }

  if (pulito.breadcrumbs) {
    (pulito as { breadcrumbs?: unknown }).breadcrumbs = pulito.breadcrumbs
      .map((b) => filtraBriciola(b))
      .filter((b): b is Briciola => b !== null);
  }

  return pulito;
}

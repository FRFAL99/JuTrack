/**
 * Dove sta un foglio ancorato in fondo, quando c'è la tastiera aperta.
 *
 * **Il difetto che questo file esiste per chiudere.** Il foglio della frase (Step 68) si apre
 * con `autoFocus`, quindi la tastiera compare da sola un istante dopo — e copriva proprio il
 * campo in cui si stava scrivendo. La causa era una riga: `KeyboardAvoidingView` riceveva un
 * `behavior` **solo su iOS**, e su Android restava inerte. Il ripiego implicito era
 * l'`adjustResize` del manifest, che però **non raggiunge la finestra di una `Modal`**: una
 * `Modal` di React Native su Android è una finestra sua, e il ridimensionamento che salva
 * tutte le altre schermate lì non arriva. Nessuno alzava il foglio, e nessuno lo diceva.
 *
 * **Quindi il foglio si alza da sé, di quanto misura la tastiera.** L'aritmetica sta qui, pura,
 * perché è l'unica parte che si possa provare senza uno schermo: la sottoscrizione agli eventi
 * della tastiera resta nel componente. È la stessa divisione di `snapshot.ts` rispetto a
 * `publish.ts` — chi decide ha i test, chi parla con la piattaforma no.
 *
 * **Vale per questo foglio e basta, per ora.** Gli altri fogli ancorati in fondo
 * (`FilterSheet`, `SettingSheet`, `GroupSwitcherSheet`) non hanno campi di testo, quindi il
 * difetto non li tocca: generalizzare adesso vorrebbe dire scrivere una regola per casi che
 * non esistono.
 */

/**
 * Quanto può crescere il foglio, in frazione dello spazio **disponibile**.
 *
 * Disponibile e non totale: è la differenza che chiude il difetto. Con la tastiera aperta,
 * l'80% dello schermo intero è più di quanto resti, e il foglio tornerebbe a finirci sotto —
 * cioè si sarebbe alzato il foglio per poi allungarlo di nuovo dentro la tastiera.
 */
export const SHEET_MAX_FRACTION = 0.8;

export interface SheetMetrics {
  /** Di quanto il foglio si stacca dal fondo: l'altezza della tastiera, quando c'è. */
  liftBy: number;
  /** Il respiro sotto l'ultima riga. */
  paddingBottom: number;
  /** Oltre questa altezza il foglio non cresce, e dentro comincia a scorrere. */
  maxHeight: number;
}

/**
 * Le tre misure del foglio, da ciò che il sistema dice in quel momento.
 *
 * **A tastiera aperta il margine di sicurezza in fondo sparisce**, e non è una svista:
 * `insets.bottom` tiene il foglio sopra la barra di navigazione, che in quel momento sta
 * **dietro** la tastiera. Sommarlo lo stesso aggiungerebbe una striscia di niente fra il
 * foglio e i tasti, cioè spazio tolto alla sola cosa che si sta guardando.
 *
 * Ogni misura che arriva rotta — assente, negativa, `NaN` — vale zero: la direzione
 * dell'errore è quella di sempre, perché un foglio che non si alza è il difetto che c'era
 * prima, mentre uno alzato di `NaN` sparisce dallo schermo e non torna.
 */
export function sheetMetrics(args: {
  windowHeight: number;
  keyboardHeight: number;
  /** Il margine di sicurezza in fondo, quando la tastiera è chiusa. */
  safeBottom: number;
  /** Il respiro minimo sotto l'ultima riga, tastiera o no. */
  gap: number;
}): SheetMetrics {
  const windowHeight = positive(args.windowHeight);
  const gap = positive(args.gap);

  // Mai più alto della finestra: una misura sballata della tastiera alzerebbe il foglio
  // fuori dallo schermo, e da lì non lo riporta indietro nessun gesto.
  const liftBy = Math.min(positive(args.keyboardHeight), windowHeight);
  const open = liftBy > 0;

  return {
    liftBy,
    paddingBottom: open ? gap : positive(args.safeBottom) + gap,
    maxHeight: (windowHeight - liftBy) * SHEET_MAX_FRACTION,
  };
}

/** Zero per tutto ciò che un numero non è, o non dovrebbe essere. */
function positive(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

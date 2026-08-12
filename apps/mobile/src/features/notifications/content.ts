/**
 * Cosa c'è scritto nella tendina: un titolo e una riga, e nient'altro.
 *
 * In un file suo perché ce l'hanno in comune due avvisi che non hanno in comune nient'altro
 * — il budget guarda il documento, la sincronizzazione guarda il motore — e farlo dichiarare
 * a uno dei due costringerebbe l'altro a importarlo da lì, cioè a dipendere da un modulo con
 * cui non ha niente da spartire.
 *
 * `ReminderContent` dello Step 31 ha la stessa forma e resta dov'è: quel testo non passa mai
 * per una funzione che accetti l'uno o l'altro, quindi unificarlo non toglierebbe un vincolo,
 * ne aggiungerebbe uno.
 */
export interface AlertContent {
  title: string;
  body: string;
}

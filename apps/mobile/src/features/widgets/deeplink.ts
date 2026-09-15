/**
 * Il link che il «+» del widget apre, scritto in un posto solo.
 *
 * **Chi lo costruisce e chi lo legge non si incontrano mai.** A costruirlo è l'app, che lo
 * infila nel foglietto; a farlo aprire è il launcher, ore o giorni dopo, magari con l'app
 * chiusa; a leggerlo è la rotta `spesa.tsx`. Tre momenti diversi dello stesso processo, e una
 * stringa scritta a mano in due di quei tre posti è una stringa che prima o poi diverge in
 * silenzio — il widget continuerebbe a essere toccabile, e non succederebbe niente.
 *
 * **Lo schema è quello di `app.json`**, e non si ricava da `expo-linking`: `createURL` in
 * sviluppo produce un `exp://…` legato alla macchina che sta servendo il bundle, mentre
 * questo URI finisce **su disco** dentro il foglietto e deve valere sul telefono di chi ha
 * l'app installata. C'è il test che lo fissa allo schema dichiarato.
 */

/** Lo schema dichiarato in `app.json` (`expo.scheme`). Cambiarlo lì significa cambiarlo qui. */
export const APP_SCHEME = 'jutrack';

/** Il percorso su cui atterra il «+». È la rotta `app/spesa.tsx`. */
export const NEW_EXPENSE_PATH = 'spesa';

/** Il nome del parametro che porta il gruppo. */
export const GROUP_PARAM = 'gruppo';

/**
 * Il link che comincia una spesa nel gruppo che il widget sta mostrando.
 *
 * **Il gruppo viaggia nel link, e questo è il punto dello step.** Il widget dice di che
 * gruppo parla; senza il suo identificativo, il «+» aprirebbe la scrittura su qualunque
 * gruppo fosse aperto nell'app in quel momento — che è il modo più silenzioso di mettere una
 * spesa nel posto sbagliato, e capita esattamente a chi ha due gruppi, cioè a chi il widget
 * lo guarda per sapere **quale** dei due.
 *
 * `encodeURIComponent` perché un identificativo è opaco: oggi è esadecimale, e il giorno in
 * cui non lo fosse più questo non sarebbe il posto in cui accorgersene.
 */
export function newExpenseUri(vaultId: string): string {
  return `${APP_SCHEME}://${NEW_EXPENSE_PATH}?${GROUP_PARAM}=${encodeURIComponent(vaultId)}`;
}

/**
 * Il gruppo letto dai parametri della rotta, `null` se non c'è.
 *
 * `useLocalSearchParams` restituisce `string | string[]`: un parametro ripetuto nel link
 * arriva come array, ed è già costato una volta (sta in `trappole.md`). Qui un array vale
 * «non l'ho capito», perché concatenarlo produrrebbe un identificativo che nessuno ha mai
 * scritto — e un identificativo inventato non corrisponde a nessun gruppo, quindi si
 * trasformerebbe in «quel gruppo non c'è più» invece che in un link malformato.
 */
export function readGroupParam(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Il parametro che dice **da dove** si è arrivati alla scrittura di una spesa. */
export const FROM_PARAM = 'da';

/** Il suo unico valore che significhi qualcosa. */
export const FROM_WIDGET = 'widget';

/**
 * La rotta interna su cui la scrittura comincia davvero, una volta scelto il gruppo.
 *
 * Non è il link del widget: quello atterra su `spesa.tsx`, che decide il gruppo e **poi**
 * manda qui. Due passaggi e non uno, perché cambiare gruppo smonta un vault e rimontarlo
 * sotto una schermata che lo sta già leggendo è il modo di vederlo sparire a metà.
 */
export function newExpenseRoute(): string {
  return `/expense/new?${FROM_PARAM}=${FROM_WIDGET}`;
}

/** Se si è arrivati dal «+» di un widget, e non dalla home. */
export function cameFromWidget(value: string | string[] | undefined): boolean {
  return value === FROM_WIDGET;
}

import type { KeyValueStore } from '@/platform/app-meta';

/**
 * Quando questo telefono ha registrato una spesa l'ultima volta.
 *
 * **Perché sta in `app_meta` e non si legge dalle spese.** Le spese vivono dentro il
 * documento Yjs di un gruppo, e di documenti ne è montato **uno solo per volta**: per
 * sapere qual è la più recente fra tutti i gruppi bisognerebbe aprire ogni vault, prendere
 * N chiavi dal portachiavi e rimontare il motore di sync — lo stesso motivo per cui il
 * sottotitolo ricco delle righe vale solo per il gruppo aperto (redesign, passo 6). Qui
 * serve un fatto solo, e sta bene in una riga di `app_meta`.
 *
 * **Conta chi scrive, non chi riceve, ed è una scelta.** Una spesa che arriva dall'altro
 * telefono non sposta la scadenza: il promemoria riguarda l'abitudine di **registrare**, e
 * chi non annota niente da tre giorni non ha annotato niente da tre giorni anche se in casa
 * lo ha fatto qualcun altro. Il prezzo, accettato: in una coppia dove uno solo registra, il
 * promemoria arriva a entrambi — ma a quello dei due che non registra è vero.
 *
 * Non è un dato del gruppo e non viene sincronizzato: `wipe.ts` lo porta via da solo con il
 * suo `DELETE FROM app_meta`.
 */
export const LAST_ACTIVITY_KEY = 'last_expense_registered_at';

/** `null` se non è mai stata registrata una spesa, o se il valore salvato non è leggibile. */
export async function readLastActivity(meta: KeyValueStore): Promise<number | null> {
  const raw = await meta.get(LAST_ACTIVITY_KEY);
  if (raw === null) return null;
  const parsed = Number(raw);
  // `Number('')` è 0 e `Number('abc')` è NaN: un timestamp illeggibile vale «mai», che
  // fa partire il conto da adesso invece di programmare un promemoria nel 1970.
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function writeLastActivity(meta: KeyValueStore, whenMs: number): Promise<void> {
  await meta.set(LAST_ACTIVITY_KEY, String(whenMs));
}

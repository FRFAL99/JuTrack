/**
 * Iniziale da mostrare nel cerchio di una persona.
 *
 * `Array.from` e non `name[0]`: il secondo restituisce una **mezza coppia surrogata** se il
 * nome comincia con un carattere fuori dal piano base — un'emoji, o parecchi alfabeti non
 * latini — e a schermo si vedrebbe il rombo col punto interrogativo. Qui si taglia per
 * punto di codice.
 *
 * Un nome vuoto o fatto di soli spazi non è impossibile: il profilo si salva sul blur, e
 * fra lo svuotamento del campo e il rientro c'è un istante in cui il membro si chiama
 * davvero «». Il ripiego è `?`, non un cerchio vuoto che sembrerebbe un errore di
 * caricamento.
 */
export function initialOf(name: string): string {
  const first = Array.from(name.trim())[0];
  return first === undefined ? '?' : first.toUpperCase();
}

/**
 * Come dividere le persone fra cerchi visibili e conteggio del resto.
 *
 * Con più di quattro o cinque persone i cerchi sovrapposti smettono di essere leggibili e
 * cominciano a mangiarsi la riga: oltre il limite si mostra `+N`. Il limite lo decide chi
 * disegna, perché dipende dallo spazio che ha.
 *
 * `+N` conta **le persone nascoste, non quelle totali**, ed è per questo che quando serve
 * il conteggio si mostra un cerchio in meno: con `max` cerchi pieni e un `+1` accanto si
 * occuperebbe lo stesso spazio di `max + 1` cerchi dicendo una cosa in meno.
 */
export function splitAvatars<T>(people: T[], max: number): { visible: T[]; overflow: number } {
  if (max < 1) return { visible: [], overflow: people.length };
  if (people.length <= max) return { visible: people, overflow: 0 };
  const visible = people.slice(0, max - 1);
  return { visible, overflow: people.length - visible.length };
}

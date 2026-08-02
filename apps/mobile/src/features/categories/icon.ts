import { CATEGORY_ICONS } from '@/state/seed';

/**
 * Quale icona Feather disegnare per il campo `icon` di una categoria.
 *
 * Il campo contiene tre cose diverse a seconda di quando è stato scritto, e tutte e tre
 * devono continuare a funzionare senza toccare i dati:
 *
 * - il **nome di un'icona Feather**, per le categorie create dalla schermata nuova;
 * - una delle **emoji di default**, per i vault seminati prima di questo passo — è la
 *   mappa a tradurle, in sola lettura;
 * - **qualunque altra cosa**, tipicamente un'emoji scelta a mano dalla vecchia schermata:
 *   qui non c'è una traduzione sensata e si restituisce `null`, che chi disegna rende come
 *   un pallino del colore della categoria.
 *
 * Il pallino è la parte che tiene in piedi il resto: senza un ripiego onesto servirebbe
 * una migrazione del documento condiviso, che è esattamente ciò che si vuole evitare.
 *
 * @param known I nomi che il set Feather conosce davvero. Lo passa chi ha la libreria in
 *   mano, così questo modulo resta pura logica e testabile fuori da React Native.
 */
export function categoryIconName(
  icon: string | undefined,
  known: ReadonlySet<string>,
): string | null {
  if (icon === undefined || icon === '') return null;

  // Prima le emoji note: se un giorno un'emoji finisse per coincidere con un nome Feather
  // vincerebbe comunque la traduzione, che è ciò che quel dato voleva dire.
  const mapped = CATEGORY_ICONS[icon];
  if (mapped !== undefined) return mapped;

  return known.has(icon) ? icon : null;
}

import type { VaultStore } from '@jutrack/core';

/**
 * Categorie iniziali, create solo al primissimo avvio.
 *
 * Il controllo «esiste già qualcosa?» è essenziale: senza, ogni avvio aggiungerebbe un
 * nuovo set di categorie.
 *
 * **Non crea più alcun membro.** Prima ne creava uno chiamato «Io» con un id casuale, su
 * ogni dispositivo: dopo il sync erano due persone diverse, e il saldo era sbagliato. Ora
 * il membro nasce dal profilo, con il `profileId` come id — vedi `profile.ts`.
 */
/**
 * I colori non sono decorativi: finiscono nelle barre delle statistiche, dove due
 * categorie vicine devono restare distinguibili — anche per chi non distingue rosso e
 * verde, e sia su fondo chiaro sia su fondo scuro.
 *
 * Verificati con un validatore di palette su entrambi i temi: banda di luminosità,
 * saturazione minima, separazione per protanopia/deuteranopia/tritanopia e contrasto
 * sullo sfondo. I due teal originali (Svago e Viaggi) erano indistinguibili anche a
 * vista piena — ΔE 5,8 su una soglia di 15 — e sono stati separati.
 *
 * «Altro» resta grigio di proposito: è il contenitore degli avanzi, e leggere come
 * neutro è esattamente ciò che deve fare.
 */
const DEFAULT_CATEGORIES: { name: string; icon: string; feather: string; color: string }[] = [
  { name: 'Spesa', icon: '🛒', feather: 'shopping-cart', color: '#2B8A3E' },
  { name: 'Casa', icon: '🏠', feather: 'home', color: '#1971C2' },
  { name: 'Ristoranti', icon: '🍕', feather: 'coffee', color: '#E8590C' },
  { name: 'Trasporti', icon: '🚗', feather: 'truck', color: '#7048E8' },
  { name: 'Salute', icon: '💊', feather: 'thermometer', color: '#C2255C' },
  { name: 'Svago', icon: '🎬', feather: 'film', color: '#0891B2' },
  { name: 'Viaggi', icon: '✈️', feather: 'send', color: '#C07F10' },
  { name: 'Altro', icon: '📦', feather: 'package', color: '#868E96' },
];

/**
 * Emoji delle categorie di default → nome dell'icona Feather che la sostituisce a schermo.
 *
 * Il campo `icon` nel documento Yjs **è sincronizzato fra i telefoni**: riscriverlo per
 * togliere le emoji genererebbe un update per ogni categoria su ogni dispositivo, e sui
 * documenti già pieni non c'è modo di distinguere «l'ho appena migrata io» da «l'ha
 * rinominata l'altro». Quindi i dati non si toccano e la sostituzione avviene solo in
 * lettura, qui.
 *
 * La mappa è **derivata** da `DEFAULT_CATEGORIES` invece di essere una tabella parallela:
 * due elenchi da tenere allineati a mano divergono al primo che ne modifica uno solo.
 */
export const CATEGORY_ICONS: Readonly<Record<string, string>> = Object.fromEntries(
  DEFAULT_CATEGORIES.map((category) => [category.icon, category.feather]),
);

/**
 * @param seedCategories `false` per chi è **entrato** nel vault di qualcun altro.
 *
 * Chi entra ha un documento vuoto finché non arriva il primo sync: seminare lì le otto
 * categorie di default significa ritrovarsene sedici appena i due documenti si uniscono.
 * Le categorie dell'altro arrivano da sole, e sono quelle giuste — magari già rinominate.
 */
export function seedDefaults(store: VaultStore, { seedCategories = true } = {}): void {
  if (seedCategories && store.listCategories(true).length === 0) {
    // Una sola transazione: otto categorie generano un solo update invece di otto.
    store.transact(() => {
      // I tre campi si scrivono per nome, non passando l'intera riga: `feather` serve solo
      // a costruire `CATEGORY_ICONS` qui sul telefono e **non deve finire nel documento**,
      // che è sincronizzato e il cui schema non cambia in questo passo.
      for (const { name, icon, color } of DEFAULT_CATEGORIES) {
        store.addCategory({ name, icon, color });
      }
    });
  }
}

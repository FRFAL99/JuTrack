import type { VaultStore } from '@jutrack/core';

/**
 * Categorie e membri iniziali, creati solo al primissimo avvio.
 *
 * Il controllo «esiste già qualcosa?» è essenziale: senza, ogni avvio aggiungerebbe un
 * nuovo set di categorie, e dopo il sync i due dispositivi ne avrebbero il doppio.
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
const DEFAULT_CATEGORIES: { name: string; icon: string; color: string }[] = [
  { name: 'Spesa', icon: '🛒', color: '#2B8A3E' },
  { name: 'Casa', icon: '🏠', color: '#1971C2' },
  { name: 'Ristoranti', icon: '🍕', color: '#E8590C' },
  { name: 'Trasporti', icon: '🚗', color: '#7048E8' },
  { name: 'Salute', icon: '💊', color: '#C2255C' },
  { name: 'Svago', icon: '🎬', color: '#0891B2' },
  { name: 'Viaggi', icon: '✈️', color: '#C07F10' },
  { name: 'Altro', icon: '📦', color: '#868E96' },
];

export function seedDefaults(store: VaultStore): void {
  if (store.listCategories(true).length === 0) {
    // Una sola transazione: otto categorie generano un solo update invece di otto.
    store.transact(() => {
      for (const category of DEFAULT_CATEGORIES) store.addCategory(category);
    });
  }

  if (store.listMembers().length === 0) {
    store.transact(() => {
      store.addMember({ name: 'Io', color: '#3B5BDB' });
    });
  }
}

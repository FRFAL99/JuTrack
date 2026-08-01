import type { VaultStore } from '@jutrack/core';

/**
 * Categorie e membri iniziali, creati solo al primissimo avvio.
 *
 * Il controllo «esiste già qualcosa?» è essenziale: senza, ogni avvio aggiungerebbe un
 * nuovo set di categorie, e dopo il sync i due dispositivi ne avrebbero il doppio.
 */
const DEFAULT_CATEGORIES: { name: string; icon: string; color: string }[] = [
  { name: 'Spesa', icon: '🛒', color: '#2B8A3E' },
  { name: 'Casa', icon: '🏠', color: '#1971C2' },
  { name: 'Ristoranti', icon: '🍕', color: '#E8590C' },
  { name: 'Trasporti', icon: '🚗', color: '#5F3DC4' },
  { name: 'Salute', icon: '💊', color: '#C2255C' },
  { name: 'Svago', icon: '🎬', color: '#0C8599' },
  { name: 'Viaggi', icon: '✈️', color: '#1098AD' },
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

import { beforeEach } from 'vitest';
import i18n from '@/i18n';
import { DEFAULT_LANGUAGE } from '@/i18n/language';

/**
 * Ogni test parte in italiano, **qualunque sia la lingua della macchina**.
 *
 * Lo Step 38 ha reso bilingui i moduli che scrivono testo — date, stato del sync, saldo,
 * divisione, sottotitoli dell'elenco — e con loro sono diventati bilingui i test che c'erano
 * già, senza che nessuno li toccasse. Il problema è che l'istanza si inizializza con
 * `resolveLanguage(null, systemLocale())`, cioè con la lingua del **sistema**: su questa
 * macchina l'italiano, su un runner di CI quasi certamente l'inglese. Sarebbero passati qui
 * e falliti là, per una ragione che dal messaggio d'errore non si sarebbe capita.
 *
 * `beforeEach` e non `beforeAll`: chi prova l'inglese cambia lingua a metà file, e senza il
 * ripristino il test successivo erediterebbe quella scelta a seconda dell'ordine.
 *
 * Vale per **tutti** i test dell'app, anche quelli che di lingua non parlano: costa una
 * chiamata sincrona su risorse già in memoria, e toglie di mezzo una categoria intera di
 * guasti che si manifestano solo altrove.
 */
beforeEach(async () => {
  await i18n.changeLanguage(DEFAULT_LANGUAGE);
});

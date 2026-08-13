import { useEffect } from 'react';
import { useProfile } from '@/state';
import i18next from './index';
import { resolveLanguage, systemLocale } from './language';

/**
 * Porta la lingua scelta nel profilo dentro `i18next`. Non disegna niente.
 *
 * Serve un componente perché le due cose stanno su piani diversi: il profilo si legge da
 * SQLite quando l'app è già partita, mentre `i18next` è inizializzato all'import — cioè
 * prima. Questo effetto è il punto in cui la scelta salvata raggiunge l'istanza, e ricorre a
 * ogni cambio perché `changeLanguage` fa ridisegnare da sé tutto ciò che usa
 * `useTranslation`: toccare una pillola nel selettore cambia il testo **subito**, senza
 * riavviare l'app e senza un contesto in più.
 *
 * Sta accanto a `ReminderScheduler` in `_layout.tsx` per la stessa ragione: sotto
 * `ProfileGate`, perché legge il profilo, e sopra i gruppi, perché la lingua è del telefono
 * e non di un vault.
 *
 * `systemLocale()` torna qui e non solo in `index.ts`: chi non ha ancora scelto niente deve
 * restare sulla lingua del telefono, non tornare in italiano appena il profilo è letto.
 */
export function LanguageSync() {
  const { language } = useProfile();

  useEffect(() => {
    const next = resolveLanguage(language, systemLocale());
    if (i18next.language === next) return;
    // `changeLanguage` non può fallire per una lingua che abbiamo appena verificato essere
    // fra le nostre — ma restituisce una promise, e una promise ignorata in silenzio è la
    // cosa che il lint chiede di dichiarare.
    void i18next.changeLanguage(next);
  }, [language]);

  return null;
}

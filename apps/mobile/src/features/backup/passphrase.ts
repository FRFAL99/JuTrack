/**
 * Giudizio sulla passphrase del backup.
 *
 * È l'unico punto di tutto il progetto in cui la sicurezza dipende da qualcosa che sceglie
 * un umano: nell'uso quotidiano la chiave è casuale a 256 bit, qui invece il backup regge
 * quanto regge la passphrase. Chi ottiene il file può provare all'infinito, offline: scrypt
 * rende ogni tentativo costoso, ma su «amore123» il costo non basta.
 *
 * Quello che segue è una **euristica**, non una misura di entropia — non può esserlo: una
 * frase lunga presa da una canzone nota passerebbe questo controllo e cadrebbe al primo
 * dizionario. Serve a scartare l'evidentemente debole e a suggerire la forma giusta, cioè
 * più parole slegate fra loro.
 */

import { t } from '@/i18n/translate';

export type PassphraseLevel = 'troppo-corta' | 'debole' | 'accettabile' | 'robusta';

export interface PassphraseAssessment {
  level: PassphraseLevel;
  /** Frase mostrata sotto il campo. Sempre valorizzata, anche quando va bene. */
  message: string;
  /** `false` blocca il pulsante: sotto questa soglia il backup sarebbe carta velina. */
  acceptable: boolean;
}

/** Sotto i 12 caratteri non si esporta: è la soglia, non un consiglio. */
export const MIN_PASSPHRASE_LENGTH = 12;

/** Parole separate da spazi, ignorando gli spazi ripetuti. */
export function countWords(passphrase: string): number {
  const trimmed = passphrase.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}

export function assessPassphrase(passphrase: string): PassphraseAssessment {
  const length = passphrase.trim().length;
  const words = countWords(passphrase);

  if (length < MIN_PASSPHRASE_LENGTH) {
    return {
      level: 'troppo-corta',
      message: t('backup.passphrase.tooShort', {
        min: MIN_PASSPHRASE_LENGTH,
        missing: MIN_PASSPHRASE_LENGTH - length,
      }),
      acceptable: false,
    };
  }

  // Quattro parole slegate battono qualunque singola parola infarcita di simboli: la
  // lunghezza cresce, e a memoria resta una frase invece di una sequenza da ricopiare.
  if (words >= 4 && length >= 20) {
    return {
      level: 'robusta',
      message: t('backup.passphrase.strong'),
      acceptable: true,
    };
  }

  if (words >= 3 || length >= 20) {
    return {
      level: 'accettabile',
      message: t('backup.passphrase.acceptable'),
      acceptable: true,
    };
  }

  return {
    level: 'debole',
    message: t('backup.passphrase.weak'),
    acceptable: true,
  };
}

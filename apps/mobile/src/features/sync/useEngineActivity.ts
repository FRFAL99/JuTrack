import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useVaultStatus } from '@/state';

/**
 * Dichiara al motore che questa schermata mostra dati condivisi, e che qualcuno la sta
 * guardando adesso.
 *
 * Il poll è una scala: due secondi appena c'è attività, fino a un minuto quando
 * l'attività si allontana. Senza questo, aprire la lista spese dopo cinque minuti di
 * inattività lascerebbe l'ultimo sonno da un minuto in corso, e la spesa scritta
 * sull'altro telefono comparirebbe fino a un minuto dopo. `markActive` riporta al
 * gradino stretto **e** sveglia l'attesa, quindi il giro parte subito.
 *
 * Va chiamato **solo** dalle schermate che mostrano dati condivisi. Metterlo ovunque non
 * romperebbe nulla — costerebbe solo poll inutili — ed è la ragione per cui il motore
 * espone `markActive` invece del suo opposto: dimenticarlo produce un sync più lento,
 * mai un sync fermo.
 *
 * `useVaultStatus` e non `useVaultRuntime`: il secondo solleva se il gruppo non è
 * pronto, e una schermata a fuoco durante il montaggio del vault è normale.
 */
export function useEngineActivity(): void {
  const status = useVaultStatus();
  const engine = status.phase === 'ready' ? status.runtime.engine : null;

  useFocusEffect(
    useCallback(() => {
      engine?.markActive();
    }, [engine]),
  );
}

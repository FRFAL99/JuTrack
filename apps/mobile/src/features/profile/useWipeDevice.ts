import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { expoKeyStore } from '@/platform';
import { clearWidgets } from '@/features/widgets/publish';
import { useAppData, useGroups, useVaultStatus, wipeDevice } from '@/state';

/**
 * A che punto è l'azzeramento.
 *
 * `closing` dura una frazione di secondo e non è cosmetico: è l'attesa che il motore di
 * sync del gruppo aperto sia davvero spento. Cancellare mentre gira significa che un ciclo
 * in volo riscrive ciò che si è appena eliminato.
 */
export type WipePhase = 'idle' | 'closing' | 'wiping' | 'error';

export interface WipeDeviceControl {
  phase: WipePhase;
  /** Il messaggio del guasto, quando `phase` è `error`. */
  error: string | null;
  /** Avvia. La conferma la chiede la schermata: qui si cancella e basta. */
  start(): void;
}

/**
 * La macchina a stati di «Azzera questo telefono».
 *
 * Tre passaggi, e il secondo è tutto il punto:
 *
 * 1. `closeCurrent()` chiude il gruppo aperto — resta in elenco, semplicemente non è più
 *    corrente;
 * 2. il cleanup dell'effetto del `VaultProvider` ferma il motore e chiude la persistenza,
 *    e il vault passa a `absent`. **Si attende quello**, invece di sperare che lo
 *    smontaggio sia già avvenuto: è la differenza fra un progetto e un
 *    `setTimeout(…, 300)`;
 * 3. `wipeDevice` cancella, e `forgetProfile()` riporta all'onboarding senza riavvio.
 *
 * La fase è **derivata** e non scritta da un `setState` dentro l'effetto: quello React lo
 * sconsiglia — ed ESLint lo vieta — e qui costerebbe pure un render in più per nulla,
 * visto che «il motore è spento» si legge già dallo stato del vault.
 */
export function useWipeDevice(): WipeDeviceControl {
  const { db, meta, forgetProfile } = useAppData();
  const { registry, closeCurrent } = useGroups();
  const vault = useVaultStatus();
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Che la cancellazione sia già partita. L'effetto può rigirare; cancellare no. */
  const running = useRef(false);

  const engineDown = vault.phase === 'absent';

  useEffect(() => {
    if (!requested || !engineDown || running.current) return;
    running.current = true;

    void wipeDevice({ db, meta, keyStore: expoKeyStore, registry })
      .then(() => {
        // `wipeDevice` porta via anche il foglietto dei widget insieme al resto di
        // `app_meta`, ma **nessuno ridisegna la home**: senza questa riga il saldo
        // dell'ultimo gruppo resterebbe scritto sullo schermo di un telefono che di quel
        // gruppo non sa più niente. Non si attende — è un rettangolo, non un dato — e se
        // fallisce non deve trattenere un azzeramento già riuscito.
        void clearWidgets();
        // Via da questa schermata **prima** di smontare l'albero. `forgetProfile()` fa
        // sparire il navigatore intero dietro l'onboarding, e al ritorno lo rimonterebbe
        // sull'ultima rotta: chi registra il profilo nuovo si ritroverebbe davanti
        // «Azzera questo telefono» come prima cosa.
        router.replace('/');
        forgetProfile();
      })
      .catch((cause: unknown) => {
        // Si torna a `idle` con un messaggio, e si può riprovare: `wipeDevice` si ferma
        // prima di toccare il profilo, quindi ciò che resta è uno stato normale — profilo
        // presente, qualche gruppo in meno.
        running.current = false;
        setError(cause instanceof Error ? cause.message : String(cause));
        setRequested(false);
      });
  }, [requested, engineDown, db, meta, registry, forgetProfile]);

  const start = useCallback((): void => {
    setError(null);
    setRequested(true);
    // Senza gruppi il vault è già `absent` e questa non fa nulla: l'effetto parte subito.
    void closeCurrent();
  }, [closeCurrent]);

  const phase: WipePhase =
    error !== null ? 'error' : !requested ? 'idle' : engineDown ? 'wiping' : 'closing';

  return { phase, error, start };
}

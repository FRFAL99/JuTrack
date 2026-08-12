import { useEffect, useMemo, useRef } from 'react';
import { useAppData, useGroups, useSyncState, useVaultStatus } from '@/state';
import { installForegroundHandler } from './foreground';
import { notifySync } from './schedule';
import { parseSettings, SETTINGS_KEY } from './settings';
import {
  parseSyncMarks,
  reviewSync,
  serializeSyncMarks,
  syncContent,
  SYNC_MARKS_KEY,
} from './sync';

/**
 * Guarda il motore di sincronizzazione e avvisa quando resta fermo. Non disegna niente.
 *
 * **Si iscrive alla fase, e non allo stato intero**, ed è ciò che rende questo componente
 * economico: `SyncState` porta con sé `at` e `retryAt`, che cambiano a ogni giro di poll —
 * dipendere dall'oggetto vorrebbe dire una lettura di `app_meta` ogni due secondi mentre
 * tutto funziona. La fase invece cambia solo quando succede qualcosa, e succede abbastanza:
 * ogni ciclo passa da `syncing` prima di ricadere in `error` o `offline`, quindi la scadenza
 * viene ricontrollata a ogni tentativo anche restando fermi sulla stessa schermata.
 *
 * Sta accanto allo `Stack` come `BudgetWatcher`, e per una ragione ancora più forte: il
 * pallino che racconta il sync vive in Tu e in fondo alla lista spese, cioè in due schermate
 * che chi ha il sync rotto potrebbe non aprire per giorni. Un guasto che si vede solo dove
 * si va a cercarlo non ha bisogno di una notifica; questo sì.
 *
 * **Un gruppo per volta, quello aperto**, come per i budget: di runtime ne è montato uno
 * solo, e gli altri gruppi non hanno un motore che giri per conto loro. Il gruppo che non si
 * apre da un mese non produce avvisi, ed è giusto — non c'è niente in coda che non stia già
 * aspettando.
 */
export function SyncWatcher() {
  const status = useVaultStatus();
  // Diviso in due come `BudgetWatcher`: gli hook che leggono il vault esistono solo dove il
  // vault esiste, invece di un ramo nullable propagato in ogni riga sotto.
  if (status.phase !== 'ready') return null;
  return <Watch vaultId={status.runtime.vaultId} />;
}

function Watch({ vaultId }: { vaultId: string }) {
  const { meta } = useAppData();
  const { groups } = useGroups();
  const { phase } = useSyncState();

  const knownVaultIds = useMemo(() => groups.map((group) => group.vaultId), [groups]);
  const groupName = groups.find((group) => group.vaultId === vaultId)?.name ?? 'questo gruppo';

  /**
   * I giri si mettono in fila, non in parallelo — stessa ragione di `BudgetWatcher`.
   *
   * Ogni giro è un leggi-modifica-scrivi su `app_meta`: due che si accavallano leggerebbero
   * gli stessi segni e il secondo riscriverebbe i primi, riaprendo la porta all'avviso
   * doppio che tutto questo file esiste per chiudere.
   */
  const chain = useRef<Promise<void>>(Promise.resolve());

  // Idempotente, e chiamato anche qui di proposito: che `BudgetWatcher` sia montato accanto
  // è vero oggi e non è un fatto su cui questo componente debba appoggiarsi. Senza gestore,
  // un avviso prodotto mentre l'app è aperta non si vedrebbe affatto.
  useEffect(() => {
    installForegroundHandler();
  }, []);

  useEffect(() => {
    let cancelled = false;

    chain.current = chain.current
      .then(async () => {
        if (cancelled) return;

        const marks = parseSyncMarks(await meta.get(SYNC_MARKS_KEY));
        const {
          alert,
          marks: next,
          changed,
        } = reviewSync({
          vaultId,
          phase,
          marks,
          knownVaultIds,
          now: Date.now(),
        });
        if (cancelled) return;

        // **Prima si scrive, poi si avvisa**, come per i budget: un invio riuscito seguito
        // da una scrittura fallita rifarebbe lo stesso avviso al giro dopo, e poi ancora.
        // Un avviso perso si nota una volta, uno ripetuto fa spegnere l'interruttore.
        if (changed) await meta.set(SYNC_MARKS_KEY, serializeSyncMarks(next));
        if (alert === null) return;

        // Le impostazioni si rileggono **adesso** e non all'inizio: l'interruttore può
        // essere stato toccato mentre questo giro era in coda. I segni si aggiornano
        // comunque, anche a interruttore spento — è ciò che evita che riaccenderlo racconti
        // un guasto che si era scelto di non farsi raccontare.
        const settings = parseSettings(await meta.get(SETTINGS_KEY));
        if (cancelled || !settings.sync) return;

        await notifySync(syncContent(alert, groupName));
      })
      .catch(() => {
        // Un avviso mancato non è un guasto da mostrare: lo stato del sync si vede in Tu e
        // in fondo alla lista spese, e il prossimo tentativo del motore riprova di qui.
      });

    return () => {
      cancelled = true;
    };
  }, [meta, vaultId, phase, knownVaultIds, groupName]);

  return null;
}

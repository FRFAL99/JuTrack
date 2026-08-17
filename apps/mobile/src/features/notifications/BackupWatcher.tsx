import { useEffect, useMemo, useRef } from 'react';
import { useAppData, useExpenses, useGroups, useVaultStatus } from '@/state';
import {
  BACKUP_MARKS_KEY,
  backupContent,
  parseBackupMarks,
  reviewBackup,
  serializeBackupMarks,
} from './backup';
import { installForegroundHandler } from './foreground';
import { notifyBackup } from './schedule';
import { parseSettings, SETTINGS_KEY } from './settings';

/**
 * Guarda quanto c'è dentro il gruppo aperto e avvisa se la sua chiave non risulta salvata.
 * Non disegna niente.
 *
 * **Si iscrive al documento**, come `BudgetWatcher` e non come `SyncWatcher`: la cosa che
 * cambia è il numero di spese, e cambia tanto per una registrata qui quanto per una arrivata
 * dall'altro telefono col sync. Le due non hanno un punto di chiamata in comune, e iscriversi
 * al documento le prende entrambe senza che nessuna schermata debba ricordarsi di dire
 * niente.
 *
 * **È l'avviso più economico dei quattro**, e vale la pena dire perché: nel caso normale —
 * chiave già salvata, oppure avviso già dato — `reviewBackup` esce alla prima riga e non
 * scrive niente. Un gruppo salvato una volta non fa più nulla per il resto della sua vita,
 * perché la `vaultKey` non cambia mai.
 *
 * **Un gruppo per volta, quello aperto**, come per budget e sync: di runtime ne è montato
 * uno solo. Il prezzo è dichiarato e accettato — un gruppo che non si apre da un mese non
 * produce avvisi — ma qui pesa meno che altrove: un gruppo che non si apre è anche un gruppo
 * in cui non si sta accumulando niente di nuovo da perdere.
 */
export function BackupWatcher() {
  const status = useVaultStatus();
  // Diviso in due come gli altri due watcher: gli hook che leggono il vault esistono solo
  // dove il vault esiste, invece di un ramo nullable propagato in ogni riga sotto.
  if (status.phase !== 'ready') return null;
  return <Watch vaultId={status.runtime.vaultId} />;
}

function Watch({ vaultId }: { vaultId: string }) {
  const { meta } = useAppData();
  const { groups } = useGroups();

  // Senza filtro: la soglia misura **tutto** quello che si perderebbe, non le spese di un
  // mese. Le cancellate restano fuori, come dappertutto — un tombstone non è una perdita.
  const expenses = useExpenses();
  const expenseCount = expenses.length;

  const knownVaultIds = useMemo(() => groups.map((group) => group.vaultId), [groups]);
  const groupName = groups.find((group) => group.vaultId === vaultId)?.name ?? 'questo gruppo';

  /**
   * I giri si mettono in fila, non in parallelo — stessa ragione degli altri due watcher.
   *
   * Ogni giro è un leggi-modifica-scrivi su `app_meta`, e qui c'è un secondo scrittore che
   * gli altri non hanno: `recordBackup`, chiamata da `/backup` quando la cifratura riesce.
   * La catena mette in fila i giri di questo componente; con `recordBackup` la corsa è
   * innocua in entrambi gli ordini — o si legge un segno senza `savedAt` e si avvisa una
   * volta di troppo, o lo si legge con `savedAt` e non si avvisa affatto. Nessuno dei due
   * perde il fatto che la chiave è salvata.
   */
  const chain = useRef<Promise<void>>(Promise.resolve());

  // Idempotente, e chiamato anche qui di proposito: che gli altri watcher siano montati
  // accanto è vero oggi e non è un fatto su cui questo componente debba appoggiarsi.
  useEffect(() => {
    installForegroundHandler();
  }, []);

  useEffect(() => {
    let cancelled = false;

    chain.current = chain.current
      .then(async () => {
        if (cancelled) return;

        const marks = parseBackupMarks(await meta.get(BACKUP_MARKS_KEY));
        const {
          alert,
          marks: next,
          changed,
        } = reviewBackup({ vaultId, expenseCount, marks, knownVaultIds });
        if (cancelled) return;

        // **Prima si scrive, poi si avvisa**, come per budget e sync: un invio riuscito
        // seguito da una scrittura fallita rifarebbe lo stesso avviso al giro dopo, e poi
        // ancora — e questo è l'avviso che meno di tutti si può permettere di diventare
        // rumore, perché è l'unico che parla di una perdita che non si recupera.
        if (changed) await meta.set(BACKUP_MARKS_KEY, serializeBackupMarks(next));
        if (alert === null) return;

        // Le impostazioni si rileggono **adesso** e non all'inizio: l'interruttore può
        // essere stato toccato mentre questo giro era in coda. Il segno si aggiorna
        // comunque, anche a interruttore spento — è ciò che evita che riaccenderlo racconti
        // da capo una cosa che si era scelto di non farsi raccontare.
        const settings = parseSettings(await meta.get(SETTINGS_KEY));
        if (cancelled || !settings.backup) return;

        await notifyBackup(backupContent(alert, groupName));
      })
      .catch(() => {
        // Un avviso mancato non è un guasto da mostrare: la stessa cosa è scritta in cima a
        // `/backup`, e la prossima modifica del documento riprova.
      });

    return () => {
      cancelled = true;
    };
  }, [meta, vaultId, expenseCount, knownVaultIds, groupName]);

  return null;
}

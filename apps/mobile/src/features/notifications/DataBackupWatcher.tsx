import { useEffect, useMemo, useRef } from 'react';
import { AUTO_BACKUP_KEY, parseBackupMarks } from '@/features/backup/auto';
import { useAppData, useExpenses, useGroups, useVaultStatus } from '@/state';
import {
  DATA_BACKUP_ALERTS_KEY,
  dataBackupContent,
  parseDataBackupMarks,
  reviewDataBackup,
  serializeDataBackupMarks,
} from './data-backup';
import { installForegroundHandler } from './foreground';
import { notifyDataBackup } from './schedule';
import { parseSettings, SETTINGS_KEY } from './settings';

/**
 * Guarda quante spese del gruppo aperto non sono nel backup, e avvisa. Non disegna niente.
 *
 * **È il gemello di `BackupWatcher`, e ne differisce in una cosa sola**: là si parla della
 * chiave, che salvata una volta vale per sempre; qui dei dati, che invecchiano a ogni spesa.
 * Quella differenza sta tutta dentro `data-backup.ts`; qui la forma è la stessa, apposta —
 * cinque avvisi con cinque impianti diversi sarebbero cinque cose da tenere allineate.
 *
 * **Si iscrive al documento** come `BudgetWatcher` e `BackupWatcher`: la cosa che cambia è
 * il numero di spese, e cambia tanto per una registrata qui quanto per una arrivata
 * dall'altro telefono col sync. Le due non hanno un punto di chiamata in comune.
 *
 * **Legge due tabelle di segni e ne scrive una sola.** `AUTO_BACKUP_KEY` la scrive il backup
 * automatico (Step 65) e qui si legge soltanto: è il fatto, e questo componente non lo
 * decide. `DATA_BACKUP_ALERTS_KEY` è sua, e dice solo se l'avviso è già stato dato.
 *
 * **Un gruppo per volta, quello aperto**, come gli altri tre. Il prezzo è dichiarato: un
 * gruppo che non si apre da un mese non produce avvisi. Qui pesa poco per la stessa ragione
 * dello Step 43, e anzi meno: un gruppo che non si apre è un gruppo in cui non entrano
 * spese nuove, e la soglia di questo avviso conta esattamente quelle.
 */
export function DataBackupWatcher() {
  const status = useVaultStatus();
  if (status.phase !== 'ready') return null;
  return <Watch vaultId={status.runtime.vaultId} />;
}

function Watch({ vaultId }: { vaultId: string }) {
  const { meta } = useAppData();
  const { groups } = useGroups();

  // Le cancellate restano fuori, come dappertutto: un tombstone non è una perdita. È anche
  // lo stesso conteggio che `readVaultContents` registra al momento del backup, e le due
  // misure devono combaciare o la differenza non vorrebbe dire niente.
  const expenses = useExpenses();
  const expenseCount = expenses.length;

  const knownVaultIds = useMemo(() => groups.map((group) => group.vaultId), [groups]);
  const groupName = groups.find((group) => group.vaultId === vaultId)?.name ?? 'questo gruppo';

  /** I giri si mettono in fila, non in parallelo — stessa ragione degli altri watcher. */
  const chain = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    installForegroundHandler();
  }, []);

  useEffect(() => {
    let cancelled = false;

    chain.current = chain.current
      .then(async () => {
        if (cancelled) return;

        const backupMarks = parseBackupMarks(await meta.get(AUTO_BACKUP_KEY));
        const marks = parseDataBackupMarks(await meta.get(DATA_BACKUP_ALERTS_KEY));
        const {
          alert,
          marks: next,
          changed,
        } = reviewDataBackup({ vaultId, expenseCount, backupMarks, marks, knownVaultIds });
        if (cancelled) return;

        // **Prima si scrive, poi si avvisa**, come gli altri quattro: un invio riuscito
        // seguito da una scrittura fallita rifarebbe lo stesso avviso al giro dopo.
        if (changed) await meta.set(DATA_BACKUP_ALERTS_KEY, serializeDataBackupMarks(next));
        if (alert === null) return;

        // Rilette adesso e non all'inizio: l'interruttore può essere stato toccato mentre
        // questo giro era in coda. Il segno si aggiorna comunque, anche a interruttore
        // spento — o riaccenderlo racconterebbe da capo una cosa già saltata.
        const settings = parseSettings(await meta.get(SETTINGS_KEY));
        if (cancelled || !settings.dataBackup) return;

        await notifyDataBackup(dataBackupContent(alert, groupName));
      })
      .catch(() => {
        // Un avviso mancato non è un guasto da mostrare: la prossima modifica riprova.
      });

    return () => {
      cancelled = true;
    };
  }, [meta, vaultId, expenseCount, knownVaultIds, groupName]);

  return null;
}

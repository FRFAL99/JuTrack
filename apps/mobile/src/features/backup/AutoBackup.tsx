import { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { toJsonExport } from '@jutrack/core';
import Constants from 'expo-constants';
import { markError } from '@/diagnostics';
import { useAppData, useGroups } from '@/state';
import {
  AUTO_BACKUP_KEY,
  BACKUP_KEEP,
  backupFileName,
  backupFilePrefix,
  filesToPrune,
  markBackedUp,
  parseBackupMarks,
  reviewAutoBackup,
  serializeBackupMarks,
} from './auto';
import { deleteFromFolder, listFolder, readFolderUri, writeIntoFolder } from './folder';
import { readVaultContents } from './vaults';

/**
 * Scrive il backup di tutti i gruppi nella cartella scelta, quando è ora. Non disegna niente.
 *
 * **«Automatico» qui vuol dire «alla riapertura», e le schermate lo dicono con queste
 * parole.** Un backup mentre l'app è chiusa vorrebbe dire `expo-background-task`, cioè un
 * modulo nativo e una build: è rimandato dichiaratamente nel piano v8. Promettere di più di
 * quello che si fa sarebbe il difetto peggiore di una funzione di backup — chi ci conta non
 * ha modo di accorgersi che non è successo.
 *
 * **Gira dopo che l'interfaccia è disegnata**, non durante. Tre gruppi con qualche migliaio
 * di spese sono lavoro vero sul thread JS: leggere il log, ricostruire il documento,
 * serializzare. Farlo al montaggio vorrebbe dire un'app che parte lenta una volta a
 * settimana, senza che nessuno capisca perché proprio quella volta.
 *
 * **Una volta per sessione**, e non a ogni ritorno in primo piano: la soglia è in giorni,
 * quindi riprovare a ogni `AppState` cambiato non produrrebbe un backup in più, solo letture
 * in più. Chi vuole farlo adesso ha il bottone in «Tu».
 */
export function AutoBackup() {
  const { db, meta } = useAppData();
  const { groups } = useGroups();

  // I gruppi arrivano dopo il primo render: il giro parte quando ce n'è almeno uno, e una
  // volta sola. Senza questa guardia partirebbe a vuoto e si segnerebbe come fatto.
  const done = useRef(false);

  useEffect(() => {
    if (done.current || groups.length === 0) return;
    done.current = true;

    const task = InteractionManager.runAfterInteractions(() => {
      void run().catch((error: unknown) => markError('backup automatico', error));
    });

    async function run(): Promise<void> {
      const folderUri = await readFolderUri(meta);
      // Nessuna cartella scelta: non c'è niente da fare, e non è un guasto. È lo stato
      // normale finché qualcuno non apre «Tu» e ne sceglie una.
      if (folderUri === null) return;

      const vaultIds = groups.map((group) => group.vaultId);
      const review = reviewAutoBackup({
        vaultIds,
        marks: parseBackupMarks(await meta.get(AUTO_BACKUP_KEY)),
        nowMs: Date.now(),
      });

      let marks = review.marks;
      let touched = review.changed;

      for (const vaultId of review.due) {
        const contents = await readVaultContents(db, vaultId);
        // Un gruppo registrato ma mai aperto non ha ancora niente sul disco: non si scrive
        // un file vuoto, e soprattutto **non si segna come fatto** — così il primo backup
        // vero parte appena ci sarà qualcosa dentro.
        if (contents === null) continue;

        const name = contents.groupName ?? groups.find((g) => g.vaultId === vaultId)?.name ?? '';
        const now = new Date();
        const fileName = backupFileName(name, vaultId, now);

        const content = toJsonExport(contents.snapshot, {
          now: () => now,
          groupName: contents.groupName,
          app: Constants.expoConfig?.version ?? null,
        });

        const outcome = await writeIntoFolder(folderUri, fileName, content);
        // Il segno si scrive **solo** a file finito sul disco. Segnarlo comunque vorrebbe
        // dire che una cartella revocata spegne il backup per altri sette giorni, in
        // silenzio e proprio dopo aver fallito.
        if (outcome.status !== 'written') continue;

        marks = markBackedUp(marks, vaultId, now.getTime(), contents.expenseCount);
        touched = true;

        // La potatura viene dopo la scrittura, non prima: se si cancellassero prima le
        // copie vecchie e poi la nuova fallisse, si resterebbe con meno backup di quanti
        // se ne avevano cominciando.
        const names = listFolder(folderUri);
        if (names !== null) {
          deleteFromFolder(
            folderUri,
            filesToPrune(names, backupFilePrefix(name, vaultId), BACKUP_KEEP),
          );
        }
      }

      if (touched) await meta.set(AUTO_BACKUP_KEY, serializeBackupMarks(marks));
    }

    return () => task.cancel();
  }, [db, meta, groups]);

  return null;
}

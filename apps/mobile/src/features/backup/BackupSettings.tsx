import { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { toJsonExport } from '@jutrack/core';
import Constants from 'expo-constants';
import { Button } from '@/components/Button';
import { Note } from '@/components/Note';
import { t } from '@/i18n/translate';
import { useAppData, useGroups } from '@/state';
import { useTheme } from '@/theme';
import {
  AUTO_BACKUP_KEY,
  BACKUP_EVERY_DAYS,
  BACKUP_KEEP,
  backupFileName,
  backupFilePrefix,
  filesToPrune,
  markBackedUp,
  parseBackupMarks,
  serializeBackupMarks,
  type BackupMarks,
} from './auto';
import {
  chooseFolder,
  deleteFromFolder,
  forgetFolder,
  isFolderPickerAvailable,
  listFolder,
  readFolderUri,
  saveFolderUri,
  writeIntoFolder,
} from './folder';
import { readVaultContents } from './vaults';

/**
 * Il contenuto del foglio «Backup automatico» in «Tu».
 *
 * **Dice sempre due cose e non una**: dove finiscono i file, e **quando** è stato fatto
 * l'ultimo. Una funzione di backup che non dice la seconda chiede di essere creduta sulla
 * parola, ed è il genere di fiducia che si scopre mal riposta al momento peggiore.
 *
 * **Il bottone «Fai un backup adesso» non è una comodità**: è l'unico modo di vedere se
 * tutto il giro funziona senza aspettare sette giorni, e quindi è anche il criterio di
 * «fatto» dello step.
 */
export function BackupSettings() {
  const { db, meta } = useAppData();
  const { groups } = useGroups();
  const { spacing } = useTheme();

  const [folderUri, setFolderUri] = useState<string | null>(null);
  const [marks, setMarks] = useState<BackupMarks>({});
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const available = isFolderPickerAvailable();

  /**
   * Rilegge cartella e segni.
   *
   * Chiamata dai gestori di evento — dopo aver scelto o dimenticato una cartella — dove
   * aggiornare lo stato è il punto. Il primo caricamento invece passa dall'effetto qui
   * sotto, con la sua guardia `cancelled`, che è la forma usata nel resto dell'app.
   */
  const refresh = useCallback(async (): Promise<void> => {
    const uri = await readFolderUri(meta);
    const stored = parseBackupMarks(await meta.get(AUTO_BACKUP_KEY));
    setFolderUri(uri);
    setMarks(stored);
    setLoaded(true);
  }, [meta]);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      const uri = await readFolderUri(meta);
      const stored = parseBackupMarks(await meta.get(AUTO_BACKUP_KEY));
      // Il foglio si può chiudere mentre si legge: senza questa guardia si scriverebbe
      // dentro un componente smontato.
      if (cancelled) return;
      setFolderUri(uri);
      setMarks(stored);
      setLoaded(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [meta]);

  const pick = (): void => {
    setBusy(true);
    void chooseFolder()
      .then(async (outcome) => {
        if (outcome.status === 'chosen') {
          await saveFolderUri(meta, outcome.uri);
          await refresh();
          return;
        }
        if (outcome.status === 'cancelled') return;
        if (outcome.status === 'unavailable') {
          Alert.alert(t('you.backup.unavailable.title'), t('you.backup.unavailable.body'));
          return;
        }
        Alert.alert(
          t('you.backup.failedTitle'),
          outcome.error instanceof Error ? outcome.error.message : String(outcome.error),
        );
      })
      .finally(() => setBusy(false));
  };

  const forget = (): void => {
    Alert.alert(t('you.backup.forgetTitle'), t('you.backup.forgetBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('you.backup.forgetConfirm'),
        style: 'destructive',
        onPress: () => {
          void forgetFolder(meta).then(refresh);
        },
      },
    ]);
  };

  /**
   * Scrive adesso il backup di **tutti** i gruppi, ignorando la soglia.
   *
   * Ripete il giro di `AutoBackup` invece di chiamarlo: quel componente decide *se* è ora,
   * e qui la risposta è già sì. Quello che i due condividono davvero — i nomi, la potatura,
   * i segni — sta in `auto.ts`, ed è l'unica parte in cui una divergenza si vedrebbe.
   */
  const runNow = (): void => {
    if (folderUri === null) return;
    setBusy(true);

    void (async () => {
      let next = marks;
      let written = 0;
      let failed = 0;

      for (const group of groups) {
        const contents = await readVaultContents(db, group.vaultId);
        // Un gruppo mai aperto non ha niente sul disco: non conta né come scritto né come
        // fallito, o il messaggio finale direbbe che è andato storto qualcosa.
        if (contents === null) continue;

        const name = contents.groupName ?? group.name;
        const now = new Date();
        const fileName = backupFileName(name, group.vaultId, now);
        const content = toJsonExport(contents.snapshot, {
          now: () => now,
          groupName: contents.groupName,
          app: Constants.expoConfig?.version ?? null,
        });

        const outcome = await writeIntoFolder(folderUri, fileName, content);
        if (outcome.status !== 'written') {
          failed++;
          continue;
        }

        next = markBackedUp(next, group.vaultId, now.getTime(), contents.expenseCount);
        written++;

        const names = listFolder(folderUri);
        if (names !== null) {
          deleteFromFolder(
            folderUri,
            filesToPrune(names, backupFilePrefix(name, group.vaultId), BACKUP_KEEP),
          );
        }
      }

      await meta.set(AUTO_BACKUP_KEY, serializeBackupMarks(next));
      setMarks(next);
      setBusy(false);

      // **Il messaggio nomina i numeri**, anche quando è tutto andato bene: «fatto» da solo
      // non distingue «tre gruppi salvati» da «zero gruppi salvati, perché erano tutti
      // vuoti», e sono due situazioni molto diverse per chi ci conta.
      if (failed > 0) {
        Alert.alert(t('you.backup.partialTitle'), t('you.backup.partialBody', { written, failed }));
      } else {
        Alert.alert(t('you.backup.doneTitle'), t('you.backup.doneBody', { written }));
      }
    })();
  };

  if (!available) {
    return (
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Note tone="warning">{t('you.backup.unavailable.body')}</Note>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
      <Note>{t('you.backup.hint', { days: BACKUP_EVERY_DAYS, keep: BACKUP_KEEP })}</Note>
      {/* Detto con queste parole e non con «automatico» e basta: un backup mentre l'app è
          chiusa vorrebbe dire un modulo nativo, ed è rimandato. Promettere di più di quello
          che si fa è il difetto peggiore che una funzione di backup possa avere. */}
      <Note>{t('you.backup.whenHint')}</Note>

      {loaded && folderUri === null && (
        <Button label={t('you.backup.choose')} onPress={pick} loading={busy} disabled={busy} />
      )}

      {loaded && folderUri !== null && (
        <>
          <Note>{describeLast(marks)}</Note>
          <Button
            label={t('you.backup.runNow')}
            onPress={runNow}
            loading={busy}
            disabled={busy || groups.length === 0}
          />
          <Button
            label={t('you.backup.change')}
            variant="secondary"
            onPress={pick}
            disabled={busy}
          />
          <Button
            label={t('you.backup.forget')}
            variant="danger"
            onPress={forget}
            disabled={busy}
          />
        </>
      )}
    </View>
  );
}

/**
 * «Ultimo backup: 13/9/2026» — o che non ne risulta nessuno.
 *
 * **«Non risulta» e non «non ne hai mai fatti»**, per la stessa ragione dello Step 43:
 * l'app conosce i backup che ha visto fare, e su una cartella riempita da una versione che
 * non teneva il conto la seconda frase sarebbe falsa. L'errore va in questa direzione di
 * proposito.
 */
export function describeLast(marks: BackupMarks): string {
  const times = Object.values(marks).map((mark) => mark.lastBackupAt);
  if (times.length === 0) return t('you.backup.never');

  const last = new Date(Math.max(...times));
  return t('you.backup.last', {
    day: last.getDate(),
    month: last.getMonth() + 1,
    year: last.getFullYear(),
  });
}

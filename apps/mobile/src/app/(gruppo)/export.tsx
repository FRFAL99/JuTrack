import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, View } from 'react-native';
import { toJsonExport, toXlsxExport } from '@jutrack/core';
import { Button } from '@/components/Button';
import { ModalScreen } from '@/components/ModalScreen';
import { Note } from '@/components/Note';
import { SectionLabel } from '@/components/SectionLabel';
import { exportFileName } from '@/features/export/filenames';
import { isFileSharingAvailable, shareBinaryFile, shareTextFile } from '@/features/export/share';
import { useVaultRuntime } from '@/state';
import { useTheme } from '@/theme';

/**
 * Porta i dati fuori dall'app.
 *
 * Requisito esplicito del progetto: nessun lock-in. Chi smette di usare JuTrack deve
 * potersi portare via tutto in formati che si aprono altrove — e senza passare da un
 * server, perché il server non li ha mai visti in chiaro.
 *
 * Due formati, due scopi diversi: il foglio di calcolo si legge, il JSON si conserva.
 * Nessuno dei due contiene la chiave del vault: quella ha una schermata sua (`/backup`) e
 * viaggia cifrata con una passphrase.
 *
 * **I bottoni sono due, ed erano tre.** Fino allo Step 61 il formato per leggere era il
 * CSV, e siccome un CSV è una tabella sola servivano due file — spese e pareggi. Un `.xlsx`
 * ha i fogli, quindi è un file solo con due linguette: il bottone di mezzo è sparito perché
 * è sparita la ragione per cui esisteva. Il perché del cambio di formato sta nell'ADR 0004.
 *
 * **La schermata non spiega più i formati in due paragrafi.** Erano tre card con un titolo
 * in grassetto e sotto duecentosettanta caratteri ciascuna: un blocco che pesava quanto il
 * bottone che accompagnava, e che dopo la prima lettura nessuno rileggeva. Adesso sono
 * sezioni con una `Note` di una riga, come in «Tu».
 */
export default function ExportScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { store } = useVaultRuntime();
  const [busy, setBusy] = useState<string | null>(null);

  const sharingAvailable = isFileSharingAvailable();

  /** Il contenuto, o `null` se costruirlo è fallito — nel qual caso l'avviso è già uscito. */
  const build = <T,>(make: () => T): T | null => {
    try {
      return make();
    } catch (error) {
      setBusy(null);
      Alert.alert(
        t('exportScreen.failedTitle'),
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  };

  const report = (outcome: { status: string; error?: unknown }): void => {
    if (outcome.status === 'failed') {
      Alert.alert(
        t('exportScreen.failedTitle'),
        outcome.error instanceof Error ? outcome.error.message : String(outcome.error),
      );
    } else if (outcome.status === 'unavailable') {
      Alert.alert(
        t('exportScreen.shareUnavailable.title'),
        t('exportScreen.shareUnavailable.body'),
      );
    }
  };

  /** Un export di testo: se il foglio di condivisione manca, ripiega sugli appunti. */
  const runText = (id: string, what: string, mimeType: string, make: () => string) => {
    return (): void => {
      setBusy(id);
      const content = build(make);
      if (content === null) return;

      const name = exportFileName(what, 'json', new Date());

      if (!sharingAvailable) {
        void Clipboard.setStringAsync(content)
          .then(() =>
            Alert.alert(
              t('exportScreen.clipboard.title'),
              t('exportScreen.clipboard.body', { name }),
            ),
          )
          .catch((error: unknown) => {
            Alert.alert(
              t('exportScreen.copyFailedTitle'),
              error instanceof Error ? error.message : String(error),
            );
          })
          .finally(() => setBusy(null));
        return;
      }

      void shareTextFile({ name, content, mimeType, dialogTitle: name })
        .then(report)
        .finally(() => setBusy(null));
    };
  };

  /**
   * Un export di byte.
   *
   * **Non ripiega sugli appunti**, a differenza di quello di testo: un `.xlsx` è uno ZIP, e
   * incollarlo da qualche parte produrrebbe spazzatura che sembra un export. Meglio dire
   * che non si può fare — e infatti il bottone è disabilitato prima ancora di provarci.
   */
  const runBinary = (id: string, what: string, mimeType: string, make: () => Uint8Array) => {
    return (): void => {
      setBusy(id);
      const content = build(make);
      if (content === null) return;

      const name = exportFileName(what, 'xlsx', new Date());
      void shareBinaryFile({ name, content, mimeType, dialogTitle: name })
        .then(report)
        .finally(() => setBusy(null));
    };
  };

  return (
    <ModalScreen title={t('exportScreen.title')}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <SectionLabel>{t('exportScreen.sheetTitle')}</SectionLabel>
        <Note>{t('exportScreen.sheetBody')}</Note>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Button
            label={t('exportScreen.sheetButton')}
            onPress={runBinary(
              'foglio',
              'dati',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              () => toXlsxExport(store.snapshot()),
            )}
            loading={busy === 'foglio'}
            /* Senza foglio di condivisione un file binario non ha dove andare: il bottone
               si spegne, e la nota in fondo alla schermata dice perché. */
            disabled={busy !== null || !sharingAvailable}
          />
        </View>
        {/* Cosa c'è dentro il file, e perché i pareggi sono un foglio a parte. Sta **sotto**
            il bottone perché è la risposta a averlo premuto, non la domanda che lo precede. */}
        <View style={{ paddingTop: spacing.sm }}>
          <Note>{t('exportScreen.sheetSplitHint')}</Note>
        </View>

        <SectionLabel>{t('exportScreen.jsonTitle')}</SectionLabel>
        <Note>{t('exportScreen.jsonBody')}</Note>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Button
            label={t('exportScreen.jsonButton')}
            onPress={runText('vault', 'vault', 'application/json', () =>
              // Il nome viene da `getGroupName()` e non dalla copia nel registro locale:
              // quella è una copia, e in caso di divergenza è lei a doversi aggiornare.
              toJsonExport(store.snapshot(), {
                groupName: store.getGroupName(),
                app: Constants.expoConfig?.version ?? null,
              }),
            )}
            loading={busy === 'vault'}
            disabled={busy !== null}
          />
        </View>

        {/* L'avviso resta in `danger` e resta **due frasi**: la prima dice cosa succede, la
            seconda cosa non succede. Accorciarlo a una lascerebbe credere che anche la
            chiave del vault esca in chiaro, che è l'equivoco peggiore possibile qui. */}
        <SectionLabel>{t('exportScreen.unencryptedTitle')}</SectionLabel>
        <Note tone="danger">{t('exportScreen.unencryptedBody1')}</Note>
        <Note>{t('exportScreen.unencryptedBody2', { label: t('manage.group.backup') })}</Note>

        {!sharingAvailable && <Note tone="warning">{t('exportScreen.noSharingNote')}</Note>}
      </ScrollView>
    </ModalScreen>
  );
}

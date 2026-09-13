import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, View } from 'react-native';
import { expensesToCsv, settlementsToCsv, toJsonExport } from '@jutrack/core';
import { Button } from '@/components/Button';
import { ModalScreen } from '@/components/ModalScreen';
import { Note } from '@/components/Note';
import { SectionLabel } from '@/components/SectionLabel';
import { exportFileName } from '@/features/export/filenames';
import { isFileSharingAvailable, shareTextFile } from '@/features/export/share';
import { useVaultRuntime } from '@/state';
import { useTheme } from '@/theme';

/**
 * Porta i dati fuori dall'app.
 *
 * Requisito esplicito del progetto: nessun lock-in. Chi smette di usare JuTrack deve
 * potersi portare via tutto in formati che si aprono altrove — e senza passare da un
 * server, perché il server non li ha mai visti in chiaro.
 *
 * Due formati, due scopi diversi: il CSV si legge, il JSON si conserva. Nessuno dei due
 * contiene la chiave del vault: quella ha una schermata sua (`/backup`) e viaggia cifrata
 * con una passphrase.
 *
 * **La schermata non spiega più i formati in due paragrafi.** Erano tre card con un titolo
 * in grassetto e sotto duecentosettanta caratteri ciascuna: un blocco che pesava quanto il
 * bottone che accompagnava, e che dopo la prima lettura nessuno rileggeva. Adesso sono
 * sezioni con una `Note` di una riga, come in «Tu» — quello che è stato tagliato è ciò che
 * si scopre aprendo il file (che gli importi ci sono anche in centesimi interi), non ciò che
 * serve a scegliere.
 */
export default function ExportScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { store } = useVaultRuntime();
  const [busy, setBusy] = useState<string | null>(null);

  const sharingAvailable = isFileSharingAvailable();

  const run = (
    id: string,
    what: string,
    extension: string,
    mimeType: string,
    build: () => string,
  ) => {
    return (): void => {
      setBusy(id);
      // Il contenuto si costruisce in ogni caso: serve sia al file sia agli appunti.
      let content: string;
      try {
        content = build();
      } catch (error) {
        setBusy(null);
        Alert.alert(
          t('exportScreen.failedTitle'),
          error instanceof Error ? error.message : String(error),
        );
        return;
      }

      const name = exportFileName(what, extension, new Date());

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
        .then((outcome) => {
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
        })
        .finally(() => setBusy(null));
    };
  };

  return (
    <ModalScreen title={t('exportScreen.title')}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <SectionLabel>{t('exportScreen.csvTitle')}</SectionLabel>
        <Note>{t('exportScreen.csvBody')}</Note>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <Button
            label={t('exportScreen.expensesCsvButton')}
            onPress={run('spese', 'spese', 'csv', 'text/csv', () =>
              expensesToCsv(store.snapshot()),
            )}
            loading={busy === 'spese'}
            disabled={busy !== null}
          />
          <Button
            label={t('exportScreen.settlementsCsvButton')}
            variant="secondary"
            onPress={run('pareggi', 'pareggi', 'csv', 'text/csv', () =>
              settlementsToCsv(store.snapshot()),
            )}
            loading={busy === 'pareggi'}
            disabled={busy !== null}
          />
        </View>
        {/* Perché i pareggi sono un file a parte: è la sola domanda che i due bottoni
            lasciano aperta, e sta **sotto** di loro perché è la risposta a averli visti. */}
        <View style={{ paddingTop: spacing.sm }}>
          <Note>{t('exportScreen.csvSplitHint')}</Note>
        </View>

        <SectionLabel>{t('exportScreen.jsonTitle')}</SectionLabel>
        <Note>{t('exportScreen.jsonBody')}</Note>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Button
            label={t('exportScreen.jsonButton')}
            onPress={run('vault', 'vault', 'json', 'application/json', () =>
              toJsonExport(store.snapshot()),
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
        <Note>{t('exportScreen.unencryptedBody2', { label: t('you.group.backup') })}</Note>

        {!sharingAvailable && <Note tone="warning">{t('exportScreen.noSharingNote')}</Note>}
      </ScrollView>
    </ModalScreen>
  );
}

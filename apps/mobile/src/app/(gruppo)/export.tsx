import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Text, View } from 'react-native';
import { expensesToCsv, settlementsToCsv, toJsonExport } from '@jutrack/core';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ModalScreen } from '@/components/ModalScreen';
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
 * Due formati, due scopi diversi, spiegati nella schermata: il CSV si legge, il JSON si
 * conserva. Nessuno dei due contiene la chiave del vault: quella ha una schermata sua
 * (`/backup`) e viaggia cifrata con una passphrase.
 */
export default function ExportScreen() {
  const { t } = useTranslation();
  const { colors, spacing, fontSize, fontWeight } = useTheme();
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
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Card style={{ gap: spacing.sm }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            {t('exportScreen.csvTitle')}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            {t('exportScreen.csvBody')}
          </Text>
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
          <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, lineHeight: 18 }}>
            {t('exportScreen.csvSplitHint')}
          </Text>
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            {t('exportScreen.jsonTitle')}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            {t('exportScreen.jsonBody')}
          </Text>
          <Button
            label={t('exportScreen.jsonButton')}
            onPress={run('vault', 'vault', 'json', 'application/json', () =>
              toJsonExport(store.snapshot()),
            )}
            loading={busy === 'vault'}
            disabled={busy !== null}
          />
        </Card>

        <Card style={{ gap: spacing.xs, borderColor: colors.danger }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            {t('exportScreen.unencryptedTitle')}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            {t('exportScreen.unencryptedBody1')}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            {t('exportScreen.unencryptedBody2', { label: t('you.group.backup') })}
          </Text>
        </Card>

        {!sharingAvailable && (
          <Card>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
              {t('exportScreen.noSharingNote')}
            </Text>
          </Card>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </ModalScreen>
  );
}

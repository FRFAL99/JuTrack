import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
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
        Alert.alert('Export fallito', error instanceof Error ? error.message : String(error));
        return;
      }

      const name = exportFileName(what, extension, new Date());

      if (!sharingAvailable) {
        void Clipboard.setStringAsync(content)
          .then(() =>
            Alert.alert(
              'Copiato negli appunti',
              `Su questa build manca il modulo per salvare i file, quindi ${name} è finito ` +
                'negli appunti. Incollalo dove preferisci — oppure aggiorna l’app per avere il ' +
                'foglio di condivisione.',
            ),
          )
          .catch((error: unknown) => {
            Alert.alert('Copia fallita', error instanceof Error ? error.message : String(error));
          })
          .finally(() => setBusy(null));
        return;
      }

      void shareTextFile({ name, content, mimeType, dialogTitle: name })
        .then((outcome) => {
          if (outcome.status === 'failed') {
            Alert.alert(
              'Export fallito',
              outcome.error instanceof Error ? outcome.error.message : String(outcome.error),
            );
          } else if (outcome.status === 'unavailable') {
            Alert.alert(
              'Condivisione non disponibile',
              'Questo dispositivo non offre il foglio di condivisione.',
            );
          }
        })
        .finally(() => setBusy(null));
    };
  };

  return (
    <ModalScreen title="Esporta i dati">
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Card style={{ gap: spacing.sm }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            Per leggerli altrove
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            Un foglio di calcolo: una riga per spesa, una colonna con la quota di ciascuno. Si apre
            in Excel, Fogli Google o qualunque altro strumento. Gli importi ci sono due volte, in
            euro e in centesimi interi: la seconda colonna è quella che nessun programma può
            interpretare male.
          </Text>
          <Button
            label="Spese (CSV)"
            onPress={run('spese', 'spese', 'csv', 'text/csv', () =>
              expensesToCsv(store.snapshot()),
            )}
            loading={busy === 'spese'}
            disabled={busy !== null}
          />
          <Button
            label="Pareggi (CSV)"
            variant="secondary"
            onPress={run('pareggi', 'pareggi', 'csv', 'text/csv', () =>
              settlementsToCsv(store.snapshot()),
            )}
            loading={busy === 'pareggi'}
            disabled={busy !== null}
          />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, lineHeight: 18 }}>
            I pareggi stanno in un file a parte perché non sono spese: sommarli insieme darebbe un
            totale che non vuol dire niente.
          </Text>
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            Per conservarli
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            Copia integrale del vault in JSON: spese, categorie, persone, budget e pareggi,
            com&apos;è in memoria. È il formato da tenere da parte — il CSV, per come è fatto, perde
            pezzi.
          </Text>
          <Button
            label="Tutto il vault (JSON)"
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
            Questi file non sono cifrati
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            Escono in chiaro: chi li riceve legge le vostre spese. La cifratura end-to-end protegge
            i dati mentre passano dal relay, non dopo che li avete mandati a qualcun altro.
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            La chiave del vault non è dentro nessuno di questi file. Per quella c&apos;è «Backup
            della chiave», ed è protetta da una passphrase.
          </Text>
        </Card>

        {!sharingAvailable && (
          <Card>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
              Su questa build i moduli per scrivere e condividere file non sono disponibili: gli
              export finiranno negli appunti. Una build aggiornata dell&apos;app risolve.
            </Text>
          </Card>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </ModalScreen>
  );
}

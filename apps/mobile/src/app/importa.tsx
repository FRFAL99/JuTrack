import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { parseVaultExport, type ImportReport, type VaultSnapshot } from '@jutrack/core';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ModalScreen } from '@/components/ModalScreen';
import { encodeSnapshotAsState } from '@/features/import/build';
import { describeKept, groupSkips, keptTotal, suggestedName } from '@/features/import/summary';
import { expoRandom } from '@/platform';
import { MAX_GROUP_NAME, useGroups } from '@/state';
import { useTheme } from '@/theme';

/**
 * Rimette dentro l'app un export JSON.
 *
 * **Chiude il buco che l'export aveva lasciato aperto.** `/export` produceva una copia
 * integrale del vault che nessuno sapeva rileggere: chi perdeva il telefono senza il backup
 * della chiave si ritrovava un file pieno di spese e nessun modo di riaverle dentro l'app.
 * Il file diceva «per conservarli», e conservare senza poter ripristinare non è conservare.
 *
 * **Non è la stessa cosa di `/backup`, e la differenza va capita prima di usarla.**
 *
 * - `/backup` salva la **chiave**, cifrata con una passphrase. Ripristinarla riapre *quel*
 *   vault: le spese ritornano dal relay e la sincronizzazione riprende con gli altri
 *   telefoni. È il ripristino vero.
 * - Questa schermata ricostruisce i **dati** in un gruppo **nuovo**, con una chiave nuova.
 *   Il file JSON è in chiaro e non contiene alcuna chiave — non potrebbe, o chiunque lo
 *   riceva entrerebbe nel gruppo — quindi non c'è nessun vault da riaprire. È la via
 *   d'uscita di chi la chiave non ce l'ha più.
 *
 * Le due cose insieme coprono i due modi di perdere i dati, e la schermata lo dice in cima
 * invece di lasciarlo scoprire a chi si aspettava di ritrovare il gruppo di prima.
 *
 * **Sta sulla radice e funziona senza gruppo**, come `/backup`, `/azzera` e `/dashboard`: chi
 * importa lo fa spesso su un telefono appena azzerato, dove di gruppi non ce n'è nessuno.
 *
 * **Si incolla, non si sceglie un file.** Un selettore di file vuole
 * `expo-document-picker`, cioè un modulo nativo, cioè una build EAS nuova — la sesta volta
 * che il progetto rifiuta un modulo nativo per una comodità. `/backup` chiede di incollare
 * per la stessa ragione, e le due schermate restano coerenti fra loro.
 */
export default function ImportScreen() {
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  const { importState } = useGroups();

  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [read, setRead] = useState<{ snapshot: VaultSnapshot; report: ImportReport } | null>(null);

  const fieldStyle = {
    color: colors.text,
    fontSize: fontSize.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  };

  /**
   * Leggere e importare sono **due tocchi**, non uno.
   *
   * Il file può contenere migliaia di spese e averne perse alcune per strada: creare un
   * gruppo prima di aver detto cosa c'è dentro vorrebbe dire far scoprire gli scarti dopo,
   * quando il gruppo esiste già e va tolto a mano. Qui il primo tocco legge e non scrive
   * niente da nessuna parte.
   */
  const handleRead = (): void => {
    setReading(true);
    setError(null);
    setRead(null);

    // In un `setTimeout` e non subito: su un file grosso `JSON.parse` più la validazione
    // tengono il thread JS per qualche decimo di secondo, e senza questo l'indicatore di
    // caricamento non farebbe in tempo a comparire — l'app sembrerebbe bloccata.
    setTimeout(() => {
      const result = parseVaultExport(text);
      setReading(false);

      if (!result.ok) {
        setError(result.reason);
        return;
      }
      if (keptTotal(result.report.kept) === 0) {
        setError('Il file è valido ma non contiene alcun record: non c’è niente da importare.');
        return;
      }

      setRead({ snapshot: result.snapshot, report: result.report });
      setName(suggestedName(result.report.exportedAt));
    }, 0);
  };

  const handleImport = (): void => {
    if (read === null) return;
    setImporting(true);

    // Lo stato si costruisce prima di toccare il registro: se la serializzazione fallisse
    // dopo aver creato il gruppo, resterebbe in elenco un gruppo vuoto che nessuno ha
    // chiesto. È lo stesso ordine con cui `register` scrive la chiave prima della riga.
    let state: Uint8Array;
    try {
      state = encodeSnapshotAsState(read.snapshot, expoRandom);
    } catch (cause) {
      setImporting(false);
      Alert.alert('Import fallito', cause instanceof Error ? cause.message : String(cause));
      return;
    }

    void importState(name, state)
      .then((group) => {
        router.replace(`/groups/${group.vaultId}`);
      })
      .catch((cause: unknown) => {
        Alert.alert('Import fallito', cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => setImporting(false));
  };

  const pasteFromClipboard = (): void => {
    void Clipboard.getStringAsync().then((content) => {
      if (content !== '') setText(content);
    });
  };

  const skips = read === null ? [] : groupSkips(read.report.skipped);

  return (
    <ModalScreen title="Importa un export">
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Card style={{ gap: spacing.xs }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            Ricostruisce i dati, non riapre il gruppo
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            Il file JSON non contiene la chiave del vault — è in chiaro, e se la contenesse chiunque
            lo ricevesse entrerebbe nel gruppo. Quello che leggi qui diventa un gruppo{' '}
            <Text style={{ fontWeight: fontWeight.semibold }}>nuovo</Text>, con una chiave nuova:
            non si sincronizza con i telefoni che avevano il gruppo di prima, e per tornare a
            condividerlo serve un invito.
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            Se hai il backup della chiave, usa quello: è in «Backup della chiave» e rimette il
            gruppo dov’era, sincronizzazione compresa.
          </Text>
        </Card>

        <Card style={{ gap: spacing.md }}>
          <View style={{ gap: 2 }}>
            <Text
              style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
            >
              Il file
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
              Incolla il contenuto dell’export JSON, quello che comincia con una graffa e contiene
              «jutrack-export».
            </Text>
          </View>

          <TextInput
            value={text}
            onChangeText={(next) => {
              setText(next);
              // Il riassunto vale per il testo da cui è stato ricavato: lasciarlo a schermo
              // mentre il contenuto cambia farebbe importare un file diverso da quello letto.
              setRead(null);
              setError(null);
            }}
            placeholder={'{ "format": "jutrack-export", …'}
            placeholderTextColor={colors.textMuted}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Contenuto del file di export"
            style={[fieldStyle, { minHeight: 120, textAlignVertical: 'top' }]}
          />

          <Button label="Incolla dagli appunti" variant="secondary" onPress={pasteFromClipboard} />
          <Button
            label={reading ? 'Lettura…' : 'Leggi il file'}
            onPress={handleRead}
            loading={reading}
            disabled={text.trim() === '' || reading}
          />

          {error !== null && (
            <Text
              style={{ color: colors.danger, fontSize: fontSize.sm, lineHeight: 20 }}
              selectable
            >
              {error}
            </Text>
          )}
        </Card>

        {read !== null && (
          <Card style={{ gap: spacing.md }}>
            <View style={{ gap: 2 }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: fontSize.md,
                  fontWeight: fontWeight.semibold,
                }}
              >
                Cosa c’è nel file
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
                {describeKept(read.report.kept)}.
              </Text>
            </View>

            {/* Gli scarti si dicono **prima** di importare, e con il motivo. Un import che
                perde delle righe in silenzio è il difetto peggiore che questa schermata
                possa avere: chi la usa crederebbe di aver riavuto tutto. */}
            {skips.length > 0 && (
              <View style={{ gap: 4 }}>
                <Text style={{ color: colors.warning, fontSize: fontSize.sm }}>
                  {read.report.skipped.length === 1
                    ? 'Un record non entrerà:'
                    : `${read.report.skipped.length} record non entreranno:`}
                </Text>
                {skips.map(({ reason, count }) => (
                  <Text
                    key={reason}
                    style={{ color: colors.textMuted, fontSize: fontSize.xs, lineHeight: 18 }}
                  >
                    • {reason}
                    {count > 1 ? ` (${count})` : ''}
                  </Text>
                ))}
              </View>
            )}

            <View style={{ gap: 2 }}>
              <Text style={{ color: colors.text, fontSize: fontSize.sm }}>Nome del gruppo</Text>
              {/* L'export non porta con sé il nome del gruppo: sta in `meta`, che la
                  fotografia non attraversa. Si propone la data del file e si lascia
                  cambiare, invece di alzare la versione del formato per un campo che si
                  può chiedere. */}
              <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs, lineHeight: 16 }}>
                Il file non lo contiene: questo è ricavato dalla data dell’export.
              </Text>
            </View>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Gruppo importato"
              placeholderTextColor={colors.textMuted}
              maxLength={MAX_GROUP_NAME}
              accessibilityLabel="Nome del gruppo importato"
              style={fieldStyle}
            />

            <Button
              label={importing ? 'Import…' : 'Crea il gruppo'}
              onPress={handleImport}
              loading={importing}
              disabled={importing}
            />
          </Card>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </ModalScreen>
  );
}

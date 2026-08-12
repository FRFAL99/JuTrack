import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { ModalScreen } from '@/components/ModalScreen';
import { mark, markError } from '@/diagnostics';
import { useTheme } from '@/theme';

/**
 * Sonda dei sottosistemi.
 *
 * Carica **un pezzo alla volta con import dinamici** e riporta fin dove arriva. Gli
 * import statici verrebbero valutati tutti insieme prima di qualunque riga di log,
 * rendendo impossibile capire quale componente fallisce.
 *
 * Serve a distinguere un guasto dell'ambiente da un guasto del nostro codice: se un
 * passaggio si interrompe, il colpevole è quello; se arriva in fondo ma l'app non parte,
 * il problema è a monte (motore, rete, versione di Expo Go).
 *
 * Ogni riga finisce anche nel log di Metro con prefisso `[JUTRACK]`, così resta
 * leggibile anche se l'app si chiude prima di mostrare qualcosa.
 */
export default function ProbeScreen() {
  const { colors, spacing, fontSize } = useTheme();
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const log = (s: string) => {
      mark(s);
      if (!cancelled) setLines((prev) => [...prev, s]);
    };

    async function probe(): Promise<void> {
      try {
        log('1. sonda avviata — React Native e Hermes funzionano');

        const Y = await import('yjs');
        log('2. yjs importato');

        const doc = new Y.Doc();
        log(`3. Y.Doc creato (clientID ${doc.clientID}) — shim lib0/webcrypto OK`);

        const core = await import('@jutrack/core');
        log(`4. @jutrack/core importato (v${core.CORE_VERSION})`);

        const { expoRandom } = await import('@/platform/random');
        const bytes = expoRandom.getRandomBytes(32);
        log(`5. expo-crypto: ${bytes.length} byte casuali`);

        const keys = core.deriveVaultKeys(core.generateVaultKey(expoRandom));
        log(`6. chiavi derivate (vault ${keys.vaultId.slice(0, 8)}…) — HKDF e UTF-8 OK`);

        const blob = core.seal(
          keys.contentKey,
          keys.vaultId,
          new Uint8Array([1, 2, 3]),
          expoRandom,
        );
        core.open(keys.contentKey, keys.vaultId, blob);
        log('7. XChaCha20-Poly1305: cifratura e decifratura OK');

        const { ExpoSqliteDatabase } = await import('@/platform/database');
        const db = await ExpoSqliteDatabase.open('jutrack-probe.db');
        log('8. database SQLite aperto');

        const persistence = new core.SqliteYPersistence(db, doc);
        await persistence.load();
        const store = new core.VaultStore(doc, { random: expoRandom });
        const me = 'membro-a';
        store.addExpense({
          amountCents: 1230,
          date: '2026-08-01',
          note: 'prova con emoji 🛒 e accenti: caffè',
          paidBy: me,
          split: core.buildSplit('single', 1230, [me]),
        });
        await persistence.flush();
        log(`9. spesa salvata su SQLite (${store.listExpenses().length} in elenco)`);

        const { expoKeyStore } = await import('@/platform/keystore');
        await expoKeyStore.set('jutrack.probe', 'valore-di-prova');
        const read = await expoKeyStore.get('jutrack.probe');
        log(
          `10. SecureStore: ${read === 'valore-di-prova' ? 'scrive e rilegge' : 'RILETTURA DIVERSA'}`,
        );

        const { RELAY_URL } = await import('@/config');
        const res = await fetch(`${RELAY_URL}/health`);
        log(`11. relay raggiungibile: HTTP ${res.status}`);

        const { createPairingInvite, parsePairingUri } = core;
        const invite = createPairingInvite(core.generateVaultKey(expoRandom), { now: Date.now() });
        const parsed = parsePairingUri(invite.uri, Date.now());
        log(`12. invito di pairing costruito e riletto: ${parsed.ok ? 'OK' : 'FALLITO'}`);

        const { buildQrPath } = await import('@/features/pairing/qr-path');
        const qr = buildQrPath(invite.uri);
        log(`13. QR generato: griglia ${qr.extent}×${qr.extent} moduli`);

        // La fotocamera è l'unico modulo nativo che l'app carica pigramente: se manca,
        // il pairing resta possibile incollando il codice, e va saputo qui.
        const { loadCameraModule } = await import('@/features/pairing/camera');
        log(
          `14. modulo fotocamera: ${loadCameraModule() === null ? 'NON disponibile (resta l’incolla manuale)' : 'disponibile'}`,
        );

        // I due moduli dello Step 30. Su una build compilata prima non ci sono, e la
        // riga lo dice invece di far cadere la sonda: è esattamente il caso che questa
        // schermata serve a distinguere — «manca nella build» non è «rotto».
        const { readNotificationPermission } = await import('@/features/notifications/module');
        const permission = await readNotificationPermission();
        log(
          `15. notifiche locali: ${
            permission === null
              ? 'modulo NON nella build — serve la build EAS dello Step 30'
              : `modulo disponibile, permesso ${permission === 'granted' ? 'concesso' : 'non concesso'}`
          }`,
        );

        // `getWidgetInfo` interroga il provider nativo per nome: se il modulo c'è ma il
        // nome non corrisponde a nessun provider generato dal plugin, fallisce qui invece
        // che allo Step 34, quando il widget resterebbe semplicemente fermo.
        const { countPlacedWidgets, WIDGET_NAMES } = await import('@/features/widgets/module');
        const placed = await Promise.all(WIDGET_NAMES.map(countPlacedWidgets));
        log(
          `16. widget Android: ${
            placed.some((count) => count === null)
              ? 'provider NON raggiungibili — serve la build EAS dello Step 30'
              : `${WIDGET_NAMES.length} provider rispondono (${placed.join(' + ')} sulla home)`
          }`,
        );

        await persistence.destroy();
        log('TUTTO OK — ogni sottosistema funziona su questo dispositivo');
      } catch (error) {
        markError('sonda interrotta', error);
        if (!cancelled) {
          setFailed(true);
          setLines((prev) => [
            ...prev,
            `INTERROTTA: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`,
          ]);
        }
      } finally {
        if (!cancelled) setDone(true);
      }
    }

    void probe();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ModalScreen title="Diagnostica">
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}>
        {lines.map((line) => (
          <Text
            key={line}
            selectable
            style={{
              color: line.startsWith('INTERROTTA') ? colors.danger : colors.textMuted,
              fontSize: fontSize.sm,
              lineHeight: 20,
            }}
          >
            {line}
          </Text>
        ))}
        {!done && (
          <View style={{ paddingTop: spacing.md }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}
        {done && !failed && (
          <Text style={{ color: colors.income, fontSize: fontSize.md, paddingTop: spacing.md }}>
            Nessun problema rilevato.
          </Text>
        )}
      </ScrollView>
    </ModalScreen>
  );
}

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { colors, spacing, fontSize } = useTheme();
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [interruptedLine, setInterruptedLine] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const log = (s: string) => {
      mark(s);
      if (!cancelled) setLines((prev) => [...prev, s]);
    };

    async function probe(): Promise<void> {
      try {
        log(`1. ${t('probe.steps.started')}`);

        const Y = await import('yjs');
        log(`2. ${t('probe.steps.yjsImported')}`);

        const doc = new Y.Doc();
        log(`3. ${t('probe.steps.yDocCreated', { clientId: doc.clientID })}`);

        const core = await import('@jutrack/core');
        log(`4. ${t('probe.steps.coreImported', { version: core.CORE_VERSION })}`);

        const { expoRandom } = await import('@/platform/random');
        const bytes = expoRandom.getRandomBytes(32);
        log(`5. ${t('probe.steps.randomBytes', { count: bytes.length })}`);

        const keys = core.deriveVaultKeys(core.generateVaultKey(expoRandom));
        log(`6. ${t('probe.steps.keysDerived', { vaultId: keys.vaultId.slice(0, 8) })}`);

        const blob = core.seal(
          keys.contentKey,
          keys.vaultId,
          new Uint8Array([1, 2, 3]),
          expoRandom,
        );
        core.open(keys.contentKey, keys.vaultId, blob);
        log(`7. ${t('probe.steps.crypto')}`);

        const { ExpoSqliteDatabase } = await import('@/platform/database');
        const db = await ExpoSqliteDatabase.open('jutrack-probe.db');
        log(`8. ${t('probe.steps.dbOpened')}`);

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
        log(`9. ${t('probe.steps.expenseSaved', { count: store.listExpenses().length })}`);

        const { expoKeyStore } = await import('@/platform/keystore');
        await expoKeyStore.set('jutrack.probe', 'valore-di-prova');
        const read = await expoKeyStore.get('jutrack.probe');
        log(
          `10. ${t('probe.steps.secureStore', {
            result:
              read === 'valore-di-prova'
                ? t('probe.secureStoreOk')
                : t('probe.secureStoreMismatch'),
          })}`,
        );

        const { RELAY_URL } = await import('@/config');
        const res = await fetch(`${RELAY_URL}/health`);
        log(`11. ${t('probe.steps.relay', { status: res.status })}`);

        const { createPairingInvite, parsePairingUri } = core;
        const invite = createPairingInvite(core.generateVaultKey(expoRandom), { now: Date.now() });
        const parsed = parsePairingUri(invite.uri, Date.now());
        log(
          `12. ${t('probe.steps.pairing', { result: parsed.ok ? t('probe.ok') : t('probe.failed') })}`,
        );

        const { buildQrPath } = await import('@/features/pairing/qr-path');
        const qr = buildQrPath(invite.uri);
        log(`13. ${t('probe.steps.qr', { extent: qr.extent })}`);

        // La fotocamera è l'unico modulo nativo che l'app carica pigramente: se manca,
        // il pairing resta possibile incollando il codice, e va saputo qui.
        const { loadCameraModule } = await import('@/features/pairing/camera');
        log(
          `14. ${t('probe.steps.camera', {
            result:
              loadCameraModule() === null ? t('probe.cameraUnavailable') : t('probe.available'),
          })}`,
        );

        // I due moduli dello Step 30. Su una build compilata prima non ci sono, e la
        // riga lo dice invece di far cadere la sonda: è esattamente il caso che questa
        // schermata serve a distinguere — «manca nella build» non è «rotto».
        const { readNotificationPermission } = await import('@/features/notifications/module');
        const permission = await readNotificationPermission();
        log(
          `15. ${t('probe.steps.notifications', {
            result:
              permission === null
                ? t('probe.notifModuleMissing')
                : t('probe.notifModuleAvailable', {
                    status:
                      permission === 'granted'
                        ? t('probe.permissionGranted')
                        : t('probe.permissionDenied'),
                  }),
          })}`,
        );

        // `getWidgetInfo` interroga il provider nativo per nome: se il modulo c'è ma il
        // nome non corrisponde a nessun provider generato dal plugin, fallisce qui invece
        // che allo Step 34, quando il widget resterebbe semplicemente fermo.
        const { countPlacedWidgets, WIDGET_NAMES } = await import('@/features/widgets/module');
        const placed = await Promise.all(WIDGET_NAMES.map(countPlacedWidgets));
        log(
          `16. ${t('probe.steps.widgets', {
            result: placed.some((count) => count === null)
              ? t('probe.widgetsUnreachable')
              : t('probe.widgetsOk', { count: WIDGET_NAMES.length, placed: placed.join(' + ') }),
          })}`,
        );

        await persistence.destroy();
        log(t('probe.steps.allOk'));
      } catch (error) {
        markError('sonda interrotta', error);
        if (!cancelled) {
          const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
          const line = t('probe.interrupted', { detail });
          setFailed(true);
          setInterruptedLine(line);
          setLines((prev) => [...prev, line]);
        }
      } finally {
        if (!cancelled) setDone(true);
      }
    }

    void probe();
    return () => {
      cancelled = true;
    };
    // Va eseguita una volta sola all'apertura della schermata: la sonda scatta subito, e
    // `t` non deve farla ripartire se la lingua cambia mentre gira.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ModalScreen title={t('probe.title')}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}>
        {lines.map((line) => (
          <Text
            key={line}
            selectable
            style={{
              color: line === interruptedLine ? colors.danger : colors.textMuted,
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
            {t('probe.noIssues')}
          </Text>
        )}
      </ScrollView>
    </ModalScreen>
  );
}

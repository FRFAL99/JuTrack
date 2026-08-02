import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { CORE_VERSION } from '@jutrack/core';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { NavCard } from '@/components/NavCard';
import { Screen } from '@/components/Screen';
import { SyncBadge } from '@/features/sync/SyncBadge';
import { useSyncState, useVaultStatus } from '@/state';
import { useTheme } from '@/theme';

/**
 * Le impostazioni dell'**app**, e nient'altro.
 *
 * Quello che c'era qui dentro se n'è andato in tre direzioni: categorie, backup della
 * chiave ed export riguardano **un gruppo** e stanno nella sua gestione (Step 19); nome,
 * colore e identificativo riguardano **me** e hanno un tab loro (Step 20); l'elenco dei
 * gruppi è il primo tab. Chi apriva «Backup della chiave» da qui non aveva modo di sapere
 * di quale chiave si trattasse — con più gruppi sullo stesso telefono è una domanda con
 * più risposte.
 *
 * Resta fuori da `app/(gruppo)/` di proposito: dallo Step 21 dovrà funzionare **senza
 * alcun gruppo**. Per questo legge il vault con `useVaultStatus()`, che non solleva,
 * invece di `useVaultRuntime()`, che solleva — ed è l'unica condizione che questo tab
 * avrà mai.
 */
export default function SettingsScreen() {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const vault = useVaultStatus();
  const syncState = useSyncState();

  const syncNow = (): void => {
    if (vault.phase !== 'ready') return;
    void vault.runtime.engine.syncOnce();
  };

  return (
    <Screen title="Impostazioni">
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Card style={{ gap: spacing.md }}>
          <View style={{ gap: 2 }}>
            <Text
              style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
            >
              Sincronizzazione
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
              Riguarda il gruppo aperto: gli altri si allineano appena li apri. Tenerne più di uno
              acceso moltiplicherebbe le richieste al relay per gruppi che nessuno sta guardando.
            </Text>
            <View style={{ paddingTop: spacing.xs }}>
              <SyncBadge state={syncState} />
            </View>
          </View>

          <Button
            label="Sincronizza adesso"
            variant="secondary"
            onPress={syncNow}
            disabled={vault.phase !== 'ready'}
          />
        </Card>

        <NavCard
          title="Diagnostica"
          subtitle="Verifica un sottosistema alla volta — crypto, database, portachiavi, relay — e mostra dove si interrompe."
          onPress={() => router.push('/probe')}
        />

        <View style={{ paddingHorizontal: spacing.xs, paddingTop: spacing.sm }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
            JuTrack 0.1.0 · core {CORE_VERSION}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

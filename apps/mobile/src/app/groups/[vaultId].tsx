import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ModalScreen } from '@/components/ModalScreen';
import { SyncBadge } from '@/features/sync/SyncBadge';
import {
  MAX_GROUP_NAME,
  normalizeGroupName,
  useGroups,
  useMembers,
  useMyMemberId,
  useSyncState,
  useVaultRuntime,
} from '@/state';
import { useTheme } from '@/theme';

/**
 * Un gruppo: come si chiama, chi ne fa parte, come invitare, come uscirne.
 *
 * Aprire questa schermata **rende corrente il gruppo**, invece di montarne il documento
 * accanto a quello già aperto. È la ragione per cui nome e persone si possono leggere e
 * scrivere qui senza un secondo runtime: sono quelli del gruppo aperto, e basta
 * attendere che il cambio sia avvenuto.
 */
export default function GroupDetailScreen() {
  const params = useLocalSearchParams<{ vaultId?: string }>();
  const vaultId = Array.isArray(params.vaultId) ? params.vaultId[0] : params.vaultId;
  const { current, groups, select } = useGroups();
  const stillExists = groups.some((group) => group.vaultId === vaultId);

  // Il cambio di gruppo smonta e rimonta il runtime: finché non è finito, i dati sotto
  // sono ancora quelli del gruppo di prima e mostrarli sarebbe una bugia.
  //
  // `stillExists` copre il caso in cui il gruppo di questa rotta sia stato appena
  // abbandonato o rigenerato: il corrente è già un altro, e senza il controllo questa
  // schermata chiederebbe di tornare su un gruppo che non c'è più.
  useEffect(() => {
    if (vaultId !== undefined && stillExists && vaultId !== current.vaultId) void select(vaultId);
  }, [current.vaultId, select, stillExists, vaultId]);

  if (vaultId === undefined || vaultId !== current.vaultId) return <Switching />;
  return <GroupDetail />;
}

function Switching() {
  const { colors } = useTheme();
  return (
    <ModalScreen title="Gruppo">
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    </ModalScreen>
  );
}

function GroupDetail() {
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  const { current, groups, rename, leave, regenerate } = useGroups();
  const { store, keys } = useVaultRuntime();
  const myMemberId = useMyMemberId();
  const members = useMembers();
  const syncState = useSyncState();

  const [draft, setDraft] = useState(current.name);
  const [leaving, setLeaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  /**
   * Spento di default: cancellare dal relay è irreversibile e vale per **tutti**, non
   * solo per questo telefono. Chi esce da un gruppo che gli altri continuano a usare non
   * deve poterlo svuotare per distrazione.
   */
  const [wipeRelay, setWipeRelay] = useState(false);

  // Il nome si salva quando il campo perde il fuoco, non a ogni tasto: scrivendo, ogni
  // lettera produrrebbe un update Yjs, e quindi una riga nel log del relay.
  const commitName = (): void => {
    const normalized = normalizeGroupName(draft);
    if (normalized === null) {
      setDraft(current.name);
      return;
    }
    if (normalized === current.name) return;
    // Dentro il vault per primo: è quello l'autorevole, ed è così che il nome nuovo
    // raggiunge l'altro telefono. Il registro tiene solo la copia per la lista.
    store.setGroupName(normalized);
    void rename(current.vaultId, normalized);
  };

  const handleLeave = (): void => {
    const last = groups.length === 1;
    Alert.alert(
      `Uscire da «${current.name}»?`,
      'Le spese di questo gruppo spariscono da questo telefono. Senza un backup della chiave ' +
        'non tornano più: non esiste un reset lato server. ' +
        (last
          ? 'Essendo il tuo unico gruppo, al suo posto ne verrà creato uno vuoto. '
          : 'Chi altro ne fa parte non se ne accorge e continua a usarlo. ') +
        (wipeRelay
          ? 'La copia sul relay verrà cancellata: chi resta non riceverà più aggiornamenti, ' +
            'ma tiene ciò che ha già scaricato.'
          : 'La copia sul relay resta e scade da sola dopo trenta giorni.'),
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Esci',
          style: 'destructive',
          onPress: () => {
            setLeaving(true);
            void leave(current.vaultId, { wipeRelay })
              .then(() => router.replace('/(tabs)'))
              .catch((cause: unknown) => {
                Alert.alert(
                  'Uscita fallita',
                  cause instanceof Error ? cause.message : String(cause),
                );
                setLeaving(false);
              });
          },
        },
      ],
    );
  };

  const handleRegenerate = (): void => {
    Alert.alert(
      `Rigenerare «${current.name}»?`,
      'Il gruppo riparte con una chiave nuova, portandosi dietro spese, categorie e saldi. ' +
        'Da questo telefono sparisce quello vecchio, e chi vuoi tenere va reinvitato: ' +
        'finché non accetta, resta fuori. Chi era nel gruppo continua a vedere ciò che ' +
        'aveva già; quello che smette è il flusso di aggiornamenti.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rigenera',
          style: 'destructive',
          onPress: () => {
            setRegenerating(true);
            // Lo stato si legge **adesso**, dal documento aperto: dopo lo spostamento il
            // runtime è già quello del gruppo nuovo, e non ci sarebbe più niente da copiare.
            const state = store.encodeState();
            void regenerate(current.vaultId, state, { wipeRelay })
              .then(() => router.replace('/pair/invite'))
              .catch((cause: unknown) => {
                Alert.alert(
                  'Rigenerazione fallita',
                  cause instanceof Error ? cause.message : String(cause),
                );
                setRegenerating(false);
              });
          },
        },
      ],
    );
  };

  const busy = leaving || regenerating;

  return (
    <ModalScreen title={current.name}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      >
        <Card style={{ gap: spacing.sm }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            Nome del gruppo
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            Sta dentro il gruppo, non sul telefono: rinominarlo lo cambia anche per gli altri.
          </Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onBlur={commitName}
            onSubmitEditing={commitName}
            placeholder="Nome del gruppo"
            placeholderTextColor={colors.textMuted}
            maxLength={MAX_GROUP_NAME}
            returnKeyType="done"
            accessibilityLabel="Nome del gruppo"
            style={{
              color: colors.text,
              fontSize: fontSize.md,
              backgroundColor: colors.background,
              borderRadius: radius.md,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border,
              padding: spacing.md,
            }}
          />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
            vault {keys.vaultId.slice(0, 8)}…
          </Text>
          <SyncBadge state={syncState} />
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <View style={{ gap: 2 }}>
            <Text
              style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
            >
              Chi ne fa parte
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
              {members.length <= 1
                ? 'Per ora solo tu. Chi collega il proprio telefono compare qui da solo, con il nome del suo profilo.'
                : 'Ognuno si aggiunge da sé collegando il proprio telefono: qui non si aggiungono persone a mano.'}
            </Text>
          </View>

          {/* Sola lettura, di proposito: una persona aggiunta a mano non ha un telefono
              dietro, quindi non potrebbe mai registrare una spesa né vedere il saldo. */}
          {members.map((member) => (
            <View
              key={member.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                paddingVertical: spacing.xs,
              }}
            >
              <View
                style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: member.color }}
              />
              <Text style={{ color: colors.text, fontSize: fontSize.md }}>{member.name}</Text>
              {member.id === myMemberId && (
                <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>· tu</Text>
              )}
            </View>
          ))}

          <Button
            label="Invita qualcuno"
            variant="secondary"
            onPress={() => router.push('/pair/invite')}
          />
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            Escludere qualcuno
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            Non esiste un modo di togliere la chiave a chi ce l&apos;ha: rigenerare il gruppo la
            cambia per tutti. Le spese e i saldi vengono con te; chi vuoi tenere lo reinviti subito
            dopo, dalla schermata che si apre da sé.
          </Text>
          <Button
            label={regenerating ? 'Rigenerazione…' : 'Rigenera con una chiave nuova'}
            variant="secondary"
            onPress={handleRegenerate}
            disabled={busy}
            loading={regenerating}
          />
        </Card>

        <Card style={{ gap: spacing.sm, borderColor: colors.danger }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            Esci dal gruppo
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            Cancella da questo telefono la chiave e le spese di questo gruppo. Non caccia nessun
            altro: chi ha la chiave continua a leggere, perché in un sistema così la chiave *è* il
            diritto di accesso.
          </Text>

          {/* Vale anche per la rigenerazione, che del gruppo vecchio esce comunque: è la
              stessa domanda, e ripeterla in due punti la farebbe sembrare due cose diverse. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.text, fontSize: fontSize.sm }}>
                Cancella anche la copia sul relay
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, lineHeight: 18 }}>
                {wipeRelay
                  ? 'Chi resta smette di ricevere aggiornamenti, ma tiene ciò che ha già scaricato.'
                  : 'Lasciandola, scade da sola dopo trenta giorni.'}
              </Text>
            </View>
            <Switch
              value={wipeRelay}
              onValueChange={setWipeRelay}
              accessibilityLabel="Cancella anche la copia sul relay"
            />
          </View>

          <Button
            label={leaving ? 'Uscita…' : 'Esci dal gruppo'}
            variant="danger"
            onPress={handleLeave}
            disabled={busy}
            loading={leaving}
          />
        </Card>
      </ScrollView>
    </ModalScreen>
  );
}

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { useMembers, useProfile, useSyncState, type GroupIdentity } from '@/state';
import { useTheme } from '@/theme';

/**
 * «Chi sei in questo gruppo?», chiesto una volta sola a chi è appena entrato.
 *
 * Nel caso normale la risposta è «sono nuovo»: si entra nel gruppo di qualcun altro e si
 * compare fra i membri con il proprio nome. Ma c'è un secondo caso, e ignorarlo
 * ricostruirebbe il bug corretto allo Step 11: chi ripristina il backup della chiave su
 * un telefono nuovo ha un `profileId` nuovo, mentre dentro quel gruppo è già qualcuno.
 * Scrivere un membro per lui vorrebbe dire due persone al posto di una, le spese vecchie
 * riferite a una e le nuove all'altra, e **un saldo sbagliato**.
 *
 * La domanda si fa **prima** di scrivere qualunque membro, non dopo: i membri non hanno
 * tombstone, quindi quello creato per sbaglio resterebbe lì e nessuno saprebbe toglierlo.
 *
 * Compare solo per chi è *entrato* in un gruppo. Chi lo ha creato è per definizione una
 * persona nuova dentro di esso, e non gli viene chiesto nulla.
 */
export function GroupIdentityGate({
  identity,
}: {
  identity: Extract<GroupIdentity, { status: 'pending' }>;
}) {
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const members = useMembers();
  const syncState = useSyncState();

  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = (memberId: string): void => {
    if (choosing) return;
    setChoosing(true);
    setError(null);
    identity.choose(memberId).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : String(cause));
      setChoosing(false);
    });
  };

  // Finché il primo sync non è arrivato l'elenco è vuoto perché il documento è vuoto, non
  // perché il gruppo non abbia nessuno: dirlo evita che si scelga «sono nuovo» credendo
  // che il gruppo sia deserto quando invece i dati stanno ancora scendendo.
  const waiting = members.length === 0 && syncState.phase !== 'synced';

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        padding: spacing.lg,
        paddingTop: insets.top + spacing.lg,
        gap: spacing.lg,
      }}
    >
      <View style={{ gap: spacing.xs }}>
        <Text style={{ fontSize: 44 }}>🙋</Text>
        <Text
          accessibilityRole="header"
          style={{ color: colors.text, fontSize: fontSize.xxl, fontWeight: fontWeight.bold }}
        >
          Chi sei in questo gruppo?
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
          Se stai entrando adesso, sei una persona nuova. Se invece hai ripristinato la chiave su un
          telefono nuovo, qui dentro sei già qualcuno: dirlo evita di comparire due volte e di
          sballare il saldo.
        </Text>
      </View>

      <Button
        label={`Sono nuovo — entro come ${profile.name}`}
        onPress={() => choose(profile.profileId)}
        loading={choosing}
      />

      <View style={{ gap: spacing.sm }}>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
          {waiting
            ? 'Sto ancora scaricando chi fa parte del gruppo…'
            : members.length === 0
              ? 'In questo gruppo non c’è ancora nessun altro.'
              : 'Oppure: ero già qui, con questo nome'}
        </Text>

        {members.map((member) => (
          <Pressable
            key={member.id}
            onPress={() => choose(member.id)}
            accessibilityRole="button"
            disabled={choosing}
          >
            {({ pressed }) => (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: spacing.md,
                  borderRadius: radius.md,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: colors.border,
                  backgroundColor: pressed ? colors.surfacePressed : colors.surface,
                }}
              >
                <View
                  style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: member.color }}
                />
                <Text style={{ color: colors.text, fontSize: fontSize.md }}>{member.name}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {error !== null && (
        <Text style={{ color: colors.warning, fontSize: fontSize.sm }} selectable>
          {error}
        </Text>
      )}
    </ScrollView>
  );
}

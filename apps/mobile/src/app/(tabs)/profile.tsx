import { useState } from 'react';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card } from '@/components/Card';
import { NavCard } from '@/components/NavCard';
import { Screen } from '@/components/Screen';
import { GroupRow } from '@/features/groups/GroupRow';
import { ColorChoice } from '@/features/profile/ColorChoice';
import { MAX_PROFILE_NAME, normalizeProfileName, useAppData, useGroups, useProfile } from '@/state';
import { useTheme } from '@/theme';

/**
 * Chi sono io, su questo telefono.
 *
 * Un tab e non una card dentro le impostazioni, perché il profilo non è una preferenza
 * dell'app: è l'unica cosa che attraversa **tutti** i gruppi. Il `profileId` è ciò che mi
 * rende la stessa persona in ognuno, ed è la ragione per cui i due telefoni non contano
 * più due persone al posto di una (Step 11).
 *
 * Sta **fuori** da `app/(gruppo)/`: non legge il vault, e dallo Step 21 dovrà funzionare
 * anche con zero gruppi — è anzi il posto da cui si arriva ad azzerare il telefono, cioè
 * proprio il gesto che di gruppi non ne lascia nessuno.
 */
export default function ProfileScreen() {
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  const { update } = useAppData();
  const profile = useProfile();
  const { groups, current } = useGroups();
  const [draftName, setDraftName] = useState(profile.name);

  // Il nome si salva quando il campo perde il fuoco, non a ogni tasto: scrivendo, ogni
  // lettera produrrebbe un update Yjs, e quindi una riga nel log del relay.
  const commitName = (): void => {
    const normalized = normalizeProfileName(draftName);
    if (normalized === null) {
      setDraftName(profile.name);
      return;
    }
    if (normalized === profile.name) return;
    void update({ name: normalized });
  };

  return (
    <Screen title="Profilo">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      >
        <Card style={{ gap: spacing.md }}>
          <View style={{ gap: 2 }}>
            <Text
              style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
            >
              Come ti vedono gli altri
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
              Nome e colore valgono in tutti i tuoi gruppi. Cambiarli aggiorna anche il telefono di
              chi divide le spese con te, e non crea una persona nuova.
            </Text>
          </View>

          <TextInput
            value={draftName}
            onChangeText={setDraftName}
            onBlur={commitName}
            onSubmitEditing={commitName}
            placeholder="Il tuo nome"
            placeholderTextColor={colors.textMuted}
            maxLength={MAX_PROFILE_NAME}
            returnKeyType="done"
            accessibilityLabel="Il tuo nome"
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

          <ColorChoice value={profile.color} onChange={(color) => void update({ color })} />
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            I tuoi gruppi
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            {groups.length === 1
              ? 'Uno solo, per ora. Ogni gruppo è un insieme di spese a sé, con le sue persone.'
              : `Sono ${groups.length}. Le spese non si mescolano fra l’uno e l’altro, e il colore e il nome qui sopra sono gli stessi in tutti.`}
          </Text>
          {groups.map((group) => (
            <GroupRow
              key={group.vaultId}
              group={group}
              currentVaultId={current.vaultId}
              onPress={() => router.push(`/groups/${group.vaultId}`)}
            />
          ))}
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            Identificativo
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
            È così che gli altri telefoni ti riconoscono dentro un gruppo. È un numero casuale,
            generato una volta su questo telefono: non è un account, non c’è niente a cui accedere,
            e da solo non dice nulla di te. Serve solo se qualcosa va storto e vuoi dire di quale
            persona stiamo parlando.
          </Text>
          {/* `selectable`: l'unico uso plausibile è copiarlo dentro una segnalazione. */}
          <Text
            selectable
            style={{
              color: colors.text,
              fontSize: fontSize.sm,
              fontFamily: 'monospace',
              backgroundColor: colors.background,
              borderRadius: radius.md,
              padding: spacing.md,
            }}
          >
            {profile.profileId}
          </Text>
        </Card>

        {/* In fondo e staccata: è il solo gesto dell'app che non ha un ritorno. La riga
            porta a una schermata che spiega — la doppia conferma sta là, non qui. */}
        <View style={{ paddingTop: spacing.md }}>
          <NavCard
            tone="danger"
            title="Azzera questo telefono"
            subtitle="Cancella il profilo, tutti i gruppi, tutte le spese e tutte le chiavi. Senza un backup della chiave non tornano: non esiste un reset lato server."
            onPress={() => router.push('/azzera')}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

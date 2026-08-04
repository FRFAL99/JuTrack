import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { MAX_GROUP_NAME, normalizeGroupName, useGroups, type GroupRecord } from '@/state';
import { useTheme } from '@/theme';

interface NewGroupModalProps {
  visible: boolean;
  onClose: () => void;
  /** Chiamato col gruppo appena creato, che è già quello aperto. */
  onCreated: (group: GroupRecord) => void;
}

/**
 * Creare un gruppo: un campo e un bottone.
 *
 * Prima era una card dentro l'elenco, accanto all'elenco stesso e a «entra con un invito»:
 * tre compiti diversi sulla stessa schermata, ed era uno dei problemi che hanno aperto il
 * redesign. Chi arrivava lì per aprire un gruppo che aveva già trovava un campo di testo
 * vuoto in mezzo, e chi voleva crearne uno doveva scorrere oltre l'elenco.
 *
 * Modale e non rotta: non c'è nulla da linkare, e una rotta in più significherebbe un
 * ritorno da gestire quando il gruppo nasce.
 */
export function NewGroupModal({ visible, onClose, onCreated }: NewGroupModalProps) {
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  const { create } = useGroups();

  const [draft, setDraft] = useState('');
  const [creating, setCreating] = useState(false);

  const normalized = normalizeGroupName(draft);

  const close = (): void => {
    setDraft('');
    onClose();
  };

  const handleCreate = (): void => {
    if (normalized === null || creating) return;
    setCreating(true);
    void create(normalized)
      .then((group) => {
        setDraft('');
        onCreated(group);
      })
      .catch((cause: unknown) => {
        Alert.alert('Creazione fallita', cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => setCreating(false));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={[styles.backdrop, { backgroundColor: '#000000AA' }]} onPress={close}>
        {/* Il tocco dentro non deve chiudere: senza questo `onPress` vuoto l'evento
            risalirebbe allo sfondo e la modale si chiuderebbe scrivendo. */}
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: colors.surfaceRaised,
            borderRadius: radius.xl,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            padding: spacing.lg,
            gap: spacing.md,
            width: '100%',
            maxWidth: 420,
          }}
        >
          <View style={{ gap: 2 }}>
            <Text
              style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.semibold }}
            >
              Nuovo gruppo
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
              Nasce vuoto e solo tuo. Diventa condiviso quando inviti qualcuno dal gruppo stesso.
            </Text>
          </View>

          <TextInput
            autoFocus
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={handleCreate}
            placeholder="Casa, Viaggio, Coinquilini…"
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

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              label="Annulla"
              variant="secondary"
              onPress={close}
              disabled={creating}
              style={{ flex: 1 }}
            />
            <Button
              label={creating ? 'Creazione…' : 'Crea'}
              onPress={handleCreate}
              disabled={normalized === null}
              loading={creating}
              style={{ flex: 1 }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});

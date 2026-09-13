import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Feather from '@expo/vector-icons/Feather';
import { vocabularyKeyOf, type VocabularyKind } from '@jutrack/core';
import { Chip } from '@/components/Chip';
import { ModalScreen } from '@/components/ModalScreen';
import { Note } from '@/components/Note';
import { SectionLabel } from '@/components/SectionLabel';
import { useExpenses, useVaultStore, useVocabulary } from '@/state';
import { useTheme } from '@/theme';
import { missingFromCatalog, suggestedNames } from './choices';

/**
 * L'elenco di una famiglia del vocabolario: tag o negozi.
 *
 * **Un componente solo per due schermate.** Le due si distinguono per una parola, e
 * scriverle separate vorrebbe dire che la prossima modifica ne aggiorna una sola — è la
 * stessa ragione per cui esiste `Chip`. Le due rotte sottili sono `app/(gruppo)/tags.tsx` e
 * `app/(gruppo)/stores.tsx`.
 *
 * Tre blocchi, e il terzo è quello che conta:
 *
 * 1. **In elenco** — con la `✕` che toglie.
 * 2. **Suggeriti** — solo per i tag, e solo quelli non ancora presi. Da toccare: nulla entra
 *    nel documento finché qualcuno non lo sceglie.
 * 3. **Già usati, non in elenco** — le parole che stanno nelle spese e non qui. Senza questo
 *    blocco, sui gruppi nati prima dello Step 59 il catalogo comincerebbe vuoto e ogni tag
 *    già scritto andrebbe ricostruito a memoria.
 *
 * **Togliere non è archiviare.** Le categorie si archiviano perché le spese le riferiscono
 * per id e resterebbero orfane; qui la spesa porta la parola, quindi togliere significa solo
 * «smetti di propormela» e non tocca un solo dato già registrato. È la libertà che si compra
 * lasciando `tags` e `store` come testo.
 */
export function VocabularyScreen({ kind }: { kind: VocabularyKind }) {
  const { t } = useTranslation();
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  const store = useVaultStore();
  const entries = useVocabulary(kind);
  const expenses = useExpenses();

  const [draft, setDraft] = useState('');

  const inCatalog = useMemo(() => new Set(entries.map((entry) => entry.key)), [entries]);

  // I suggerimenti già presi spariscono: una pillola che non fa niente è una pillola che
  // insegna a non fidarsi delle pillole.
  const suggestions = useMemo(
    () => suggestedNames(kind).filter((name) => !inCatalog.has(vocabularyKeyOf(kind, name))),
    [kind, inCatalog],
  );

  const orphans = useMemo(
    () => missingFromCatalog(kind, entries, expenses),
    [kind, entries, expenses],
  );

  const add = (name: string): void => {
    store.addVocabularyEntry(kind, name);
  };

  const commitDraft = (): void => {
    if (draft.trim() === '') return;
    add(draft);
    setDraft('');
  };

  const field = {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  };

  return (
    <ModalScreen title={t(`vocabulary.${kind}.title`)}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
      >
        <View style={[styles.addRow, { padding: spacing.lg, gap: spacing.sm }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={commitDraft}
            placeholder={t(`vocabulary.${kind}.placeholder`)}
            placeholderTextColor={colors.textMuted}
            // I tag si scrivono minuscoli, i negozi sono nomi propri: è la stessa
            // distinzione che il form fa già sui due campi.
            autoCapitalize={kind === 'store' ? 'words' : 'none'}
            maxLength={MAX_ENTRY_NAME}
            returnKeyType="done"
            accessibilityLabel={t(`vocabulary.${kind}.placeholder`)}
            style={field}
          />
          <Pressable
            onPress={commitDraft}
            disabled={draft.trim() === ''}
            accessibilityRole="button"
            accessibilityLabel={t('vocabulary.add')}
            style={{
              paddingHorizontal: spacing.lg,
              justifyContent: 'center',
              borderRadius: radius.md,
              backgroundColor: colors.accent,
              opacity: draft.trim() === '' ? 0.4 : 1,
            }}
          >
            <Text style={{ color: colors.textOnAccent, fontWeight: fontWeight.semibold }}>
              {t('vocabulary.add')}
            </Text>
          </Pressable>
        </View>

        <SectionLabel>{t('vocabulary.inList')}</SectionLabel>
        <Note>{t(`vocabulary.${kind}.note`)}</Note>

        {entries.length === 0 ? (
          <Note>{t(`vocabulary.${kind}.empty`)}</Note>
        ) : (
          <View>
            {entries.map((entry) => (
              <View
                key={entry.key}
                style={[styles.row, { paddingVertical: spacing.md, paddingHorizontal: spacing.lg }]}
              >
                <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.md }}>
                  {entry.name}
                </Text>
                <Pressable
                  onPress={() => store.removeVocabularyEntry(kind, entry.key)}
                  accessibilityRole="button"
                  accessibilityLabel={t('vocabulary.removeA11y', { name: entry.name })}
                  hitSlop={12}
                  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                >
                  <Feather name="x" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {suggestions.length > 0 && (
          <>
            <SectionLabel>{t('vocabulary.suggestedTitle')}</SectionLabel>
            <View style={[styles.chips, { paddingHorizontal: spacing.lg }]}>
              {suggestions.map((name) => (
                <Chip
                  key={name}
                  label={name}
                  selected={false}
                  onPress={() => add(name)}
                  accessibilityLabel={t('vocabulary.addA11y', { name })}
                />
              ))}
            </View>
          </>
        )}

        {orphans.length > 0 && (
          <>
            <SectionLabel>{t('vocabulary.usedTitle')}</SectionLabel>
            <Note>{t('vocabulary.usedNote')}</Note>
            <View style={[styles.chips, { paddingHorizontal: spacing.lg }]}>
              {orphans.map((name) => (
                <Chip
                  key={name}
                  label={name}
                  selected={false}
                  onPress={() => add(name)}
                  accessibilityLabel={t('vocabulary.addA11y', { name })}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </ModalScreen>
  );
}

/**
 * Quanto può essere lungo il nome di una voce.
 *
 * Della stessa famiglia di `MAX_GROUP_NAME` e `MAX_PROFILE_NAME`: senza, una voce incollata
 * da chissà dove diventa una pillola larga quanto tre schermi, e il campo `store` di ogni
 * spesa che la usa se la porta dietro nell'export e nei grafici.
 */
const MAX_ENTRY_NAME = 40;

const styles = StyleSheet.create({
  addRow: { flexDirection: 'row' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

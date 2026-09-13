import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Feather from '@expo/vector-icons/Feather';
import { vocabularyKeyOf, type VocabularyKind } from '@jutrack/core';
import { Chip } from '@/components/Chip';
import { useExpenses, useVocabulary } from '@/state';
import { useTheme } from '@/theme';
import { vocabularyChoices } from './choices';

interface VocabularyPickerProps {
  kind: VocabularyKind;
  /** Le voci scelte: una sola per il negozio, molte per i tag. */
  chosen: string[];
  onToggle: (name: string) => void;
  /**
   * La voce che si sta scrivendo col `+`.
   *
   * **La tiene il form e non questo componente**, e non è pignoleria: chi tocca «Salva»
   * senza aver confermato col tasto «fine» si aspetta di ritrovare ciò che ha scritto. Se
   * la bozza vivesse qui, `handleSubmit` non potrebbe vederla e la parola sparirebbe in
   * silenzio. Era già la regola del vecchio campo dei tag.
   */
  draft: string;
  onDraftChange: (value: string) => void;
  onCommitDraft: () => void;
}

/**
 * Le voci del gruppo come pillole, più un `+` per scriverne una nuova.
 *
 * Sostituisce le due caselle di testo di «Dettagli»: si sceglie da un elenco invece di
 * riscrivere la stessa parola ogni volta, che per i grafici significa smettere di contare
 * due volte la stessa insegna scritta in due modi.
 *
 * **Le voci fuori elenco restano proponibili** (`inCatalog: false`): sono le parole che le
 * spese già usano e che nessuno ha ancora adottato. Escluderle renderebbe irraggiungibile,
 * il giorno in cui il catalogo entra, tutto ciò che è stato scritto prima.
 */
export function VocabularyPicker({
  kind,
  chosen,
  onToggle,
  draft,
  onDraftChange,
  onCommitDraft,
}: VocabularyPickerProps) {
  const { t } = useTranslation();
  const { colors, spacing, radius, fontSize } = useTheme();
  const entries = useVocabulary(kind);
  const expenses = useExpenses();

  const choices = useMemo(
    () => vocabularyChoices(kind, entries, chosen, expenses),
    [kind, entries, chosen, expenses],
  );

  const chosenKeys = useMemo(
    () => new Set(chosen.map((name) => vocabularyKeyOf(kind, name))),
    [chosen, kind],
  );

  /**
   * La casella sta **dietro il `+`**, e non sempre a schermo.
   *
   * È tutto il punto dello Step 59: una casella di testo visibile invita a riscrivere, ed è
   * riscrivere che produceva due insegne per lo stesso negozio. Scegliere è la via
   * principale; creare è l'eccezione, e un'eccezione si chiede.
   *
   * Resta aperta finché c'è una bozza dentro: chiuderla nasconderebbe del testo scritto.
   */
  const [adding, setAdding] = useState(false);
  const writing = adding || draft !== '';

  const closeDraft = (): void => {
    onCommitDraft();
    setAdding(false);
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.chips}>
        {choices.map((choice) => (
          <Chip
            key={choice.key}
            label={choice.name}
            selected={chosenKeys.has(choice.key)}
            onPress={() => onToggle(choice.name)}
          />
        ))}
        <Chip
          label={t('vocabulary.newEntry')}
          selected={writing}
          onPress={() => setAdding((open) => !open)}
          icon={
            <Feather
              name="plus"
              size={13}
              color={writing ? colors.textOnAccent : colors.textMuted}
            />
          }
        />
      </View>

      {writing && (
        <TextInput
          value={draft}
          onChangeText={onDraftChange}
          autoFocus
          onSubmitEditing={onCommitDraft}
          onBlur={closeDraft}
          placeholder={t(`vocabulary.${kind}.placeholder`)}
          placeholderTextColor={colors.textFaint}
          autoCapitalize={kind === 'store' ? 'words' : 'none'}
          maxLength={MAX_ENTRY_NAME}
          returnKeyType="done"
          // `submit` e non il default `blurAndSubmit`: chi mette due tag di seguito non deve
          // ritoccare il campo dopo il primo.
          submitBehavior="submit"
          accessibilityLabel={t(`vocabulary.${kind}.placeholder`)}
          style={{
            color: colors.text,
            fontSize: fontSize.sm,
            backgroundColor: colors.background,
            borderRadius: radius.md,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.md,
          }}
        />
      )}
    </View>
  );
}

/** Come in `VocabularyScreen`: della famiglia di `MAX_GROUP_NAME`. */
const MAX_ENTRY_NAME = 40;

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

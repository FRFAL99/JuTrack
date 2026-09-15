import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parseExpense } from '@jutrack/core';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { useCurrencySymbol, useMembers, useMyMemberId, useCategories } from '@/state';
import { useTheme } from '@/theme';
import { draftPills, highlight, sentenceHint } from './sentence';
import { sheetMetrics } from './sheet-metrics';
import { useSentenceContext } from './useSentence';

interface SentenceSheetProps {
  visible: boolean;
  onClose: () => void;
  /**
   * Dove va a finire la frase, deciso da chi apre il foglio.
   *
   * **Il foglio non naviga**, e dallo Step 72 non può più: i chiamanti sono due e vogliono
   * due cose diverse. Dalla home la frase diventa una rotta nuova verso il form; arrivando
   * dal «+» del widget il form **è già aperto**, e spingerne un secondo lascerebbe sotto una
   * schermata di spesa vuota da cui si torna indietro senza capire perché. Far decidere al
   * foglio quale dei due casi è in corso vorrebbe dire dargli da sapere come ci si è
   * arrivati, che è esattamente ciò che non deve sapere.
   */
  onSentence: (sentence: string) => void;
}

/** Quanto può essere lunga la frase. Oltre non è più una frase, è una nota. */
const MAX_SENTENCE = 160;

/**
 * Quanto è alta la tastiera adesso, zero se è chiusa.
 *
 * **`Will` su iOS, `Did` su Android**, e non è una preferenza: iOS annuncia la tastiera
 * *prima* di aprirla e il foglio si alza insieme a lei, mentre Android quegli eventi non li
 * manda affatto — restare su `Will` lì vorrebbe dire non ricevere mai niente, cioè il difetto
 * di prima scritto in un altro modo.
 *
 * Sta qui e non in `sheet-metrics.ts` di proposito: questa è la parte che parla con la
 * piattaforma e che nessun test può eseguire. Il conto che ne segue è di là, dove si prova.
 */
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const shown = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (event) => {
      setHeight(event.endCoordinates.height);
    });
    const hidden = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      setHeight(0);
    });
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  return height;
}

/**
 * La spesa scritta in una riga, in un foglio dal basso.
 *
 * Il tastierino dello Step 49 aveva risolto l'importo: si digita e si salva senza scorrere.
 * Tutto il resto no — negozio, categoria, chi ha pagato e com'è divisa stanno in tre righe
 * che si aprono una per volta, e una spesa che le usa tutte costa sei tocchi in più della
 * stessa spesa detta in quattro parole. Qui le quattro parole si scrivono, e la grammatica
 * di `packages/core/src/parse/` le smista.
 *
 * **Tre cose a schermo, e sono tre livelli della stessa risposta.** Il campo è ciò che si
 * scrive; sotto, la frase ricomposta con le parole capite **in accento**, che è il modo in
 * cui si impara la sintassi senza un manuale da leggere; sotto ancora le pillole, che dicono
 * il *valore* — «ieri» diventa la data vera, «25» diventa 25,00 €. L'una insegna, le altre
 * confermano.
 *
 * **`Modal` di React Native**, per la stessa ragione scritta in `GroupSwitcherSheet`:
 * `@gorhom/bottom-sheet` porterebbe due moduli nativi e una build EAS nuova, e questo step
 * arriva al telefono via etere.
 *
 * **Niente entra nel documento da qui.** «Continua» passa la frase alla schermata della
 * spesa, che la rilegge e semina il form: la spesa si salva di là, come tutte le altre. Una
 * lettura sbagliata che si salvasse da sola sarebbe molto peggio di una che si vede prima.
 */
export function SentenceSheet({ visible, onClose, onSentence }: SentenceSheetProps) {
  const { t } = useTranslation();
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const keyboardHeight = useKeyboardHeight();
  const context = useSentenceContext();
  const categories = useCategories();
  const members = useMembers();
  const myMemberId = useMyMemberId();
  const symbol = useCurrencySymbol();

  const [text, setText] = useState('');

  // La frase si rilegge a ogni tasto, e costa qualche decina di microsecondi: il conto
  // pesante — il vocabolario del gruppo — è già stato fatto una volta da `useSentenceContext`.
  const draft = useMemo(() => parseExpense(text, context), [text, context]);
  const pills = useMemo(
    () => draftPills(draft, { categories, members, myMemberId, symbol }),
    [draft, categories, members, myMemberId, symbol],
  );
  const pieces = useMemo(() => highlight(draft), [draft]);
  const hint = sentenceHint(draft);

  // Il conto sta in `sheet-metrics.ts`, che è puro e ha i test: qui restano le tre misure
  // che solo il dispositivo sa dire.
  const metrics = sheetMetrics({
    windowHeight,
    keyboardHeight,
    safeBottom: insets.bottom,
    gap: spacing.md,
  });

  const close = (): void => {
    setText('');
    onClose();
  };

  const proceed = (): void => {
    const sentence = text.trim();
    if (sentence === '') return;
    close();
    // **Viaggia la frase, non la bozza** (decisione 8 del piano v9): una rappresentazione
    // sola, e viva. Serializzare la bozza vorrebbe dire due versioni della stessa cosa che
    // possono divergere, e la seconda invecchia appena si aggiunge un campo.
    onSentence(sentence);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel={t('common.close')} />
      {/* **Niente `KeyboardAvoidingView`**: qui dentro non funzionava. Una `Modal` di React
          Native su Android è una finestra sua, e l'`adjustResize` del manifest — che salva
          ogni altra schermata — non la raggiunge; il `behavior` era per giunta impostato solo
          su iOS, quindi su Android non si muoveva niente e il campo finiva sotto la tastiera.
          Adesso il foglio si alza da sé, di quanto la tastiera misura davvero. */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          marginBottom: metrics.liftBy,
          paddingBottom: metrics.paddingBottom,
          maxHeight: metrics.maxHeight,
        }}
      >
        <View style={{ alignItems: 'center', paddingTop: spacing.md }}>
          <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.semibold }}
          >
            {t('sentence.title')}
          </Text>

          <TextInput
            value={text}
            onChangeText={setText}
            autoFocus
            maxLength={MAX_SENTENCE}
            placeholder={t('sentence.placeholder')}
            placeholderTextColor={colors.textFaint}
            accessibilityLabel={t('sentence.title')}
            returnKeyType="next"
            onSubmitEditing={proceed}
            style={{
              color: colors.text,
              fontSize: fontSize.lg,
              backgroundColor: colors.background,
              borderRadius: radius.md,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.md,
            }}
          />

          {/* L'anteprima compare **solo quando c'è qualcosa da mostrare**: su una frase
                ancora vuota o mai capita sarebbe un'eco muta del campo qui sopra. */}
          {draft.marks.length > 0 && (
            <Text style={{ fontSize: fontSize.md, lineHeight: 24 }}>
              {pieces.map((piece, index) => (
                <Text
                  key={`${index}:${piece.field ?? 'note'}`}
                  style={{
                    color: piece.field === null ? colors.textMuted : colors.accent,
                    fontWeight: piece.field === null ? fontWeight.regular : fontWeight.semibold,
                  }}
                >
                  {piece.text}
                </Text>
              ))}
            </Text>
          )}

          {pills.length > 0 && (
            <View style={styles.pills}>
              {pills.map((pill) => (
                <Chip
                  key={pill.key}
                  label={pill.label}
                  selected
                  // Le pillole dicono, non scelgono: toccarle non deve fare niente. A
                  // correggere una lettura è il form, dov'è già possibile cambiare tutto.
                  onPress={() => {}}
                  {...(pill.color !== undefined && { color: pill.color })}
                />
              ))}
            </View>
          )}

          {hint !== null && (
            <Text style={{ color: colors.warning, fontSize: fontSize.sm }}>{hint}</Text>
          )}

          {draft.note !== '' && (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
              {t('sentence.asNote', { text: draft.note })}
            </Text>
          )}

          <Button label={t('sentence.continue')} onPress={proceed} disabled={text.trim() === ''} />

          <Text style={{ color: colors.textFaint, fontSize: fontSize.xs, lineHeight: 18 }}>
            {t('sentence.help')}
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000099' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

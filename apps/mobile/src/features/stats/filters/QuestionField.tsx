import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useSentenceContext } from '@/features/expenses/useSentence';
import { useTheme } from '@/theme';
import { readQuestion, type QuestionResult } from './question';

interface QuestionFieldProps {
  onApply: (result: QuestionResult) => void;
}

/** Quanto può essere lunga una domanda. Oltre non è più una domanda. */
const MAX_QUESTION = 120;

/**
 * La domanda scritta, sopra la barra dei filtri.
 *
 * Nei Grafici la domanda si compone in quattro posti — il selettore del periodo, il foglio
 * dei filtri, i chip, la barra dei mesi — e chi sa già cosa vuole sapere deve comunque
 * attraversarli tutti. Qui la si scrive: «spesa da esselunga questo mese» accende gli
 * **stessi** chip che si sarebbero ottenuti a mano.
 *
 * **Si applica quando si conferma, non a ogni tasto.** Due ragioni, e nessuna delle due è
 * la prestazione soltanto: applicare mentre si scrive rifarebbe sedici widget a ogni
 * lettera, ma soprattutto una frase scritta a metà è una domanda diversa da quella che si
 * sta scrivendo — «ad ago" filtrerebbe su qualcosa che nessuno ha chiesto, e lo si vedrebbe
 * succedere sotto le dita.
 *
 * **Il campo si svuota dopo aver applicato**, e non è una dimenticanza: da quel momento la
 * verità sono i chip. Chi tocca la × su «Esselunga» toglie il filtro, e una frase rimasta
 * scritta direbbe ancora «da esselunga» — cioè la schermata racconterebbe due cose diverse
 * di sé stessa, e quella scritta più in grande sarebbe quella falsa.
 */
export function QuestionField({ onApply }: QuestionFieldProps) {
  const { t } = useTranslation();
  const { colors, spacing, radius, fontSize } = useTheme();
  const context = useSentenceContext();

  const [text, setText] = useState('');
  /** L'ultima domanda che non si è capita. Si spegne appena si ricomincia a scrivere. */
  const [missed, setMissed] = useState<string | null>(null);

  const submit = (): void => {
    const question = text.trim();
    if (question === '') return;

    const result = readQuestion(question, context);
    if (!result.understood) {
      // Non si tocca niente: i filtri di prima restano, e il campo lo dice.
      setMissed(question);
      return;
    }

    setMissed(null);
    setText('');
    onApply(result);
  };

  return (
    <View style={{ paddingHorizontal: spacing.lg, gap: spacing.xs }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          paddingHorizontal: spacing.md,
        }}
      >
        <Feather name="search" size={15} color={colors.textFaint} />
        <TextInput
          value={text}
          onChangeText={(value) => {
            setText(value);
            if (missed !== null) setMissed(null);
          }}
          onSubmitEditing={submit}
          returnKeyType="search"
          maxLength={MAX_QUESTION}
          placeholder={t('stats.question.placeholder')}
          placeholderTextColor={colors.textFaint}
          accessibilityLabel={t('stats.question.label')}
          style={{
            flex: 1,
            color: colors.text,
            fontSize: fontSize.sm,
            paddingVertical: spacing.md,
          }}
        />
      </View>

      {missed !== null && (
        <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, lineHeight: 17 }}>
          {t('stats.question.missed')}
        </Text>
      )}
    </View>
  );
}

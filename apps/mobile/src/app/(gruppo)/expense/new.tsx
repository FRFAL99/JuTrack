import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { parseExpense } from '@jutrack/core';
import { ModalScreen } from '@/components/ModalScreen';
import { ExpenseForm, type ExpenseFormValues } from '@/features/expenses/ExpenseForm';
import { SentenceSheet } from '@/features/expenses/SentenceSheet';
import { sentenceAvailable } from '@/features/expenses/sentence';
import { useSentenceContext } from '@/features/expenses/useSentence';
import { cameFromWidget, FROM_PARAM } from '@/features/widgets/deeplink';
import { useExpenseRegistered } from '@/features/notifications/useNotifications';
import { useVaultStore } from '@/state';

export default function NewExpenseScreen() {
  const { t, i18n } = useTranslation();
  const store = useVaultStore();
  const noteRegistered = useExpenseRegistered();
  /**
   * La frase dello Step 68, quando si arriva dal foglio.
   *
   * **Viaggia la frase, non la bozza** (decisione 8 del piano v9): una rappresentazione
   * sola, e viva. Serializzare la bozza nel parametro vorrebbe dire avere due versioni
   * della stessa cosa che possono divergere, e la seconda invecchia appena si aggiunge un
   * campo. Rifare l'analisi costa microsecondi e non tocca il disco.
   *
   * `useLocalSearchParams` dà `string | string[]`: un parametro ripetuto nella rotta
   * arriverebbe come array, e concatenarlo produrrebbe una frase che nessuno ha scritto.
   */
  const params = useLocalSearchParams<{ frase?: string | string[]; da?: string | string[] }>();
  const fromRoute = typeof params.frase === 'string' ? params.frase : '';

  /**
   * La frase scritta **qui**, arrivando dal «+» di un widget.
   *
   * Dalla home il foglio si apre prima e questa schermata nasce già seminata; dal widget
   * l'ordine è rovesciato — la schermata c'è già, e il foglio le si apre sopra. Quindi la
   * frase non può viaggiare in un parametro: spingere una seconda `/expense/new` lascerebbe
   * sotto questa, vuota, e il «indietro» dal form ci ricadrebbe senza spiegazioni.
   */
  const [written, setWritten] = useState('');

  // Il foglio si apre da solo **solo** arrivando dal widget, e solo dove la grammatica
  // esiste: in inglese il «+» porta al form normale, che è la stessa cosa in un gesto in più.
  const [sheetOpen, setSheetOpen] = useState(
    cameFromWidget(params[FROM_PARAM]) && sentenceAvailable(i18n.language),
  );

  const sentence = written !== '' ? written : fromRoute;
  const context = useSentenceContext();
  const draft = useMemo(
    () => (sentence === '' ? undefined : parseExpense(sentence, context)),
    [sentence, context],
  );

  const handleSubmit = (values: ExpenseFormValues): void => {
    store.addExpense({
      amountCents: values.amountCents,
      date: values.date,
      categoryId: values.categoryId,
      note: values.note,
      store: values.store,
      tags: values.tags,
      // La valuta del profilo entra qui e da nessun'altra parte: è l'unico punto in cui
      // nasce una spesa. In modifica non si tocca — vedi `expense/[id].tsx`.
      currency: values.currency,
      paidBy: values.paidBy,
      split: values.split,
    });

    // Sposta in avanti la scadenza del promemoria (Step 31): è **questo** il gesto che
    // «registrare una spesa» significa, non l'apertura dell'app. Non si attende — al
    // massimo il promemoria arriverebbe un giorno prima del dovuto.
    noteRegistered();

    router.back();
  };

  return (
    // `compact`: la x tonda a sinistra e il titolo al centro, perché l'azione che conclude
    // — «Salva la spesa» — è il bottone a piena larghezza in fondo al form.
    <ModalScreen title={t('expense.newTitle')} compact>
      <ExpenseForm
        {...(draft !== undefined && { draft })}
        onSubmit={handleSubmit}
        submitLabel={t('expense.submitNew')}
      />

      {/* Chiudere il foglio senza scrivere niente **non torna alla home**: sotto c'è il form
          della spesa, che è dove si stava andando. È il ripiego giusto — chi ha toccato il
          «+» voleva registrare una spesa, e la frase è una scorciatoia, non l'unica strada. */}
      <SentenceSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSentence={setWritten}
      />
    </ModalScreen>
  );
}

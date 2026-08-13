import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ModalScreen } from '@/components/ModalScreen';
import { ExpenseForm, type ExpenseFormValues } from '@/features/expenses/ExpenseForm';
import { useExpenseRegistered } from '@/features/notifications/useNotifications';
import { useVaultStore } from '@/state';

export default function NewExpenseScreen() {
  const { t } = useTranslation();
  const store = useVaultStore();
  const noteRegistered = useExpenseRegistered();

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
      <ExpenseForm onSubmit={handleSubmit} submitLabel={t('expense.submitNew')} />
    </ModalScreen>
  );
}

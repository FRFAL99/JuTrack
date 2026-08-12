import { router } from 'expo-router';
import { ModalScreen } from '@/components/ModalScreen';
import { ExpenseForm, type ExpenseFormValues } from '@/features/expenses/ExpenseForm';
import { useVaultStore } from '@/state';

export default function NewExpenseScreen() {
  const store = useVaultStore();

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

    router.back();
  };

  return (
    // `compact`: la x tonda a sinistra e il titolo al centro, perché l'azione che conclude
    // — «Salva la spesa» — è il bottone a piena larghezza in fondo al form.
    <ModalScreen title="Nuova spesa" compact>
      <ExpenseForm onSubmit={handleSubmit} submitLabel="Salva la spesa" />
    </ModalScreen>
  );
}

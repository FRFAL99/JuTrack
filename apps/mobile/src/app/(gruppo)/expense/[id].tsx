import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { ModalScreen } from '@/components/ModalScreen';
import { ExpenseForm, type ExpenseFormValues } from '@/features/expenses/ExpenseForm';
import { useExpense, useVaultStore } from '@/state';

export default function EditExpenseScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useVaultStore();
  const expense = useExpense(id);

  if (expense === null || expense.deletedAt !== null) {
    // Può succedere davvero: l'altro dispositivo può aver cancellato la spesa
    // mentre questa schermata era aperta.
    return (
      <ModalScreen title={t('expense.notFoundTitle')}>
        <EmptyState
          icon="🔍"
          title={t('expense.notFoundHeading')}
          hint={t('expense.notFoundHint')}
        />
      </ModalScreen>
    );
  }

  const handleSubmit = (values: ExpenseFormValues): void => {
    store.updateExpense(expense.id, {
      amountCents: values.amountCents,
      categoryId: values.categoryId,
      note: values.note,
      store: values.store,
      tags: values.tags,
      // `values.currency` esiste ma **non si scrive**: una spesa conserva la valuta con cui
      // è nata. Riscriverla con quella del profilo di adesso cambierebbe di significato una
      // cifra che nessuno ha toccato.
      paidBy: values.paidBy,
      // Lo split arriva sempre insieme all'importo: VaultStore rifiuta un aggiornamento
      // che lascerebbe le quote incoerenti col totale.
      split: values.split,
    });

    router.back();
  };

  const handleDelete = (): void => {
    Alert.alert(t('expense.deleteTitle'), t('expense.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('expense.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          store.deleteExpense(expense.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <ModalScreen title={t('expense.editTitle')} compact>
      <ExpenseForm
        initial={expense}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        submitLabel={t('expense.submitEdit')}
      />
    </ModalScreen>
  );
}

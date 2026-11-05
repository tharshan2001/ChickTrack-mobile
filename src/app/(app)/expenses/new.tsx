import { ExpenseForm } from '@/features/expense-form';
import { useCreateExpense } from '@/features/expenses-api';
import { savedAndBack } from '@/components/motion';

export default function AddExpense() {
  const create = useCreateExpense();
  return <ExpenseForm title="Add expense" submitTitle="Save expense" save={create} onSaved={() => savedAndBack('Expense saved')} />;
}

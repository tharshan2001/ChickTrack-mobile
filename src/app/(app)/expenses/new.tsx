import { router } from 'expo-router';

import { ExpenseForm } from '@/features/expense-form';
import { useCreateExpense } from '@/features/expenses-api';

export default function AddExpense() {
  const create = useCreateExpense();
  return <ExpenseForm title="Add expense" submitTitle="Save expense" save={create} onSaved={() => router.back()} />;
}

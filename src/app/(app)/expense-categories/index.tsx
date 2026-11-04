import { expenseCategories } from '@/api/resources';
import { MasterList } from '@/components/master-list';

export default function ExpenseCategories() {
  return (
    <MasterList
      title="Expense categories"
      subtitle="Types of cost you track"
      noun="category"
      plural="categories"
      useList={expenseCategories.useList}
      describe={(c) => c.description ?? undefined}
      addHref="/expense-categories/new"
      itemHref={(c) => ({ pathname: '/expense-categories/[id]', params: { id: c.id } })}
      note="Categories group the costs on purchases, like transport, so reports can show where money goes."
      emptyText="Add the costs you track, like Transport or Labour."
    />
  );
}

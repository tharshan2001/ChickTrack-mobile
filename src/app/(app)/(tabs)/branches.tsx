import { branches } from '@/api/resources';
import { MasterList } from '@/components/master-list';

/**
 * Branch list. Stock, today's sales and the amount each branch owes are
 * added to these rows in the branch-operations phase.
 */
export default function BranchesTab() {
  return (
    <MasterList
      isTab
      title="Branches"
      subtitle="Shops that receive stock and sell"
      noun="branch"
      plural="branches"
      useList={branches.useList}
      describe={(b) => [b.code, b.phone].filter(Boolean).join(' · ')}
      addHref="/branches/new"
      itemHref={(b) => ({ pathname: '/branches/[id]', params: { id: b.id } })}
      note="Inactive branches can't receive dispatches or record sales. Their history stays."
      emptyText="Add your first branch, like Kandy Central."
    />
  );
}

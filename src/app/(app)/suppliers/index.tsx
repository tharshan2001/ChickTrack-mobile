import { suppliers } from '@/api/resources';
import { MasterList } from '@/components/master-list';

export default function Suppliers() {
  return (
    <MasterList
      title="Suppliers"
      subtitle="Farms and traders you buy from"
      noun="supplier"
      plural="suppliers"
      useList={suppliers.useList}
      describe={(s) => [s.contactPerson, s.phone].filter(Boolean).join(' · ') || s.paymentTerms || undefined}
      addHref="/suppliers/new"
      itemHref={(s) => ({ pathname: '/suppliers/[id]', params: { id: s.id } })}
      note="Inactive suppliers are hidden when you record a purchase. Past purchases keep their supplier."
      emptyText="Add the farms and traders you buy chickens from."
    />
  );
}

import { products } from '@/api/resources';
import { MasterList } from '@/components/master-list';

export default function Products() {
  return (
    <MasterList
      title="Products"
      subtitle="Chicken types you buy, stock and sell"
      noun="product"
      plural="products"
      useList={products.useList}
      describe={(p) => p.description ?? undefined}
      addHref="/products/new"
      itemHref={(p) => ({ pathname: '/products/[id]', params: { id: p.id } })}
      note="Inactive products are hidden from the purchase picker. Their history and any stock you hold stay as they are."
      emptyText="Add the chicken types you buy, like Broiler or Layer."
    />
  );
}

import { products } from '@/api/resources';
import { productCopy } from '@/features/copy';
import { AddSimpleEntity } from '@/features/simple-entity';

export default function AddProduct() {
  return <AddSimpleEntity crud={products} copy={productCopy} />;
}

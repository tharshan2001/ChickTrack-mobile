import { products } from '@/api/resources';
import { productCopy } from '@/features/copy';
import { EditSimpleEntity } from '@/features/simple-entity';

export default function EditProduct() {
  return <EditSimpleEntity crud={products} copy={productCopy} />;
}

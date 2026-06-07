import { getReferences } from "@/lib/actions/references";
import { getProducts } from "@/lib/actions/livestream";
import ReferencesPageClient from "@/components/admin/livestream/references-page-client";

export default async function ReferencesPage() {
  const [referencesResult, productsResult] = await Promise.all([
    getReferences(),
    getProducts(),
  ]);

  const references = referencesResult.success ? referencesResult.data : [];
  const products = productsResult.success
    ? productsResult.data.map((p) => ({ product_id: p.product_id, name: p.name }))
    : [];

  return <ReferencesPageClient references={references} products={products} />;
}

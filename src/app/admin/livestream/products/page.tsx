import { getProducts } from "@/lib/actions/livestream";
import { createClient } from "@/lib/supabase/server";
import ProductsPageClient from "@/components/admin/livestream/products-page-client";

export default async function ProductsPage() {
  const [productsResult, supabase] = await Promise.all([
    getProducts(),
    createClient(),
  ]);

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("campaign_id, campaign_name")
    .order("campaign_name");

  const products = productsResult.success ? productsResult.data : [];

  return (
    <ProductsPageClient
      products={products}
      campaigns={(campaigns ?? []) as { campaign_id: string; campaign_name: string }[]}
    />
  );
}

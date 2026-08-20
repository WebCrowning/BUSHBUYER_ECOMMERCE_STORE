import { auth } from "@/auth";
import { StoreRepository } from "@/repositories/store.repository";
import { ProductRepository } from "@/repositories/product.repository";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import SellerNavbar from "@/components/seller-navbar";
import SellerInventoryClient from "./seller-inventory-client";

export default async function SellerInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ storeId?: string }>;
}) {
  const { storeId: rawStoreId } = await searchParams;
  const reqStoreId = rawStoreId ? parseInt(rawStoreId, 10) : NaN;

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const userId = Number(session.user.id);
  const stores = await StoreRepository.getUserStores(userId);
  const primaryStore =
    (!isNaN(reqStoreId) && stores.find((s) => s.id === reqStoreId)) ||
    stores[0] ||
    (await StoreRepository.findById(1));

  if (!primaryStore) {
    return <div className="p-8 text-center text-foreground/70">No store found. Please contact Super Admin.</div>;
  }

  const productRows = await ProductRepository.listProducts({ store_id: primaryStore.id, limit: 200 });
  const products = productRows.map(ProductRepository.mapToProduct);

  return (
    <div className="min-h-screen bg-surface-soft text-foreground flex flex-col">
      <SiteHeader />

      <main className="container-shell py-8 flex-1">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:items-start">
          <aside>
            <SellerNavbar storeId={primaryStore.id} storeSlug={primaryStore.slug} stores={stores} />
          </aside>

          <SellerInventoryClient
            store={primaryStore}
            initialProducts={products}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

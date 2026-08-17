import { auth } from "@/auth";
import { StoreRepository } from "@/repositories/store.repository";
import { ProductRepository } from "@/repositories/product.repository";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import SellerNavbar from "@/components/seller-navbar";
import SellerProductsClient from "./seller-products-client";

export default async function SellerProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const { new: openNew } = await searchParams;
  const autoOpenForm = openNew === "1";

  const userId = Number(session.user.id);
  const role = (session.user as { role?: string }).role;
  const stores = await StoreRepository.getUserStores(userId);
  const primaryStore = stores[0] || null;

  if (!primaryStore) {
    return (
      <div className="min-h-screen bg-surface-soft text-foreground flex flex-col">
        <SiteHeader />
        <main className="container-shell py-12 flex-1 text-center">
          <div className="max-w-md mx-auto p-8 glass-card rounded-2xl border border-border">
            <h2 className="text-xl font-bold text-brand-deep mb-2">No Seller Store Assigned</h2>
            <p className="text-xs text-foreground/70 mb-4">
              Your account does not have a vendor store assigned.
            </p>
            <p className="text-xs text-foreground/60">
              Main platform catalog products (Store #1 - Bushbuyer Flagship) are managed directly via{" "}
              <a href="/admin/products" className="font-bold text-brand hover:underline">
                Admin Products
              </a>.
            </p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const productRows = await ProductRepository.listProducts({ store_id: primaryStore.id, limit: 100 });
  const products = productRows.map(ProductRepository.mapToProduct);
  const categoryRows = await ProductRepository.listCategories(primaryStore.id);

  return (
    <div className="min-h-screen bg-surface-soft text-foreground flex flex-col">
      <SiteHeader />

      <main className="container-shell py-8 flex-1">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:items-start">
          <aside>
            <SellerNavbar storeId={primaryStore.id} storeSlug={primaryStore.slug} />
          </aside>

          <SellerProductsClient
            store={primaryStore}
            initialProducts={products}
            initialCategories={categoryRows}
            autoOpenForm={autoOpenForm}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

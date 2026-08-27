import { auth } from "@/auth";
import { StoreRepository } from "@/repositories/store.repository";
import { ProductRepository } from "@/repositories/product.repository";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import SellerNavbar from "@/components/seller-navbar";
import SellerProductsClient from "./seller-products-client";

import { canAccessSellerRoute } from "@/lib/store-permissions";

export default async function SellerProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; storeId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const { new: openNew, storeId: rawStoreId } = await searchParams;
  const autoOpenForm = openNew === "1";
  const reqStoreId = rawStoreId ? parseInt(rawStoreId, 10) : NaN;

  const userId = Number(session.user.id);
  const stores = await StoreRepository.getUserStores(userId);
  const primaryStore =
    (!isNaN(reqStoreId) && stores.find((s) => s.id === reqStoreId)) ||
    stores[0] ||
    null;

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

  const globalRole = (session.user as { role?: string })?.role;
  const storeRole =
    (await StoreRepository.getUserStoreRole(userId, primaryStore.id)) ||
    (globalRole === "admin" || globalRole === "super_admin" ? "store_owner" : "sales_staff");

  if (!canAccessSellerRoute(storeRole, "/seller/products")) {
    redirect(`/seller/dashboard?storeId=${primaryStore.id}&access=denied&required=manage_products`);
  }

  const productRows = await ProductRepository.listProducts({
    store_id: primaryStore.id,
    include_blocked: true,
    limit: 100,
  });
  const products = productRows.map(ProductRepository.mapToProduct);
  const categoryRows = await ProductRepository.listCategories(primaryStore.id);

  return (
    <div className="min-h-screen bg-surface-soft text-foreground flex flex-col">
      <SiteHeader />

      <main className="container-shell py-8 flex-1">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:items-start">
          <aside>
            <SellerNavbar storeId={primaryStore.id} storeSlug={primaryStore.slug} stores={stores} storeRole={storeRole} />
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

import { auth } from "@/auth";
import { StoreRepository } from "@/repositories/store.repository";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import SellerNavbar from "@/components/seller-navbar";
import SellerWalletsClient from "./seller-wallets-client";

import { canAccessSellerRoute, hasStorePermission } from "@/lib/store-permissions";

export default async function SellerWalletsPage({
  searchParams,
}: {
  searchParams: Promise<{ storeId?: string }>;
}) {
  const { storeId: rawStoreId } = await searchParams;
  const reqStoreId = rawStoreId ? parseInt(rawStoreId, 10) : NaN;

  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const userId = Number(session.user.id);
  const globalRole = (session.user as { role?: string }).role ?? "customer";
  const stores = await StoreRepository.getUserStores(userId);
  const primaryStore =
    (!isNaN(reqStoreId) && stores.find((s) => s.id === reqStoreId)) ||
    stores[0] ||
    (await StoreRepository.findById(1));

  if (!primaryStore) {
    return (
      <div className="p-8 text-center text-foreground/70">
        No store found. Please contact the platform admin.
      </div>
    );
  }

  const storeRole =
    (await StoreRepository.getUserStoreRole(userId, primaryStore.id)) ||
    (globalRole === "admin" || globalRole === "super_admin" ? "store_owner" : "sales_staff");

  if (!canAccessSellerRoute(storeRole, "/seller/wallets")) {
    redirect(`/seller/dashboard?storeId=${primaryStore.id}&access=denied&required=view_wallet`);
  }

  const isGlobalAdmin =
    globalRole === "admin" ||
    globalRole === "super_admin" ||
    globalRole === "platform_admin" ||
    globalRole === "finance_admin";

  const canWithdraw = isGlobalAdmin || hasStorePermission(storeRole, "withdraw_wallet");

  return (
    <div className="min-h-screen bg-surface-soft text-foreground flex flex-col">
      <SiteHeader />
      <main className="container-shell py-8 flex-1">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:items-start">
          <aside>
            <SellerNavbar storeId={primaryStore.id} storeSlug={primaryStore.slug} stores={stores} storeRole={storeRole} />
          </aside>
          <SellerWalletsClient
            store={primaryStore}
            canWithdraw={canWithdraw}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

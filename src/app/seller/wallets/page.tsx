import { auth } from "@/auth";
import { StoreRepository } from "@/repositories/store.repository";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import SellerNavbar from "@/components/seller-navbar";
import SellerWalletsClient from "./seller-wallets-client";

export default async function SellerWalletsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const userId = Number(session.user.id);
  const role = (session.user as { role?: string }).role ?? "customer";
  const stores = await StoreRepository.getUserStores(userId);
  const primaryStore = stores[0] || (await StoreRepository.findById(1));

  if (!primaryStore) {
    return (
      <div className="p-8 text-center text-foreground/70">
        No store found. Please contact the platform admin.
      </div>
    );
  }

  const canWithdraw =
    role === "store_owner" ||
    role === "admin" ||
    role === "super_admin" ||
    role === "platform_admin" ||
    role === "finance_admin";

  return (
    <div className="min-h-screen bg-surface-soft text-foreground flex flex-col">
      <SiteHeader />
      <main className="container-shell py-8 flex-1">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:items-start">
          <aside>
            <SellerNavbar storeId={primaryStore.id} storeSlug={primaryStore.slug} />
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

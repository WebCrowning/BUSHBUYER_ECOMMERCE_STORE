import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { StoreRepository } from "@/repositories/store.repository";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import SellerNavbar from "@/components/seller-navbar";
import SellerStaffClient from "@/components/seller-staff-client";
import { Users } from "lucide-react";

import { canAccessSellerRoute, hasStorePermission } from "@/lib/store-permissions";

export const metadata = {
  title: "Staff & Users | Seller Portal",
};

export default async function SellerStaffPage({
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
  const globalRole = (session.user as { role?: string }).role;
  const stores = await StoreRepository.getUserStores(userId);
  const primaryStore =
    (!isNaN(reqStoreId) && stores.find((s) => s.id === reqStoreId)) ||
    stores[0] ||
    null;

  if (!primaryStore) {
    return (
      <div className="min-h-screen bg-surface-soft text-foreground flex flex-col">
        <SiteHeader />
        <main className="container-shell py-16 flex-1 flex items-center justify-center">
          <div className="rounded-2xl border border-border bg-white p-10 text-center shadow-sm max-w-sm w-full">
            <Users size={36} className="mx-auto mb-3 text-foreground/20" />
            <h2 className="text-base font-bold text-brand-deep">No Store Assigned</h2>
            <p className="mt-1 text-xs text-foreground/60">
              You are not assigned to any store yet. Please contact the platform admin.
            </p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const storeRole =
    (await StoreRepository.getUserStoreRole(userId, primaryStore.id)) ||
    (globalRole === "admin" || globalRole === "super_admin" ? "store_owner" : "sales_staff");

  if (!canAccessSellerRoute(storeRole, "/seller/staff")) {
    redirect(`/seller/dashboard?storeId=${primaryStore.id}&access=denied&required=manage_staff`);
  }

  const isGlobalAdmin = globalRole === "admin" || globalRole === "super_admin";
  const canAssign = isGlobalAdmin || hasStorePermission(storeRole, "manage_staff");

  return (
    <div className="min-h-screen bg-surface-soft text-foreground flex flex-col">
      <SiteHeader />

      <main className="container-shell py-8 flex-1">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:items-start">
          <aside>
            <SellerNavbar storeId={primaryStore.id} storeSlug={primaryStore.slug} stores={stores} storeRole={storeRole} />
          </aside>

          <SellerStaffClient
            storeId={primaryStore.id}
            storeName={primaryStore.name}
            canAssign={canAssign}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

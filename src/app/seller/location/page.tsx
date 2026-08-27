import { auth } from "@/auth";
import { StoreRepository } from "@/repositories/store.repository";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import SellerNavbar from "@/components/seller-navbar";
import { StoreLocationManager } from "@/components/store/store-location-manager";
import { MapPin, Store, Navigation } from "lucide-react";

import { canAccessSellerRoute } from "@/lib/store-permissions";

export default async function SellerLocationPage({
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

  const globalRole = (session.user as { role?: string })?.role;
  const storeRole =
    (await StoreRepository.getUserStoreRole(userId, primaryStore.id)) ||
    (globalRole === "admin" || globalRole === "super_admin" ? "store_owner" : "sales_staff");

  if (!canAccessSellerRoute(storeRole, "/seller/location")) {
    redirect(`/seller/dashboard?storeId=${primaryStore.id}&access=denied&required=edit_store_settings`);
  }

  return (
    <div className="min-h-screen bg-surface-soft text-foreground flex flex-col">
      <SiteHeader />

      <main className="container-shell py-8 flex-1">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:items-start">
          <aside>
            <SellerNavbar storeId={primaryStore.id} storeSlug={primaryStore.slug} stores={stores} storeRole={storeRole} />
          </aside>

          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold border border-emerald-200">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-brand-deep">Store Location & GPS Settings</h1>
                  <p className="text-xs text-foreground/60">
                    Set your shop coordinates in Cameroon so nearby buyers can locate your store.
                  </p>
                </div>
              </div>
            </div>

            <StoreLocationManager store={primaryStore} />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

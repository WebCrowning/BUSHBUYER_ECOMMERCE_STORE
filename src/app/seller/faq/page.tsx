import { auth } from "@/auth";
import { StoreRepository } from "@/repositories/store.repository";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import SellerNavbar from "@/components/seller-navbar";
import SellerFaqClient from "./seller-faq-client";

export default async function SellerFaqPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const userId = Number(session.user.id);
  const stores = await StoreRepository.getUserStores(userId);
  const primaryStore = stores[0] || (await StoreRepository.findById(1));

  if (!primaryStore) {
    return <div className="p-8 text-center text-foreground/70">No store found. Please contact Super Admin.</div>;
  }

  return (
    <div className="min-h-screen bg-surface-soft text-foreground flex flex-col">
      <SiteHeader />

      <main className="container-shell py-8 flex-1">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:items-start">
          <aside>
            <SellerNavbar storeId={primaryStore.id} storeSlug={primaryStore.slug} />
          </aside>

          <SellerFaqClient store={primaryStore} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { VisitedStoresTracker } from "@/components/dashboard/visited-stores-tracker";
import { requireUserPage } from "@/lib/authz";
import Link from "next/link";
import { ChevronLeft, Compass, LayoutDashboard } from "lucide-react";

export const metadata: Metadata = {
  title: "Visited Stores & GPS Map Tracker - Bushbuyer",
  description: "Track physical shop locations on Google Maps for stores you have visited.",
  robots: "noindex, nofollow",
};

export default async function VisitedStoresPage() {
  await requireUserPage();

  return (
    <div className="min-h-screen bg-surface-soft text-foreground flex flex-col">
      <SiteHeader />

      <main className="container-shell py-8 flex-1">
        {/* Breadcrumb / Back Link */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-emerald-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>

        <VisitedStoresTracker />
      </main>

      <SiteFooter />
    </div>
  );
}

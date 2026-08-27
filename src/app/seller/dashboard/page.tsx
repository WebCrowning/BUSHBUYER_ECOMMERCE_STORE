import { auth } from "@/auth";
import { StoreRepository } from "@/repositories/store.repository";
import { OrderRepository } from "@/repositories/order.repository";
import { WalletRepository } from "@/repositories/wallet.repository";
import { ProductRepository } from "@/repositories/product.repository";
import { UserRepository } from "@/repositories/user.repository";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import SellerNavbar from "@/components/seller-navbar";
import { Store, DollarSign, Package, ShoppingBag, Users, ArrowUpRight, Truck, UserPlus, ShieldCheck, MapPin } from "lucide-react";

import { STORE_ROLE_META } from "@/lib/store-permissions";

export default async function SellerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ storeId?: string; access?: string; required?: string }>;
}) {
  const { storeId: rawStoreId, access, required } = await searchParams;
  const reqStoreId = rawStoreId ? parseInt(rawStoreId, 10) : NaN;

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const userId = Number(session.user.id);
  const stores = await StoreRepository.getUserStores(userId);

  // Determine active store from storeId parameter or fallback to first store
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

  const roleMeta = STORE_ROLE_META[storeRole] ?? STORE_ROLE_META.store_owner;

  const wallet = await WalletRepository.getByStoreId(primaryStore.id);
  const products = await ProductRepository.listProducts({ store_id: primaryStore.id, limit: 100 });
  const recentOrders = await OrderRepository.listOrders({ storeId: primaryStore.id, limit: 10 });
  const attributedCustomers = await UserRepository.getAttributedUsersForStore(primaryStore.id);

  return (
    <div className="min-h-screen bg-surface-soft text-foreground flex flex-col">
      <SiteHeader />

      <main className="container-shell py-8 flex-1">
        {/* Access Denied Notice if redirected from unauthorized route */}
        {access === "denied" && (
          <div className="mb-6 rounded-2xl border border-rose-300 bg-rose-50 p-4 sm:p-5 text-rose-900 shadow-sm flex items-start gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white font-bold text-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-rose-900">Restricted Section — Insufficient Authority</h3>
              <p className="text-xs text-rose-700 mt-0.5">
                Your role as <span className="font-bold underline">{roleMeta.label}</span> does not have permission to access that section
                {required ? ` (requires '${required.replace(/_/g, " ")}')` : ""}. Please contact the Store Owner for elevated permissions.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:items-start">
          <aside>
            <SellerNavbar storeId={primaryStore.id} storeSlug={primaryStore.slug} stores={stores} storeRole={storeRole} />
          </aside>

          <div className="space-y-6">
            {/* Store Portal Header */}
            <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold border border-emerald-200">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-extrabold text-brand-deep">{primaryStore.name}</h1>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-600 text-[10px] font-bold rounded-md uppercase tracking-wider">
                        {primaryStore.store_status}
                      </span>
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider border ${roleMeta.badgeClass}`}>
                        🛡️ {roleMeta.label}
                      </span>
                      <span className="text-xs text-foreground/60 font-mono">/store/{primaryStore.slug}</span>
                      {primaryStore.city && (
                        <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium border border-emerald-200 flex items-center gap-1">
                          <MapPin size={11} /> {primaryStore.quarter ? `${primaryStore.quarter}, ` : ""}{primaryStore.city}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  href={`/seller/location?storeId=${primaryStore.id}`}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all"
                >
                  <MapPin className="w-3.5 h-3.5" /> Store GPS Location
                </Link>
                <Link
                  href={`/store/${primaryStore.slug}`}
                  target="_blank"
                  className="px-4 py-2.5 bg-surface hover:bg-surface-soft text-foreground/80 text-xs font-bold rounded-xl flex items-center gap-2 border border-border transition-all shadow-sm"
                >
                  View Storefront <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                </Link>
              </div>
            </div>

            {/* Vendor Store Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                <div className="flex justify-between items-center text-foreground/60 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/60">Available Wallet</span>
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-2xl font-extrabold text-brand-deep">${wallet?.available_balance || "0.00"}</p>
                <p className="text-[11px] text-foreground/60 mt-1">Total Sales: ${wallet?.total_sales || "0.00"}</p>
              </div>

              <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                <div className="flex justify-between items-center text-foreground/60 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/60">Store Catalog</span>
                  <Package className="w-5 h-5 text-teal-600" />
                </div>
                <p className="text-2xl font-extrabold text-brand-deep">{products.length}</p>
                <p className="text-[11px] text-foreground/60 mt-1">Active Products</p>
              </div>

              <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                <div className="flex justify-between items-center text-foreground/60 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/60">Store Orders</span>
                  <ShoppingBag className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-extrabold text-brand-deep">{recentOrders.length}</p>
                <p className="text-[11px] text-foreground/60 mt-1">Received Orders</p>
              </div>

              <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                <div className="flex justify-between items-center text-foreground/60 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/60">Attributed Users</span>
                  <Users className="w-5 h-5 text-sky-600" />
                </div>
                <p className="text-2xl font-extrabold text-brand-deep">{attributedCustomers.length}</p>
                <p className="text-[11px] text-foreground/60 mt-1">Registered via Store Link</p>
              </div>
            </div>

            {/* Store Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                href="/seller/delivery-settings"
                className="rounded-2xl border border-border bg-white p-5 shadow-sm hover:border-emerald-300 hover:bg-surface transition-all group flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0 border border-emerald-200">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-brand-deep text-sm">Delivery Settings</p>
                  <p className="text-xs text-foreground/60 mt-0.5">Local, shipping & pickup zones</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-foreground/50 group-hover:text-emerald-600 flex-shrink-0 transition-colors" />
              </Link>

              <Link
                href="/seller/staff"
                className="rounded-2xl border border-border bg-white p-5 shadow-sm hover:border-purple-300 hover:bg-surface transition-all group flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0 border border-purple-200">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-brand-deep text-sm">Staff & Users</p>
                  <p className="text-xs text-foreground/60 mt-0.5">Assign staff & view customers</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-foreground/50 group-hover:text-purple-600 flex-shrink-0 transition-colors" />
              </Link>

              <Link
                href="/seller/products"
                className="rounded-2xl border border-border bg-white p-5 shadow-sm hover:border-sky-300 hover:bg-surface transition-all group flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 flex-shrink-0 border border-sky-200">
                  <Package className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-brand-deep text-sm">Manage Products</p>
                  <p className="text-xs text-foreground/60 mt-0.5">Add/Edit catalog & inventory</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-foreground/50 group-hover:text-sky-600 flex-shrink-0 transition-colors" />
              </Link>
            </div>

            {/* Store Recent Orders Section */}
            <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-brand-deep">Recent Orders for {primaryStore.name}</h2>
                  <p className="text-xs text-foreground/60">Track and manage customer purchases for your store</p>
                </div>
              </div>

              {recentOrders.length === 0 ? (
                <div className="py-12 text-center text-foreground/60 text-sm">No recent orders received for your store yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-foreground/70">
                    <thead className="bg-surface text-foreground/60 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 rounded-l-xl">Order ID</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3">Order Status</th>
                        <th className="px-4 py-3">Payment</th>
                        <th className="px-4 py-3 rounded-r-xl">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {recentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-surface">
                          <td className="px-4 py-3 font-mono font-bold text-brand-deep">{order.public_order_id}</td>
                          <td className="px-4 py-3 text-foreground/80">{order.customer_name}</td>
                          <td className="px-4 py-3 font-bold text-brand-deep">${order.total_price}</td>
                          <td className="px-4 py-3">
                            <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-600 font-bold rounded-md">
                              {order.order_status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-600 font-semibold rounded">
                              {order.payment_status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/orders/${order.public_order_id}`}
                              className="font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                            >
                              Fulfill &rarr;
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

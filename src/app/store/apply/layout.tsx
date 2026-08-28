import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Open Your Store | Bushbuyer Vendor Application",
  description:
    "Join Bushbuyer Marketplace as a verified vendor. Sell authentic African raw foods, reach local and diaspora customers, and get paid with Mobile Money & PayPal.",
  alternates: {
    canonical: "https://bushbuyer.com/store/apply",
  },
  openGraph: {
    title: "Open Your Store on Bushbuyer Marketplace",
    description:
      "Start selling African raw food ingredients directly to local and international buyers. Fast verification and automated disbursements.",
    url: "https://bushbuyer.com/store/apply",
  },
};

export default function StoreApplyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

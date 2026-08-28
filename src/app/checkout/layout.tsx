import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout | Bushbuyer",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

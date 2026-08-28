import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shopping Cart | Bushbuyer",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

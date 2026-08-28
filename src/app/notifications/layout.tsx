import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications | Bushbuyer",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

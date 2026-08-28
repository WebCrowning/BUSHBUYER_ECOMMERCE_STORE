import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Bushbuyer",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function SigninLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

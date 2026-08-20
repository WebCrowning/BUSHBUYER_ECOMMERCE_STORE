import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";
import { UserRepository } from "@/repositories/user.repository";
import { StoreRepository } from "@/repositories/store.repository";
import { checkRateLimit } from "@/lib/rate-limit";
import { SystemRole } from "@/types/marketplace";

const authSecret = process.env.NEXTAUTH_SECRET ?? "";
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !authSecret) {
  throw new Error("NEXTAUTH_SECRET must be set in production");
}

const providers: any[] = [
  Credentials({
    name: "Admin Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;

      const emailStr = (credentials.email as string).toLowerCase().trim();
      const submittedPassword = credentials.password as string;

      // ── Rate-limit login attempts per email (10 per 15 min) ──────────────
      const rl = checkRateLimit({
        key: `admin-login:${emailStr}`,
        windowMs: 15 * 60 * 1000,
        maxRequests: 10,
      });
      if (!rl.allowed) {
        // Return null — NextAuth treats null as invalid credentials
        console.warn(`[Auth] Login rate limit hit for: ${emailStr}`);
        return null;
      }

      // Look up user with password hash from the database
      const dbUser = await UserRepository.findByEmailWithPassword(emailStr);

      if (!dbUser) return null;

      // Only allow admin roles
      const allowedRoles = ["admin", "sub_admin", "super_admin", "platform_admin"];
      if (!allowedRoles.includes(dbUser.role)) return null;

      // Check if user is blocked
      if (dbUser.is_blocked) return null;

      // Verify strictly against MySQL database password_hash
      if (!dbUser.password_hash) return null;

      // Support both bcrypt hashes ($2b$...) and legacy SHA-256 hashes (64-char hex).
      // SHA-256 support is kept for backward-compat during migration; use
      // scripts/set-admin-password.js to upgrade all hashes to bcrypt.
      const storedHash = dbUser.password_hash;
      let passwordValid = false;

      if (storedHash.startsWith("$2b$") || storedHash.startsWith("$2a$")) {
        // bcrypt hash — use constant-time comparison
        passwordValid = await bcrypt.compare(submittedPassword, storedHash);
      } else if (/^[0-9a-f]{64}$/i.test(storedHash)) {
        // Legacy SHA-256 — constant-time compare (still weak; upgrade recommended)
        const { createHash, timingSafeEqual } = await import("crypto");
        const submittedHex = createHash("sha256").update(submittedPassword).digest("hex").toLowerCase();
        const a = Buffer.from(submittedHex);
        const b = Buffer.from(storedHash.toLowerCase());
        passwordValid = a.length === b.length && timingSafeEqual(a, b);
      } else {
        return null; // unrecognised hash format — deny
      }

      if (!passwordValid) return null;

      return {
        id: String(dbUser.id),
        email: dbUser.email,
        name: dbUser.name,
        image: dbUser.image ?? undefined,
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  providers.push(
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret || undefined,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  jwt: {
    maxAge: 60 * 60 * 24 * 7,
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      try {
        if (!user.email || !account?.provider) {
          return false;
        }

        // Skip DB upsert for credentials (admin) logins — no social profile to store
        if (account.provider === "credentials") {
          return true;
        }

        let referredByStoreId: number | null = null;
        try {
          const { cookies } = await import("next/headers");
          const cookieStore = await cookies();
          const refCookie = cookieStore.get("ref_store_id")?.value;
          if (refCookie) {
            referredByStoreId = parseInt(refCookie, 10) || null;
          }
          if (!referredByStoreId) {
            const refSlugCookie = cookieStore.get("ref_store_slug")?.value;
            if (refSlugCookie) {
              const store = await StoreRepository.findBySlug(refSlugCookie);
              if (store) {
                referredByStoreId = store.id;
              }
            }
          }
        } catch {
          // Ignore header error outside request scope
        }

        // Automatic social user creation / lookup (Default role: customer)
        await UserRepository.createOrUpdateSocialUser({
          name: user.name || "Customer",
          email: user.email,
          image: user.image || null,
          provider: account.provider,
          referredByStoreId,
        });

        return true;
      } catch (error) {
        console.error("SignIn callback error:", error);
        return true;
      }
    },
    async jwt({ token }) {
      try {
        if (token.email) {
          const dbUser = await UserRepository.findByEmail(token.email);
          if (dbUser) {
            // If the user has been blocked since their last token issue, invalidate the session
            if (dbUser.is_blocked) {
              // Returning a token with a past expiry forces NextAuth to sign the user out
              return { ...token, exp: 0 };
            }

            token.id = String(dbUser.id);
            token.role = dbUser.role || "customer";
            token.referredByStoreId = dbUser.referred_by_store_id || null;

            // Attach assigned store IDs for vendor staff & owners
            const stores = await StoreRepository.getUserStores(dbUser.id);
            token.storeIds = stores.map((s) => s.id);

            // Fetch attributed store slug if user was referred by a store
            if (dbUser.referred_by_store_id) {
              const refStore = await StoreRepository.findById(dbUser.referred_by_store_id);
              if (refStore) {
                token.referredStoreSlug = refStore.slug;
              }
            }
          }
        }

        token.role = token.role ?? "customer";
        return token;
      } catch (error) {
        console.error("JWT callback error:", error);
        return token;
      }
    },
    async session({ session, token }) {
      try {
        if (session.user) {
          if (token.id) {
            session.user.id = token.id as string;
          }
          (session.user as { role?: SystemRole }).role = (token.role as SystemRole) || "customer";
          (session.user as { storeIds?: number[] }).storeIds = (token.storeIds as number[]) || [];
          (session.user as { referredByStoreId?: number | null }).referredByStoreId = (token.referredByStoreId as number) || null;
          (session.user as { referredStoreSlug?: string | null }).referredStoreSlug = (token.referredStoreSlug as string) || null;
        }
        return session;
      } catch (error) {
        console.error("Session callback error:", error);
        return session;
      }
    },
  },
  pages: {
    signIn: "/signin",
  },
});

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";
import { createHash, timingSafeEqual } from "crypto";
import { query } from "@/lib/db";

type DbUser = {
  id: number;
};

type AuthUserWithRole = {
  id?: string;
  role?: string;
};

const isProduction = process.env.NODE_ENV === "production";
const authSecret = process.env.NEXTAUTH_SECRET ?? "";
const enableSocialAuth = (process.env.ENABLE_SOCIAL_LOGIN ?? "false").toLowerCase() === "true";

function comparePasswordHash(password: string, storedHash: string) {
  if (!password || !storedHash) return false;
  const cleanPassword = password.trim();
  const cleanHash = storedHash.trim();

  // Direct plain text match
  if (cleanPassword === cleanHash) {
    return true;
  }

  // SHA-256 hex match
  const incomingHash = createHash("sha256").update(cleanPassword).digest("hex");
  const a = Buffer.from(incomingHash);
  const b = Buffer.from(cleanHash);

  if (a.length === b.length) {
    try {
      if (timingSafeEqual(a, b)) {
        return true;
      }
    } catch {
      // Fallback
    }
  }

  return false;
}

const providers: any[] = [
  Credentials({
    name: "Email & Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = String(credentials?.email ?? "").trim().toLowerCase();
      const password = String(credentials?.password ?? "");

      if (!email || !password) {
        return null;
      }

      // Check DB users table for admin or sub_admin
      try {
        const users = await query<
          Array<{
            id: number;
            name: string;
            email: string;
            role: string;
            password_hash?: string | null;
          }>
        >(
          "SELECT id, name, email, role, password_hash FROM users WHERE LOWER(email) = ? AND role IN ('admin', 'sub_admin') LIMIT 1",
          [email],
        );

        if (users.length > 0) {
          const user = users[0];
          if (user.password_hash && comparePasswordHash(password, user.password_hash)) {
            return {
              id: String(user.id),
              name: user.name || "Admin",
              email: user.email,
              image: null,
              role: user.role || "admin",
            };
          }
        }
      } catch (error) {
        console.error("DB Admin Auth authorize error:", error);
      }

      return null;
    },
  }),
];

if (enableSocialAuth) {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      }),
    );
  }

  if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    providers.push(
      Facebook({
        clientId: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      }),
    );
  }
}

if (isProduction && !authSecret) {
  throw new Error("NEXTAUTH_SECRET must be set in production");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret || undefined,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
  },
  jwt: {
    maxAge: 60 * 60 * 8,
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      try {
        if (!user.email || !account?.provider) {
          return false;
        }

        if (account.provider === "credentials") {
          return true;
        }

        await query(
          `
          INSERT INTO users (name, email, image, provider)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            image = VALUES(image),
            provider = VALUES(provider)
          `,
          [user.name ?? "Customer", user.email, user.image ?? null, account.provider],
        );

        return true;
      } catch (error) {
        console.error("SignIn callback error:", error);
        return true;
      }
    },
    async jwt({ token, user }) {
      try {
        if (user) {
          const authUser = user as AuthUserWithRole;
          token.role = authUser.role || "user";
          token.id = authUser.id ?? token.id;
        }

        if (token.email) {
          const rows = await query<Array<{ id: number; role: string }>>(
            "SELECT id, role FROM users WHERE LOWER(email) = ? LIMIT 1",
            [token.email.toLowerCase()],
          );
          if (rows[0]) {
            token.id = String(rows[0].id);
            if (rows[0].role) {
              token.role = rows[0].role;
            }
          }
        }

        token.role = token.role ?? "user";
        return token;
      } catch (error) {
        console.error("JWT callback error:", error);
        return token;
      }
    },
    async session({ session, token }) {
      try {
        if (session.user) {
          // Use token.id which is set in JWT callback
          if (token.id) {
            session.user.id = token.id as string;
          }
          // Add role to session
          (session.user as { role?: string }).role = String(token.role || "user");
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

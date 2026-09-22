import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import argon2 from "argon2";
import { prisma } from "@/lib/db";
import { normalizeEmail } from "@/lib/utils";
import { verifyTotp } from "@/lib/twofactor";
import { decryptSecret } from "@/lib/crypto";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

// Generic message on purpose: never reveal whether the email exists,
// whether the password or the OTP was the wrong part.
const INVALID_CREDENTIALS = "INVALID_CREDENTIALS";

export const authOptions: NextAuthOptions = {
  // PrismaAdapter still links Google OAuth accounts/users to the DB even
  // though sessions run as JWTs (required by CredentialsProvider in v4).
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      // Safe: Google verifies the email address before it reaches us, so
      // linking to an existing email/password account on first Google
      // sign-in does not let an attacker take over an unverified email.
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "One-time code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error(INVALID_CREDENTIALS);
        }
        const email = normalizeEmail(credentials.email);
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.passwordHash) {
          throw new Error(INVALID_CREDENTIALS);
        }
        if (user.isDisabled) {
          throw new Error("ACCOUNT_DISABLED");
        }
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error("ACCOUNT_LOCKED");
        }

        const validPassword = await argon2.verify(user.passwordHash, credentials.password);
        if (!validPassword) {
          const failedLoginCount = user.failedLoginCount + 1;
          const shouldLock = failedLoginCount >= MAX_FAILED_ATTEMPTS;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: shouldLock ? 0 : failedLoginCount,
              lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null,
            },
          });
          throw new Error(shouldLock ? "ACCOUNT_LOCKED" : INVALID_CREDENTIALS);
        }

        if (user.twoFactorEnabled) {
          if (!credentials.otp) {
            throw new Error("2FA_REQUIRED");
          }
          const secret = decryptSecret(user.twoFactorSecret!);
          const otpValid = verifyTotp(credentials.otp, secret);
          if (!otpValid) {
            throw new Error("INVALID_2FA");
          }
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: null },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          sessionVersion: user.sessionVersion,
          twoFactorEnabled: user.twoFactorEnabled,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = normalizeEmail(user.email ?? "");
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing?.isDisabled) return false;
        if (existing && !existing.emailVerified) {
          await prisma.user.update({ where: { id: existing.id }, data: { emailVerified: new Date() } });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.sv = user.sessionVersion;
      }
      if (!token.uid) return token;

      // Re-check security-sensitive fields against the DB on every request
      // so role changes, account disable, and "log out of all devices"
      // (sessionVersion bump) take effect immediately instead of waiting
      // for the JWT to expire.
      const dbUser = await prisma.user.findUnique({ where: { id: token.uid as string } });
      if (!dbUser || dbUser.isDisabled || dbUser.sessionVersion !== token.sv) {
        return { ...token, invalid: true };
      }
      token.role = dbUser.role;
      token.twoFactorEnabled = dbUser.twoFactorEnabled;
      token.name = dbUser.name;
      token.email = dbUser.email;
      return token;
    },
    async session({ session, token }) {
      if (token.invalid) {
        return { ...session, user: undefined as never, error: "SessionInvalidated" };
      }
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role!;
        session.user.twoFactorEnabled = !!token.twoFactorEnabled;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // OAuth sign-ups are pre-verified by the provider.
      if (user.id) {
        await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
      }
    },
  },
};

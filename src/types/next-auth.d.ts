import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      twoFactorEnabled: boolean;
    } & DefaultSession["user"];
    error?: "SessionInvalidated";
  }

  interface User {
    role: Role;
    sessionVersion: number;
    twoFactorEnabled: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: Role;
    sv?: number;
    twoFactorEnabled?: boolean;
    invalid?: boolean;
  }
}

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(16),
  NEXTAUTH_URL: z.string().url(),
  APP_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().optional().default("CineTown <no-reply@cinetown.mm>"),
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_PUBLISHABLE_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  KBZPAY_MERCHANT_ID: z.string().optional().default(""),
  KBZPAY_APP_ID: z.string().optional().default(""),
  KBZPAY_MERCHANT_KEY: z.string().optional().default(""),
  KBZPAY_ENV: z.enum(["sandbox", "live"]).optional().default("sandbox"),
  KBZPAY_BASE_URL: z.string().optional().default("https://uat.kbzpay.com"),
  KBZPAY_WEBHOOK_SECRET: z.string().optional().default(""),
});

export const env = envSchema.parse(process.env);

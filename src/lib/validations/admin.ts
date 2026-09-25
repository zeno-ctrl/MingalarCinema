import { z } from "zod";

export const movieSchema = z.object({
  title: z.string().trim().min(1).max(200),
  synopsis: z.string().trim().min(1).max(4000),
  cast: z.array(z.string().trim().min(1)).default([]),
  director: z.string().trim().min(1).max(200),
  genre: z.array(z.string().trim().min(1)).default([]),
  rating: z.enum(["G", "PG", "PG13", "R"]),
  runtimeMin: z.coerce.number().int().min(1).max(600),
  language: z.string().trim().min(1).max(100),
  subtitles: z.string().trim().max(100).optional().or(z.literal("")),
  formats: z.array(z.enum(["D2", "D3", "PREMIUM"])).min(1),
  posterUrl: z.string().trim().min(1),
  bannerUrl: z.string().trim().optional().or(z.literal("")),
  trailerUrl: z.string().trim().optional().or(z.literal("")),
  releaseDate: z.coerce.date(),
  status: z.enum(["COMING_SOON", "NOW_SHOWING", "ENDED"]),
  featured: z.boolean().default(false),
  allBranches: z.boolean().default(true),
  branchIds: z.array(z.string()).default([]),
});
export type MovieInput = z.infer<typeof movieSchema>;

export const branchSchema = z.object({
  nameEn: z.string().trim().min(1).max(200),
  nameMm: z.string().trim().min(1).max(200),
  addressEn: z.string().trim().min(1).max(500),
  addressMm: z.string().trim().min(1).max(500),
  phone: z.string().trim().min(1).max(30),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  openingHours: z.string().trim().min(1).max(200),
  facilities: z.array(z.string().trim().min(1)).default([]),
  photos: z.array(z.string().trim().min(1)).default([]),
  isActive: z.boolean().default(true),
});
export type BranchInput = z.infer<typeof branchSchema>;

export const hallSchema = z.object({
  branchId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  rows: z.coerce.number().int().min(1).max(26),
  columns: z.coerce.number().int().min(1).max(40),
});
export type HallInput = z.infer<typeof hallSchema>;

export const seatConfigSchema = z.object({
  seats: z.array(
    z.object({
      row: z.string().min(1),
      column: z.coerce.number().int().min(1),
      type: z.enum(["STANDARD", "VIP", "COUPLE"]),
      isDisabled: z.boolean(),
      isAisleAfter: z.boolean(),
    }),
  ),
});

export const showtimeSchema = z.object({
  movieId: z.string().min(1),
  branchId: z.string().min(1),
  hallId: z.string().min(1),
  startsAt: z.coerce.date(),
  format: z.enum(["D2", "D3", "PREMIUM"]),
  priceStandard: z.coerce.number().int().min(0),
  priceVip: z.coerce.number().int().min(0),
  priceCouple: z.coerce.number().int().min(0),
});
export type ShowtimeInput = z.infer<typeof showtimeSchema>;

export const bulkShowtimeSchema = z.object({
  movieId: z.string().min(1),
  branchId: z.string().min(1),
  hallId: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1),
  format: z.enum(["D2", "D3", "PREMIUM"]),
  priceStandard: z.coerce.number().int().min(0),
  priceVip: z.coerce.number().int().min(0),
  priceCouple: z.coerce.number().int().min(0),
  cleaningBufferMin: z.coerce.number().int().min(0).max(120).default(20),
});

export const promotionSchema = z.object({
  titleEn: z.string().trim().min(1).max(200),
  titleMm: z.string().trim().min(1).max(200),
  bodyEn: z.string().trim().min(1).max(4000),
  bodyMm: z.string().trim().min(1).max(4000),
  imageUrl: z.string().trim().optional().or(z.literal("")),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  published: z.boolean().default(false),
});

export const promoCodeSchema = z.object({
  code: z.string().trim().min(3).max(30),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  amount: z.coerce.number().int().min(1),
  minSpend: z.coerce.number().int().min(0).default(0),
  usageLimit: z.coerce.number().int().min(1).optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const siteSettingsSchema = z.object({
  name: z.string().trim().min(1).max(100),
  logoText: z.string().trim().min(1).max(100),
  colors: z.object({
    orange: z.string().trim().min(1),
    red: z.string().trim().min(1),
    crimson: z.string().trim().min(1),
  }),
  hotline: z.string().trim().max(50).optional().or(z.literal("")),
  social: z.object({
    facebook: z.string().trim().optional().or(z.literal("")),
    viber: z.string().trim().optional().or(z.literal("")),
    telegram: z.string().trim().optional().or(z.literal("")),
  }),
  defaultLanguage: z.enum(["en", "mm"]),
});

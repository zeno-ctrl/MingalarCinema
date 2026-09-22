import { prisma } from "@/lib/db";

export type BrandSettings = {
  name: string;
  logoText: string;
  colors: { orange: string; red: string; crimson: string };
  hotline: string;
  social: { facebook?: string; viber?: string; telegram?: string };
  defaultLanguage: "en" | "mm";
};

const DEFAULT_BRAND: BrandSettings = {
  name: "CineTown",
  logoText: "CineTown",
  colors: { orange: "#F0522A", red: "#D7372B", crimson: "#BE1E2D" },
  hotline: "",
  social: {},
  defaultLanguage: "en",
};

export async function getBrandSettings(): Promise<BrandSettings> {
  const row = await prisma.setting.findUnique({ where: { key: "brand" } });
  if (!row) return DEFAULT_BRAND;
  return { ...DEFAULT_BRAND, ...(row.value as Partial<BrandSettings>) };
}

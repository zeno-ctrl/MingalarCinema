import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth-helpers";
import { validatePromoCode } from "@/lib/promo";

const schema = z.object({ code: z.string().trim().min(1).max(50), subtotal: z.number().int().nonnegative() });

export async function POST(req: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ valid: false, error: "Invalid request" }, { status: 400 });
  }

  const result = await validatePromoCode(parsed.data.code, parsed.data.subtotal, user.id);
  return NextResponse.json(result);
}

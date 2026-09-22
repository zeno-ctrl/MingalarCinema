import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth-helpers";
import { uploadImage } from "@/lib/upload";

export async function POST(req: Request) {
  const { response } = await requireApiRole("ADMIN");
  if (response) return response;

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const result = await uploadImage(file);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ url: result.url });
}

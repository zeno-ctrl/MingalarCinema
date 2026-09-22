import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-helpers";
import { generateTotpSecret, getOtpAuthUrl, getQrDataUrl } from "@/lib/twofactor";

export async function POST() {
  const { user, response } = await requireApiUser();
  if (response) return response;

  const secret = generateTotpSecret();
  const otpAuthUrl = getOtpAuthUrl(user.email!, secret);
  const qrDataUrl = await getQrDataUrl(otpAuthUrl);

  // The secret is not persisted until /2fa/enable verifies the user can
  // actually produce a valid code with it (proves the authenticator app
  // was set up correctly before we lock the account behind it).
  return NextResponse.json({ secret, qrDataUrl });
}

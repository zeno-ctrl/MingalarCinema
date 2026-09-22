import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || "CineTown <no-reply@cinetown.mm>";

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    // Dev fallback: log instead of sending so the flow is testable without
    // an API key. Never do this in production (guarded by RESEND_API_KEY presence).
    console.log(`\n[email:dev] to=${to} subject="${subject}"\n${html}\n`);
    return;
  }
  await resend.emails.send({ from: FROM, to, subject, html });
}

function layout(title: string, bodyHtml: string) {
  return `<!DOCTYPE html>
  <html><body style="font-family:sans-serif;background:#F7F7F8;padding:24px;">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(160deg,#F0522A 0%,#BE1E2D 100%);padding:24px;color:#fff;">
        <h1 style="margin:0;font-size:20px;">CineTown</h1>
      </div>
      <div style="padding:24px;color:#1A1A1A;">
        <h2 style="margin-top:0;">${title}</h2>
        ${bodyHtml}
      </div>
    </div>
  </body></html>`;
}

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  await send(
    to,
    "Verify your CineTown email",
    layout(
      "Confirm your email",
      `<p>Thanks for signing up! Please confirm your email address to start booking.</p>
       <p><a href="${verifyUrl}" style="background:#D7372B;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;display:inline-block;">Verify Email</a></p>
       <p style="color:#6B6B70;font-size:13px;">This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>`,
    ),
  );
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await send(
    to,
    "Reset your CineTown password",
    layout(
      "Reset your password",
      `<p>We received a request to reset your password.</p>
       <p><a href="${resetUrl}" style="background:#D7372B;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;display:inline-block;">Reset Password</a></p>
       <p style="color:#6B6B70;font-size:13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`,
    ),
  );
}

export async function sendAdminInviteEmail(to: string, inviteUrl: string, role: string) {
  await send(
    to,
    "You've been invited to CineTown Admin",
    layout(
      "Admin invitation",
      `<p>You've been invited to join the CineTown admin dashboard as <b>${role}</b>.</p>
       <p><a href="${inviteUrl}" style="background:#D7372B;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;display:inline-block;">Accept Invite</a></p>
       <p style="color:#6B6B70;font-size:13px;">This link expires in 48 hours.</p>`,
    ),
  );
}

export async function sendBookingConfirmationEmail(
  to: string,
  data: {
    reference: string;
    movieTitle: string;
    branchName: string;
    hallName: string;
    seats: string[];
    startsAt: string;
    total: string;
    qrDataUrl: string;
  },
) {
  await send(
    to,
    `Your CineTown ticket - ${data.reference}`,
    layout(
      "Booking confirmed",
      `<p><b>${data.movieTitle}</b></p>
       <p>${data.branchName} • ${data.hallName}<br/>${data.startsAt}</p>
       <p>Seats: ${data.seats.join(", ")}</p>
       <p>Total paid: ${data.total}</p>
       <p>Booking reference: <b>${data.reference}</b></p>
       <p><img src="${data.qrDataUrl}" alt="QR code" width="160" height="160" /></p>
       <p style="color:#6B6B70;font-size:13px;">Show this QR code at the cinema entrance.</p>`,
    ),
  );
}

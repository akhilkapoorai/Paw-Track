import { db, alertSubscriptionsTable, type Pet } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildAlertEmail(pet: Pet, petUrl: string, unsubscribeUrl: string): string {
  const statusColor = pet.status === "LOST" ? "#EF4444" : pet.status === "FOUND" ? "#10B981" : "#8B5CF6";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Inter,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">
        <tr>
          <td style="background:#0F172A;padding:20px 32px;text-align:center;">
            <span style="color:#F59E0B;font-size:24px;font-weight:800;">🐾 PawTrack</span>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;">
            <p style="margin:0 0 8px;font-size:14px;color:#94A3B8;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">New Alert Near You</p>
            <h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#0F172A;">${pet.name} is ${pet.status.toLowerCase()}!</h1>
            ${pet.photoUrl ? `<img src="${pet.photoUrl}" alt="${pet.name}" style="width:100%;max-height:280px;object-fit:cover;border-radius:12px;margin-bottom:16px;">` : ""}
            <table cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
              <tr>
                <td style="padding:4px 12px;background:${statusColor}18;color:${statusColor};border-radius:999px;font-size:12px;font-weight:700;text-transform:uppercase;border:1px solid ${statusColor}40;">
                  ${pet.status}
                </td>
              </tr>
            </table>
            <p style="margin:0 0 6px;font-size:14px;color:#475569;"><strong>Species:</strong> ${pet.species}</p>
            ${pet.breed ? `<p style="margin:0 0 6px;font-size:14px;color:#475569;"><strong>Breed:</strong> ${pet.breed}</p>` : ""}
            <p style="margin:0 0 16px;font-size:14px;color:#475569;"><strong>Last seen:</strong> ${pet.lastSeenAddress}</p>
            <a href="${petUrl}" style="display:inline-block;background:#F59E0B;color:#0F172A;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;">View Pet Profile →</a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #E2E8F0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94A3B8;">
              You're receiving this because you subscribed to PawTrack alerts.<br>
              <a href="${unsubscribeUrl}" style="color:#4F46E5;text-decoration:none;">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildVerificationEmail(verifyUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Inter,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">
        <tr>
          <td style="background:#0F172A;padding:20px 32px;text-align:center;">
            <span style="color:#F59E0B;font-size:24px;font-weight:800;">🐾 PawTrack</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;text-align:center;">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#0F172A;">Confirm Your Alerts</h1>
            <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
              Click below to activate your PawTrack alert subscription. You'll be notified when pets go missing near you.
            </p>
            <a href="${verifyUrl}" style="display:inline-block;background:#4F46E5;color:white;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:14px;">Confirm Alerts →</a>
            <p style="margin:24px 0 0;font-size:12px;color:#94A3B8;">If you didn't request this, you can safely ignore this email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

  if (!apiKey) {
    logger.warn("RESEND_API_KEY not set — skipping email send");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: `PawTrack <${fromEmail}>`, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}

async function sendSms(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromPhone) return;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const encoded = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const params = new URLSearchParams({ To: to, From: fromPhone, Body: body });
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${encoded}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const b = await res.text();
    throw new Error(`Twilio error ${res.status}: ${b}`);
  }
}

export async function sendVerificationEmail(email: string, verificationToken: string): Promise<void> {
  const domains = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost:80";
  const proto = domains.includes("localhost") ? "http" : "https";
  const verifyUrl = `${proto}://${domains}/api/alerts/verify?token=${verificationToken}`;
  const html = buildVerificationEmail(verifyUrl);
  await sendEmail(email, "Confirm your PawTrack alerts", html);
}

export async function sendNewPetAlerts(pet: Pet): Promise<void> {
  try {
    const allSubs = await db
      .select()
      .from(alertSubscriptionsTable)
      .where(eq(alertSubscriptionsTable.isEmailVerified, true));

    const domains = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost:80";
    const proto = domains.includes("localhost") ? "http" : "https";
    const baseUrl = `${proto}://${domains}`;

    const matching = allSubs.filter((sub) => {
      if (sub.species !== "all" && sub.species !== pet.species) return false;
      const dist = haversineDistance(sub.lat, sub.lng, pet.lastSeenLat, pet.lastSeenLng);
      return dist <= sub.radiusMiles;
    });

    const chunks: typeof matching[] = [];
    for (let i = 0; i < matching.length; i += 20) {
      chunks.push(matching.slice(i, i + 20));
    }

    for (const chunk of chunks) {
      await Promise.allSettled(
        chunk.map(async (sub) => {
          try {
            const petUrl = `${baseUrl}/pet/${pet.id}`;
            const unsubUrl = `${baseUrl}/api/alerts/unsubscribe?token=${sub.unsubscribeToken}`;
            const html = buildAlertEmail(pet, petUrl, unsubUrl);
            await sendEmail(sub.email, `🚨 ${pet.name} is ${pet.status.toLowerCase()} near ${sub.locationName}`, html);

            if (sub.phone) {
              await sendSms(
                sub.phone,
                `PawTrack Alert: ${pet.name} (${pet.species}) is ${pet.status.toLowerCase()} near ${sub.locationName}. Last seen: ${pet.lastSeenAddress}. View: ${petUrl}`,
              ).catch((err) => logger.warn({ err }, "SMS send failed"));
            }

            await db
              .update(alertSubscriptionsTable)
              .set({ lastAlertSentAt: new Date() })
              .where(eq(alertSubscriptionsTable.id, sub.id));
          } catch (err) {
            logger.error({ err, subId: sub.id }, "Failed to send alert to subscriber");
          }
        }),
      );
    }

    logger.info({ petId: pet.id, sent: matching.length }, "Pet alerts dispatched");
  } catch (err) {
    logger.error({ err }, "sendNewPetAlerts failed");
    throw err;
  }
}

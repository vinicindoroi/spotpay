import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  protocol: z
    .string()
    .trim()
    .regex(/^REF-\d{6}$/),
});

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildEmailHtml(name: string, protocol: string) {
  const safeName = escapeHtml(name);
  const safeProtocol = escapeHtml(protocol);
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 12px;">
    <div style="background-color:#121212;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a;">
      <div style="background-color:#000000;padding:26px 28px;text-align:center;border-bottom:1px solid #2a2a2a;">
        <p style="margin:0;color:#1db954;font-size:26px;font-weight:800;letter-spacing:1px;">Spotify<span style="color:#ffffff;"> Rewards</span></p>
        <p style="margin:10px 0 0;color:#1db954;font-size:11px;font-weight:bold;letter-spacing:3px;">REFUND SUPPORT</p>
        <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:800;">We received your refund request</h1>
      </div>
      <div style="padding:26px 28px;">
        <p style="margin:0;color:#ffffff;font-size:14px;line-height:1.6;">Hi ${safeName},</p>
        <p style="margin:12px 0 0;color:#d4d4d8;font-size:14px;line-height:1.6;">This email confirms that we received your refund request. Keep the reference number below for your records.</p>

        <div style="margin:20px 0;background-color:#0d2818;border:1px solid #1db954;border-radius:12px;padding:18px;text-align:center;">
          <p style="margin:0;color:#1db954;font-size:10px;font-weight:bold;letter-spacing:3px;">PROTOCOL</p>
          <p style="margin:6px 0 0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:2px;">${safeProtocol}</p>
        </div>

        <p style="margin:0;color:#a1a1aa;font-size:13px;line-height:1.6;">The amount will be returned to the same payment method used for the purchase. No extra action is needed from you.</p>

        <p style="margin:22px 0 8px;color:#ffffff;font-size:13px;font-weight:800;">What happens next</p>
        <p style="margin:0 0 10px;color:#a1a1aa;font-size:13px;line-height:1.5;"><strong style="color:#ffffff;">Next 48 hours</strong> — confirmation email with your protocol and processing details</p>
        <p style="margin:0 0 10px;color:#a1a1aa;font-size:13px;line-height:1.5;"><strong style="color:#ffffff;">Up to 7 business days</strong> — our finance team completes the refund</p>
        <p style="margin:0;color:#a1a1aa;font-size:13px;line-height:1.5;"><strong style="color:#ffffff;">Next card statement</strong> — the amount shows as a credit or a deduction</p>

        <p style="margin:0;color:#71717a;font-size:12px;line-height:1.6;">The exact date can vary depending on your bank or card operator.</p>
      </div>
      <div style="padding:16px 28px 24px;text-align:center;border-top:1px solid #2a2a2a;">
        <p style="margin:0;color:#71717a;font-size:12px;">Need help? <a href="mailto:refound.spotpay@officialprogram.online" style="color:#1db954;text-decoration:underline;">refound.spotpay@officialprogram.online</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buildEmailText(name: string, protocol: string) {
  return `Hi ${name},

We received your refund request.

Reference number: ${protocol}

The amount will be returned to the same payment method used for the purchase. The exact date can vary depending on your bank or card operator.

Need help? refound.spotpay@officialprogram.online

Spotify Rewards Refund Support`;
}

export const sendRefundEmail = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["RESEND_API_KEY"];
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Spotify Rewards Support <refound.spotpay@officialprogram.online>",
        to: [data.email],
        reply_to: "refound.spotpay@officialprogram.online",
        subject: `Refund request received — ${data.protocol}`,
        html: buildEmailHtml(data.name, data.protocol),
        text: buildEmailText(data.name, data.protocol),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Resend request failed [${response.status}]: ${errorBody}`);
      throw new Error(`Resend request failed [${response.status}]: ${errorBody}`);
    }

    return { sent: true };
  });

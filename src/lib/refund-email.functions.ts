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
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 12px;">
    <div style="background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
      <div style="background-color:#1db954;padding:22px 28px;">
        <p style="margin:0;color:#0b3d20;font-size:11px;font-weight:bold;letter-spacing:2px;">SPOTIFY REWARDS &middot; REFUND</p>
        <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:800;">Your refund is being processed</h1>
      </div>
      <div style="padding:26px 28px;">
        <p style="margin:0;color:#18181b;font-size:14px;line-height:1.6;">Hi ${safeName},</p>
        <p style="margin:12px 0 0;color:#18181b;font-size:14px;line-height:1.6;">We received your request and <strong>your refund is already being processed</strong>.</p>

        <div style="margin:20px 0;background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:18px;text-align:center;">
          <p style="margin:0;color:#16a34a;font-size:10px;font-weight:bold;letter-spacing:3px;">PROTOCOL</p>
          <p style="margin:6px 0 0;color:#18181b;font-size:24px;font-weight:800;letter-spacing:2px;">${safeProtocol}</p>
        </div>

        <p style="margin:0;color:#3f3f46;font-size:13px;line-height:1.6;">The amount will be returned to the same payment method used for the purchase. No extra action is needed from you.</p>

        <p style="margin:22px 0 8px;color:#18181b;font-size:13px;font-weight:800;">What happens next</p>
        <p style="margin:0 0 10px;color:#3f3f46;font-size:13px;line-height:1.5;"><strong style="color:#18181b;">Next 48 hours</strong> — confirmation email with your protocol and processing details</p>
        <p style="margin:0 0 10px;color:#3f3f46;font-size:13px;line-height:1.5;"><strong style="color:#18181b;">Up to 7 business days</strong> — our finance team completes the refund</p>
        <p style="margin:0;color:#3f3f46;font-size:13px;line-height:1.5;"><strong style="color:#18181b;">Next card statement</strong> — the amount shows as a credit or a deduction</p>

        <div style="margin:22px 0;background-color:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px 16px;">
          <p style="margin:0;color:#92400e;font-size:12px;line-height:1.6;">A refund does <strong>not</strong> speed up your rewards. It only <strong>cancels your access completely</strong> — the withdrawal and the balance stop.</p>
        </div>

        <p style="margin:0;color:#71717a;font-size:12px;line-height:1.6;">The exact date can vary depending on your bank or card operator.</p>
      </div>
      <div style="padding:16px 28px 24px;text-align:center;">
        <p style="margin:0;color:#71717a;font-size:12px;">Need help? <a href="mailto:support@spotpay.vita-protocol.online" style="color:#1db954;text-decoration:underline;">support@spotpay.vita-protocol.online</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
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
        from: "Spotify Rewards <refound@spotpay.officialprogram.online>",
        to: [data.email],
        subject: `Your refund is being processed — ${data.protocol}`,
        html: buildEmailHtml(data.name, data.protocol),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Resend request failed [${response.status}]: ${errorBody}`);
      throw new Error(`Resend request failed [${response.status}]: ${errorBody}`);
    }

    return { sent: true };
  });

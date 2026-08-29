import { env } from "./env";
import { log } from "./logger";

type Mail = { to: string; subject: string; html: string; text?: string };

/**
 * Sends transactional email via SMTP when configured. Without SMTP credentials
 * (dev), it logs the message (including any link) instead of silently failing —
 * so email verification / password reset remain testable locally.
 */
export async function sendMail(mail: Mail): Promise<{ sent: boolean; transport: "smtp" | "log" }> {
  if (!env.smtpHost || !env.smtpUser) {
    log.info("mail.logged", { to: mail.to, subject: mail.subject, preview: stripHtml(mail.html).slice(0, 500) });
    return { sent: false, transport: "log" };
  }
  try {
    // Imported lazily so the app boots without nodemailer present in edge contexts.
    const nodemailer = (await import("nodemailer")).default;
    const transport = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: { user: env.smtpUser, pass: env.smtpPass },
    });
    await transport.sendMail({
      from: env.smtpFrom,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text ?? stripHtml(mail.html),
    });
    log.info("mail.sent", { to: mail.to, subject: mail.subject });
    return { sent: true, transport: "smtp" };
  } catch (err) {
    log.error("mail.failed", { to: mail.to, error: err instanceof Error ? err.message : "unknown" });
    return { sent: false, transport: "log" };
  }
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function shell(title: string, body: string) {
  return `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0b1220">
    <div style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#0891b2;margin-bottom:8px">Velrix</div>
    <h1 style="font-size:18px;margin:0 0 12px">${title}</h1>
    ${body}
    <p style="color:#64748b;font-size:12px;margin-top:24px">If you didn't request this, you can safely ignore this email.</p>
  </div>`;
}

export function verificationEmail(link: string): { subject: string; html: string } {
  return {
    subject: "Verify your Velrix email",
    html: shell(
      "Confirm your email",
      `<p>Welcome to Velrix. Confirm your email to activate your workspace.</p>
       <p><a href="${link}" style="display:inline-block;background:#0891b2;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Verify email</a></p>
       <p style="color:#64748b;font-size:13px">Or paste this link: ${link}</p>`,
    ),
  };
}

export function resetEmail(link: string): { subject: string; html: string } {
  return {
    subject: "Reset your Velrix password",
    html: shell(
      "Reset your password",
      `<p>We received a request to reset your password. This link expires in 1 hour.</p>
       <p><a href="${link}" style="display:inline-block;background:#0891b2;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Reset password</a></p>
       <p style="color:#64748b;font-size:13px">Or paste this link: ${link}</p>`,
    ),
  };
}

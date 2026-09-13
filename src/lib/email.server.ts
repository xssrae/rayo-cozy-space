import "@tanstack/react-start/server-only";
import { Resend } from "resend";

export async function sendAuthEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    if (process.env["NODE_ENV"] !== "production") console.info(`[email preview] ${subject}: ${html}`);
    return;
  }
  const resend = new Resend(apiKey);
  await resend.emails.send({ from: process.env["EMAIL_FROM"] ?? "Rayo Plan <onboarding@resend.dev>", to, subject, html });
}

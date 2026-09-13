import "@tanstack/react-start/server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getDb } from "@/db/index";
import * as schema from "@/db/schema";
import { sendAuthEmail } from "./email.server";

function createAuth() {
  const secret = process.env["BETTER_AUTH_SECRET"];
  if (!secret && process.env["NODE_ENV"] === "production") throw new Error("BETTER_AUTH_SECRET is not configured");
  return betterAuth({
    appName: "Rayo Plan",
    baseURL: process.env["BETTER_AUTH_URL"] ?? "http://localhost:3000",
    secret: secret ?? "development-only-rayo-secret-change-me",
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => sendAuthEmail({ to: user.email, subject: "Reset your Rayo password", html: `<p>Use this link to choose a new password:</p><p><a href="${url}">Reset password</a></p>` }),
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => sendAuthEmail({ to: user.email, subject: "Verify your Rayo email", html: `<p>Welcome to Rayo.</p><p><a href="${url}">Verify email</a></p>` }),
    },
    advanced: { useSecureCookies: process.env["NODE_ENV"] === "production", defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: process.env["NODE_ENV"] === "production" } },
    rateLimit: { enabled: true, window: 60, max: 100 },
    plugins: [tanstackStartCookies()],
  });
}

let authInstance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  if (authInstance) return authInstance;
  authInstance = createAuth();
  return authInstance;
}

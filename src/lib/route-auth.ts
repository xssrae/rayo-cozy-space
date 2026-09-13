import { redirect } from "@tanstack/react-router";
import { getSessionFn } from "@/server/session.functions";

export async function requireSignedIn(locationHref: string) {
  const session = await getSessionFn();
  if (!session) throw redirect({ to: "/login", search: { redirect: locationHref } });
  return { user: session.user };
}

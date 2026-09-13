import { eq } from "drizzle-orm";
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { getDb } from "@/db/index";
import { userPreferences, workspaces } from "@/db/schema";

export const requireWorkspace = createServerOnlyFn(async () => {
  const { getAuth } = await import("@/lib/auth.server");
  const authSession = await getAuth().api.getSession({ headers: getRequestHeaders() });
  if (!authSession) throw new Error("UNAUTHORIZED");
  const db = getDb();
  await db.insert(workspaces).values({ ownerUserId: authSession.user.id, name: `${authSession.user.name}'s workspace` }).onConflictDoNothing();
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.ownerUserId, authSession.user.id)).limit(1);
  if (!workspace) throw new Error("WORKSPACE_NOT_FOUND");
  await db.insert(userPreferences).values({ workspaceId: workspace.id }).onConflictDoNothing();
  return { session: authSession, workspace };
});

export const getSessionFn = createServerFn({ method: "GET" }).handler(async () =>
  (await import("@/lib/auth.server")).getAuth().api.getSession({ headers: getRequestHeaders() }),
);

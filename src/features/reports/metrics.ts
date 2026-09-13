import type { FocusSession } from "@/features/workspace/types";

export function localDateKey(value: Date | string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function calculateMomentum(sessions: Pick<FocusSession, "status" | "endedAt">[], timeZone: string, today = new Date()) {
  const days = new Set(sessions.filter((session) => session.status === "completed" && session.endedAt).map((session) => localDateKey(session.endedAt!, timeZone)));
  let activeDays = 0;
  for (let offset = 0; offset < 28; offset += 1) {
    const date = new Date(today); date.setUTCDate(date.getUTCDate() - offset);
    if (days.has(localDateKey(date, timeZone))) activeDays += 1;
  }
  return { activeDays, momentum: Math.round((activeDays / 28) * 100) };
}

export function remainingFocusSeconds(session: Pick<FocusSession, "status" | "plannedSeconds" | "startedAt" | "pausedAt" | "accumulatedPausedSeconds">, now = Date.now()) {
  const effectiveNow = session.status === "paused" && session.pausedAt ? new Date(session.pausedAt).getTime() : now;
  const elapsed = Math.max(0, Math.floor((effectiveNow - new Date(session.startedAt).getTime()) / 1000) - session.accumulatedPausedSeconds);
  return Math.max(0, session.plannedSeconds - elapsed);
}

import { describe, expect, it } from "vitest";
import { calculateMomentum, localDateKey, remainingFocusSeconds } from "./metrics";

describe("focus metrics", () => {
  it("calculates a calm 28-day momentum score from distinct completed days", () => {
    const sessions = [
      { status: "completed" as const, endedAt: "2026-09-13T12:00:00.000Z" },
      { status: "completed" as const, endedAt: "2026-09-13T15:00:00.000Z" },
      { status: "completed" as const, endedAt: "2026-09-12T12:00:00.000Z" },
      { status: "cancelled" as const, endedAt: "2026-09-11T12:00:00.000Z" },
    ];
    expect(calculateMomentum(sessions, "America/Bahia", new Date("2026-09-13T15:00:00.000Z"))).toEqual({ activeDays: 2, momentum: 7 });
  });

  it("uses the selected timezone for day boundaries", () => {
    expect(localDateKey("2026-09-13T01:00:00.000Z", "America/Bahia")).toBe("2026-09-12");
  });

  it("derives remaining time from timestamps and persisted pauses", () => {
    const session = { status: "active" as const, plannedSeconds: 1500, startedAt: "2026-09-13T12:00:00.000Z", pausedAt: null, accumulatedPausedSeconds: 120 };
    expect(remainingFocusSeconds(session, new Date("2026-09-13T12:10:00.000Z").getTime())).toBe(1020);
  });

  it("freezes elapsed time while paused", () => {
    const session = { status: "paused" as const, plannedSeconds: 1500, startedAt: "2026-09-13T12:00:00.000Z", pausedAt: "2026-09-13T12:05:00.000Z", accumulatedPausedSeconds: 0 };
    expect(remainingFocusSeconds(session, new Date("2026-09-13T13:00:00.000Z").getTime())).toBe(1200);
  });
});

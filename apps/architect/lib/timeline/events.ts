import { createId, nowIso } from "@/lib/utils";
import type { Interview, TimelineCategory, TimelineEvent } from "@/types";

/**
 * Every meaningful discovery becomes a timeline event.
 */
export function buildTimelineEventsFromInterview(
  workspaceId: string,
  meetingId: string,
  interview: Interview,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const stamp = nowIso();

  for (const pain of interview.memory.whiteboard.painPoints.slice(0, 4)) {
    events.push(
      event(workspaceId, meetingId, stamp, "discovery", `${pain}`, `Pain confirmed: ${pain}.`),
    );
  }

  for (const moduleName of interview.memory.whiteboard.potentialModules.slice(0, 4)) {
    events.push(
      event(
        workspaceId,
        meetingId,
        stamp,
        "module",
        `${moduleName} module suggested`,
        `${moduleName} entered the recommended architecture.`,
      ),
    );
  }

  for (const opportunity of interview.opportunities.slice(0, 3)) {
    events.push(
      event(
        workspaceId,
        meetingId,
        stamp,
        "recommendation",
        opportunity.title,
        opportunity.description,
      ),
    );
  }

  for (const observation of interview.observations.slice(0, 3)) {
    if (observation.severity === "critical" || observation.severity === "notable") {
      events.push(
        event(
          workspaceId,
          meetingId,
          stamp,
          observation.severity === "critical" ? "risk" : "discovery",
          observation.title,
          observation.body,
        ),
      );
    }
  }

  return events;
}

function event(
  workspaceId: string,
  meetingId: string,
  date: string,
  category: TimelineCategory,
  title: string,
  description: string,
): TimelineEvent {
  return {
    id: createId("timeline"),
    workspaceId,
    date,
    title,
    description,
    category,
    meetingId,
  };
}

export function sortTimelineNewestFirst(
  events: TimelineEvent[],
): TimelineEvent[] {
  return [...events].sort((a, b) => b.date.localeCompare(a.date));
}

export function formatTimelineDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

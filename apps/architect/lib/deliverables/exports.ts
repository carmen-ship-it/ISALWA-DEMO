import type { DeliverableExportContract } from "@/types";

/**
 * Future export targets — contracts only.
 * No PDF / DOCX / PPT / Notion / Jira implementation in Mission 9.
 */
export const DELIVERABLE_EXPORT_CONTRACTS: readonly DeliverableExportContract[] =
  [
    {
      id: "pdf",
      title: "PDF",
      description: "Executive PDF package for client handoff.",
      status: "planned",
    },
    {
      id: "word",
      title: "Word",
      description: "Editable DOCX for proposal and SOW narratives.",
      status: "planned",
    },
    {
      id: "markdown",
      title: "Markdown",
      description: "Repo-friendly Markdown for Cursor and GitHub.",
      status: "designed",
    },
    {
      id: "powerpoint",
      title: "PowerPoint",
      description: "Keynote-quality executive slides.",
      status: "planned",
    },
    {
      id: "notion",
      title: "Notion",
      description: "Publish deliverables into a Notion workspace.",
      status: "planned",
    },
    {
      id: "confluence",
      title: "Confluence",
      description: "Enterprise wiki publication.",
      status: "planned",
    },
    {
      id: "cursor",
      title: "Cursor",
      description: "Inject Cursor Context as master agent context.",
      status: "designed",
    },
    {
      id: "github",
      title: "GitHub",
      description: "Open issues / PR templates from backlog.",
      status: "planned",
    },
    {
      id: "linear",
      title: "Linear",
      description: "Sync epics and stories into Linear.",
      status: "planned",
    },
    {
      id: "jira",
      title: "Jira",
      description: "Sync epics and stories into Jira.",
      status: "planned",
    },
  ] as const;

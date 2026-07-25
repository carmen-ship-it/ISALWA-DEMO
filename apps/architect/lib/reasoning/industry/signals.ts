import type {
  DetectedSignal,
  PainCategory,
} from "@/types";

interface SignalRule {
  id: string;
  label: string;
  category: PainCategory | "tool" | "process";
  patterns: RegExp[];
}

const SIGNAL_RULES: SignalRule[] = [
  {
    id: "excel",
    label: "Spreadsheet dependency",
    category: "spreadsheet",
    patterns: [/\bexcel\b/i, /\bspreadsheet/i, /\bgoogle sheets?\b/i],
  },
  {
    id: "whatsapp",
    label: "Messaging as workflow",
    category: "messaging",
    patterns: [/\bwhatsapp\b/i, /\btelegram\b/i, /\btext message/i, /\bsms\b/i],
  },
  {
    id: "paper",
    label: "Paper-based process",
    category: "paper",
    patterns: [/\bpaper\b/i, /\bprint(ed|out)?\b/i, /\bhandwritten\b/i],
  },
  {
    id: "duplicate",
    label: "Duplicate data entry",
    category: "duplicate_work",
    patterns: [
      /\btwice\b/i,
      /\bre-?enter/i,
      /\bduplicate/i,
      /\bsame information\b/i,
    ],
  },
  {
    id: "manual",
    label: "Manual work",
    category: "manual_work",
    patterns: [/\bmanual(ly)?\b/i, /\bby hand\b/i],
  },
  {
    id: "approvals",
    label: "Approval bottleneck",
    category: "approvals",
    patterns: [/\bapprov/i, /\bone person\b/i, /\bwaiting on\b/i],
  },
  {
    id: "visibility",
    label: "Missing visibility",
    category: "visibility",
    patterns: [
      /\bdon'?t know\b/i,
      /\bno (one )?can see\b/i,
      /\bvisibility\b/i,
      /\blost\b/i,
      /\bno (central|shared) (history|record)/i,
    ],
  },
  {
    id: "reports",
    label: "Manual reporting",
    category: "reporting",
    patterns: [/\breport/i, /\bend of (the )?month\b/i],
  },
  {
    id: "phone",
    label: "Phone-driven coordination",
    category: "phone",
    patterns: [/\bphone\b/i, /\bcall(s|ing)?\b/i],
  },
  {
    id: "repeated",
    label: "Repeated work",
    category: "repeated_work",
    patterns: [/\brepeat/i, /\brework\b/i, /\bstart over\b/i],
  },
  {
    id: "email",
    label: "Email as system of record",
    category: "tool",
    patterns: [/\bemail\b/i, /\binbox\b/i, /\boutlook\b/i],
  },
];

export function detectSignals(text: string): DetectedSignal[] {
  const signals: DetectedSignal[] = [];

  for (const rule of SIGNAL_RULES) {
    const match = rule.patterns.find((pattern) => pattern.test(text));
    if (!match) continue;
    const evidence = text.match(match)?.[0] ?? rule.label;
    signals.push({
      id: rule.id,
      label: rule.label,
      category: rule.category,
      evidence,
      confidence: 0.78,
    });
  }

  return signals;
}

export function mergeSignals(
  existing: DetectedSignal[],
  incoming: DetectedSignal[],
): DetectedSignal[] {
  const map = new Map<string, DetectedSignal>();
  for (const signal of [...existing, ...incoming]) {
    const prior = map.get(signal.id);
    if (!prior || signal.confidence >= prior.confidence) {
      map.set(signal.id, signal);
    }
  }
  return [...map.values()];
}

export function extractTools(text: string): string[] {
  const tools = [
    "Excel",
    "Google Sheets",
    "WhatsApp",
    "WhatsApp Business",
    "Email",
    "QuickBooks",
    "SAP",
    "Salesforce",
    "HubSpot",
    "Shopify",
    "Notion",
    "Trello",
    "Asana",
    "Slack",
    "Paper",
  ];

  return tools.filter((tool) =>
    new RegExp(`\\b${tool.replace(/\s+/g, "\\s+")}\\b`, "i").test(text),
  );
}

export function mentionsTrigger(
  text: string,
  trigger: "excel" | "whatsapp" | "paper",
): boolean {
  if (trigger === "excel") {
    return /\bexcel\b|\bspreadsheet|\bgoogle sheets?\b/i.test(text);
  }
  if (trigger === "whatsapp") {
    return /\bwhatsapp\b/i.test(text);
  }
  return /\bpaper\b|\bhandwritten\b|\bprint(ed|out)?\b/i.test(text);
}

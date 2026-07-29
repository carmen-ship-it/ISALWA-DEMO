import type {
  DetectedSignal,
  PainCategory,
} from "@/types";

interface SignalRule {
  id: string;
  label: string;
  category: PainCategory | "tool" | "process" | "industry";
  patterns: RegExp[];
}

const SIGNAL_RULES: SignalRule[] = [
  {
    id: "excel",
    label: "Dependencia de hojas de cálculo",
    category: "spreadsheet",
    patterns: [
      /\bexcel\b/i,
      /\bspreadsheet/i,
      /\bgoogle sheets?\b/i,
      /\bhojas?\s+de\s+c[aá]lculo/i,
    ],
  },
  {
    id: "whatsapp",
    label: "Mensajería como flujo de trabajo",
    category: "messaging",
    patterns: [/\bwhatsapp\b/i, /\btelegram\b/i, /\btext message/i, /\bsms\b/i],
  },
  {
    id: "paper",
    label: "Proceso en papel",
    category: "paper",
    patterns: [
      /\bpaper\b/i,
      /\bpapel\b/i,
      /\bprint(ed|out)?\b/i,
      /\bimpres/i,
      /\bhandwritten\b/i,
      /\ba\s+mano\b/i,
    ],
  },
  {
    id: "duplicate",
    label: "Captura duplicada de datos",
    category: "duplicate_work",
    patterns: [
      /\btwice\b/i,
      /\bdos veces\b/i,
      /\bre-?enter/i,
      /\bvolver a capturar\b/i,
      /\bduplicate/i,
      /\bduplicad/i,
      /\bsame information\b/i,
      /\bla misma informaci/i,
    ],
  },
  {
    id: "manual",
    label: "Trabajo manual",
    category: "manual_work",
    patterns: [/\bmanual(ly|mente)?\b/i, /\bby hand\b/i, /\ba\s+mano\b/i],
  },
  {
    id: "approvals",
    label: "Cuello de botella en aprobaciones",
    category: "approvals",
    patterns: [
      /\bapprov/i,
      /\baprobaci/i,
      /\bone person\b/i,
      /\buna sola persona\b/i,
      /\bwaiting on\b/i,
      /\besperando (a|por)\b/i,
    ],
  },
  {
    id: "visibility",
    label: "Falta de visibilidad",
    category: "visibility",
    patterns: [
      /\bdon'?t know\b/i,
      /\bno s[eé]\b/i,
      /\bno (one )?can see\b/i,
      /\bnadie (lo )?ve\b/i,
      /\bvisibility\b/i,
      /\bvisibilidad\b/i,
      /\blost\b/i,
      /\bse pierde\b/i,
      /\bno (central|shared|centralizad|compartid) (history|record|historial|registro)/i,
    ],
  },
  {
    id: "reports",
    label: "Reportes manuales",
    category: "reporting",
    patterns: [
      /\breport/i,
      /\breporte?s?\b/i,
      /\bend of (the )?month\b/i,
      /\bfin de mes\b/i,
    ],
  },
  {
    id: "phone",
    label: "Coordinación por teléfono",
    category: "phone",
    patterns: [
      /\bphone\b/i,
      /\btel[eé]fono\b/i,
      /\bcall(s|ing)?\b/i,
      /\bllamad/i,
    ],
  },
  {
    id: "repeated",
    label: "Trabajo repetido",
    category: "repeated_work",
    patterns: [
      /\brepeat/i,
      /\brepite/i,
      /\brework\b/i,
      /\bretrabajo\b/i,
      /\bstart over\b/i,
      /\bempezar de nuevo\b/i,
    ],
  },
  {
    id: "email",
    label: "Correo como sistema de registro",
    category: "tool",
    patterns: [
      /\bemail\b/i,
      /\bcorreo\b/i,
      /\binbox\b/i,
      /\bbandeja\b/i,
      /\boutlook\b/i,
    ],
  },
  {
    id: "production",
    label: "Producción y manufactura",
    category: "industry",
    patterns: [
      // Manufacturing / industry keywords (bilingual).
      /\bmanufactur\w*\b/i,
      /\bfactory\b/i,
      /\bf[aá]brica\b/i,
      /\bfabricaci[oó]n\b/i,
      /\bplant\b/i,
      /\bplanta\b/i,
      /\bmachining\b/i,
      /\bmaquinado\b/i,
      /\bkiln\b/i,
      /\bhorno\b/i,
      // Production department language.
      /\bproducci[oó]n\b/i,
      /\bproduction\s+(department|team)\b/i,
      /\bdepartamento\s+de\s+producci[oó]n\b/i,
      // Production workflow language.
      /\bproduction\s+line\b/i,
      /\bl[ií]nea\s+de\s+producci[oó]n\b/i,
      /\bproduction\s+process\b/i,
      /\bproceso\s+productivo\b/i,
      /\bwork\s+order/i,
      /\borden(?:es)?\s+de\s+producci[oó]n\b/i,
      /\bshop\s+floor\b/i,
      /\bpiso\s+de\s+producci[oó]n\b/i,
      /\bassembly\b/i,
      /\bensamblaje\b/i,
      /\braw\s+material/i,
      /\bmateria\s+prima\b/i,
      /\bfinished\s+goods?\b/i,
      /\bproducto\s+terminado\b/i,
      /\bbom\b/i,
    ],
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
    return /\bexcel\b|\bspreadsheet|\bgoogle sheets?\b|\bhojas?\s+de\s+c[aá]lculo/i.test(
      text,
    );
  }
  if (trigger === "whatsapp") {
    return /\bwhatsapp\b/i.test(text);
  }
  return /\bpaper\b|\bpapel\b|\bhandwritten\b|\ba\s+mano\b|\bprint(ed|out)?\b|\bimpres/i.test(
    text,
  );
}

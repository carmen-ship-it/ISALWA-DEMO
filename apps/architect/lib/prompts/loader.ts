import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Industry } from "@/types";

const PROMPTS_ROOT = path.join(process.cwd(), "prompts");

export async function loadSystemPrompt(): Promise<string> {
  return readFile(path.join(PROMPTS_ROOT, "system.md"), "utf8");
}

export async function loadIndustryPrompt(
  industry: Industry,
): Promise<string | null> {
  if (
    industry === "unknown" ||
    industry === "other" ||
    industry === "services"
  ) {
    return null;
  }

  try {
    return await readFile(
      path.join(PROMPTS_ROOT, "industries", `${industry}.md`),
      "utf8",
    );
  } catch {
    return null;
  }
}

export async function composeArchitectPrompt(
  industry: Industry,
): Promise<string> {
  const system = await loadSystemPrompt();
  const industryPrompt = await loadIndustryPrompt(industry);
  if (!industryPrompt) return system;
  return `${system.trim()}\n\n---\n\n${industryPrompt.trim()}`;
}

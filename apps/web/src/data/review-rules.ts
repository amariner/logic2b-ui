// Import only the catalog: documentation does not need to load the parser.
import { RULES } from "../../../../packages/review/src/rules";
import type { RuleId } from "../../../../packages/review/src/contract";

const titlesEs: Record<RuleId, string> = {
  "L2B-TOK-001": "Usa colores semánticos cuando el proyecto active esta política",
  "L2B-A11Y-001": "Da nombre a los diálogos con un contexto de etiquetas resuelto",
  "L2B-A11Y-002": "Asocia los controles con un nombre accesible",
  "L2B-A11Y-003": "Da nombre a los botones, incluidas las acciones solo con icono",
};

export function reviewRules(locale: "en" | "es" = "en") {
  return (Object.entries(RULES) as [RuleId, (typeof RULES)[RuleId]][]).map(([id, rule]) => ({
    ...rule,
    id,
    anchor: id.toLowerCase(),
    title: locale === "es" ? titlesEs[id] : rule.title,
  }));
}

export function reviewRulesMarkdown(locale: "en" | "es" = "en"): string {
  return reviewRules(locale).map(rule => [
    `## ${rule.id}`,
    "",
    rule.title,
    "",
    locale === "es" ? "Antes:" : "Before:",
    "",
    "```tsx",
    rule.bad,
    "```",
    "",
    locale === "es" ? "Después:" : "After:",
    "",
    "```tsx",
    rule.good,
    "```",
  ].join("\n")).join("\n\n");
}

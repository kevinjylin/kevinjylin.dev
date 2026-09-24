export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

// Formats a "YYYY-MM" month, e.g. formatMonth("2026-03", { month: "short", year: "numeric" }) → "Mar 2026"
export function formatMonth(date: string, options: Intl.DateTimeFormatOptions): string {
  const [year, month] = date.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1)),
  );
}

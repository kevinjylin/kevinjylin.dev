import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import { getRequiredString, parseFrontmatter, stripFrontmatter } from "@/lib/frontmatter";

export type ContentPage = {
  // "YYYY-MM-DD"
  lastUpdated: string;
  content: string;
};

// A single MDX page under content/, like now.mdx or things.mdx
export const getContentPage = cache(async (name: string): Promise<ContentPage> => {
  const filePath = path.join(process.cwd(), "content", `${name}.mdx`);
  const fileContents = await readFile(filePath, "utf8");
  const data = parseFrontmatter(fileContents);

  return {
    lastUpdated: getRequiredString(data, "lastUpdated", filePath),
    content: stripFrontmatter(fileContents),
  };
});

const formatters = {
  long: new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }),
  short: new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }),
};

// "2026-10-31" → "October 31, 2026", or "Oct 31, 2026" when short
export function formatDay(value: string, style: keyof typeof formatters = "long"): string {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? value : formatters[style].format(parsed);
}

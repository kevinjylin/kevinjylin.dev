import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import { getRequiredString, parseFrontmatter, stripFrontmatter } from "@/lib/frontmatter";

const nowFilePath = path.join(process.cwd(), "content", "now.mdx");

export type NowPage = {
  lastUpdated: string;
  content: string;
};

export const getNow = cache(async (): Promise<NowPage> => {
  const fileContents = await readFile(nowFilePath, "utf8");
  const data = parseFrontmatter(fileContents);

  if (Object.keys(data).length === 0) {
    throw new Error(`Expected frontmatter in ${nowFilePath}.`);
  }

  return {
    lastUpdated: getRequiredString(data, "lastUpdated", nowFilePath),
    content: stripFrontmatter(fileContents),
  };
});

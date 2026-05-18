import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

const nowFilePath = path.join(process.cwd(), "content", "now.mdx");
const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const lastUpdatedPattern = /^lastUpdated:\s*"?([^"\r\n]+?)"?\s*$/m;

export type NowPage = {
  lastUpdated: string;
  content: string;
};

export const getNow = cache(async (): Promise<NowPage> => {
  const fileContents = await readFile(nowFilePath, "utf8");
  const frontmatterMatch = fileContents.match(frontmatterPattern);

  if (!frontmatterMatch) {
    throw new Error(`Expected frontmatter in ${nowFilePath}.`);
  }

  const lastUpdatedMatch = frontmatterMatch[1].match(lastUpdatedPattern);

  if (!lastUpdatedMatch) {
    throw new Error(`Expected "lastUpdated" in ${nowFilePath} frontmatter.`);
  }

  return {
    lastUpdated: lastUpdatedMatch[1],
    content: fileContents.replace(frontmatterPattern, ""),
  };
});

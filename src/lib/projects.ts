import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import {
  getOptionalBoolean,
  getOptionalNumber,
  getOptionalString,
  getRequiredBoolean,
  getRequiredString,
  getRequiredStringArray,
  parseFrontmatter,
  type FrontmatterRecord,
  stripFrontmatter,
} from "@/lib/frontmatter";

const projectsDirectory = path.join(process.cwd(), "content", "projects");
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

export type ProjectMetadata = {
  award?: string;
  // Path to a picture under public/ shown at the top of the project's page, with the words a
  // screen reader says for it and an optional caption beneath
  cover?: string;
  coverAlt?: string;
  coverCaption?: string;
  // "YYYY-MM"
  date: string;
  event?: string;
  featured: boolean;
  // Path to the project's own icon under public/, shown at favicon size beside its title
  icon?: string;
  kind?: string;
  liveUrl?: string;
  order?: number;
  // Shown first everywhere, and in its own "Featured" section of the list
  pinned?: boolean;
  repoUrl?: string;
  slug: string;
  summary: string;
  tags: string[];
  title: string;
  // One line on why it exists, in my words; shown under the summary in the list
  why?: string;
};

export type Project = {
  metadata: ProjectMetadata;
  content: string;
};

function getRequiredMonth(data: FrontmatterRecord, key: string, filePath: string): string {
  const value = getRequiredString(data, key, filePath);

  if (!monthPattern.test(value)) {
    throw new Error(`Expected "${key}" to be a YYYY-MM month in ${filePath}.`);
  }

  return value;
}

async function readProjectFile(fileName: string): Promise<Project> {
  const filePath = path.join(projectsDirectory, fileName);
  const fileContents = await readFile(filePath, "utf8");
  const data = parseFrontmatter(fileContents);

  return {
    metadata: {
      award: getOptionalString(data, "award", filePath),
      cover: getOptionalString(data, "cover", filePath),
      coverAlt: getOptionalString(data, "coverAlt", filePath),
      coverCaption: getOptionalString(data, "coverCaption", filePath),
      date: getRequiredMonth(data, "date", filePath),
      event: getOptionalString(data, "event", filePath),
      featured: getRequiredBoolean(data, "featured", filePath),
      icon: getOptionalString(data, "icon", filePath),
      kind: getOptionalString(data, "kind", filePath),
      liveUrl: getOptionalString(data, "liveUrl", filePath),
      order: getOptionalNumber(data, "order", filePath),
      pinned: getOptionalBoolean(data, "pinned", filePath),
      repoUrl: getOptionalString(data, "repoUrl", filePath),
      slug: fileName.replace(/\.mdx$/, ""),
      summary: getRequiredString(data, "summary", filePath),
      tags: getRequiredStringArray(data, "tags", filePath),
      title: getRequiredString(data, "title", filePath),
      why: getOptionalString(data, "why", filePath),
    },
    content: stripFrontmatter(fileContents),
  };
}

const getAllProjects = cache(async (): Promise<Project[]> => {
  try {
    const directoryEntries = await readdir(projectsDirectory, {
      withFileTypes: true,
    });

    const fileNames = directoryEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
      .map((entry) => entry.name);

    const projects = await Promise.all(fileNames.map(readProjectFile));

    return projects.sort((left, right) => {
      if (Boolean(left.metadata.pinned) !== Boolean(right.metadata.pinned)) {
        return Number(Boolean(right.metadata.pinned)) - Number(Boolean(left.metadata.pinned));
      }

      const leftOrder = left.metadata.order ?? Infinity;
      const rightOrder = right.metadata.order ?? Infinity;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      if (left.metadata.featured !== right.metadata.featured) {
        return Number(right.metadata.featured) - Number(left.metadata.featured);
      }

      if (left.metadata.date !== right.metadata.date) {
        return right.metadata.date.localeCompare(left.metadata.date);
      }

      return left.metadata.title.localeCompare(right.metadata.title);
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
});

export const getProjects = cache(async (): Promise<ProjectMetadata[]> => {
  const projects = await getAllProjects();
  return projects.map((project) => project.metadata);
});

export const getProjectBySlug = cache(async (slug: string): Promise<Project | undefined> => {
  const projects = await getAllProjects();
  return projects.find((project) => project.metadata.slug === slug);
});

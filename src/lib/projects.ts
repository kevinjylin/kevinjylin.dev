import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import {
  getOptionalNumber,
  getOptionalString,
  getRequiredBoolean,
  getRequiredNumber,
  getRequiredString,
  getRequiredStringArray,
  parseFrontmatter,
  stripFrontmatter,
} from "@/lib/frontmatter";

const projectsDirectory = path.join(process.cwd(), "content", "projects");

export type ProjectMetadata = {
  featured: boolean;
  liveUrl?: string;
  order?: number;
  repoUrl?: string;
  slug: string;
  summary: string;
  tags: string[];
  title: string;
  year: number;
};

export type Project = {
  metadata: ProjectMetadata;
  content: string;
};

async function readProjectFile(fileName: string): Promise<Project> {
  const filePath = path.join(projectsDirectory, fileName);
  const fileContents = await readFile(filePath, "utf8");
  const data = parseFrontmatter(fileContents);

  return {
    metadata: {
      featured: getRequiredBoolean(data, "featured", filePath),
      liveUrl: getOptionalString(data, "liveUrl", filePath),
      order: getOptionalNumber(data, "order", filePath),
      repoUrl: getOptionalString(data, "repoUrl", filePath),
      slug: fileName.replace(/\.mdx$/, ""),
      summary: getRequiredString(data, "summary", filePath),
      tags: getRequiredStringArray(data, "tags", filePath),
      title: getRequiredString(data, "title", filePath),
      year: getRequiredNumber(data, "year", filePath),
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
      const leftOrder = left.metadata.order ?? Infinity;
      const rightOrder = right.metadata.order ?? Infinity;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      if (left.metadata.featured !== right.metadata.featured) {
        return Number(right.metadata.featured) - Number(left.metadata.featured);
      }

      if (left.metadata.year !== right.metadata.year) {
        return right.metadata.year - left.metadata.year;
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

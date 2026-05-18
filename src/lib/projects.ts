import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

const projectsDirectory = path.join(process.cwd(), "content", "projects");
const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

type FrontmatterValue = boolean | number | string | string[];
type FrontmatterRecord = Record<string, FrontmatterValue>;

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

function parseScalarValue(rawValue: string): boolean | number | string {
  const value = rawValue.trim();

  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  if (/^-?\d+$/.test(value)) {
    return Number(value);
  }

  return value;
}

function parseArrayValue(rawValue: string): string[] {
  const inner = rawValue.slice(1, -1).trim();

  if (!inner) {
    return [];
  }

  return inner.split(",").map((segment) => {
    const value = parseScalarValue(segment);

    if (typeof value !== "string") {
      throw new Error(`Only string arrays are supported in project frontmatter.`);
    }

    return value;
  });
}

function parseFrontmatter(fileContents: string): FrontmatterRecord {
  const match = fileContents.match(frontmatterPattern);

  if (!match) {
    return {};
  }

  return match[1]
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .reduce<FrontmatterRecord>((accumulator, line) => {
      const separatorIndex = line.indexOf(":");

      if (separatorIndex === -1) {
        throw new Error(`Invalid frontmatter line: "${line}"`);
      }

      const key = line.slice(0, separatorIndex).trim();
      const rawValue = line.slice(separatorIndex + 1).trim();

      accumulator[key] =
        rawValue.startsWith("[") && rawValue.endsWith("]")
          ? parseArrayValue(rawValue)
          : parseScalarValue(rawValue);

      return accumulator;
    }, {});
}

function getRequiredString(
  data: FrontmatterRecord,
  key: string,
  filePath: string
): string {
  const value = data[key];

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Expected "${key}" to be a non-empty string in ${filePath}.`);
  }

  return value;
}

function getOptionalString(
  data: FrontmatterRecord,
  key: string,
  filePath: string
): string | undefined {
  const value = data[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`Expected "${key}" to be a string in ${filePath}.`);
  }

  return value.length > 0 ? value : undefined;
}

function getRequiredNumber(
  data: FrontmatterRecord,
  key: string,
  filePath: string
): number {
  const value = data[key];

  if (typeof value !== "number") {
    throw new Error(`Expected "${key}" to be a number in ${filePath}.`);
  }

  return value;
}

function getRequiredBoolean(
  data: FrontmatterRecord,
  key: string,
  filePath: string
): boolean {
  const value = data[key];

  if (typeof value !== "boolean") {
    throw new Error(`Expected "${key}" to be a boolean in ${filePath}.`);
  }

  return value;
}

function getOptionalNumber(
  data: FrontmatterRecord,
  key: string,
  filePath: string
): number | undefined {
  const value = data[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number") {
    throw new Error(`Expected "${key}" to be a number in ${filePath}.`);
  }

  return value;
}

function getRequiredStringArray(
  data: FrontmatterRecord,
  key: string,
  filePath: string
): string[] {
  const value = data[key];

  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`Expected "${key}" to be a string array in ${filePath}.`);
  }

  return value;
}

function stripFrontmatter(fileContents: string): string {
  return fileContents.replace(frontmatterPattern, "");
}

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
      year: getRequiredNumber(data, "year", filePath)
    },
    content: stripFrontmatter(fileContents)
  };
}

const getAllProjects = cache(async (): Promise<Project[]> => {
  try {
    const directoryEntries = await readdir(projectsDirectory, {
      withFileTypes: true
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
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }
});

export const getProjects = cache(async (): Promise<ProjectMetadata[]> => {
  const projects = await getAllProjects();
  return projects.map((project) => project.metadata);
});

export const getProjectBySlug = cache(
  async (slug: string): Promise<Project | undefined> => {
    const projects = await getAllProjects();
    return projects.find((project) => project.metadata.slug === slug);
  }
);

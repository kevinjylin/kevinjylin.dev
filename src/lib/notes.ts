import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import {
  getOptionalBoolean,
  getRequiredString,
  parseFrontmatter,
  stripFrontmatter,
} from "@/lib/frontmatter";

const notesDirectory = path.join(process.cwd(), "content", "notes");
const dayPattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// Drafts show while running locally, so they can be read in place, and never in a build
const showDrafts = process.env.NODE_ENV === "development";

export type NoteMetadata = {
  // "YYYY-MM-DD"
  date: string;
  draft: boolean;
  slug: string;
  summary: string;
  title: string;
};

export type Note = {
  metadata: NoteMetadata;
  content: string;
};

async function readNote(fileName: string): Promise<Note> {
  const filePath = path.join(notesDirectory, fileName);
  const fileContents = await readFile(filePath, "utf8");
  const data = parseFrontmatter(fileContents);
  const date = getRequiredString(data, "date", filePath);

  if (!dayPattern.test(date)) {
    throw new Error(`Expected "date" to be a YYYY-MM-DD day in ${filePath}.`);
  }

  return {
    metadata: {
      date,
      draft: getOptionalBoolean(data, "draft", filePath) ?? false,
      slug: fileName.replace(/\.mdx$/, ""),
      summary: getRequiredString(data, "summary", filePath),
      title: getRequiredString(data, "title", filePath),
    },
    content: stripFrontmatter(fileContents),
  };
}

const getAllNotes = cache(async (): Promise<Note[]> => {
  let fileNames: string[];

  try {
    const entries = await readdir(notesDirectory, { withFileTypes: true });
    fileNames = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
      .map((entry) => entry.name);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const notes = await Promise.all(fileNames.map(readNote));

  return notes
    .filter((note) => showDrafts || !note.metadata.draft)
    .sort((left, right) => right.metadata.date.localeCompare(left.metadata.date));
});

// Newest first
export const getNotes = cache(async (): Promise<NoteMetadata[]> => {
  const notes = await getAllNotes();
  return notes.map((note) => note.metadata);
});

export const getNoteBySlug = cache(async (slug: string): Promise<Note | undefined> => {
  const notes = await getAllNotes();
  return notes.find((note) => note.metadata.slug === slug);
});

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

const friendsFilePath = path.join(process.cwd(), "content", "friends.json");

export type Friend = {
  name: string;
  // Their personal site
  url: string;
  // Optional: how you know them, or what they make
  note?: string;
};

function isFriend(value: unknown): value is Friend {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const entry = value as Record<string, unknown>;

  return (
    typeof entry.name === "string" &&
    typeof entry.url === "string" &&
    (entry.note === undefined || typeof entry.note === "string")
  );
}

// content/friends.json: [{ "name": "...", "url": "https://...", "note": "..." }]
export const getFriends = cache(async (): Promise<Friend[]> => {
  let raw: string;

  try {
    raw = await readFile(friendsFilePath, "utf8");
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed) || !parsed.every(isFriend)) {
    throw new Error(`Expected a list of { name, url, note? } in ${friendsFilePath}.`);
  }

  return parsed;
});

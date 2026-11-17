import type { ProjectMetadata } from "@/lib/projects";

// The order the home page lists projects in: pinned ones lead, the rest run newest first.
// Kept apart from the code that reads project files, so the browser can use it too.
export function inListOrder(projects: ProjectMetadata[]): ProjectMetadata[] {
  return [...projects].sort(
    (left, right) =>
      Number(Boolean(right.pinned)) - Number(Boolean(left.pinned)) ||
      right.date.localeCompare(left.date),
  );
}

import { getNotes } from "@/lib/notes";
import { getProjects } from "@/lib/projects";
import { bio, contactLinks, siteUrl } from "@/lib/site";
import { formatMonth } from "@/lib/utils";

// A plain-text map of the site for language models and the tools built on them (llmstxt.org)
export const dynamic = "force-static";

export async function GET() {
  const [projects, notes] = await Promise.all([getProjects(), getNotes()]);

  const projectLines = projects.map((project) => {
    const details = [
      formatMonth(project.date, { month: "short", year: "numeric" }),
      project.event,
      project.award,
    ].filter(Boolean);

    return `- [${project.title}](${siteUrl}/projects/${project.slug}): ${project.summary} (${details.join(", ")})`;
  });

  const noteLines = notes
    .filter((note) => !note.draft)
    .map((note) => `- [${note.title}](${siteUrl}/notes/${note.slug}): ${note.summary}`);

  const sections = [
    "# Kevin Lin",
    `> ${bio}`,
    "## Projects",
    projectLines.join("\n"),
    noteLines.length > 0 ? `## Notes\n\n${noteLines.join("\n")}` : null,
    "## Pages",
    `- [Things](${siteUrl}/things): things I use and like`,
    "## Contact",
    contactLinks.map((link) => `- [${link.label}](${link.href})`).join("\n"),
  ].filter((section): section is string => section !== null);

  return new Response(`${sections.join("\n\n")}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

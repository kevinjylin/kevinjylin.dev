import { ogSize, renderOgCard } from "@/lib/og-card";
import { getProjectBySlug, getProjects } from "@/lib/projects";

export const alt = "Project by Kevin Lin";
export const size = ogSize;
export const contentType = "image/png";

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export default async function ProjectOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    return renderOgCard({ title: "Kevin Lin", body: "Projects", footer: "Kevin Lin" });
  }

  const { title, summary, kind, award, event } = project.metadata;

  return renderOgCard({
    eyebrow: [kind, award ?? event].filter(Boolean).join(" · "),
    title,
    body: summary,
    footer: "A project by Kevin Lin",
  });
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";

import { BackLink } from "@/components/back-link";
import { Footer } from "@/components/footer";
import { mdxComponents } from "@/components/mdx-components";
import { formatDay } from "@/lib/content-page";
import { getNoteBySlug, getNotes } from "@/lib/notes";

type RouteParams = { slug: string };

type NotePageProps = {
  params: Promise<RouteParams>;
};

export async function generateStaticParams(): Promise<RouteParams[]> {
  const notes = await getNotes();
  return notes.map((note) => ({ slug: note.slug }));
}

export async function generateMetadata({ params }: NotePageProps): Promise<Metadata> {
  const { slug } = await params;
  const note = await getNoteBySlug(slug);

  if (!note) {
    return {};
  }

  const title = `${note.metadata.title} — Kevin Lin`;

  return {
    title,
    description: note.metadata.summary,
    openGraph: {
      type: "article",
      siteName: "Kevin Lin",
      title,
      description: note.metadata.summary,
      url: `/notes/${slug}`,
    },
  };
}

export default async function NotePage({ params }: NotePageProps) {
  const { slug } = await params;
  const note = await getNoteBySlug(slug);

  if (!note) {
    notFound();
  }

  const { metadata, content } = note;

  return (
    <main className="page-shell" id="main-content" tabIndex={-1}>
      <div className="page-frame">
        <div className="intro-offset">
          <BackLink href="/notes" className="project-back">
            ← Notes
          </BackLink>

          <article className="project-detail">
            <header className="project-detail__header">
              <p className="project-detail__year">
                <time dateTime={metadata.date}>{formatDay(metadata.date)}</time>
                {metadata.draft ? " · draft" : null}
              </p>
              <h1>{metadata.title}</h1>
            </header>

            <div className="project-detail__body">
              <MDXRemote source={content} components={mdxComponents} />
            </div>
          </article>
        </div>

        <Footer />
      </div>
    </main>
  );
}

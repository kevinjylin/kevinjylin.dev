import type { Metadata } from "next";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";

import { getNow } from "@/lib/now";

export const metadata: Metadata = {
  title: "Now — Kevin Lin",
  description: "What Kevin Lin is focused on right now.",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

function formatLastUpdated(value: string): string {
  const parsed = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return dateFormatter.format(parsed);
}

export default async function NowPage() {
  const { lastUpdated, content } = await getNow();

  return (
    <main className="page-shell">
      <div className="page-frame">
        <div className="intro-offset">
          <Link href="/" className="project-back" aria-label="Back to home">
            ← Back
          </Link>

          <article className="now-page">
            <header className="now-page__header">
              <p className="eyebrow">/ now</p>
              <h1>What I&apos;m focused on</h1>
              <p className="now-page__updated">
                Last updated <time dateTime={lastUpdated}>{formatLastUpdated(lastUpdated)}</time>
              </p>
            </header>

            <div className="project-detail__body now-page__body">
              <MDXRemote source={content} />
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}

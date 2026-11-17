import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";

import { mdxComponents } from "@/components/mdx-components";
import { SubPage } from "@/components/sub-page";
import { formatDay, getContentPage } from "@/lib/content-page";

export const metadata: Metadata = {
  title: "Things — Kevin Lin",
  description: "Things Kevin Lin uses and likes, mostly coffee.",
};

export default async function ThingsPage() {
  const { lastUpdated, content } = await getContentPage("things");

  return (
    <SubPage>
      <article className="now-page">
        <header className="now-page__header">
          <h1>Things</h1>
          <p className="now-page__updated">
            Last updated <time dateTime={lastUpdated}>{formatDay(lastUpdated)}</time>
          </p>
        </header>

        {/* Each ## heading becomes a muted label in the left gutter, its list beside it */}
        <div className="project-detail__body now-page__body things-page__body">
          <MDXRemote source={content} components={mdxComponents} />
        </div>
      </article>
    </SubPage>
  );
}

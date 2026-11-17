import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";

import { mdxComponents } from "@/components/mdx-components";
import { SubPage } from "@/components/sub-page";
import { formatDay, getContentPage } from "@/lib/content-page";

export const metadata: Metadata = {
  title: "Now — Kevin Lin",
  description: "What Kevin Lin is focused on right now.",
};

export default async function NowPage() {
  const { lastUpdated, content } = await getContentPage("now");

  return (
    <SubPage>
      <article className="now-page">
        <header className="now-page__header">
          <h1>Now</h1>
          <p className="now-page__updated">
            Last updated <time dateTime={lastUpdated}>{formatDay(lastUpdated)}</time>
          </p>
        </header>

        <div className="project-detail__body now-page__body">
          <MDXRemote source={content} components={mdxComponents} />
        </div>
      </article>
    </SubPage>
  );
}

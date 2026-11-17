import type { ComponentProps } from "react";
import Link from "next/link";

import { Picture } from "@/components/picture";

function isExternalHref(href: string | undefined): boolean {
  if (!href) {
    return false;
  }

  return /^https?:\/\//i.test(href) || href.startsWith("//");
}

function MdxLink({ href, children, ...props }: ComponentProps<"a">) {
  if (href?.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    );
  }

  if (isExternalHref(href)) {
    return (
      <a href={href} rel="noreferrer" target="_blank" {...props}>
        {children}
      </a>
    );
  }

  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}

// Markdown's ![words for a screen reader](/path/under/public.png "Caption") becomes a framed
// picture; the caption is optional
function MdxPicture({ src, alt, title }: ComponentProps<"img">) {
  if (typeof src !== "string") {
    return null;
  }

  return <Picture src={src} alt={alt ?? ""} caption={title} />;
}

export const mdxComponents = {
  a: MdxLink,
  img: MdxPicture,
};

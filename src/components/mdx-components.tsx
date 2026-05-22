import type { ComponentProps } from "react";
import Link from "next/link";

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

export const mdxComponents = {
  a: MdxLink,
};

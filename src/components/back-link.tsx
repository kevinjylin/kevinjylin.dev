"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

import { previousPath } from "@/lib/route-memory";

type BackLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
};

// A link back to the page above this one. If that is the page you just came from, it goes back
// through the browser's history instead, which puts you where you were scrolled to; otherwise
// it is an ordinary link, and its # can point at the place on that page this one belongs to.
export function BackLink({ href, children, ...props }: BackLinkProps) {
  const router = useRouter();

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Leave opening in a new tab or window alone
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    if (previousPath() === href.split("#")[0]) {
      event.preventDefault();
      router.back();
    }
  };

  return (
    <Link href={href} onClick={onClick} {...props}>
      {children}
    </Link>
  );
}

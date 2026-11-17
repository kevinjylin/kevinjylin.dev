"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { previousPath, rememberPath } from "@/lib/route-memory";

// Sits in the layout and notes each page as it opens, so a "Back" link can tell whether the
// page it points at is the one you just came from. Once you have moved between pages, it also
// marks the visit as under way, so a page you return to doesn't play its entrance again.
export function RouteMemory() {
  const pathname = usePathname();

  useEffect(() => {
    rememberPath(pathname);

    if (previousPath() !== null) {
      document.documentElement.dataset.returning = "";
    }

    // A project's Back link can land on its row with #project-… in the address. Once the page
    // has scrolled there the # has done its job; left in place, it would pull the page back to
    // that row on a refresh.
    if (window.location.hash.startsWith("#project-")) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [pathname]);

  return null;
}

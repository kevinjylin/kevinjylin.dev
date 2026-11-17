import Link from "next/link";
import type { ReactNode } from "react";

import { CoffeeMark } from "@/components/coffee-mark";
import { Footer } from "@/components/footer";
import { IntroLinks } from "@/components/intro-links";

type SubPageProps = {
  children: ReactNode;
};

// The frame shared by /now, /things, /notes and /friends: the stamp, the name, then the page
export function SubPage({ children }: SubPageProps) {
  return (
    <main className="page-shell" id="main-content" tabIndex={-1}>
      <div className="page-frame">
        <div className="intro-offset">
          <CoffeeMark href="/" label="Back home" />

          <section className="intro">
            <p className="intro__name">
              <Link href="/">Kevin Lin</Link>
            </p>
            <IntroLinks />
          </section>

          {children}
        </div>

        <Footer />
      </div>
    </main>
  );
}

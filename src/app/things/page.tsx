import type { Metadata } from "next";

import { Incense } from "@/components/incense";
import { SubPage } from "@/components/sub-page";
import { type Thing, ThingsShelf } from "@/components/things-shelf";
import { formatDay, getContentPage } from "@/lib/content-page";

export const metadata: Metadata = {
  title: "Things — Kevin Lin",
  description: "Things Kevin Lin uses and likes.",
};

const things: Thing[] = [
  {
    slug: "macbook-air",
    name: "MacBook Air M5",
    brand: "Apple",
    image: "/things/macbook-air-closed.webp",
    source: "https://www.apple.com/shop/buy-mac/macbook-air",
    note: "13-inch, 24GB of memory, 512GB SSD. My daily-driver.",
  },
  {
    slug: "kso-evo",
    name: "KSO EVO",
    brand: "Vibram FiveFingers",
    image: "/things/kso-evo.webp",
    source: "https://www.vibram.com/us/shop/fivefingers/men/kso-evo/M07_Black.html",
    note: "Good for your feet apparently. I'm just captivated by their bold design.",
  },
  {
    slug: "hero-parfum",
    name: "Hero Parfum",
    brand: "Burberry",
    image: "/things/hero-parfum.webp",
    source: "https://us.burberry.com/burberry-hero-parfum-100ml-p40841031",
    note: "My go-to choice for fall/winter. Many aren’t a fan of the strong woody opening, but give it time and the dry-down is where it truly shines. Very symbolic and this fragrance brings me back to a special time of my life.",
  },
  {
    slug: "sarashina",
    name: "Sarashina Incense",
    brand: "Aesop",
    image: "/things/sarashina.webp",
    source: "https://www.aesop.com/home-fragrance/incense/sarashina-aromatique-incense/HM15.html",
    note: "Picked this up in Japan, and it’s become a staple for cozy fall nights. It opens dry and woody with sandalwood, then slowly warms into clove and cinnamon as it burns. Every time I light it, I’m taken right back to that trip.",
  },
];

export default async function ThingsPage() {
  const { lastUpdated } = await getContentPage("things");

  return (
    <SubPage>
      <article className="now-page">
        <header className="now-page__header">
          <h1>Things</h1>
          <p className="now-page__updated">
            Last updated <time dateTime={lastUpdated}>{formatDay(lastUpdated)}</time>
          </p>
        </header>

        {/* The incense stands in the right margin, on the shelf's last line */}
        <div className="things-shelf-wrap">
          <ThingsShelf things={things} />
          <Incense />
        </div>
      </article>
    </SubPage>
  );
}

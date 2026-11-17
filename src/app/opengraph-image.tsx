import { ogSize, renderOgCard } from "@/lib/og-card";

export const alt = "Kevin Lin — CS + Business at UC Riverside";
export const size = ogSize;
export const contentType = "image/png";

export default function OpengraphImage() {
  return renderOgCard({
    title: "Kevin Lin",
    body: "Interested in AI agent systems, product development, and the process of turning ideas into useful tools.",
    footer: "CS + Business · UC Riverside",
  });
}

import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };

type OgCardProps = {
  eyebrow?: string;
  title: string;
  body: string;
  footer: string;
};

// The link preview shown when a page is shared on LinkedIn, Slack, Discord or iMessage.
// Same coffee palette and signature as the homepage.
export async function renderOgCard({ eyebrow, title, body, footer }: OgCardProps) {
  const signature = await readFile(path.join(process.cwd(), "public", "signature.png"));
  const signatureSrc = `data:image/png;base64,${signature.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 96px",
          background: "#ffffff",
          color: "#1f140e",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          {eyebrow ? (
            <div style={{ fontSize: 26, color: "#a65d33", marginBottom: 18 }}>{eyebrow}</div>
          ) : null}
          <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: "-0.03em" }}>{title}</div>
          <div
            style={{
              marginTop: 24,
              maxWidth: 960,
              fontSize: 36,
              lineHeight: 1.35,
              color: "#4a2c20",
            }}
          >
            {body}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderTop: "2px solid #e0d6cb",
            paddingTop: 32,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", fontSize: 28, color: "#7a6b5d" }}>
            <span>{footer}</span>
            <span style={{ marginTop: 6, color: "#6b4423" }}>kevinjylin.dev</span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain img only */}
          <img src={signatureSrc} width={262} height={90} alt="" />
        </div>
      </div>
    ),
    ogSize,
  );
}

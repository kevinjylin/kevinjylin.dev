import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import { EasterEggs } from "@/components/easter-eggs";
import { RouteMemory } from "@/components/route-memory";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const description = "A minimal portfolio and project archive for kevin";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.kevinjylin.dev"),
  title: "Kevin Lin",
  description,
  openGraph: {
    type: "website",
    siteName: "Kevin Lin",
    title: "Kevin Lin",
    description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
        {/* The pen's roughness, kept here once so anything on the site can be drawn with it */}
        <svg className="ink-defs" aria-hidden="true" focusable="false">
          <defs>
            <filter id="ink-rough" x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="5" />
              <feDisplacementMap in="SourceGraphic" scale="3.4" />
            </filter>
          </defs>
        </svg>
        <RouteMemory />
        <EasterEggs />
        <SpeedInsights />
      </body>
    </html>
  );
}

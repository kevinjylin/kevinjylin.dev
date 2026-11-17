import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import { EasterEggs } from "@/components/easter-eggs";

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
        <EasterEggs />
      </body>
    </html>
  );
}

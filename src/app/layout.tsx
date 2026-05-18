import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kevin Lin",
  description: "A minimal portfolio and project archive for kevin",
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
      </body>
    </html>
  );
}

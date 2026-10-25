// Standalone layout for the StorefrontIQ portfolio case study.
// Loads the same "Atelier" typeface set as the Tourbillon case study (display serif,
// grotesk body, technical mono) as scoped CSS variables and sets an HR-facing title.
// The site chrome is suppressed upstream by ChromeGate for this route.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hoang Anh Chu — StorefrontIQ",
  description:
    "Portfolio case study: StorefrontIQ, an open multi-channel retail analytics platform built by Hoang Anh Chu (Brandon).",
  // Unlisted while the project is unfinished: reachable by direct link, kept out of search results.
  robots: { index: false, follow: false },
};

export default function StorefrontIQPortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      {children}
    </div>
  );
}

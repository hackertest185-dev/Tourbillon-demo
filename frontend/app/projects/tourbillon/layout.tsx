// Standalone layout for the Tourbillon portfolio case study.
// Loads the page-specific "Atelier" typeface set (display serif, grotesk body,
// technical mono) as scoped CSS variables and sets an HR-facing page title.
// The site chrome is suppressed upstream by ChromeGate for this route.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hoang Anh Chu — Software Engineer",
  description:
    "Portfolio case study: Tourbillon, a full-stack luxury watch platform built by Hoang Anh Chu (Brandon).",
};

export default function TourbillonPortfolioLayout({
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

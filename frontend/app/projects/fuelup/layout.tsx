// Standalone layout for the FuelUp portfolio case study.
// Loads the same "Atelier" typeface set as the Tourbillon case study (display serif,
// grotesk body, technical mono) as scoped CSS variables and sets an HR-facing title.
// The site chrome is suppressed upstream by ChromeGate for this route.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hoang Anh Chu — FuelUp",
  description:
    "Portfolio case study: FuelUp, an AI-assisted fitness and nutrition companion app built by Hoang Anh Chu (Brandon).",
};

export default function FuelUpPortfolioLayout({
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

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CineMatch — AI Powered Discovery",
  description: "Next-generation content discovery and recommendations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-background text-zinc-50 font-sans antialiased min-h-screen selection:bg-primary/30">
        {children}
      </body>
    </html>
  );
}

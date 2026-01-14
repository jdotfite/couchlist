import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CouchList - Track TV Shows & Movies",
  description: "Your cozy companion for tracking all the TV shows and movies you've watched",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import AuthProvider from "@/components/AuthProvider";

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
      <body className="antialiased">
        <AuthProvider>
          {children}
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}

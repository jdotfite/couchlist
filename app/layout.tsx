import type { Metadata } from "next";
import { Montserrat, Open_Sans } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import AuthProvider from "@/components/AuthProvider";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-montserrat",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  display: "swap",
});

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
    <html lang="en" className={`${montserrat.variable} ${openSans.variable}`}>
      <body className="antialiased font-sans">
        <AuthProvider>
          {children}
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}

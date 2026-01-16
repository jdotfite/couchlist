import type { Metadata, Viewport } from "next";
import { Montserrat, Open_Sans } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import AuthProvider from "@/components/AuthProvider";
import { SidebarProvider } from "@/components/SidebarContext";
import AppLayout from "@/components/AppLayout";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${montserrat.variable} ${openSans.variable}`}>
      <body className="antialiased font-sans overflow-x-hidden">
        <AuthProvider>
          <SidebarProvider>
            <AppLayout>
              {children}
            </AppLayout>
            <BottomNav />
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

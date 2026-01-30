import type { Metadata } from "next";
import { SpeedInsights } from '@vercel/speed-insights/next';
import ErrorSuppressor from './components/ErrorSuppressor';
import "./globals.css";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Adirai Rides - அதிரை ரைட்ஸ்",
  description: "Uber-like ride service for Adirampattinam",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Adirai Rides",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ta">
      <body className="antialiased">
        {children}
        <ErrorSuppressor />
        <SpeedInsights />
      </body>
    </html>
  );
}

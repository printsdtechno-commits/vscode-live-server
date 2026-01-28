import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adirai Rides - அதிரை ரைட்ஸ்",
  description: "Uber-like ride service for Adirampattinam",
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
      </body>
    </html>
  );
}

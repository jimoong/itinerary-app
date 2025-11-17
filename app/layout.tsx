import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "London & Prague Itinerary Explorer",
  description: "Plan your family trip to London and Prague",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}


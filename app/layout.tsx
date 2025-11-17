import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "London & Prague Itinerary Explorer",
  description: "Plan your family trip to London and Prague",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no",
  manifest: "/manifest.json",
  themeColor: "#134686",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Itinerary",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white dark:bg-black text-slate-900 dark:text-slate-50 transition-colors">
        {children}
      </body>
    </html>
  );
}


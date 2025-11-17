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
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white dark:bg-black text-slate-900 dark:text-slate-50 transition-colors">
        {children}
      </body>
    </html>
  );
}


import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Velrix — AI Sales Agent",
  description:
    "Turn every enquiry into a qualified opportunity. Velrix is an AI sales agent that replies, qualifies, scores, follows up, and hands hot leads to your team.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

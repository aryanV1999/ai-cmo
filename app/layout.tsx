import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Marketing Intelligence | Brutal SEO & Marketing Audits",
  description:
    "Get a brutally honest SEO and marketing audit for your website. No fluff, no sugarcoating — just actionable insights that will help you grow.",
  keywords: [
    "SEO audit",
    "marketing audit",
    "website analysis",
    "technical SEO",
    "competitor analysis",
  ],
  openGraph: {
    title: "AI Marketing Intelligence | Brutal SEO & Marketing Audits",
    description:
      "Get a brutally honest SEO and marketing audit for your website in 60 seconds.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}

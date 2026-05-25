import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";

import Footer from "@/app/components/Footer";
import Navbar from "@/app/components/Navbar";

import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "OpusGrex — Hire Verified Clinical Talent, Nationwide",
  description:
    "OpusGrex connects hospitals and care facilities with licensed, credentialed healthcare professionals — ready to work when you need them.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable} h-full scroll-smooth antialiased`}>
      <body className="min-h-full bg-[#FAF9F6] font-sans text-slate-600">
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}

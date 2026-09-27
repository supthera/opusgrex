import type { Metadata } from "next";

import "./globals.css";

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
    <html lang="en" className="h-full scroll-smooth antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-[#FAF9F6] font-sans text-slate-600">
        {children}
      </body>
    </html>
  );
}

import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0, user-scalable=yes"
        />
        <meta name="theme-color" content="#0a0a0a" />
        <title>OpusGrex — Agency Map Dashboard</title>
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

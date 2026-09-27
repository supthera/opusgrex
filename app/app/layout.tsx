import Link from "next/link";

export default function AppShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#FAF9F6]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="font-heading text-lg font-semibold tracking-tight text-[#0F4C81]"
            >
              OpusGrex
            </Link>
            <span className="rounded-md bg-[#0F4C81]/10 px-2 py-0.5 text-xs font-medium text-[#0F4C81]">
              CA OT App
            </span>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-slate-500 transition-colors hover:text-[#0F4C81]"
          >
            Marketing site
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}

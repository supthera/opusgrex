export default function CliniciansLoading() {
  return (
    <main className="min-h-screen pt-24 pb-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-4 h-6 w-full max-w-xl animate-pulse rounded-lg bg-slate-100" />
        <div className="mt-10 h-28 animate-pulse rounded-2xl bg-slate-100" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}
        </div>
      </div>
    </main>
  );
}

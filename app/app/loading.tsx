export default function AppLoading() {
  return (
    <main className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-8">
        <div className="h-9 w-72 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-4 h-5 w-full max-w-2xl animate-pulse rounded bg-slate-100" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}
        </div>
        <div className="mt-8 h-96 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </main>
  );
}

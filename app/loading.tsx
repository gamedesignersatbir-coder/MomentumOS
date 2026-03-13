export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="glass animate-pulse rounded-[28px] p-8">
        <div className="mb-8 h-8 w-56 rounded-full bg-white/10" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-56 rounded-3xl bg-white/8" />
          <div className="h-56 rounded-3xl bg-white/8" />
          <div className="h-56 rounded-3xl bg-white/8" />
        </div>
      </div>
    </main>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/14 bg-white/[0.02] p-5 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm text-dim">{description}</p>
    </div>
  );
}

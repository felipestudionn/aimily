export default function ProductLoading() {
  return (
    <div className="min-h-screen bg-crema animate-pulse">
      {/* Dashboard skeleton */}
      <div className="pt-8 px-8">
        <div className="h-6 w-48 bg-carbon/[0.06] rounded mb-6" />
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="h-32 bg-white/60 rounded border border-carbon/[0.04]" />
          <div className="h-32 bg-white/60 rounded border border-carbon/[0.04]" />
          <div className="h-32 bg-white/60 rounded border border-carbon/[0.04]" />
        </div>
      </div>

      {/* SKU grid skeleton */}
      <div className="px-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="bg-white/60 rounded border border-carbon/[0.04]">
            <div className="aspect-[4/5]" />
            <div className="p-3 space-y-2">
              <div className="h-3 w-24 bg-carbon/[0.06] rounded" />
              <div className="h-3 w-16 bg-carbon/[0.04] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

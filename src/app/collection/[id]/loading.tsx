export default function CollectionLoading() {
  return (
    <div className="min-h-screen bg-crema animate-pulse">
      {/* Header skeleton */}
      <div className="pt-8 pb-4 px-8">
        <div className="h-3 w-24 bg-carbon/[0.06] rounded mb-3" />
        <div className="h-7 w-64 bg-carbon/[0.06] rounded mb-2" />
        <div className="h-4 w-96 bg-carbon/[0.04] rounded" />
      </div>

      {/* Stepper skeleton */}
      <div className="px-8 mb-8">
        <div className="flex gap-0 w-fit">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-36 bg-carbon/[0.04] border border-carbon/[0.04]" />
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="px-8 grid grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-64 bg-white/60 rounded border border-carbon/[0.04]" />
        ))}
      </div>
    </div>
  );
}

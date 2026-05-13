/**
 * Suspense fallback for /my-collections.
 *
 * Renders the same chrome the resolved page renders (shade background +
 * navbar slot height) plus a 3-card skeleton that matches the final
 * grid geometry. Because the page is force-dynamic and SSR'd, this
 * fallback usually only appears during route transitions inside the
 * SPA — not on first paint. When it does show, the page transitions
 * skeleton → real cards in place instead of empty → spinner → grid.
 */
export default function MyCollectionsLoading() {
  return (
    <div className="min-h-screen bg-shade">
      {/* Navbar slot — matches the real Navbar height so layout doesn't jump */}
      <div className="fixed top-0 left-0 right-0 z-50 h-16 bg-shade/80 backdrop-blur-sm" />

      <main className="pt-24 pb-20 px-6 md:px-10 lg:px-14">
        <div className="max-w-[1440px] mx-auto space-y-8">
          {/* Header skeleton */}
          <div className="flex items-end justify-between flex-wrap gap-4 pt-2">
            <div className="space-y-3">
              <div className="h-8 w-48 rounded-md bg-carbon/[0.06] animate-pulse" />
              <div className="h-3 w-72 rounded-md bg-carbon/[0.04] animate-pulse" />
            </div>
            <div className="h-10 w-40 rounded-full bg-carbon/[0.06] animate-pulse" />
          </div>

          {/* 3-card grid skeleton — matches grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-[20px] overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-carbon/[0.025] via-shade/80 to-carbon/[0.015] animate-pulse" />
                <div className="px-5 py-4 space-y-3">
                  <div className="h-3 w-32 rounded-md bg-carbon/[0.05] animate-pulse" />
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-[6px] rounded-full bg-carbon/[0.06]" />
                    <div className="h-6 w-20 rounded-full bg-carbon/[0.08] animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

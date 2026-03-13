import { CreativeSpaceClient } from './creative-space-client';

export default function CreativeSpacePage() {
  return (
    <div className="flex flex-col gap-10 px-4 md:px-6 py-6 md:py-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Creative Space</h1>
        <p className="text-muted-foreground max-w-3xl">
          Build a visual moodboard with images from Pinterest or your own uploads.
          Use AI to analyze your visual direction.
        </p>
      </div>

      <CreativeSpaceClient />
    </div>
  );
}

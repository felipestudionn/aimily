import type { LookbookPage } from '@/types/studio';

/**
 * LookbookPageRenderer — full-bleed rendering of a LookbookPage by layout_type.
 * Pure, server-compatible (no hooks, no client state). Used by the presentation
 * deck to render lookbook slides with full layout fidelity.
 *
 * Supported layouts: cover, full_bleed, two_column, grid_4, text_image, quote.
 */
export function LookbookPageRenderer({ page }: { page: LookbookPage }) {
  const images = page.content.filter((c) => c.type === 'image' && c.asset_url);
  const texts = page.content.filter((c) => c.type === 'text' && c.text);
  const bgStyle = page.background_color
    ? { backgroundColor: page.background_color }
    : undefined;

  switch (page.layout_type) {
    case 'cover':
      return <CoverLayout images={images} texts={texts} bgStyle={bgStyle} />;
    case 'full_bleed':
      return <FullBleedLayout images={images} bgStyle={bgStyle} />;
    case 'two_column':
      return <TwoColumnLayout images={images} texts={texts} bgStyle={bgStyle} />;
    case 'grid_4':
      return <Grid4Layout images={images} bgStyle={bgStyle} />;
    case 'text_image':
      return <TextImageLayout images={images} texts={texts} bgStyle={bgStyle} />;
    case 'quote':
      return <QuoteLayout texts={texts} bgStyle={bgStyle} />;
    default:
      return <FullBleedLayout images={images} bgStyle={bgStyle} />;
  }
}

type Item = { type: string; asset_url?: string; text?: string };
type BgStyle = { backgroundColor: string } | undefined;

/* ─── Layouts ─── */

function CoverLayout({ images, texts, bgStyle }: { images: Item[]; texts: Item[]; bgStyle: BgStyle }) {
  const heroImage = images[0]?.asset_url;
  const heroText = texts[0]?.text ?? '';

  return (
    <div className="relative w-full h-full min-h-screen flex items-center justify-center bg-carbon overflow-hidden" style={bgStyle}>
      {heroImage && (
        <img
          src={heroImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
      )}
      <div className="relative z-10 text-center max-w-4xl px-16">
        {heroText ? (
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-light text-crema tracking-tight leading-[0.95]">
            {heroText}
          </h2>
        ) : (
          <p className="text-[10px] tracking-[0.3em] uppercase text-crema/40">Lookbook</p>
        )}
      </div>
    </div>
  );
}

function FullBleedLayout({ images, bgStyle }: { images: Item[]; bgStyle: BgStyle }) {
  const heroImage = images[0]?.asset_url;

  return (
    <div className="relative w-full h-full min-h-screen bg-carbon" style={bgStyle}>
      {heroImage ? (
        <img src={heroImage} alt="" className="w-full h-full object-cover absolute inset-0" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-[10px] tracking-[0.3em] uppercase text-crema/20">Blank page</p>
        </div>
      )}
    </div>
  );
}

function TwoColumnLayout({ images, texts, bgStyle }: { images: Item[]; texts: Item[]; bgStyle: BgStyle }) {
  const leftImage = images[0]?.asset_url;
  const rightText = texts[0]?.text ?? '';

  return (
    <div className="w-full h-full min-h-screen grid grid-cols-1 md:grid-cols-2 bg-carbon" style={bgStyle}>
      <div className="relative bg-crema/[0.03] min-h-[50vh] md:min-h-screen">
        {leftImage && <img src={leftImage} alt="" className="w-full h-full object-cover absolute inset-0" />}
      </div>
      <div className="flex flex-col justify-center px-16 py-16">
        {rightText && (
          <p className="text-xl md:text-2xl font-light text-crema leading-relaxed max-w-md">
            {rightText}
          </p>
        )}
      </div>
    </div>
  );
}

function Grid4Layout({ images, bgStyle }: { images: Item[]; bgStyle: BgStyle }) {
  const tiles = images.slice(0, 4);

  return (
    <div className="w-full h-full min-h-screen grid grid-cols-2 grid-rows-2 gap-1 bg-carbon p-1" style={bgStyle}>
      {Array.from({ length: 4 }).map((_, i) => {
        const img = tiles[i]?.asset_url;
        return (
          <div key={i} className="relative bg-crema/[0.03] overflow-hidden">
            {img && <img src={img} alt="" className="w-full h-full object-cover absolute inset-0" />}
          </div>
        );
      })}
    </div>
  );
}

function TextImageLayout({ images, texts, bgStyle }: { images: Item[]; texts: Item[]; bgStyle: BgStyle }) {
  const heroImage = images[0]?.asset_url;
  const heroText = texts[0]?.text ?? '';
  const secondaryText = texts[1]?.text ?? '';

  return (
    <div className="w-full h-full min-h-screen flex flex-col bg-carbon" style={bgStyle}>
      <div className="px-16 pt-16 pb-10 max-w-4xl">
        {heroText && (
          <h3 className="text-3xl md:text-4xl font-light text-crema tracking-tight mb-4">
            {heroText}
          </h3>
        )}
        {secondaryText && (
          <p className="text-sm md:text-base font-light text-crema/60 leading-relaxed max-w-2xl">
            {secondaryText}
          </p>
        )}
      </div>
      <div className="relative flex-1 bg-crema/[0.03]">
        {heroImage && <img src={heroImage} alt="" className="w-full h-full object-cover absolute inset-0" />}
      </div>
    </div>
  );
}

function QuoteLayout({ texts, bgStyle }: { texts: Item[]; bgStyle: BgStyle }) {
  const quote = texts[0]?.text ?? '';
  const attribution = texts[1]?.text ?? '';

  return (
    <div className="w-full h-full min-h-screen flex items-center justify-center px-16 py-16 bg-carbon" style={bgStyle}>
      <div className="max-w-4xl text-center">
        <div className="text-[9c7c4c] text-6xl font-light leading-none mb-8" style={{ color: '#9c7c4c' }}>
          &ldquo;
        </div>
        {quote && (
          <blockquote className="text-3xl md:text-4xl lg:text-5xl font-light text-crema leading-snug tracking-tight">
            {quote}
          </blockquote>
        )}
        {attribution && (
          <p className="mt-10 text-[11px] tracking-[0.25em] uppercase text-crema/40">
            — {attribution}
          </p>
        )}
      </div>
    </div>
  );
}

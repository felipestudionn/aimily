/* ═══════════════════════════════════════════════════════════════════
   PresentationFonts — load the Google Fonts the theme tokens reference

   Themes in src/lib/presentation/themes.ts declare display/body/mono
   families as CSS font-family strings. Those only resolve to real
   fonts if Chromium has them loaded. System fallbacks (serif, sans,
   monospace) are a poor visual substitute for Playfair or Archivo
   Black in both the live preview and the PDF export.

   Render this component at the top of any layout/component that
   mounts a PresentationDeck or its export variant. React dedupes
   identical <link> tags so it's safe to include in multiple places.
   ═══════════════════════════════════════════════════════════════════ */

export function PresentationFonts() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700;9..144,900&family=Inter:wght@100..900&family=Space+Grotesk:wght@300..700&family=Archivo+Narrow:wght@400..700&family=Archivo+Black&family=Anton&family=Oswald:wght@300..700&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap"
      />
    </>
  );
}

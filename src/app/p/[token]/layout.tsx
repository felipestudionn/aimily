/* Layout for the public shared-deck route. Full viewport, no chrome —
   the Navbar is already route-scoped to public pages, so we just zero
   out margins and let the deck own the screen. */

export default function SharedDeckLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        html, body { margin: 0 !important; padding: 0 !important; }
      `}</style>
      {children}
    </>
  );
}

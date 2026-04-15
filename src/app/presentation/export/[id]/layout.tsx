/* Layout for the internal PDF-export route. GlobalNav already skips
   non-public routes. CookieConsent is client-gated. Analytics is
   invisible. So we just wrap children transparently and add a print-
   safety style that hides anything accidentally inherited. */

export default function ExportLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
        /* Kill any sticky/fixed overlays that might slip past GlobalNav
           checks when generating the PDF. */
        body > :not(main),
        main > :not([data-export-root]) { display: none !important; }
      `}</style>
      <div data-export-root>{children}</div>
    </>
  );
}

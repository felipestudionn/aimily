/* ═══════════════════════════════════════════════════════════════════
   Storefront 404 — when host doesn't match any published storefront
   or the requested path doesn't exist within a published storefront.
   ═══════════════════════════════════════════════════════════════════ */

export default function StorefrontNotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        background: '#F5F2EC',
        color: '#1A1815',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '64px', fontWeight: 300, letterSpacing: '-0.04em', margin: 0 }}>
        404
      </h1>
      <p style={{ fontSize: '14px', opacity: 0.5, marginTop: '1rem', maxWidth: '480px', lineHeight: 1.6 }}>
        This storefront isn&apos;t available.
      </p>
      <a
        href="https://aimily.app"
        style={{
          marginTop: '2rem',
          fontSize: '12px',
          letterSpacing: '0.05em',
          textDecoration: 'underline',
          color: '#1A1815',
          opacity: 0.6,
        }}
      >
        aimily.app
      </a>
    </main>
  );
}

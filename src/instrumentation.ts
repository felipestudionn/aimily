export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export async function onRequestError(
  err: unknown,
  request: Parameters<NonNullable<typeof import('@sentry/nextjs').captureRequestError>>[1],
  context: Parameters<NonNullable<typeof import('@sentry/nextjs').captureRequestError>>[2],
) {
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(err, request, context);
}

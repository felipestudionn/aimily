/**
 * AI provider error normalisation.
 *
 * Endpoints AI hoy hacen `return NextResponse.json({ error: error.message })`.
 * El usuario acaba viendo cosas tipo:
 *
 *   "Anthropic: rate_limit_exceeded — please try again later"
 *   "AI providers failed — Haiku: 529 overloaded | Gemini: 503 ..."
 *   "Failed to fetch source image: 403"
 *
 * Para una empresa enterprise eso es UX amateur — el cliente paga, el
 * cliente debería ver un mensaje accionable, sin nombres de proveedor
 * ni códigos crípticos. El detalle técnico se loggea aparte (ya está
 * en console.error y Sentry).
 *
 * Esta función toma un error crudo y devuelve:
 *   - `userMessage`: lo que mostramos al cliente (ES por defecto, EN
 *     posible vía locale).
 *   - `internalCode`: tag estable para tracking (rate_limit, capacity,
 *     content_filter, network, unknown). Útil para logs y dashboards.
 *   - `httpStatus`: 429 / 502 / 504 / 500 según naturaleza.
 *
 * No traduce todavía a 9 locales — para el launch, EN/ES cubre 95%
 * del tráfico. Resto cae a EN. Ampliar via `messagesByLocale` cuando
 * el i18n sweep llegue aquí.
 */

export type AiErrorCode =
  | 'rate_limit'
  | 'capacity'
  | 'content_filter'
  | 'invalid_input'
  | 'auth'
  | 'network'
  | 'timeout'
  | 'unknown';

export interface NormalizedAiError {
  userMessage: string;
  internalCode: AiErrorCode;
  httpStatus: number;
}

const MESSAGES_EN: Record<AiErrorCode, string> = {
  rate_limit: 'Our AI is busy right now. Please try again in a few seconds.',
  capacity: 'Our AI provider is at capacity. Please retry in a minute.',
  content_filter: 'The request was blocked by safety filters. Try rephrasing your input.',
  invalid_input: 'The input provided is missing required information. Please review and try again.',
  auth: 'There is a configuration issue with the AI service. Our team has been notified.',
  network: 'We could not reach the AI service. Please retry.',
  timeout: 'The AI took too long to respond. Please try again.',
  unknown: 'Something went wrong while generating content. Please try again, and contact support if it persists.',
};

const MESSAGES_ES: Record<AiErrorCode, string> = {
  rate_limit: 'Nuestra IA está saturada. Vuelve a intentarlo en unos segundos.',
  capacity: 'El proveedor de IA está al límite de capacidad. Reintenta en un minuto.',
  content_filter: 'La petición fue bloqueada por los filtros de seguridad. Prueba a reformularla.',
  invalid_input: 'Faltan datos en la petición. Revisa los campos e inténtalo de nuevo.',
  auth: 'Hay un problema de configuración con el servicio de IA. Nuestro equipo está al tanto.',
  network: 'No pudimos contactar con el servicio de IA. Reintenta.',
  timeout: 'La IA tardó demasiado en responder. Inténtalo de nuevo.',
  unknown: 'Algo falló al generar el contenido. Inténtalo otra vez y contacta soporte si persiste.',
};

const STATUS_BY_CODE: Record<AiErrorCode, number> = {
  rate_limit: 429,
  capacity: 503,
  content_filter: 422,
  invalid_input: 400,
  auth: 500,   // user-facing 500 because they can't fix it; we get the alert
  network: 502,
  timeout: 504,
  unknown: 500,
};

function classify(rawMessage: string): AiErrorCode {
  const m = rawMessage.toLowerCase();
  if (m.includes('rate_limit') || m.includes('rate limit') || m.includes('too many requests') || m.includes('429')) {
    return 'rate_limit';
  }
  if (m.includes('overloaded') || m.includes('capacity') || m.includes('529') || m.includes('503')) {
    return 'capacity';
  }
  if (m.includes('content_filter') || m.includes('content filter') || m.includes('safety') || m.includes('blocked')) {
    return 'content_filter';
  }
  if (m.includes('invalid') || m.includes('required') || m.includes('missing') || m.includes('400')) {
    return 'invalid_input';
  }
  if (m.includes('unauthor') || m.includes('forbidden') || m.includes('api_key') || m.includes('401') || m.includes('403')) {
    return 'auth';
  }
  if (m.includes('etimedout') || m.includes('timeout') || m.includes('aborted')) {
    return 'timeout';
  }
  if (m.includes('econn') || m.includes('enotfound') || m.includes('network') || m.includes('fetch failed')) {
    return 'network';
  }
  return 'unknown';
}

/**
 * @param error  whatever caught in the catch block
 * @param locale 'es' | 'en' — anything else falls back to EN
 */
export function normalizeAiError(error: unknown, locale: string = 'en'): NormalizedAiError {
  const raw = error instanceof Error ? error.message : String(error ?? 'unknown error');
  const code = classify(raw);
  const messages = locale.toLowerCase().startsWith('es') ? MESSAGES_ES : MESSAGES_EN;
  return {
    userMessage: messages[code],
    internalCode: code,
    httpStatus: STATUS_BY_CODE[code],
  };
}

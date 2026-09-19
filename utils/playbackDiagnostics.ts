type DiagnosticLevel = 'info' | 'error';

type DiagnosticDetails = Record<string, unknown>;

const diagnosticsEnabled = typeof __DEV__ !== 'undefined' && __DEV__;

export const describeMediaUrl = (value: string | null | undefined): DiagnosticDetails => {
  if (!value) return { host: null, path: null, streamType: 'unknown', signed: false };
  try {
    const parsed = new URL(value);
    const path = parsed.pathname;
    const streamType = /\.m3u8$/i.test(path) || /\/playlist\//i.test(path)
      ? 'hls'
      : /\.mp4$/i.test(path)
        ? 'mp4'
        : 'unknown';
    const expires = parsed.searchParams.get('expires');
    const expiresNumber = expires ? Number(expires) : Number.NaN;
    const expiresDate = Number.isFinite(expiresNumber)
      ? new Date(expiresNumber > 1_000_000_000_000 ? expiresNumber : expiresNumber * 1000)
      : null;
    return {
      host: parsed.hostname,
      path,
      streamType,
      signed: parsed.searchParams.has('token') || parsed.searchParams.has('expires'),
      expiresAt: expiresDate && Number.isFinite(expiresDate.getTime()) ? expiresDate.toISOString() : null,
    };
  } catch {
    return {
      host: null,
      path: value.split('?')[0],
      streamType: /\.m3u8(?:$|[?#])/i.test(value) ? 'hls' : /\.mp4(?:$|[?#])/i.test(value) ? 'mp4' : 'unknown',
      signed: value.includes('?'),
    };
  }
};

export const sanitizeDiagnosticMessage = (value: string): string =>
  value
    .replace(/([?&](?:token|expires|signature|sig|auth|key)=)[^&\s"']+/gi, '$1<redacted>')
    .replace(/(https?:\/\/[^\s?"']+)\?[^\s"']+/gi, '$1?<redacted>');

const getHeaderValue = (headers: unknown, name: string): string | null => {
  if (!headers || typeof headers !== 'object') return null;
  const headerSource = headers as Record<string, unknown> & { get?: (key: string) => unknown };
  const value = typeof headerSource.get === 'function'
    ? headerSource.get(name)
    : headerSource[name] ?? headerSource[name.toLowerCase()];
  return value == null ? null : String(value);
};

export const describeDiagnosticError = (error: unknown): DiagnosticDetails => {
  if (error instanceof Error) {
    const extended = error as Error & { code?: string; response?: { status?: number; headers?: unknown } };
    return {
      name: error.name,
      message: sanitizeDiagnosticMessage(error.message),
      code: extended.code ?? null,
      status: extended.response?.status ?? null,
      retryAfter: getHeaderValue(extended.response?.headers, 'retry-after'),
      server: getHeaderValue(extended.response?.headers, 'server'),
      requestId: getHeaderValue(extended.response?.headers, 'cf-ray'),
    };
  }
  return { message: sanitizeDiagnosticMessage(String(error)) };
};

export const playbackDiagnostic = (
  event: string,
  details: DiagnosticDetails = {},
  level: DiagnosticLevel = 'info',
): void => {
  if (!diagnosticsEnabled) return;
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...details,
  });
  console.info(`[AniNyanDiag] ${entry}`);
};

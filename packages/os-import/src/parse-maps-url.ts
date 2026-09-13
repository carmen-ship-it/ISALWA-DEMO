export type ParsedMapsUrl = {
  latitude: number | null;
  longitude: number | null;
  provenanceUrl: string | null;
  kind: 'with_coords' | 'provenance_only' | 'skipped';
};

function isFiniteCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** Decode query text for coordinate matching only. Never used as the stored URL. */
function decodeForCoordinateScan(url: string): string {
  let decoded = url.replace(/%2C/gi, ',');
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Keep the %2C substitution if the URL is not fully decodable.
  }
  try {
    const parsed = new URL(url);
    for (const [key, value] of parsed.searchParams.entries()) {
      let param = value.replace(/%2C/gi, ',');
      try {
        param = decodeURIComponent(param);
      } catch {
        // Keep the substituted value.
      }
      decoded = decoded.replace(value, param);
      if (key === 'q' || key === 'll' || key === 'query') {
        decoded += `&${key}=${param}`;
      }
    }
  } catch {
    // Not a fully qualified URL; the %2C substitution above is enough.
  }
  return decoded;
}

/**
 * Offline Maps URL parser. Never geocodes. Never calls network APIs.
 * Short maps.app.goo.gl links → provenance only (null coords).
 */
export function parseMapsUrl(raw: string | null | undefined): ParsedMapsUrl {
  if (!raw) {
    return { latitude: null, longitude: null, provenanceUrl: null, kind: 'skipped' };
  }
  const url = String(raw).trim();
  if (!url) {
    return { latitude: null, longitude: null, provenanceUrl: null, kind: 'skipped' };
  }

  const lower = url.toLowerCase();
  const looksLikeMaps =
    lower.includes('maps.google.') ||
    lower.includes('google.com/maps') ||
    lower.includes('maps.app.goo.gl') ||
    lower.includes('goo.gl/maps') ||
    lower.startsWith('http');

  if (!looksLikeMaps && !/^https?:\/\//i.test(url)) {
    return { latitude: null, longitude: null, provenanceUrl: null, kind: 'skipped' };
  }

  // Short links: no inline coords offline
  if (lower.includes('maps.app.goo.gl') || lower.includes('goo.gl/maps')) {
    return {
      latitude: null,
      longitude: null,
      provenanceUrl: url,
      kind: 'provenance_only',
    };
  }

  const scan = decodeForCoordinateScan(url);
  const patterns: RegExp[] = [
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i,
    /[?&]ll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i,
    /[?&]query=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /\/search\/(-?\d+(?:\.\d+)?),\+?(-?\d+(?:\.\d+)?)/,
  ];

  for (const re of patterns) {
    const m = scan.match(re);
    if (!m?.[1] || !m[2]) continue;
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (!isFiniteCoord(lat, lng)) continue;
    return {
      latitude: lat,
      longitude: lng,
      provenanceUrl: url,
      kind: 'with_coords',
    };
  }

  if (/^https?:\/\//i.test(url)) {
    return {
      latitude: null,
      longitude: null,
      provenanceUrl: url,
      kind: 'provenance_only',
    };
  }

  return { latitude: null, longitude: null, provenanceUrl: null, kind: 'skipped' };
}

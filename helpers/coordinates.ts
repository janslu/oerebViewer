import { transform } from 'ol/proj'

/**
 * Converts longitude and latitude to Swiss coordinate system (EPSG:2056)
 *
 * @param lon - Longitude in WGS84 (EPSG:4326)
 * @param lat - Latitude in WGS84 (EPSG:4326)
 * @returns Array of coordinates in Swiss coordinate system [easting, northing]
 */
export function convertToSwissCoordinates(lon: number, lat: number): [number, number] {
  const coordinates: [number, number] = [lon, lat]
  const swissCoordinates = transform(coordinates, 'EPSG:4326', 'EPSG:2056')

  return swissCoordinates as [number, number]
}

export interface CoordinateQueryResult {
  type: 'wgs84' | 'lv95' | 'lv03'
  lon: number
  lat: number
  x: number
  y: number
}

// bounds are slightly padded around switzerland; the value ranges of the three
// systems (and of both axes within each system) never overlap, so a pair of
// numbers identifies its coordinate system and axis order unambiguously
const BOUNDS = {
  wgs84Lon: [5.5, 11],
  wgs84Lat: [45.5, 48],
  lv95X: [2450000, 2850000],
  lv95Y: [1050000, 1350000],
  lv03X: [450000, 850000],
  lv03Y: [50000, 350000],
}

const inRange = (value: number, [min, max]: number[]): boolean =>
  value >= min && value <= max

/**
 * Detects whether a search query is a coordinate pair (WGS84, LV95 or LV03)
 * and resolves it to lon/lat plus LV95 x/y. Accepts both axis orders and
 * apostrophes as thousands separators. Returns null for non-coordinate input.
 */
export function parseCoordinateQuery(query: string): CoordinateQueryResult | null {
  if (typeof query !== 'string') return null

  const cleaned = query.trim().replace(/[’']/g, '')

  // dot decimals - comma, semicolon and whitespace separate the pair
  const tokens = cleaned.split(/[\s,;]+/).filter(Boolean)
  if (tokens.length === 2) {
    const result = classifyPair(Number(tokens[0]), Number(tokens[1]))
    if (result) return result
  }

  // comma decimals (german locale tools) - whitespace separates the pair
  const commaTokens = cleaned.split(/\s+/).filter(Boolean)
  if (
    commaTokens.length === 2 &&
    commaTokens.every(t => (t.match(/,/g) || []).length <= 1)
  ) {
    const [a, b] = commaTokens.map(t => Number(t.replace(',', '.')))
    return classifyPair(a, b)
  }

  return null
}

function classifyPair(a: number, b: number): CoordinateQueryResult | null {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null

  if (inRange(a, BOUNDS.wgs84Lat) && inRange(b, BOUNDS.wgs84Lon)) return fromWgs84(b, a)
  if (inRange(a, BOUNDS.wgs84Lon) && inRange(b, BOUNDS.wgs84Lat)) return fromWgs84(a, b)

  if (inRange(a, BOUNDS.lv95X) && inRange(b, BOUNDS.lv95Y)) return fromLv95(a, b)
  if (inRange(a, BOUNDS.lv95Y) && inRange(b, BOUNDS.lv95X)) return fromLv95(b, a)

  if (inRange(a, BOUNDS.lv03X) && inRange(b, BOUNDS.lv03Y)) return fromLv03(a, b)
  if (inRange(a, BOUNDS.lv03Y) && inRange(b, BOUNDS.lv03X)) return fromLv03(b, a)

  return null
}

function fromWgs84(lon: number, lat: number): CoordinateQueryResult {
  const [x, y] = convertToSwissCoordinates(lon, lat)
  return { type: 'wgs84', lon, lat, x, y }
}

function fromLv95(x: number, y: number): CoordinateQueryResult {
  const [lon, lat] = transform([x, y], 'EPSG:2056', 'EPSG:4326')
  return { type: 'lv95', lon, lat, x, y }
}

function fromLv03(x03: number, y03: number): CoordinateQueryResult {
  const [x, y] = transform([x03, y03], 'EPSG:21781', 'EPSG:2056')
  const [lon, lat] = transform([x, y], 'EPSG:2056', 'EPSG:4326')
  return { type: 'lv03', lon, lat, x, y }
}

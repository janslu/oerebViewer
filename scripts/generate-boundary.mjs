/**
 * Generates a simplified canton boundary for the coordinate search
 * restriction from the official swissBOUNDARIES3D dataset.
 *
 * Usage:
 *   node scripts/generate-boundary.mjs <featureId> <output>
 *   node scripts/generate-boundary.mjs 2 config/bern/boundary.json
 *   node scripts/generate-boundary.mjs 18 config/graubuenden/boundary.json
 *
 * The geometry is douglas-peucker simplified with TOLERANCE meters of
 * maximum deviation. The viewer compensates with a grace distance when
 * testing points, so the boundary must never be used as an exact border.
 */

import fs from 'fs'

const TOLERANCE = 250
const LAYER = 'ch.swisstopo.swissboundaries3d-kanton-flaeche.fill'

const [featureId, output] = process.argv.slice(2)
if (!featureId || !output) {
  console.error('usage: node scripts/generate-boundary.mjs <featureId> <output>')
  process.exit(1)
}

const url = `https://api3.geo.admin.ch/rest/services/api/MapServer/${LAYER}/${featureId}?geometryFormat=geojson&sr=2056`
const data = await fetch(url).then((r) => {
  if (!r.ok) throw new Error(`${r.status} fetching ${url}`)
  return r.json()
})

const { geometry } = data.feature
if (geometry.type !== 'MultiPolygon') throw new Error(`unexpected geometry type ${geometry.type}`)

function douglasPeucker(points, tolerance) {
  if (points.length < 3) return points
  const keep = new Array(points.length).fill(false)
  keep[0] = keep[points.length - 1] = true
  const stack = [[0, points.length - 1]]
  while (stack.length) {
    const [i0, i1] = stack.pop()
    const [x0, y0] = points[i0]
    const [x1, y1] = points[i1]
    const dx = x1 - x0
    const dy = y1 - y0
    const norm = Math.hypot(dx, dy) || 1e-12
    let dmax = -1
    let imax = -1
    for (let i = i0 + 1; i < i1; i++) {
      const [x, y] = points[i]
      const d = Math.abs(dy * (x - x0) - dx * (y - y0)) / norm
      if (d > dmax) {
        dmax = d
        imax = i
      }
    }
    if (dmax > tolerance) {
      keep[imax] = true
      stack.push([i0, imax], [imax, i1])
    }
  }
  return points.filter((p, i) => keep[i])
}

function simplifyRing(ring, tolerance) {
  let points = ring.map((p) => [Math.round(p[0]), Math.round(p[1])])
  if (String(points[0]) === String(points[points.length - 1])) points = points.slice(0, -1)

  // a closed ring needs two independent baselines, otherwise the
  // start == end baseline degenerates and everything collapses
  const mid = Math.floor(points.length / 2)
  const first = douglasPeucker(points.slice(0, mid + 1), tolerance)
  const second = douglasPeucker([...points.slice(mid), points[0]], tolerance)
  return [...first.slice(0, -1), ...second.slice(0, -1)]
}

// outer rings only - enclaves inside the canton stay searchable
const coordinates = geometry.coordinates.map((polygon) => [simplifyRing(polygon[0], TOLERANCE)])

const boundary = {
  source: `swissBOUNDARIES3D ${LAYER} featureId ${featureId}`,
  tolerance: TOLERANCE,
  coordinates,
}

fs.writeFileSync(output, JSON.stringify(boundary))
const vertices = coordinates.reduce((n, poly) => n + poly[0].length, 0)
console.log(`${output}: ${vertices} vertices, ${Math.round(fs.statSync(output).size / 1024)} KB`)

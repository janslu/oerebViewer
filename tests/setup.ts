import proj4 from 'proj4'
import { register } from 'ol/proj/proj4'
import { projectionDefinitions } from '../config/defaults/setup.js'

// register the swiss projections like MapViewer does at runtime,
// so coordinate transforms work in tests
for (const key in projectionDefinitions) {
  const definition = projectionDefinitions[key]
  proj4.defs(`EPSG:${definition.type}`, definition.proj4)
}
register(proj4)

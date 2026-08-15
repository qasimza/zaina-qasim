/**
 * Height field for the coastal hillside.
 *
 * The shape is built from three parts, added together:
 *   1. A ridge that climbs from the foreground to a summit, where the museum sits.
 *   2. Fractal noise, for natural roughness.
 *   3. A carved trench along the path, so the path reads as a cut into the slope.
 *
 * Everything is a plain function of (x, z), so the same code gives the terrain
 * mesh its height and tells a prop what height to sit at.
 */

/** Deterministic pseudo-random value for a lattice point. */
function hash(x: number, z: number): number {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123
  return n - Math.floor(n)
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

/** Value noise, one octave. */
function noise(x: number, z: number): number {
  const xi = Math.floor(x)
  const zi = Math.floor(z)
  const xf = smooth(x - xi)
  const zf = smooth(z - zi)

  const a = hash(xi, zi)
  const b = hash(xi + 1, zi)
  const c = hash(xi, zi + 1)
  const d = hash(xi + 1, zi + 1)

  return a + (b - a) * xf + (c - a) * zf + (a - b - c + d) * xf * zf
}

/** Fractal noise. Each octave doubles the frequency and halves the amplitude. */
function fbm(x: number, z: number, octaves = 4): number {
  let total = 0
  let amplitude = 1
  let frequency = 1
  let normalise = 0

  for (let i = 0; i < octaves; i++) {
    total += noise(x * frequency, z * frequency) * amplitude
    normalise += amplitude
    amplitude *= 0.5
    frequency *= 2
  }

  return total / normalise
}

/** World size of the terrain, in units. */
export const TERRAIN_SIZE = 200

/** The summit sits at the far end of the ridge. The museum goes here. */
export const SUMMIT = { x: 6, z: -70 }

/**
 * Centre line of the path, as a function of depth.
 * The path curves, so the eye follows it rather than running straight up.
 */
export function pathCentreX(z: number): number {
  const t = (z + 90) / 120 // 0 in the foreground, 1 near the summit
  return Math.sin(t * Math.PI * 1.1) * 14 + t * SUMMIT.x
}

/** Where the camera stands on the path, and what it looks at. */
export const VIEWPOINT = { x: pathCentreX(58), z: 58, eyeHeight: 9 }

/** Terrain height at a world position. */
export function terrainHeight(x: number, z: number): number {
  // 1. The ridge. Rises toward the summit, falls away to the sides.
  const alongRidge = Math.max(0, (-z + 90) / 160)
  const distanceFromSpine = Math.abs(x - pathCentreX(z))
  const shoulder = Math.exp(-(distanceFromSpine * distanceFromSpine) / 3200)
  const ridge = alongRidge * alongRidge * 46 * (0.35 + 0.65 * shoulder)

  // 2. Roughness. Broad folds, then finer detail on top of them.
  const folds = fbm(x * 0.018 + 40, z * 0.018 + 40) * 9
  const rough = fbm(x * 0.055 + 11, z * 0.055 + 11, 3) * 3
  const fine = fbm(x * 0.16, z * 0.16, 2) * 1

  // 3. The path. A shallow trench that also flattens the ground it runs over,
  //    so the walking surface stays smooth while the hillside stays rough.
  const pathWidth = 5.5 - alongRidge * 2
  const trench = Math.exp(-(distanceFromSpine * distanceFromSpine) / (pathWidth * pathWidth))
  const detail = (folds + rough + fine) * (1 - trench * 0.85)

  return ridge + detail - trench * 2.6
}

/**
 * How much a position belongs to the path, from 0 (hillside) to 1 (path centre).
 *
 * This is deliberately a smooth ramp, not a boolean. A hard cut makes the path
 * edge follow the vertex grid, which reads as a staircase.
 */
export function pathBlend(x: number, z: number): number {
  const distance = Math.abs(x - pathCentreX(z))
  const inner = 2.4 // fully path
  const outer = 5.2 // fully hillside
  if (distance <= inner) return 1
  if (distance >= outer) return 0
  const t = 1 - (distance - inner) / (outer - inner)
  return t * t * (3 - 2 * t)
}

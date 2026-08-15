/**
 * Height field for the coastal hillside.
 *
 * Three parts are summed:
 *
 *   1. Ridged fractal noise for rolling hills.
 *   2. A rim that lifts the far perimeter, so the mesh edge stays hidden.
 *   3. Soft landforms for the camera hill and the museum rise.
 *
 * Everything is a plain function of (x, z), so the same code gives the mesh its
 * height and tells a prop what height to sit at.
 */

function hash(x: number, z: number): number {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123
  return n - Math.floor(n)
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

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

/**
 * Ridged noise. Folding the value around 1 turns rounded hills into sharp
 * crests.
 */
function ridged(x: number, z: number, octaves = 6): number {
  let total = 0
  let amplitude = 1
  let frequency = 1
  let normalise = 0
  // Rotating between octaves stops the ridges lining up on the grid axes.
  let px = x
  let pz = z

  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(noise(px * frequency, pz * frequency) * 2 - 1)
    total += n * n * amplitude
    normalise += amplitude
    amplitude *= 0.48
    frequency *= 2.03
    const rx = px * 0.8 - pz * 0.6
    const rz = px * 0.6 + pz * 0.8
    px = rx
    pz = rz
  }

  return total / normalise
}

/** Soft gaussian rise. Matches the museum summit and the camera hill. */
function softRise(x: number, z: number, cx: number, cz: number, spread: number, height: number): number {
  const d = Math.hypot(x - cx, z - cz)
  return Math.exp(-(d * d) / spread) * height
}

/** World size of the terrain, in units. */
export const TERRAIN_SIZE = 700

/**
 * Natural hill under the camera. Same soft shape as the other rises — not a
 * flat plateau or a cliff.
 *
 * Fixed in the world so moving the camera does not move the landform.
 */
export const HILL = { x: 0, z: 100, spread: 9800, height: 44 }

/**
 * Crest of the hill, a short step seaward of the peak so the view looks down
 * the slope toward the water.
 */
export const VIEWPOINT = { x: 0, z: 86, eyeHeight: 5 }

/** The rise that carries the museum. */
export const SUMMIT = { x: 34, z: -90 }

/** Height of the ocean surface. Land is measured against this. */
export const SEA_LEVEL = 0

/**
 * How much a position belongs to the sea, from 0 (inland) to 1 (open water).
 *
 * The coast runs across the far side of the scene, so the ocean sits beyond the
 * hills in the direction the camera faces.
 */
export function coastFactor(z: number): number {
  const shoreStart = -150
  const shoreEnd = -330
  const t = Math.min(1, Math.max(0, (z - shoreStart) / (shoreEnd - shoreStart)))
  return smooth(t)
}

/**
 * Coastal hills. Rolling ground, one rise for the museum, one for the camera,
 * and far hills on every side so a full turn never finds an edge.
 */
export function terrainHeight(x: number, z: number): number {
  const distance = Math.hypot(x, z)
  const sea = coastFactor(z)

  // 1. Rolling hills. Low amplitude, broad wavelength.
  const hills = ridged(x * 0.004 + 17, z * 0.004 + 17, 4) * 34

  // 2. Far hills. Rise at the perimeter to close the horizon. They fade out
  //    toward the coast, which opens the view to the water.
  const rimStart = TERRAIN_SIZE * 0.26
  const rimEnd = TERRAIN_SIZE * 0.5
  const rimT = Math.min(1, Math.max(0, (distance - rimStart) / (rimEnd - rimStart)))
  const rim = smooth(rimT) * 70 * (1 - sea)

  // 3. Museum rise.
  const summit = softRise(x, z, SUMMIT.x, SUMMIT.z, 5200, 46)

  // 4. Camera hill. Soft gaussian — same language as the rest of the land.
  const hill = softRise(x, z, HILL.x, HILL.z, HILL.spread, HILL.height)

  // Fine detail, faded out where it cannot be seen.
  const detailFade = Math.max(0, 1 - distance / 320)
  const detail = ridged(x * 0.03, z * 0.03, 3) * 3.5 * detailFade

  // 5. Land eases toward the shore so rolling ground does not block the water.
  const descent = Math.min(1, Math.max(0, (z + 170) / (HILL.z + 170)))
  const seaward = 0.18 + 0.82 * descent * descent

  const land = (hills + detail) * seaward + rim + summit * seaward + hill + 28

  // Toward the coast the ground drops below sea level, so the shoreline is a
  // real crossing rather than a drawn line.
  return land * (1 - sea) + sea * -30
}

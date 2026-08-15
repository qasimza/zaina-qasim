/**
 * Height field for the mountain landscape.
 *
 * The terrain surrounds the viewpoint, so the camera can turn a full circle and
 * always face mountains. Three parts are summed:
 *
 *   1. Ridged fractal noise, which gives sharp crests instead of soft blobs.
 *   2. A rim that lifts the far perimeter into a ring of distant peaks. This
 *      hides the edge of the mesh, so there is no hollow side.
 *   3. A bowl that lowers the ground near the viewpoint, so the camera stands in
 *      a basin and the mountains rise around it.
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
 * crests, which is what makes a mountain read as a mountain.
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

/** World size of the terrain, in units. */
export const TERRAIN_SIZE = 700

/** Where the camera stands, on the open hillside. */
export const VIEWPOINT = { x: 0, z: 40, eyeHeight: 6 }

/** The rise that carries the museum. */
export const SUMMIT = { x: 34, z: -90 }

/**
 * Coastal hills, not mountains. Rolling ground with one rise for the museum,
 * and far hills on every side so a full turn never finds an edge.
 */
export function terrainHeight(x: number, z: number): number {
  const distance = Math.hypot(x, z)

  // 1. Rolling hills. Low amplitude, broad wavelength.
  const hills = ridged(x * 0.004 + 17, z * 0.004 + 17, 4) * 34

  // 2. Far hills. Rise gently at the perimeter to close the horizon, so the
  //    mesh edge is never visible from the viewpoint.
  const rimStart = TERRAIN_SIZE * 0.26
  const rimEnd = TERRAIN_SIZE * 0.5
  const rimT = Math.min(1, Math.max(0, (distance - rimStart) / (rimEnd - rimStart)))
  const rim = smooth(rimT) * 70

  // 3. The museum rise. One deliberate landform, so the eye has a destination.
  const toSummit = Math.hypot(x - SUMMIT.x, z - SUMMIT.z)
  const summit = Math.exp(-(toSummit * toSummit) / 5200) * 46

  // 4. A shallow bowl at the viewpoint, so the camera is not buried.
  const clearing = Math.exp(-(Math.hypot(x - VIEWPOINT.x, z - VIEWPOINT.z) ** 2) / 5000) * 16

  // Fine detail, faded out where it cannot be seen.
  const detailFade = Math.max(0, 1 - distance / 320)
  const detail = ridged(x * 0.03, z * 0.03, 3) * 3.5 * detailFade

  return hills + rim + summit - clearing + detail
}

import { useMemo } from 'react'
import * as THREE from 'three'
import fragmentShader from './shaders/fragment.frag'
import vertexShader from './shaders/vertex.vert'

/**
 * Sky dome.
 *
 * A flat background colour makes the horizon look like a cut-out. A gradient
 * that darkens with altitude, plus a glow around the sun, reads as atmosphere.
 * The fog colour is matched to the horizon band so distant peaks dissolve into
 * the sky rather than fading to grey.
 */
interface Props {
  sunDirection: THREE.Vector3
  radius?: number
}

/**
 * Horizon colour, also used for fog so the two always agree.
 *
 * This must stay a pale, low-saturation haze. A warm sandy value makes distant
 * water fade to the colour of sand, because the ocean fogs toward this too.
 * Warmth at the horizon comes from the sun glow, not from this base colour.
 */
export const HORIZON_COLOUR = new THREE.Color('#cdd3d2')

export default function Sky({ sunDirection, radius = 2000 }: Props) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uHorizon: { value: HORIZON_COLOUR },
          uZenith: { value: new THREE.Color('#7ba6c9') },
          uSunColour: { value: new THREE.Color('#ffd9a0') },
          uSunDirection: { value: sunDirection.clone().normalize() },
        },
      }),
    [sunDirection],
  )

  return (
    <mesh material={material} frustumCulled={false}>
      <sphereGeometry args={[radius, 32, 16]} />
    </mesh>
  )
}

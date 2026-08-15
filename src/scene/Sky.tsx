import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * Sky dome.
 *
 * A flat background colour makes the horizon look like a cut-out. A gradient
 * that darkens with altitude, plus a glow around the sun, reads as atmosphere.
 * The fog colour is matched to the horizon band so distant peaks dissolve into
 * the sky rather than fading to grey.
 */
const vertexShader = /* glsl */ `
varying vec3 vDirection;

void main() {
  vDirection = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */ `
uniform vec3 uHorizon;
uniform vec3 uZenith;
uniform vec3 uSunColour;
uniform vec3 uSunDirection;

varying vec3 vDirection;

void main() {
  vec3 dir = normalize(vDirection);

  // Altitude gradient. The power curve keeps the horizon band tight.
  float altitude = clamp(dir.y, 0.0, 1.0);
  vec3 colour = mix(uHorizon, uZenith, pow(altitude, 0.55));

  // Broad glow around the sun, then the disc itself.
  float sunAmount = max(dot(dir, normalize(uSunDirection)), 0.0);
  colour += uSunColour * pow(sunAmount, 7.0) * 0.5;
  colour += uSunColour * pow(sunAmount, 900.0) * 0.7;

  // Tone curve. Compresses the highlights so the sun does not clip flat.
  colour = 1.0 - exp(-colour * 1.9);

  gl_FragColor = vec4(colour, 1.0);
}
`

interface Props {
  sunDirection: THREE.Vector3
  radius?: number
}

/** Horizon colour, also used for fog so the two always agree. */
export const HORIZON_COLOUR = new THREE.Color('#e4d3b4')

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

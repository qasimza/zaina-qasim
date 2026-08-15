import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { SEA_LEVEL } from './heightField'
import { HORIZON_COLOUR } from './Sky'

/**
 * Ocean surface.
 *
 * A flat plane, not simulated geometry. The movement lives entirely in the
 * shader: two crossing wave fields perturb the normal, which drives both the
 * sun glitter and how much sky reflects. That is cheap, because the cost is one
 * plane regardless of how detailed the water looks.
 */
const vertexShader = /* glsl */ `
varying vec2 vWorldXZ;
varying vec3 vWorldPosition;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPosition = world.xyz;
  vWorldXZ = world.xz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uSkyColour;
uniform vec3 uSunColour;
uniform vec3 uSunDirection;
uniform vec3 uFogColour;
uniform float uFogDensity;

varying vec2 vWorldXZ;
varying vec3 vWorldPosition;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);

  // Two crossing wave fields, at different scales and speeds. Summing them
  // stops any single direction reading as a repeating pattern.
  vec2 p = vWorldXZ * 0.05;
  float waveA = sin(p.x * 1.7 + uTime * 0.9) * cos(p.y * 1.3 - uTime * 0.6);
  float waveB = sin((p.x + p.y) * 3.1 - uTime * 1.4) * 0.5;
  float waveC = sin(p.y * 6.2 + uTime * 2.1) * 0.18;

  // Build a normal from the wave slopes. Y stays large so the surface stays
  // broadly flat and only glints, rather than looking like crumpled foil.
  vec3 normal = normalize(vec3(
    (waveA + waveB + waveC) * 0.06,
    1.0,
    (waveB - waveA + waveC) * 0.06
  ));

  // Fresnel. Water is dark looking straight down and mirror-like at a glancing
  // angle. This single term is what makes it read as water rather than paint.
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);

  vec3 colour = mix(uDeep, uShallow, 0.35 + waveA * 0.1);
  colour = mix(colour, uSkyColour, clamp(fresnel * 1.4, 0.0, 0.85));

  // Sun glitter, from the reflected view direction.
  vec3 reflection = reflect(-viewDir, normal);
  float glint = pow(max(dot(reflection, normalize(uSunDirection)), 0.0), 220.0);
  colour += uSunColour * glint * 1.6;

  // Match the scene fog, so the far water melts into the horizon and the plane
  // edge never shows.
  float dist = length(cameraPosition - vWorldPosition);
  float fog = 1.0 - exp(-dist * dist * uFogDensity * uFogDensity);
  colour = mix(colour, uFogColour, clamp(fog, 0.0, 1.0));

  gl_FragColor = vec4(colour, 1.0);
}
`

interface Props {
  sunDirection: THREE.Vector3
  fogDensity: number
  size?: number
}

export default function Ocean({ sunDirection, fogDensity, size = 6000 }: Props) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uShallow: { value: new THREE.Color('#4d94a6') },
      uDeep: { value: new THREE.Color('#1f4e63') },
      uSkyColour: { value: new THREE.Color('#9fc4dd') },
      uSunColour: { value: new THREE.Color('#ffdcaa') },
      uSunDirection: { value: sunDirection.clone().normalize() },
      uFogColour: { value: HORIZON_COLOUR },
      uFogDensity: { value: fogDensity },
    }),
    [sunDirection, fogDensity],
  )

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, SEA_LEVEL, -400]}>
      <planeGeometry args={[size, size]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}
